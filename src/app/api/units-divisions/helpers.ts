'use server';

import { db } from '@/db';
import {
    users,
    factionMembers,
    factionMembersCache,
    forumApiCache,
    factionOrganizationCat2,
    factionOrganizationCat3,
    factionOrganizationMembership,
} from '@/db/schema';
import { and, asc, eq, inArray, or } from 'drizzle-orm';
import type { IronSession } from 'iron-session';
import type { SessionData } from '@/lib/session';
import { canUserManage } from './[cat1Id]/[cat2Id]/helpers';

type CategoryType = 'cat_2' | 'cat_3';

interface FormattedMember {
    id: number;
    character_id: number;
    character_name: string;
    rank_name: string;
    title: string | null;
    created_at: string;
    creator: { username: string };
    secondary: boolean;
    manual: boolean;
}

interface UnitsAndDetailsOption {
    label: string;
    value: string;
    type: 'cat_2' | 'cat_3';
}

function formatMembers(
    memberships: (typeof factionOrganizationMembership.$inferSelect & {
        creator: { username: string } | null;
    })[],
    rosterMembers: Map<number, any>,
): FormattedMember[] {
    return memberships.map(member => {
        const rosterData = rosterMembers.get(member.character_id) ?? {};
        const characterName = typeof rosterData.character_name === 'string'
            ? rosterData.character_name
            : `ID: ${member.character_id}`;
        const rankName = typeof rosterData.rank_name === 'string'
            ? rosterData.rank_name
            : rosterData.rank ?? 'Unknown';

        return {
            id: member.id,
            character_id: member.character_id,
            character_name: characterName,
            rank_name: rankName,
            title: member.title ?? null,
            created_at: (member.created_at instanceof Date ? member.created_at.toISOString() : new Date(member.created_at ?? Date.now()).toISOString()),
            creator: {
                username: member.creator?.username ?? 'System',
            },
            secondary: member.secondary ?? false,
            manual: member.manual ?? false,
        };
    });
}

function buildUnitsAndDetails(allCat2s: (typeof factionOrganizationCat2.$inferSelect & {
    cat1: { id: number; name: string } | null;
    cat3s: { id: number; name: string }[];
})[]): UnitsAndDetailsOption[] {
    const options: UnitsAndDetailsOption[] = [];

    for (const cat2 of allCat2s) {
        const cat1Name = cat2.cat1?.name ?? 'Division';
        options.push({
            label: `${cat1Name} - ${cat2.name}`,
            value: String(cat2.id),
            type: 'cat_2',
        });

        for (const cat3 of cat2.cat3s ?? []) {
            options.push({
                label: `${cat1Name} - ${cat2.name} / ${cat3.name}`,
                value: String(cat3.id),
                type: 'cat_3',
            });
        }
    }

    return options;
}

function computeMissingForumUsers(
    forumGroupId: number | null | undefined,
    factionId: number,
    rosterByName: Set<string>,
) {
    if (!forumGroupId) {
        return [] as string[];
    }
    return db.query.forumApiCache
        .findFirst({
            where: and(
                eq(forumApiCache.faction_id, factionId),
                eq(forumApiCache.group_id, forumGroupId),
            ),
        })
        .then(cache => {
            if (!cache?.data) return [] as string[];
            const members = Array.isArray((cache.data as any)?.members)
                ? (cache.data as any).members
                : [];
            const leaders = Array.isArray((cache.data as any)?.leaders)
                ? (cache.data as any).leaders
                : [];
            const usernames = [...members, ...leaders]
                .map((entry: any) => (typeof entry?.username === 'string' ? entry.username.replace(/_/g, ' ') : null))
                .filter((name): name is string => !!name);
            return usernames.filter(name => !rosterByName.has(name.toLowerCase()));
        });
}

