
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembers, factionMembersCache, factionMembersAbasCache, activityRosters } from '@/db/schema';
import { and, eq, desc, inArray, sql } from 'drizzle-orm';

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

        const factionId = user.selectedFaction.id;

        // 1. Get user's characters and their ABAS
        const userCharactersInFaction = await db.query.factionMembersCache.findFirst({
            where: eq(factionMembersCache.faction_id, factionId),
        }).then(cache => cache?.members?.filter((m: any) => m.user_id === user.gtaw_user_id) || []);

        const userCharacterIds = userCharactersInFaction.map((c: any) => c.character_id);

        let userCharactersWithAbas: { character_id: number; character_name: string; abas: number | null; }[] = [];
        let userTotalAbas = 0;

        if (userCharacterIds.length > 0) {
            const abasCache = await db.query.factionMembersAbasCache.findMany({
                where: and(
                    eq(factionMembersAbasCache.faction_id, factionId),
                    inArray(factionMembersAbasCache.character_id, userCharacterIds)
                ),
            });
            
            const abasMap = new Map(abasCache.map(a => [a.character_id, a]));
            
            userCharactersWithAbas = userCharactersInFaction.map((c: any) => ({
                character_id: c.character_id,
                character_name: c.character_name,
                abas: parseFloat(abasMap.get(c.character_id)?.abas || '0'),
            }));
            
            userTotalAbas = abasCache[0]?.total_abas || 0;
        }


        // 2. Get required ABAS for the user
        const userMembership = await db.query.factionMembers.findFirst({
             where: and(
                eq(factionMembers.userId, session.userId),
                eq(factionMembers.factionId, factionId)
             )
        });

        let requiredAbas = 0;
        if (userMembership && user.selectedFaction) {
             const isSupervisor = userMembership.rank >= (user.selectedFaction.supervisor_rank ?? 10);
             requiredAbas = isSupervisor ? (user.selectedFaction.minimum_supervisor_abas ?? 0) : (user.selectedFaction.minimum_abas ?? 0);
        }

        // 3. Get Faction Average ABAS, Top 5 Performers
        const allFactionAbas = await db.query.factionMembersAbasCache.findMany({
            where: eq(factionMembersAbasCache.faction_id, factionId),
        });

        const allMembersCache = await db.query.factionMembersCache.findFirst({
            where: eq(factionMembersCache.faction_id, factionId),
        });
        const totalMembersCount = allMembersCache?.members?.length || 0;
        const totalFactionAbas = allFactionAbas.reduce((sum, a) => sum + parseFloat(a.abas || '0'), 0);
        const factionAverageAbas = totalMembersCount > 0 ? totalFactionAbas / totalMembersCount : 0;
        
        const characterIdToNameMap = new Map(allMembersCache?.members?.map((m: any) => [m.character_id, m.character_name]) || []);

        const topPerformers = allFactionAbas
            .map(a => ({
                character_id: a.character_id,
                character_name: characterIdToNameMap.get(a.character_id) || `Character #${a.character_id}`,
                abas: parseFloat(a.abas || '0'),
            }))
            .sort((a, b) => b.abas - a.abas)
            .slice(0, 5);
        
        // 4. Get 5 recent rosters created by the user
        const recentRosters = await db.query.activityRosters.findMany({
            where: and(
                eq(activityRosters.factionId, factionId),
                eq(activityRosters.created_by, session.userId)
            ),
            orderBy: [desc(activityRosters.created_at)],
            limit: 5,
            columns: {
                id: true,
                name: true,
                created_at: true,
            }
        });

        return NextResponse.json({
            userCharacters: userCharactersWithAbas,
            userTotalAbas,
            requiredAbas,
            factionAverageAbas,
            topPerformers,
            recentRosters,
        });

    } catch (error) {
        console.error('[API Dashboard] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
