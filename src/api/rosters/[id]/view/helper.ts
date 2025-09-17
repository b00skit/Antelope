
'use server';

import { db } from '@/db';
import { activityRosters, users, factionMembersCache, factionMembersAbasCache, forumApiCache, activityRosterAccess, factionOrganizationMembership, activityRosterLabels } from '@/db/schema';
import { and, eq, or, inArray } from 'drizzle-orm';
import config from '@config';
import type { IronSession } from 'iron-session';
import type { SessionData } from '@/lib/session';
import { processFactionMemberAlts } from '@/lib/faction-sync';

interface AbasData {
    character_id: number;
    abas: string;
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
    forum_groups?: number[];
    assignmentTitle?: string | null;
    label?: string | null;
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
    show_assignment_titles?: boolean;
    allow_roster_snapshots?: boolean;
    abas_standards?: {
        by_rank?: Record<string, number>;
        by_name?: Record<string, number>;
    };
    labels?: Record<string, string>;
}

async function fetchForumData(roster: any, filters: RosterFilters) {
    const includedUsernames = new Set<string>();
    const excludedUsernames = new Set<string>();
    const usernameToGroupsMap = new Map<string, number[]>();


    if (roster.faction.phpbb_api_url && roster.faction.phpbb_api_key) {
        const baseUrl = roster.faction.phpbb_api_url.endsWith('/') ? roster.faction.phpbb_api_url : `${roster.faction.phpbb_api_url}/`;
        const apiKey = roster.faction.phpbb_api_key;
        
        const allGroupIds = new Set([
            ...(filters.forum_groups_included || []),
            ...(filters.forum_groups_excluded || []),
            ...(roster.sections.flatMap((s: any) => s.configuration_json?.include_forum_groups || []))
        ]);

        if (allGroupIds.size > 0) {
            const groupPromises = Array.from(allGroupIds).map(async (groupId) => {
                try {
                    const url = `${baseUrl}app.php/booskit/phpbbapi/group/${groupId}?key=${apiKey}`;
                    const res = await fetch(url, { next: { revalidate: config.FORUM_API_REFRESH_MINUTES * 60 } });
                    if (!res.ok) {
                        console.warn(`[API Roster View] Failed to fetch forum group ${groupId}. Status: ${res.status}`);
                        return { groupId, members: [] };
                    }
                    const data = await res.json();
                    const allMembers = [
                        ...(data.group?.members.map((m: any) => m.username) || []),
                        ...(data.group?.leaders.map((l: any) => l.username) || [])
                    ];
                    return { groupId, members: allMembers };
                } catch (e) {
                    console.error(`[API Roster View] Error fetching forum group ${groupId}:`, e);
                    return { groupId, members: [] };
                }
            });

            const groupResults = await Promise.all(groupPromises);
            
            groupResults.forEach(result => {
                result.members.forEach((username: string) => {
                    const cleanUsername = username.replace('_', ' ');
                    if (!usernameToGroupsMap.has(cleanUsername)) {
                        usernameToGroupsMap.set(cleanUsername, []);
                    }
                    usernameToGroupsMap.get(cleanUsername)!.push(result.groupId);
                });
            });

            const groupUserMap = new Map(groupResults.map(r => [r.groupId, r.members]));
            
            (filters.forum_groups_included || []).forEach(gid => {
                groupUserMap.get(gid)?.forEach((username: string) => includedUsernames.add(username.replace('_', ' ')));
            });

            (filters.forum_groups_excluded || []).forEach(gid => {
                groupUserMap.get(gid)?.forEach((username: string) => excludedUsernames.add(username.replace('_', ' ')));
            });
        }
        
        if (filters.forum_users_included || filters.forum_users_excluded) {
            const userIds = new Set([...(filters.forum_users_included || []), ...(filters.forum_users_excluded || [])]);

            const userPromises = Array.from(userIds).map(async (userId) => {
                try {
                    const url = `${baseUrl}app.php/booskit/phpbbapi/user/${userId}?key=${apiKey}`;
                    const res = await fetch(url, { next: { revalidate: config.FORUM_API_REFRESH_MINUTES * 60 } });
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
    }
    
    return {
        includedUsernames: Array.from(includedUsernames),
        excludedUsernames: Array.from(excludedUsernames),
        usernameToGroupsMap,
    }
}

export async function getRosterViewData(rosterId: number, session: IronSession<SessionData>, forceSync = false) {
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId!),
    });

    if (!user || !user.selected_faction_id) {
        return { error: 'No active faction selected.' };
    }
    
    const roster = await db.query.activityRosters.findFirst({
        where: and(
            eq(activityRosters.id, rosterId),
            eq(activityRosters.factionId, user.selected_faction_id)
        ),
        with: {
            faction: true,
            forumCache: true,
            sections: true,
            labels: true,
        }
    });

    if (!roster) {
        return { error: 'Roster not found.' };
    }

    // --- ACCESS CONTROL ---
    let hasAccess = false;
    if (roster.visibility === 'public' || roster.visibility === 'unlisted') {
        hasAccess = true;
    } else if (roster.created_by === session.userId) {
         hasAccess = true;
    }

    if (roster.visibility === 'private' && !hasAccess) {
        const accessRecord = await db.query.activityRosterAccess.findFirst({
            where: and(
                eq(activityRosterAccess.activity_roster_id, rosterId),
                eq(activityRosterAccess.user_id, session.userId)
            )
        });
        if (accessRecord) {
            hasAccess = true;
        } else {
            return { error: 'Password required', requiresPassword: true };
        }
    }

    if (!hasAccess) {
         return { error: 'You do not have permission to view this roster.' };
    }


    const factionId = roster.factionId;
    const now = new Date();
    const factionRefreshThreshold = now.getTime() - config.GTAW_API_REFRESH_MINUTES_FACTIONS * 60 * 1000;
    const abasRefreshThreshold = now.getTime() - config.GTAW_API_REFRESH_MINUTES_ABAS * 60 * 1000;
    const membersRefreshThreshold = Math.min(factionRefreshThreshold, abasRefreshThreshold);
    const forumRefreshThreshold = now.getTime() - config.FORUM_API_REFRESH_MINUTES * 60 * 1000;
    
    let members: Member[] = [];
    const cachedFaction = await db.query.factionMembersCache.findFirst({
        where: eq(factionMembersCache.faction_id, factionId)
    });

    if (forceSync || !cachedFaction || !cachedFaction.last_sync_timestamp || new Date(cachedFaction.last_sync_timestamp).getTime() < membersRefreshThreshold) {
        const [factionApiResponse, abasApiResponse] = await Promise.all([
             fetch(`https://ucp.gta.world/api/faction/${factionId}`, {
                headers: {
                    Authorization: `Bearer ${session.gtaw_access_token}`,
                    'Accept': 'application/json',
                },
            }),
            fetch(`https://ucp.gta.world/api/faction/${factionId}/abas`, {
                 headers: {
                    Authorization: `Bearer ${session.gtaw_access_token}`,
                    'Accept': 'application/json',
                },
            })
        ]);
        
        if (!factionApiResponse.ok) {
            const errorBody = await factionApiResponse.text();
            console.error(`[API Roster View] Failed to fetch GTA:W faction data for faction ${factionId}:`, errorBody);
            if (factionApiResponse.status === 401) {
                return { error: 'Your session has expired. Please log in again.', reauth: true };
            }
            return { error: 'Failed to fetch roster data from GTA:World API.' };
        }
        
        const gtawFactionData = await factionApiResponse.json();
        members = gtawFactionData.data.members;

        await db.insert(factionMembersCache)
            .values({ faction_id: factionId, members: members, last_sync_timestamp: now })
            .onConflictDoUpdate({ target: factionMembersCache.faction_id, set: { members: members, last_sync_timestamp: now } });

        await processFactionMemberAlts(factionId, members);
        
        if (abasApiResponse.ok) {
            const abasData = await abasApiResponse.json();
            const abasValues: AbasData[] = abasData.data;

            for (const abasEntry of abasValues) {
                await db.insert(factionMembersAbasCache)
                    .values({
                        character_id: abasEntry.character_id,
                        faction_id: factionId,
                        abas: abasEntry.abas,
                        last_sync_timestamp: now,
                    })
                    .onConflictDoUpdate({
                        target: [factionMembersAbasCache.character_id, factionMembersAbasCache.faction_id],
                        set: {
                            abas: abasEntry.abas,
                            last_sync_timestamp: now,
                        }
                    });
            }
        } else {
             console.warn(`[API Roster View] Failed to fetch ABAS data for faction ${factionId}. Status: ${abasApiResponse.status}`);
        }

    } else {
        members = cachedFaction.members || [];
    }

    const memberIds = members.map(m => m.character_id);
    if (memberIds.length > 0) {
        const [abasCache, labels] = await Promise.all([
            db.query.factionMembersAbasCache.findMany({
                where: and(
                    eq(factionMembersAbasCache.faction_id, factionId),
                    inArray(factionMembersAbasCache.character_id, memberIds)
                )
            }),
            db.query.activityRosterLabels.findMany({
                where: and(
                    eq(activityRosterLabels.activity_roster_id, rosterId),
                    inArray(activityRosterLabels.character_id, memberIds)
                )
            })
        ]);

        const abasMap = new Map(abasCache.map(a => [a.character_id, { abas: a.abas, last_sync: a.last_sync_timestamp, total_abas: a.total_abas }]));
        const labelMap = new Map(labels.map(l => [l.character_id, l.color]));

        members = members.map(member => ({
            ...member,
            abas: abasMap.get(member.character_id)?.abas,
            abas_last_sync: abasMap.get(member.character_id)?.last_sync,
            total_abas: abasMap.get(member.character_id)?.total_abas,
            label: labelMap.get(member.character_id),
        }));
    }

    let missingForumUsers: string[] = [];
    let includedUsernames = new Set<string>();
    let excludedUsernames = new Set<string>();
    let rosterConfig: RosterFilters = {};
    let usernameToGroupsMap = new Map<string, number[]>();
    let showAssignmentTitles = false;
    let canEdit = roster.created_by === session.userId || roster.access_json?.includes(session.userId!);
    let canCreateSnapshot = false;

    if (roster.roster_setup_json) {
        try {
            const filters: RosterFilters = JSON.parse(roster.roster_setup_json);
            rosterConfig = filters;
            showAssignmentTitles = !!(roster.faction.feature_flags?.units_divisions_enabled && filters.show_assignment_titles);
            canCreateSnapshot = canEdit && !!filters.allow_roster_snapshots;
            
            const isForumFilterActive = filters.forum_groups_included?.length || filters.forum_groups_excluded?.length || filters.forum_users_included?.length || filters.forum_users_excluded?.length || roster.sections.some(s => s.configuration_json?.include_forum_groups?.length);

            if (isForumFilterActive) {
                const cachedForumData = roster.forumCache;
                if (forceSync || !cachedForumData || !cachedForumData.last_sync_timestamp || new Date(cachedForumData.last_sync_timestamp).getTime() < forumRefreshThreshold) {
                    const forumData = await fetchForumData(roster, filters);

                    await db.insert(forumApiCache).values({
                        activity_roster_id: rosterId,
                        data: forumData,
                        last_sync_timestamp: now,
                    }).onConflictDoUpdate({
                        target: forumApiCache.activity_roster_id,
                        set: { data: forumData, last_sync_timestamp: now },
                    });
                    
                    includedUsernames = new Set(forumData.includedUsernames);
                    excludedUsernames = new Set(forumData.excludedUsernames);
                    usernameToGroupsMap = forumData.usernameToGroupsMap;
                } else if (cachedForumData.data) {
                    includedUsernames = new Set(cachedForumData.data.includedUsernames);
                    excludedUsernames = new Set(cachedForumData.data.excludedUsernames);
                    usernameToGroupsMap = new Map(Object.entries(cachedForumData.data.usernameToGroupsMap || {}));
                }
            }
            
            members = members.map(m => ({ ...m, forum_groups: usernameToGroupsMap.get(m.character_name.replace('_', ' ')) || [] }));
            
            if (filters.alert_forum_users_missing && isForumFilterActive) {
                const gtawUsernames = new Set(members.map(m => m.character_name.replace('_', ' ')));
                const finalIncluded = new Set([...includedUsernames].filter(u => !excludedUsernames.has(u)));
                missingForumUsers = [...finalIncluded].filter(fu => !gtawUsernames.has(fu));
            }

            members = members.filter(member => {
                const charName = member.character_name.replace('_', ' ');

                if (filters.include_ranks && filters.include_ranks.length > 0 && !filters.include_ranks.includes(member.rank)) return false;
                if (filters.exclude_ranks && filters.exclude_ranks.includes(member.rank)) return false;
                if (filters.include_members && filters.include_members.length > 0 && !filters.include_members.some(name => charName.includes(name))) return false;
                if (filters.exclude_members && filters.exclude_members.some(name => charName.includes(name))) return false;

                if (isForumFilterActive) {
                    if (excludedUsernames.has(charName)) return false;
                    if (includedUsernames.size > 0 && !includedUsernames.has(charName)) return false;
                }

                return true;
            });
        } catch (e) {
            console.error(`[API Roster View] Invalid JSON in roster ${rosterId}:`, e);
        }
    }

    if (showAssignmentTitles && memberIds.length > 0) {
        const assignments = await db.query.factionOrganizationMembership.findMany({
            where: and(
                inArray(factionOrganizationMembership.character_id, memberIds),
                eq(factionOrganizationMembership.secondary, false)
            )
        });
        const assignmentMap = new Map(assignments.map(a => [a.character_id, a.title]));
        members = members.map(m => ({ ...m, assignmentTitle: assignmentMap.get(m.character_id) }));
    }

    return {
        roster: { id: roster.id, name: roster.name, isPrivate: roster.visibility === 'private' },
        faction: { id: roster.faction.id, name: roster.faction.name, features: roster.faction.feature_flags, supervisor_rank: roster.faction.supervisor_rank, minimum_abas: roster.faction.minimum_abas, minimum_supervisor_abas: roster.faction.minimum_supervisor_abas },
        members: Array.from(new Map(members.map(item => [item['character_id'], item])).values()),
        missingForumUsers: missingForumUsers,
        sections: (roster.sections || []).map(s => ({
            id: s.id,
            name: s.name,
            description: s.description,
            character_ids_json: s.character_ids_json || [],
            order: s.order ?? 0,
            configuration_json: s.configuration_json,
        })).sort((a, b) => a.order - b.order),
        rosterConfig,
        canEdit,
        canCreateSnapshot,
    };
}
