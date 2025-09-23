
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembersCache, factionMembersAbasCache, apiCacheAlternativeCharacters, factions } from '@/db/schema';
import { eq } from 'drizzle-orm';
import * as XLSX from 'xlsx';
import { z } from 'zod';
import { subDays } from 'date-fns';

const columnSchema = z.object({
    key: z.string(),
    label: z.string(),
});

const sheetSchema = z.object({
    id: z.string(),
    name: z.string(),
    columns: z.array(columnSchema),
});

const filterSchema = z.object({
    onlyWithAlts: z.boolean(),
    dutyActiveDays: z.string(), // 'all', '7', '14', '30'
    belowMinimumAbas: z.boolean(),
    rank: z.string(),
});

const exportSchema = z.object({
    sheets: z.array(sheetSchema),
    filters: filterSchema,
});


interface Member {
    character_id: number;
    character_name: string;
    user_id: number;
    last_online: string | null;
    last_duty: string | null;
    [key: string]: any;
}

const formatDate = (timestamp: string | null): string => {
    if (!timestamp) return 'N/A';
    try {
        return new Date(timestamp).toLocaleDateString();
    } catch (e) {
        return 'Invalid Date';
    }
};

const formatTime = (timestamp: string | null): string => {
    if (!timestamp) return 'N/A';
    try {
        return new Date(timestamp).toLocaleTimeString();
    } catch (e) {
        return 'Invalid Time';
    }
};


export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = exportSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid configuration.', details: parsed.error.flatten() }, { status: 400 });
    }
    const { sheets, filters } = parsed.data;


    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
            with: { selectedFaction: true },
        });

        if (!user?.selectedFaction?.id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }

        if (!user.selectedFaction.feature_flags?.data_exports_enabled) {
            return NextResponse.json({ error: 'Data exports are not enabled for this faction.' }, { status: 403 });
        }

        const factionId = user.selectedFaction.id;

        const [membersCache, abasCache, altCache, faction] = await Promise.all([
            db.query.factionMembersCache.findFirst({ where: eq(factionMembersCache.faction_id, factionId) }),
            db.query.factionMembersAbasCache.findMany({ where: eq(factionMembersAbasCache.faction_id, factionId) }),
            db.query.apiCacheAlternativeCharacters.findMany({ where: eq(apiCacheAlternativeCharacters.faction_id, factionId) }),
            db.query.factions.findFirst({ where: eq(factions.id, factionId) }),
        ]);

        if (!membersCache || !membersCache.members) {
            return NextResponse.json({ error: 'No member data found to export.' }, { status: 404 });
        }
        if (!faction) {
            return NextResponse.json({ error: 'Faction settings not found.' }, { status: 404 });
        }

        const abasMap = new Map(abasCache.map(a => [a.character_id, a.abas]));
        const altMap = new Map(altCache.map(a => [a.user_id, a]));
        
        const allMembers: Member[] = membersCache.members;
        
        let processedData = allMembers.map(member => {
            const abas = abasMap.get(member.character_id) ?? '0.00';
            const lastOnlineDate = formatDate(member.last_online);
            const lastOnlineTime = formatTime(member.last_online);
            const lastDutyDate = formatDate(member.last_duty);
            const lastDutyTime = formatTime(member.last_duty);
            
            let primaryCharacterName = '';
            const altInfo = altMap.get(member.user_id);
            let hasAlts = false;
            // A user has alts if they appear in the altCache
            if (altInfo) {
                hasAlts = true;
                primaryCharacterName = altInfo.character_name;
            }

            const isSupervisor = member.rank >= (faction.supervisor_rank ?? 10);
            const requiredAbas = isSupervisor ? (faction.minimum_supervisor_abas ?? 0) : (faction.minimum_abas ?? 0);
            const isBelowMinimumAbas = parseFloat(abas) < requiredAbas;


            return {
                ...member,
                primary_character: primaryCharacterName,
                has_alts: hasAlts,
                is_below_min_abas: isBelowMinimumAbas,
                abas,
                last_online_date: lastOnlineDate,
                last_online_time: lastOnlineTime,
                last_duty_date: lastDutyDate,
                last_duty_time: lastDutyTime,
            };
        });

        // Apply filters
        if (filters.onlyWithAlts) {
            processedData = processedData.filter(row => row.has_alts);
        }
        if (filters.belowMinimumAbas) {
            processedData = processedData.filter(row => row.is_below_min_abas);
        }
        if (filters.dutyActiveDays !== 'all') {
            const days = parseInt(filters.dutyActiveDays, 10);
            if (!isNaN(days)) {
                const cutoffDate = subDays(new Date(), days);
                processedData = processedData.filter(row => row.last_duty && new Date(row.last_duty) > cutoffDate);
            }
        }
        if (filters.rank && filters.rank !== 'all' && filters.rank.trim() !== '') {
            processedData = processedData.filter(row => row.rank_name.toLowerCase() === filters.rank.toLowerCase().trim());
        }
        
        const workbook = XLSX.utils.book_new();

        for (const sheetConfig of sheets) {
            if (sheetConfig.columns.length === 0) continue;

            const worksheetData = processedData.map(row => {
                const newRow: Record<string, any> = {};
                for (const col of sheetConfig.columns) {
                    newRow[col.label] = row[col.key] ?? '';
                }
                return newRow;
            });
            const worksheet = XLSX.utils.json_to_sheet(worksheetData);
            const sheetName = sheetConfig.name.replace(/[*?:/\\\[\]]/g, '').substring(0, 31) || `Sheet ${sheets.indexOf(sheetConfig) + 1}`;
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        }

        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });

        return new Response(Buffer.from(buffer), {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="faction-roster-${new Date().toISOString().split('T')[0]}.xlsx"`,
            },
        });

    } catch (error) {
        console.error('[API Faction Roster Export] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
