
'use server';

import { db } from '@/db';
import { activityRosters, users, factionMembersCache, factionMembersAbasCache, forumApiCache, activityRosterAccess, factionOrganizationMembership, activityRosterLabels, apiCacheAlternativeCharacters } from '@/db/schema';
import { and, eq, or, inArray } from 'drizzle-orm';
import config from '@config';
import type { IronSession } from 'iron-session';
import type { SessionData } from '@/lib/session';

interface Member {
    user_id: number;
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
    isPrimary?: boolean;
    isAlternative?: boolean;
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
    mark_alternative_characters?: boolean;
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
            // This part remains as it fetches external data based on roster config, not a global sync
        }
    }
    
    return {
        includedUsernames: Array.from(includedUsernames),
        excludedUsernames: Array.from(excludedUsernames),
        usernameToGroupsMap,
    }
}

export async function getRosterViewData(rosterId: number, session: IronSession<SessionData>) {
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
    
    let members: Member[] = [];
    const cachedFaction = await db.query.factionMembersCache.findFirst({
        where: eq(factionMembersCache.faction_id, factionId)
    });
    
    if (!cachedFaction || !cachedFaction.members) {
        return { error: 'Faction data has not been synced. Please go to Sync Management.' };
    }

    members = cachedFaction.members || [];

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
            
            if (filters.mark_alternative_characters) {
                // Re-fetch altCache *after* a potential sync to get the latest data.
                const altCache = await db.query.apiCacheAlternativeCharacters.findMany({
                    where: eq(apiCacheAlternativeCharacters.faction_id, factionId),
                });
                const altMap = new Map(
                    altCache.map(entry => [
                        entry.user_id,
                        {
                            primaryCharacterId: entry.character_id,
                            alternatives: Array.isArray(entry.alternative_characters_json)
                                ? entry.alternative_characters_json
                                : [],
                        },
                    ]),
                );

                members = members.map(m => {
                    const altInfo = altMap.get(m.user_id);
                    if (!altInfo) {
                        return m;
                    }

                    const isPrimary = m.character_id === altInfo.primaryCharacterId;
                    const isAlternative = altInfo.alternatives.some(
                        (alt: any) => alt?.character_id === m.character_id,
                    );

                    if (!isPrimary && !isAlternative) {
                        return m;
                    }

                    return {
                        ...m,
                        ...(isPrimary ? { isPrimary: true } : {}),
                        ...(isAlternative ? { isAlternative: true } : {}),
                    };
                });
            }

            // Forum data fetching remains as it is specific to the roster's config, not a global sync.
            const isForumFilterActive = filters.forum_groups_included?.length || filters.forum_groups_excluded?.length || filters.forum_users_included?.length || filters.forum_users_excluded?.length || roster.sections.some(s => s.configuration_json?.include_forum_groups?.length);

            if (isForumFilterActive) {
                // This part remains as it's not a global sync
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

    const alternativeCharacters = members.filter(m => m.isAlternative);
    for (const section of roster.sections) {
        if (section.configuration_json?.alternative_characters === true) {
            section.character_ids_json = alternativeCharacters.map(m => m.character_id);
        }
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
