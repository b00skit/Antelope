
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { activityRosters, users, factionMembersCache } from '@/db/schema';
import { and, eq, or } from 'drizzle-orm';

interface RouteParams {
    params: {
        id: string;
    }
}

interface Member {
    character_id: number;
    character_name: string;
    rank: number;
    rank_name: string;
    last_online: string | null;
    last_duty: string | null;
}

interface RosterFilters {
    include_ranks?: number[];
    exclude_ranks?: number[];
    include_members?: string[];
    exclude_members?: string[];
}


export async function GET(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId || !session.gtaw_access_token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rosterId = parseInt(params.id, 10);
    if (isNaN(rosterId)) {
        return NextResponse.json({ error: 'Invalid roster ID.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const forceSync = searchParams.get('forceSync') === 'true';

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
        });

        if (!user || !user.selected_faction_id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }
        
        // 1. Verify user has access to this roster
        const roster = await db.query.activityRosters.findFirst({
            where: and(
                eq(activityRosters.id, rosterId),
                eq(activityRosters.factionId, user.selected_faction_id),
                or(
                    eq(activityRosters.is_public, true),
                    eq(activityRosters.created_by, session.userId)
                )
            ),
            with: {
                faction: true
            }
        });

        if (!roster) {
            return NextResponse.json({ error: 'Roster not found or you do not have permission to view it.' }, { status: 404 });
        }

        const factionId = roster.factionId;
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        
        let members: Member[] = [];
        const cachedFaction = await db.query.factionMembersCache.findFirst({
            where: eq(factionMembersCache.faction_id, factionId)
        });

        // 2. Decide whether to fetch from API or use cache
        if (forceSync || !cachedFaction || !cachedFaction.last_sync_timestamp || new Date(cachedFaction.last_sync_timestamp) < oneDayAgo) {
             const factionApiResponse = await fetch(`https://ucp.gta.world/api/faction/${factionId}`, {
                headers: {
                    Authorization: `Bearer ${session.gtaw_access_token}`,
                    'Accept': 'application/json',
                },
            });
            
            if (!factionApiResponse.ok) {
                const errorBody = await factionApiResponse.text();
                console.error(`[API Roster View] Failed to fetch GTA:W faction data for faction ${factionId}:`, errorBody);
                if (factionApiResponse.status === 401) {
                    return NextResponse.json({ error: 'Your session has expired. Please log in again.', reauth: true }, { status: 401 });
                }
                return NextResponse.json({ error: 'Failed to fetch roster data from GTA:World API.' }, { status: 502 });
            }
            
            const gtawFactionData = await factionApiResponse.json();
            members = gtawFactionData.data.members;

            await db.insert(factionMembersCache)
                .values({ faction_id: factionId, members: members, last_sync_timestamp: now })
                .onConflictDoUpdate({ target: factionMembersCache.faction_id, set: { members: members, last_sync_timestamp: now } });
        } else {
            members = cachedFaction.members || [];
        }


        // 3. Apply JSON filters if they exist
        if (roster.roster_setup_json) {
            try {
                const filters: RosterFilters = JSON.parse(roster.roster_setup_json);
                
                members = members.filter(member => {
                    const charName = member.character_name.replace('_', ' ');

                    if (filters.include_ranks && filters.include_ranks.length > 0 && !filters.include_ranks.includes(member.rank)) {
                        return false;
                    }
                    if (filters.exclude_ranks && filters.exclude_ranks.includes(member.rank)) {
                        return false;
                    }
                    if (filters.include_members && filters.include_members.length > 0 && !filters.include_members.some(name => charName.includes(name))) {
                        return false;
                    }
                    if (filters.exclude_members && filters.exclude_members.some(name => charName.includes(name))) {
                        return false;
                    }
                    return true;
                });
            } catch (e) {
                console.error(`[API Roster View] Invalid JSON in roster ${rosterId}:`, e);
                // Fail gracefully by returning unfiltered list
            }
        }


        // 4. Return combined and filtered data
        return NextResponse.json({
            roster: {
                id: roster.id,
                name: roster.name,
            },
            faction: {
                id: roster.faction.id,
                name: roster.faction.name,
            },
            members: members,
        });

    } catch (error) {
        console.error(`[API Roster View] Error fetching view data for roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
