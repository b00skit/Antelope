
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { activityRosters, users, factionMembersCache, factionMembersAbasCache } from '@/db/schema';
import { and, eq, or, inArray } from 'drizzle-orm';

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
    abas?: string | null;
    abas_last_sync?: Date | null;
    total_abas?: number | null;
}

interface RosterFilters {
    include_ranks?: number[];
    exclude_ranks?: number[];
    include_members?: string[];
    exclude_members?: string[];
    forum_groups_included?: number[];
    forum_groups_excluded?: number[];
    forum_users_included?: number[];
    forum_users_excluded?: number[];
    alert_forum_users_missing?: boolean;
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

        // 3. Augment with ABAS data
        const memberIds = members.map(m => m.character_id);
        if (memberIds.length > 0) {
            const abasCache = await db.query.factionMembersAbasCache.findMany({
                where: and(
                    eq(factionMembersAbasCache.faction_id, factionId),
                    inArray(factionMembersAbasCache.character_id, memberIds)
                )
            });

            const abasMap = new Map(abasCache.map(a => [a.character_id, { abas: a.abas, last_sync: a.last_sync_timestamp, total_abas: a.total_abas }]));

            members = members.map(member => ({
                ...member,
                abas: abasMap.get(member.character_id)?.abas,
                abas_last_sync: abasMap.get(member.character_id)?.last_sync,
                total_abas: abasMap.get(member.character_id)?.total_abas,
            }));
        }

        let missingForumUsers: string[] = [];
        // 4. Apply JSON filters if they exist
        if (roster.roster_setup_json) {
            try {
                const filters: RosterFilters = JSON.parse(roster.roster_setup_json);
                let isForumFilterActive = false;
                const includedUsernames = new Set<string>();
                const excludedUsernames = new Set<string>();

                // Forum Integration Logic
                if (roster.faction.phpbb_api_url && roster.faction.phpbb_api_key) {
                    const baseUrl = roster.faction.phpbb_api_url.endsWith('/') ? roster.faction.phpbb_api_url : `${roster.faction.phpbb_api_url}/`;
                    const apiKey = roster.faction.phpbb_api_key;

                    // Fetch Group Members
                    if (filters.forum_groups_included || filters.forum_groups_excluded) {
                        isForumFilterActive = true;
                        const groupIds = new Set([...(filters.forum_groups_included || []), ...(filters.forum_groups_excluded || [])]);
                        
                        const groupPromises = Array.from(groupIds).map(async (groupId) => {
                            try {
                                const url = `${baseUrl}app.php/booskit/phpbbapi/group/${groupId}?key=${apiKey}`;
                                const res = await fetch(url);
                                if (!res.ok) {
                                    console.warn(`[API Roster View] Failed to fetch forum group ${groupId}. Status: ${res.status}`);
                                    return { groupId, members: [] };
                                }
                                const data = await res.json();
                                const groupMembers = data.group?.members.map((m: any) => m.username) || [];
                                const groupLeaders = data.group?.leaders.map((l: any) => l.username) || [];
                                return { groupId, members: [...groupMembers, ...groupLeaders] };
                            } catch (e) {
                                console.error(`[API Roster View] Error fetching forum group ${groupId}:`, e);
                                return { groupId, members: [] };
                            }
                        });

                        const groupResults = await Promise.all(groupPromises);
                        const groupUserMap = new Map(groupResults.map(r => [r.groupId, r.members]));
                        
                        (filters.forum_groups_included || []).forEach(gid => {
                            groupUserMap.get(gid)?.forEach((username: string) => includedUsernames.add(username.replace('_', ' ')));
                        });

                        (filters.forum_groups_excluded || []).forEach(gid => {
                            groupUserMap.get(gid)?.forEach((username: string) => excludedUsernames.add(username.replace('_', ' ')));
                        });
                    }
                    
                    // Fetch Individual Users
                    if (filters.forum_users_included || filters.forum_users_excluded) {
                        isForumFilterActive = true;
                        const userIds = new Set([...(filters.forum_users_included || []), ...(filters.forum_users_excluded || [])]);

                        const userPromises = Array.from(userIds).map(async (userId) => {
                            try {
                                const url = `${baseUrl}app.php/booskit/phpbbapi/user/${userId}?key=${apiKey}`;
                                const res = await fetch(url);
                                if (!res.ok) {
                                    console.warn(`[API Roster View] Failed to fetch forum user ${userId}. Status: ${res.status}`);
                                    return null;
                                }
                                const data = await res.json();
                                return data.user?.username;
                            } catch(e) {
                                console.error(`[API Roster View] Error fetching forum user ${userId}:`, e);
                                return null;
                            }
                        });
                        
                        const usernames = await Promise.all(userPromises);
                        const userIdToUsernameMap = new Map(Array.from(userIds).map((id, index) => [id, usernames[index]]));

                        (filters.forum_users_included || []).forEach(uid => {
                            const username = userIdToUsernameMap.get(uid);
                            if (username) includedUsernames.add(username.replace('_', ' '));
                        });

                        (filters.forum_users_excluded || []).forEach(uid => {
                            const username = userIdToUsernameMap.get(uid);
                            if (username) excludedUsernames.add(username.replace('_', ' '));
                        });
                    }

                    if (filters.alert_forum_users_missing && isForumFilterActive) {
                        const gtawUsernames = new Set(members.map(m => m.character_name.replace('_', ' ')));
                        const finalIncluded = new Set([...includedUsernames].filter(u => !excludedUsernames.has(u)));
                        missingForumUsers = [...finalIncluded].filter(fu => !gtawUsernames.has(fu));
                    }
                }
                
                members = members.filter(member => {
                    const charName = member.character_name.replace('_', ' ');

                    // Basic Filters
                    if (filters.include_ranks && filters.include_ranks.length > 0 && !filters.include_ranks.includes(member.rank)) return false;
                    if (filters.exclude_ranks && filters.exclude_ranks.includes(member.rank)) return false;
                    if (filters.include_members && filters.include_members.length > 0 && !filters.include_members.some(name => charName.includes(name))) return false;
                    if (filters.exclude_members && filters.exclude_members.some(name => charName.includes(name))) return false;

                    // Forum Filters
                    if (isForumFilterActive) {
                        const isExcluded = excludedUsernames.has(charName);
                        if (isExcluded) return false;

                        if (includedUsernames.size > 0 && !includedUsernames.has(charName)) {
                            return false;
                        }
                    }

                    return true;
                });
            } catch (e) {
                console.error(`[API Roster View] Invalid JSON in roster ${rosterId}:`, e);
                // Fail gracefully by returning unfiltered list
            }
        }


        // 5. Return combined and filtered data
        return NextResponse.json({
            roster: {
                id: roster.id,
                name: roster.name,
            },
            faction: {
                id: roster.faction.id,
                name: roster.faction.name,
                features: roster.faction.feature_flags,
            },
            members: Array.from(new Map(members.map(item => [item['character_id'], item])).values()),
            missingForumUsers: missingForumUsers
        });

    } catch (error) {
        console.error(`[API Roster View] Error fetching view data for roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
