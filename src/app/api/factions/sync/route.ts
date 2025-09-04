import { NextRequest, NextResponse } from 'next/server';
import { getServerSession, DbSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembers, factions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

async function syncFactions(session: DbSession) {
    if (!session.gtawAccessToken) {
        return { success: false, error: 'Not authenticated or no access token available.' };
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
    });

    if (!user) {
        return { success: false, error: 'User not found.' };
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Sync if last_sync_timestamp is null or older than 24 hours
    if (user.last_sync_timestamp && new Date(user.last_sync_timestamp) > oneDayAgo) {
        return { success: true, message: 'Faction data is up to date.' };
    }

    try {
        const factionsResponse = await fetch('https://ucp.gta.world/api/factions', {
            headers: {
                Authorization: `Bearer ${session.gtawAccessToken}`,
            },
        });

        if (!factionsResponse.ok) {
            const errorBody = await factionsResponse.text();
            console.error('Failed to fetch factions:', errorBody);
            // If token is expired, redirect user to re-login
            if (factionsResponse.status === 401) {
                return { success: false, error: 'Your session has expired. Please log in again.', reauth: true };
            }
            return { success: false, error: 'Failed to fetch faction data from GTA:World API.' };
        }

        const gtawFactionsData = await factionsResponse.json();
        
        const characterFactions = gtawFactionsData.data;
        if (!characterFactions || Object.keys(characterFactions).length === 0) {
            // Still update timestamp to avoid re-fetching constantly for users with no factions
            await db.update(users).set({ last_sync_timestamp: now }).where(eq(users.id, user.id));
            return { success: true, message: 'No faction data found for your characters.' };
        }
        
        const highestRanks: { [key: string]: { id: number; name: string; rank: number } } = {};
        for (const charId in characterFactions) {
            const factionInfo = characterFactions[charId];
            const name = factionInfo.faction_name;
            if (!highestRanks[name] || factionInfo.faction_rank > highestRanks[name].rank) {
                highestRanks[name] = {
                    id: factionInfo.faction,
                    name: name,
                    rank: factionInfo.faction_rank,
                };
            }
        }
        
        const allDbFactions = await db.query.factions.findMany();
        const userFactionMemberships = await db.query.factionMembers.findMany({
            where: eq(factionMembers.userId, user.id)
        });

        for (const factionName in highestRanks) {
            const { id: factionId, rank } = highestRanks[factionName];
            
            const dbFaction = allDbFactions.find(f => f.id === factionId);
            if (!dbFaction) continue;

            const existingMembership = userFactionMemberships.find(m => m.factionId === factionId);

            if (existingMembership) {
                if (rank > existingMembership.rank) {
                    await db.update(factionMembers)
                        .set({ rank })
                        .where(and(eq(factionMembers.userId, user.id), eq(factionMembers.factionId, factionId)));
                }
            } else {
                await db.insert(factionMembers).values({
                    userId: user.id,
                    factionId: factionId,
                    rank: rank,
                });
            }
        }
        
        await db.update(users).set({ last_sync_timestamp: now }).where(eq(users.id, user.id));

        return { success: true, message: 'Successfully synced faction data.' };

    } catch (error) {
        console.error('Faction sync error:', error);
        return { success: false, error: 'An internal error occurred during faction sync.' };
    }
}

export async function GET(request: NextRequest) {
    try {
        const csrfToken = request.headers.get('x-csrf-token') || '';
        const session = await getServerSession(csrfToken);
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const syncResult = await syncFactions(session);

        if (!syncResult.success) {
            return NextResponse.json(syncResult, { status: 500 });
        }
        
        const userFactions = await db.query.factionMembers.findMany({
            where: eq(factionMembers.userId, session.userId),
            with: {
                faction: true,
            },
        });
        
        return NextResponse.json({ factions: userFactions });

    } catch (error) {
        console.error('[API Factions Sync] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
