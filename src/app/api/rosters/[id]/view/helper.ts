
'use server';

import { db } from '@/db';
import {
    activityRosters,
    users,
    factionMembersCache,
    factionMembersAbasCache,
    activityRosterAccess,
    factionOrganizationMembership,
    activityRosterLabels,
    apiCacheAlternativeCharacters,
    forumApiCache,
    factionMembers,
    factionOrganizationCat2,
    factionOrganizationCat3,
} from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import type { IronSession } from 'iron-session';
import type { SessionData } from '@/lib/session';
import { canUserManage } from '@/app/api/units-divisions/[cat1Id]/[cat2Id]/helpers';

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
    membershipId?: number;
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

export async function getRosterViewData(
    rosterId: number,
    session: IronSession<SessionData>,
    _forceSync = false,
) {
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId!),
    });

    if (!user || !user.selected_faction_id) {
        return { error: 'No active faction selected.' };
    }

    const roster = await db.query.activityRosters.findFirst({
        where: and(
            eq(activityRosters.id, rosterId),
            eq(activityRosters.factionId, user.selected_faction_id),
        ),
        with: {
            faction: true,
            sections: true,
        },
    });

    if (!roster) {
        return { error: 'Roster not found.' };
    }

    let hasAccess = false;
    if (roster.visibility === 'public' || roster.visibility === 'unlisted' || roster.visibility === 'organization') {
        hasAccess = true;
    } else if (roster.created_by === session.userId) {
        hasAccess = true;
    }

    if (roster.visibility === 'private' && !hasAccess) {
        const accessRecord = await db.query.activityRosterAccess.findFirst({
            where: and(
                eq(activityRosterAccess.activity_roster_id, rosterId),
                eq(activityRosterAccess.user_id, session.userId),
            ),
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
    
    let canEdit = false;
    if (roster.visibility === 'organization' && roster.organization_category_type && roster.organization_category_id) {
        const userMembership = await db.query.factionMembers.findFirst({
            where: and(eq(factionMembers.userId, session.userId!), eq(factionMembers.factionId, roster.factionId))
        });
        if (userMembership) {
            const result = await canUserManage(session, user, userMembership, roster.faction, roster.organization_category_type, roster.organization_category_id);
            canEdit = result.authorized;
        }
    } else {
        canEdit = roster.created_by === session.userId || (roster.access_json && Array.isArray(roster.access_json) && roster.access_json.includes(session.userId!));
    }


    const factionId = roster.factionId;
    let members: Member[] = [];
    let orgMemberships: { character_id: number; id: number, title: string | null }[] = [];

    const rosterOrgType = roster.organization_category_type;
    const rosterOrgId = roster.organization_category_id;

    let organizationInfo: { type: 'cat_2' | 'cat_3'; id: number; parentId?: number } | undefined;
    if (rosterOrgType && rosterOrgId) {
        organizationInfo = { type: rosterOrgType, id: rosterOrgId };

        if (rosterOrgType === 'cat_2') {
            const cat2 = await db.query.factionOrganizationCat2.findFirst({
                where: eq(factionOrganizationCat2.id, rosterOrgId),
            });
            if (cat2?.cat1_id) {
                organizationInfo.parentId = cat2.cat1_id;
            }
        } else if (rosterOrgType === 'cat_3') {
            const cat3 = await db.query.factionOrganizationCat3.findFirst({
                where: eq(factionOrganizationCat3.id, rosterOrgId),
            });
            if (cat3?.cat2_id) {
                organizationInfo.parentId = cat3.cat2_id;
            }
        }
    }

    if (rosterOrgType && rosterOrgId) {
        orgMemberships = await db.query.factionOrganizationMembership.findMany({
            where: and(
                eq(factionOrganizationMembership.type, rosterOrgType),
                eq(factionOrganizationMembership.category_id, rosterOrgId)
            ),
            columns: {
                id: true,
                character_id: true,
                title: true,
            }
        });
        const orgMemberIds = orgMemberships.map(m => m.character_id);

        if (orgMemberIds.length > 0) {
            const cachedFaction = await db.query.factionMembersCache.findFirst({
                where: eq(factionMembersCache.faction_id, factionId),
            });
            if (!cachedFaction?.members) {
                return { error: 'Faction member data not available.' };
            }
            const allFactionMembers: Member[] = cachedFaction.members;
            members = allFactionMembers.filter(m => orgMemberIds.includes(m.character_id));
        }
    } else {
        const cachedFaction = await db.query.factionMembersCache.findFirst({
            where: eq(factionMembersCache.faction_id, factionId),
        });
        if (!cachedFaction?.members || cachedFaction.members.length === 0) {
            return { error: 'Faction data has not been synced. Please go to Sync Management.' };
        }
        members = cachedFaction.members || [];
    }

    const memberIds = members.map(m => m.character_id);
    if (memberIds.length > 0) {
        const [abasCache, labels] = await Promise.all([
            db.query.factionMembersAbasCache.findMany({
                where: and(
                    eq(factionMembersAbasCache.faction_id, factionId),
                    inArray(factionMembersAbasCache.character_id, memberIds),
                ),
            }),
            db.query.activityRosterLabels.findMany({
                where: and(
                    eq(activityRosterLabels.activity_roster_id, rosterId),
                    inArray(activityRosterLabels.character_id, memberIds),
                ),
            }),
        ]);

        const abasMap = new Map(
            abasCache.map(a => [a.character_id, { abas: a.abas, last_sync: a.last_sync_timestamp, total_abas: a.total_abas }]),
        );
        const labelMap = new Map(labels.map(l => [l.character_id, l.color]));
        const orgMembershipMap = new Map(orgMemberships.map(m => [m.character_id, m]));


        members = members.map(member => ({
            ...member,
            abas: abasMap.get(member.character_id)?.abas,
            abas_last_sync: abasMap.get(member.character_id)?.last_sync,
            total_abas: abasMap.get(member.character_id)?.total_abas,
            label: labelMap.get(member.character_id),
            membershipId: orgMembershipMap.get(member.character_id)?.id,
            assignmentTitle: orgMembershipMap.get(member.character_id)?.title ?? member.assignmentTitle,
        }));
    }

    let missingForumUsers: string[] = [];
    let includedUsernames = new Set<string>();
    let excludedUsernames = new Set<string>();
    let rosterConfig: RosterFilters = {};
    let usernameToGroupsMap = new Map<string, number[]>();
    let showAssignmentTitles = false;
    let canCreateSnapshot = false;

    if (roster.roster_setup_json) {
        try {
            const filters: RosterFilters = JSON.parse(roster.roster_setup_json);
            rosterConfig = filters;
            showAssignmentTitles = !!(
                roster.faction.feature_flags?.units_divisions_enabled && filters.show_assignment_titles
            );
            canCreateSnapshot = canEdit && !!filters.allow_roster_snapshots;

            if (filters.mark_alternative_characters) {
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

            const sectionGroupIds = roster.sections
                .flatMap(section => section.configuration_json?.include_forum_groups || [])
                .filter((groupId): groupId is number => typeof groupId === 'number');

            const isForumFilterActive =
                filters.forum_groups_included?.length ||
                filters.forum_groups_excluded?.length ||
                filters.forum_users_included?.length ||
                filters.forum_users_excluded?.length ||
                sectionGroupIds.length > 0;

            if (isForumFilterActive) {
                const groupIdSet = new Set<number>([
                    ...(filters.forum_groups_included || []),
                    ...(filters.forum_groups_excluded || []),
                    ...sectionGroupIds,
                ]);

                const relevantGroupIds = [...groupIdSet];

                let cachedForumGroups: { group_id: number; data: any }[] = [];
                if (relevantGroupIds.length > 0) {
                    cachedForumGroups = await db.query.forumApiCache.findMany({
                        where: and(
                            eq(forumApiCache.faction_id, factionId),
                            inArray(forumApiCache.group_id, relevantGroupIds),
                        ),
                    });

                    if (cachedForumGroups.length !== relevantGroupIds.length) {
                        return { error: 'Forum data has not been synced for all required groups. Please go to Sync Management.' };
                    }
                }

                const groupMembersMap = new Map<number, { id: number; username: string }[]>();
                const userIdToUsername = new Map<number, string>();

                for (const group of cachedForumGroups) {
                    const members = Array.isArray(group.data?.members) ? group.data.members : [];
                    groupMembersMap.set(group.group_id, members);

                    for (const member of members) {
                        if (!member?.username) continue;
                        const cleanUsername = member.username.replace('_', ' ');
                        if (!usernameToGroupsMap.has(cleanUsername)) {
                            usernameToGroupsMap.set(cleanUsername, []);
                        }
                        const groups = usernameToGroupsMap.get(cleanUsername)!;
                        if (!groups.includes(group.group_id)) {
                            groups.push(group.group_id);
                        }

                        if (typeof member.id === 'number' && !userIdToUsername.has(member.id)) {
                            userIdToUsername.set(member.id, cleanUsername);
                        }
                    }
                }

                includedUsernames = new Set(
                    (filters.forum_groups_included || [])
                        .flatMap(groupId => groupMembersMap.get(groupId) || [])
                        .map(member => member.username.replace('_', ' ')),
                );

                excludedUsernames = new Set(
                    (filters.forum_groups_excluded || [])
                        .flatMap(groupId => groupMembersMap.get(groupId) || [])
                        .map(member => member.username.replace('_', ' ')),
                );

                for (const userId of filters.forum_users_included || []) {
                    const username = userIdToUsername.get(userId);
                    if (username) {
                        includedUsernames.add(username);
                    }
                }

                for (const userId of filters.forum_users_excluded || []) {
                    const username = userIdToUsername.get(userId);
                    if (username) {
                        excludedUsernames.add(username);
                    }
                }
            }

            members = members.map(m => ({
                ...m,
                forum_groups: usernameToGroupsMap.get(m.character_name.replace('_', ' ')) || [],
            }));

            if (filters.alert_forum_users_missing && isForumFilterActive) {
                const gtawUsernames = new Set(members.map(m => m.character_name.replace('_', ' ')));
                const finalIncluded = new Set([...includedUsernames].filter(u => !excludedUsernames.has(u)));
                missingForumUsers = [...finalIncluded].filter(fu => !gtawUsernames.has(fu));
            }

            members = members.filter(member => {
                const charName = member.character_name.replace('_', ' ');

                if (filters.include_ranks && filters.include_ranks.length > 0 && !filters.include_ranks.includes(member.rank)) {
                    return false;
                }
                if (filters.exclude_ranks && filters.exclude_ranks.includes(member.rank)) {
                    return false;
                }
                if (
                    filters.include_members &&
                    filters.include_members.length > 0 &&
                    !filters.include_members.some(name => charName.includes(name))
                ) {
                    return false;
                }
                if (filters.exclude_members && filters.exclude_members.some(name => charName.includes(name))) {
                    return false;
                }

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

    if (showAssignmentTitles && memberIds.length > 0 && !rosterOrgType) {
        const assignments = await db.query.factionOrganizationMembership.findMany({
            where: and(
                inArray(factionOrganizationMembership.character_id, memberIds),
                eq(factionOrganizationMembership.secondary, false),
            ),
        });
        const assignmentMap = new Map(assignments.map(a => [a.character_id, a.title]));
        members = members.map(m => ({ ...m, assignmentTitle: assignmentMap.get(m.character_id) }));
    }

    const alternativeCharacterIds = members.filter(m => m.isAlternative).map(m => m.character_id);

    return {
        roster: {
            id: roster.id,
            name: roster.name,
            isPrivate: roster.visibility === 'private',
            isOrganizational: roster.visibility === 'organization',
            organizationInfo,
        },
        faction: {
            id: roster.faction.id,
            name: roster.faction.name,
            features: roster.faction.feature_flags,
            supervisor_rank: roster.faction.supervisor_rank,
            minimum_abas: roster.faction.minimum_abas,
            minimum_supervisor_abas: roster.faction.minimum_supervisor_abas,
        },
        members: Array.from(new Map(members.map(item => [item['character_id'], item])).values()),
        missingForumUsers,
        sections: (roster.sections || [])
            .map(section => ({
                id: section.id,
                name: section.name,
                description: section.description,
                character_ids_json:
                    section.configuration_json?.alternative_characters === true
                        ? alternativeCharacterIds
                        : section.character_ids_json || [],
                order: section.order ?? 0,
                configuration_json: section.configuration_json,
            }))
            .sort((a, b) => a.order - b.order),
        rosterConfig,
        canEdit,
        canCreateSnapshot,
    };
}
