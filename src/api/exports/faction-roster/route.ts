
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembersCache, factionMembersAbasCache, apiCacheAlternativeCharacters } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface Member {
    character_id: number;
    character_name: string;
    user_id: number;
    last_online: string | null;
    last_duty: string | null;
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


export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

        const [membersCache, abasCache, altCache] = await Promise.all([
            db.query.factionMembersCache.findFirst({ where: eq(factionMembersCache.faction_id, factionId) }),
            db.query.factionMembersAbasCache.findMany({ where: eq(factionMembersAbasCache.faction_id, factionId) }),
            db.query.apiCacheAlternativeCharacters.findMany({ where: eq(apiCacheAlternativeCharacters.faction_id, factionId) })
        ]);

        if (!membersCache || !membersCache.members) {
            return NextResponse.json({ error: 'No member data found to export.' }, { status: 404 });
        }

        const abasMap = new Map(abasCache.map(a => [a.character_id, a.abas]));
        const altMap = new Map(altCache.map(a => [a.user_id, a]));
        
        const allMembers: Member[] = membersCache.members;

        const csvHeader = "Character ID,Name,User ID,Alternative Character,ABAS,Last Logged In - Date,Last Logged In - Time,Last Duty - Date,Last Duty - Time\n";

        const csvRows = allMembers.map(member => {
            const abas = abasMap.get(member.character_id) ?? '0.00';
            const lastOnlineDate = formatDate(member.last_online);
            const lastOnlineTime = formatTime(member.last_online);
            const lastDutyDate = formatDate(member.last_duty);
            const lastDutyTime = formatTime(member.last_duty);
            
            let altStatus = 'N/A';
            const altInfo = altMap.get(member.user_id);
            if (altInfo) {
                if (altInfo.character_id === member.character_id) {
                    altStatus = 'Primary Character';
                } else {
                    altStatus = `Yes - ${altInfo.character_name}`;
                }
            }

            // Escape commas in names
            const name = `"${member.character_name.replace(/"/g, '""')}"`;

            return [
                member.character_id,
                name,
                member.user_id,
                altStatus,
                abas,
                lastOnlineDate,
                lastOnlineTime,
                lastDutyDate,
                lastDutyTime,
            ].join(',');
        });
        
        const csvContent = csvHeader + csvRows.join('\n');

        return new Response(csvContent, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="faction-roster-${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });

    } catch (error) {
        console.error('[API Faction Roster Export] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
