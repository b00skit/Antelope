import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembersCache, factionMembersAbasCache } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { subDays } from 'date-fns';

interface Member {
    character_id: number;
    character_name: string;
    rank: number;
    rank_name: string;
    last_online: string | null;
    last_duty: string | null;
}

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
            with: { selectedFaction: true }
        });

        if (!user?.selectedFaction?.id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }
        
        const { selectedFaction: faction } = user;
        if (!faction.feature_flags?.statistics_enabled) {
            return NextResponse.json({ error: 'Statistics are not enabled for this faction.' }, { status: 403 });
        }

        const cachedMembers = await db.query.factionMembersCache.findFirst({
            where: eq(factionMembersCache.faction_id, faction.id)
        });

        if (!cachedMembers || !cachedMembers.members) {
            return NextResponse.json({ error: 'Faction member cache is not available. Please sync the roster first.' }, { status: 404 });
        }

        const members: Member[] = cachedMembers.members;
        const memberIds = members.map(m => m.character_id);

        const abasData = memberIds.length > 0 ? await db.query.factionMembersAbasCache.findMany({
            where: and(
                eq(factionMembersAbasCache.faction_id, faction.id),
                inArray(factionMembersAbasCache.character_id, memberIds)
            )
        }) : [];

        const abasMap = new Map(abasData.map(a => [a.character_id, parseFloat(a.abas || '0')]));
        
        // --- Process Statistics ---
        const totalMembers = members.length;
        const sevenDaysAgo = subDays(new Date(), 7);
        const activeLast7Days = members.filter(m => m.last_duty && new Date(m.last_duty) > sevenDaysAgo).length;

        const rankDistribution = members.reduce((acc, member) => {
            acc[member.rank_name] = (acc[member.rank_name] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const sortedRankDistribution = Object.entries(rankDistribution)
            .sort(([, a], [, b]) => b - a)
            .map(([name, count]) => ({ name, count }));
            
        const totalAbas = Array.from(abasMap.values()).reduce((sum, abas) => sum + abas, 0);
        const averageAbas = totalMembers > 0 ? totalAbas / totalMembers : 0;
        
        const membersWithAbas = members.map(m => {
            const abas = abasMap.get(m.character_id) ?? 0;
            const isSupervisor = m.rank >= (faction.supervisor_rank ?? 10);
            const requiredAbas = isSupervisor ? (faction.minimum_supervisor_abas ?? 0) : (faction.minimum_abas ?? 0);
            const metMinimum = abas >= requiredAbas;
            return {
                ...m,
                abas,
                requiredAbas,
                metMinimum
            };
        });
        
        const topPerformers = [...membersWithAbas].sort((a, b) => b.abas - a.abas).slice(0, 10);
        const belowMinimum = membersWithAbas.filter(m => !m.metMinimum && m.requiredAbas > 0).sort((a, b) => a.abas - b.abas);

        return NextResponse.json({
            totalMembers,
            activeLast7Days,
            averageAbas,
            rankDistribution: sortedRankDistribution,
            topPerformers,
            belowMinimum,
            lastSync: cachedMembers.last_sync_timestamp,
        });

    } catch (error) {
        console.error('[API Statistics] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
