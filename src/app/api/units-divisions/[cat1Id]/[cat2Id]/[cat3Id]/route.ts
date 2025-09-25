
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionOrganizationCat1, factionOrganizationCat2, factionOrganizationCat3, factionMembersCache, factionOrganizationMembership, factionMembers, forumApiCache } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { canManageCat2, canUserManage } from '../helpers';

interface RouteParams {
    params: {
        cat1Id: string;
        cat2Id: string;
        cat3Id: string;
    }
}

async function autoSyncForumGroup(cat3: any, sessionUserId: number) {
    const forumGroupId = cat3.settings_json?.forum_group_id;
    if (!forumGroupId) return;

    const [forumCache, factionCache] = await Promise.all([
        db.query.forumApiCache.findFirst({
            where: and(
                eq(forumApiCache.faction_id, cat3.faction_id),
                eq(forumApiCache.group_id, forumGroupId)
            )
        }),
        db.query.factionMembersCache.findFirst({
            where: eq(factionMembersCache.faction_id, cat3.faction_id)
        })
    ]);

    if (!forumCache?.data?.members || !factionCache?.members) {
        console.warn(`[Auto-Sync Cat3 ${cat3.id}] Missing forum or faction cache. Skipping sync.`);
        return;
    }

    const forumUsernames = new Set(forumCache.data.members.map((m: any) => m.username.replace(/_/g, ' ')));
    const factionMembersMap = new Map(factionCache.members.map((m: any) => [m.character_name, m.character_id]));

    const characterIdsInForumGroup = new Set(
        Array.from(forumUsernames)
            .map(username => factionMembersMap.get(username))
            .filter((id): id is number => id !== undefined)
    );
    
    const existingMemberships = await db.query.factionOrganizationMembership.findMany({
        where: and(
            eq(factionOrganizationMembership.category_id, cat3.id),
            eq(factionOrganizationMembership.type, 'cat_3')
        )
    });
    
    const existingMemberIds = new Set(existingMemberships.map(m => m.character_id));
    
    // Add new members from forum group
    const membersToAdd = [...characterIdsInForumGroup].filter(id => !existingMemberIds.has(id));
    if (membersToAdd.length > 0) {
        await db.insert(factionOrganizationMembership).values(
            membersToAdd.map(charId => ({
                type: 'cat_3',
                category_id: cat3.id,
                character_id: charId,
                created_by: sessionUserId,
                manual: false,
            }))
        );
    }
    
    // Remove members who are no longer in the forum group (but were not added manually)
    const membersToRemove = existingMemberships
        .filter(m => !m.manual && !characterIdsInForumGroup.has(m.character_id))
        .map(m => m.id);

    if (membersToRemove.length > 0) {
        await db.delete(factionOrganizationMembership).where(inArray(factionOrganizationMembership.id, membersToRemove));
    }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const cat3Id = parseInt(params.cat3Id, 10);
    if (isNaN(cat3Id)) {
        return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    }

    const cat3 = await db.query.factionOrganizationCat3.findFirst({
        where: eq(factionOrganizationCat3.id, cat3Id),
        with: {
            cat2: {
                with: {
                    cat1: {
                        columns: { id: true, name: true }
                    }
                }
            }
        }
    });

    if (!cat3) {
        return NextResponse.json({ error: 'Detail not found.' }, { status: 404 });
    }

    // Auto-sync before fetching the rest of the data
    await autoSyncForumGroup(cat3, session.userId);

    const { authorized, user, membership, faction } = await canManageCat2(session, cat3.cat2_id);

    const [factionCache, members, factionUsers, allAssignedMembers, allCat1s] = await Promise.all([
        db.query.factionMembersCache.findFirst({
            where: eq(factionMembersCache.faction_id, cat3.faction_id)
        }),
        db.query.factionOrganizationMembership.findMany({
            where: and(
                eq(factionOrganizationMembership.category_id, cat3Id),
                eq(factionOrganizationMembership.type, 'cat_3')
            ),
            with: {
                creator: {
                    columns: { username: true }
                }
            }
        }),
        db.query.factionMembers.findMany({
            where: and(eq(factionMembers.factionId, cat3.faction_id), eq(factionMembers.joined, true)),
            with: {
                user: {
                    columns: {
                        id: true,
                        username: true,
                    }
                }
            }
        }),
        db.query.factionOrganizationMembership.findMany({
            where: eq(factionOrganizationMembership.secondary, false)
        }),
        db.query.factionOrganizationCat1.findMany({
            where: eq(factionOrganizationCat1.faction_id, cat3.faction_id),
            with: {
                cat2s: {
                    with: {
                        cat3s: true
                    }
                }
            }
        })
    ]);

    const allFactionMembers = factionCache?.members || [];
    const memberDetails = members.map(m => {
        const factionMember = allFactionMembers.find((fm: any) => fm.character_id === m.character_id);
        return {
            ...m,
            character_name: factionMember?.character_name || 'Unknown',
            rank_name: factionMember?.rank_name || 'Unknown',
        }
    });
    
    const availableUsers = factionUsers.map(fm => fm.user).filter(Boolean);
    const allAssignedCharacterIds = allAssignedMembers.map(m => m.character_id);

    // Prepare list for moving members
    const allUnitsAndDetails: { label: string; value: string; type: 'cat_2' | 'cat_3' }[] = [];
    for (const cat1 of allCat1s) {
        for (const c2 of cat1.cat2s) {
             const canManage = await canUserManage(session, user, membership, faction, 'cat_2', c2.id);
             if (canManage.authorized && !(c2.settings_json?.secondary)) {
                allUnitsAndDetails.push({
                    label: `${cat1.name} / ${c2.name}`,
                    value: c2.id.toString(),
                    type: 'cat_2'
                });
             }
            if (c2.cat3s) {
                for (const c3 of c2.cat3s) {
                    const canManageCat3 = await canUserManage(session, user, membership, faction, 'cat_3', c3.id);
                    if(canManageCat3.authorized && !(c3.settings_json?.secondary)) {
                         allUnitsAndDetails.push({
                            label: `${cat1.name} / ${c2.name} / ${c3.name}`,
                            value: c3.id.toString(),
                            type: 'cat_3'
                        });
                    }
                }
            }
        }
    }


    return NextResponse.json({
        detail: cat3,
        members: memberDetails,
        allFactionMembers,
        allAssignedCharacterIds,
        canManage: authorized,
        factionUsers: availableUsers,
        allUnitsAndDetails,
    });
}