export async function getCatViewData(
    session: IronSession<SessionData>,
    categoryType: CategoryType,
    categoryId: number,
) {
    if (!session?.isLoggedIn || !session.userId) {
        return { error: 'Unauthorized' } as const;
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        with: { selectedFaction: true },
    });

    if (!user?.selectedFaction?.id) {
        return { error: 'No active faction selected.' } as const;
    }

    const factionId = user.selectedFaction.id;

    const membership = await db.query.factionMembers.findFirst({
        where: and(
            eq(factionMembers.userId, session.userId),
            eq(factionMembers.factionId, factionId),
        ),
    });

    if (!membership) {
        return { error: 'You are not a member of this faction.' } as const;
    }

    const [factionCache, factionUserRecords, allCat2s] = await Promise.all([
        db.query.factionMembersCache.findFirst({
            where: eq(factionMembersCache.faction_id, factionId),
        }),
        db.query.factionMembers.findMany({
            where: and(
                eq(factionMembers.factionId, factionId),
                eq(factionMembers.joined, true),
            ),
            with: {
                user: {
                    columns: {
                        id: true,
                        username: true,
                    },
                },
            },
        }),
        db.query.factionOrganizationCat2.findMany({
            where: eq(factionOrganizationCat2.faction_id, factionId),
            with: {
                cat1: {
                    columns: {
                        id: true,
                        name: true,
                    },
                },
                cat3s: {
                    columns: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: [asc(factionOrganizationCat2.name)],
        }),
    ]);

    const rosterMembersArray = Array.isArray(factionCache?.members) ? factionCache!.members : [];
    const rosterById = new Map<number, any>();
    const rosterNameSet = new Set<string>();
    for (const entry of rosterMembersArray as any[]) {
        if (entry && typeof entry.character_id === 'number') {
            rosterById.set(entry.character_id, entry);
        }
        if (entry && typeof entry.character_name === 'string') {
            rosterNameSet.add(entry.character_name.toLowerCase());
        }
    }

    const allFactionMembers = (rosterMembersArray as any[]).map(member => ({
        ...member,
        manual: member?.manual ?? true,
    }));

    const factionUsersList = factionUserRecords
        .map(record => record.user)
        .filter((u): u is { id: number; username: string } => !!u);

    const allUnitsAndDetails = buildUnitsAndDetails(allCat2s.map(cat2 => ({
        ...cat2,
        cat3s: cat2.cat3s ?? [],
    })));

    if (categoryType === 'cat_2') {
        const unit = await db.query.factionOrganizationCat2.findFirst({
            where: and(
                eq(factionOrganizationCat2.id, categoryId),
                eq(factionOrganizationCat2.faction_id, factionId),
            ),
            with: {
                cat1: {
                    columns: {
                        id: true,
                        name: true,
                        access_json: true,
                    },
                },
                creator: {
                    columns: {
                        username: true,
                    },
                },
                cat3s: {
                    with: {
                        creator: {
                            columns: {
                                username: true,
                            },
                        },
                    },
                    columns: {
                        id: true,
                        name: true,
                        short_name: true,
                        access_json: true,
                        settings_json: true,
                        forum_group_id: true,
                        created_at: true,
                        created_by: true,
                    },
                    orderBy: [asc(factionOrganizationCat3.name)],
                },
            },
        });

        if (!unit) {
            return { error: 'Unit not found.' } as const;
        }

        const unitMemberships = await db.query.factionOrganizationMembership.findMany({
            where: and(
                eq(factionOrganizationMembership.category_id, categoryId),
                eq(factionOrganizationMembership.type, 'cat_2'),
            ),
            with: {
                creator: {
                    columns: {
                        username: true,
                    },
                },
            },
            orderBy: [asc(factionOrganizationMembership.created_at)],
        });

        const members = formatMembers(unitMemberships, rosterById);

        const missingForumUsers = await computeMissingForumUsers(
            unit.forum_group_id,
            factionId,
            rosterNameSet,
        );

        const canAdminister = membership.rank >= (user.selectedFaction.administration_rank ?? 15);
        const canManage = canAdminister
            || unit.access_json?.includes(session.userId)
            || unit.cat1?.access_json?.includes(session.userId) || false;

        return {
            unit: {
                id: unit.id,
                faction_id: unit.faction_id,
                cat1_id: unit.cat1_id,
                name: unit.name,
                short_name: unit.short_name,
                forum_group_id: unit.forum_group_id,
                access_json: unit.access_json,
                settings_json: unit.settings_json,
                created_by: unit.created_by,
                created_at: unit.created_at,
                updated_at: unit.updated_at,
                cat1: unit.cat1 ? { id: unit.cat1.id, name: unit.cat1.name } : null,
                cat3s: unit.cat3s.map(cat3 => ({
                    ...cat3,
                    settings_json: {
                        ...cat3.settings_json,
                        forum_group_id: cat3.forum_group_id ?? cat3.settings_json?.forum_group_id ?? null,
                    },
                })),
                creator: unit.creator,
            },
            members,
            allFactionMembers,
            canManage,
            factionUsers: factionUsersList,
            allUnitsAndDetails,
            missingForumUsers,
        } as const;
    }

    const detail = await db.query.factionOrganizationCat3.findFirst({
        where: and(
            eq(factionOrganizationCat3.id, categoryId),
            eq(factionOrganizationCat3.faction_id, factionId),
        ),
        with: {
            cat2: {
                columns: {
                    id: true,
                    name: true,
                    cat1_id: true,
                    forum_group_id: true,
                    settings_json: true,
                },
                with: {
                    cat1: {
                        columns: {
                            id: true,
                            name: true,
                        },
                    },
                },
            },
        },
    });

    if (!detail) {
        return { error: 'Detail not found.' } as const;
    }

    const detailMemberships = await db.query.factionOrganizationMembership.findMany({
        where: and(
            eq(factionOrganizationMembership.category_id, categoryId),
            eq(factionOrganizationMembership.type, 'cat_3'),
        ),
        with: {
            creator: {
                columns: {
                    username: true,
                },
            },
        },
        orderBy: [asc(factionOrganizationMembership.created_at)],
    });

    const members = formatMembers(detailMemberships, rosterById);

    const canManageResult = await canUserManage(
        session,
        user,
        membership,
        user.selectedFaction,
        'cat_3',
        categoryId,
    );

    const cat2Ids = allCat2s.map(cat2 => cat2.id);
    const cat3Ids = allCat2s.flatMap(cat2 => cat2.cat3s?.map(cat3 => cat3.id) ?? []);
    const membershipFilters = [];

    if (cat2Ids.length > 0) {
        membershipFilters.push(and(
            eq(factionOrganizationMembership.type, 'cat_2'),
            inArray(factionOrganizationMembership.category_id, cat2Ids),
        ));
    }

    if (cat3Ids.length > 0) {
        membershipFilters.push(and(
            eq(factionOrganizationMembership.type, 'cat_3'),
            inArray(factionOrganizationMembership.category_id, cat3Ids),
        ));
    }

    let allAssignments: typeof detailMemberships = [];
    if (membershipFilters.length === 1) {
        allAssignments = await db.query.factionOrganizationMembership.findMany({
            where: membershipFilters[0],
        });
    } else if (membershipFilters.length > 1) {
        allAssignments = await db.query.factionOrganizationMembership.findMany({
            where: or(...membershipFilters),
        });
    }

    const allAssignedCharacterIds = allAssignments
        .filter(entry => !entry.secondary)
        .map(entry => entry.character_id);

    const missingForumUsers = await computeMissingForumUsers(
        detail.forum_group_id,
        factionId,
        rosterNameSet,
    );

    return {
        detail: {
            ...detail,
            settings_json: {
                ...detail.settings_json,
                forum_group_id: detail.forum_group_id ?? detail.settings_json?.forum_group_id ?? null,
            },
        },
        members,
        allFactionMembers,
        allAssignedCharacterIds,
        canManage: canManageResult.authorized ?? false,
        factionUsers: factionUsersList,
        allUnitsAndDetails,
        missingForumUsers,
    } as const;
}
