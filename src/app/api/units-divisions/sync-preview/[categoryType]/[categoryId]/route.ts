
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionOrganizationMembership, factionOrganizationCat2, factionOrganizationCat3, factionMembersCache, forumApiCache, factionOrganizationSyncExclusions } from '@/db/schema';
import { and, eq, inArray, not } from 'drizzle-orm';
import { canManageCat2 } from '../../../[cat1Id]/[cat2Id]/helpers';

interface RouteParams {
    params: {
        categoryType: 'cat_2' | 'cat_3';
        categoryId: string;
    }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);
    if (!session.isLoggedIn) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categoryType, categoryId } = params;
    const categoryIdNum = parseInt(categoryId, 10);
    if (isNaN(categoryIdNum)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    let category: any;
    let cat2IdToCheck;
    if (categoryType === 'cat_2') {
        category = await db.query.factionOrganizationCat2.findFirst({ where: eq(factionOrganizationCat2.id, categoryIdNum) });
        cat2IdToCheck = categoryIdNum;
    } else {
        category = await db.query.factionOrganizationCat3.findFirst({ where: eq(factionOrganizationCat3.id, categoryIdNum) });
        if (category) cat2IdToCheck = category.cat2_id;
    }
    
    if (!category || !cat2IdToCheck) {
        return NextResponse.json({ error: 'Unit or Detail not found.' }, { status: 404 });
    }
    
    const isCurrentUnitSecondary = category.settings_json?.secondary ?? false;

    const { authorized, message } = await canManageCat2(session, cat2IdToCheck);
    if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    const forumGroupId = category.settings_json?.forum_group_id;
    if (!forumGroupId) {
        return NextResponse.json({ error: 'No forum group is configured.' }, { status: 400 });
    }

    const [forumCache, factionCache, existingMemberships, allPrimaryMemberships, exclusions] = await Promise.all([
        db.query.forumApiCache.findFirst({
            where: and(
                eq(forumApiCache.faction_id, category.faction_id),
                eq(forumApiCache.group_id, forumGroupId)
            )
        }),
        db.query.factionMembersCache.findFirst({
            where: eq(factionMembersCache.faction_id, category.faction_id)
        }),
        db.query.factionOrganizationMembership.findMany({
            where: and(
                eq(factionOrganizationMembership.category_id, categoryIdNum),
                eq(factionOrganizationMembership.type, categoryType)
            )
        }),
        // Fetch all primary assignments in the faction to check for conflicts
        db.query.factionOrganizationMembership.findMany({
            where: and(
                eq(factionOrganizationMembership.secondary, false),
                // Exclude members of the current unit being synced
                not(
                    and(
                        eq(factionOrganizationMembership.category_id, categoryIdNum),
                        eq(factionOrganizationMembership.type, categoryType)
                    )
                )
            )
        }),
        db.query.factionOrganizationSyncExclusions.findMany({
            where: and(
                eq(factionOrganizationSyncExclusions.category_id, categoryIdNum),
                eq(factionOrganizationSyncExclusions.category_type, categoryType)
            )
        })
    ]);

    if (!forumCache?.data?.members) return NextResponse.json({ error: 'Forum group cache not found or empty. Please sync it on the Sync Management page first.' }, { status: 404 });
    if (!factionCache?.members) return NextResponse.json({ error: 'Faction member cache not found. Please sync it on the Sync Management page first.' }, { status: 404 });

    const forumUsernames = new Set(forumCache.data.members.map((m: any) => m.username.replace(/_/g, ' ')));
    const factionMembersMap = new Map(factionCache.members.map((m: any) => [m.character_name, { id: m.character_id, rank: m.rank_name }]));
    
    const characterIdsInForumGroup = new Set(
        Array.from(forumUsernames)
            .map(username => factionMembersMap.get(username)?.id)
            .filter((id): id is number => id !== undefined)
    );
    
    const existingMemberIds = new Set(existingMemberships.map(m => m.character_id));
    const manuallyAddedMemberIds = new Set(existingMemberships.filter(m => m.manual).map(m => m.character_id));
    const alreadyAssignedPrimaryIds = new Set(allPrimaryMemberships.map(m => m.character_id));
    const excludedNames = new Set(exclusions.map(e => e.character_name));

    const toAddIds = [...characterIdsInForumGroup].filter(id => !existingMemberIds.has(id));
    const toRemoveIds = [...existingMemberIds].filter(id => !characterIdsInForumGroup.has(id) && !manuallyAddedMemberIds.has(id));

    const allFactionMembers = factionCache?.members || [];

    const toAdd = toAddIds.map(id => {
        const memberInfo = allFactionMembers.find(m => m.character_id === id);
        return { 
            character_id: id, 
            character_name: memberInfo?.character_name || `ID: ${id}`, 
            rank_name: memberInfo?.rank_name || 'N/A',
            isAlreadyAssigned: !isCurrentUnitSecondary && alreadyAssignedPrimaryIds.has(id),
            isExcluded: excludedNames.has(memberInfo?.character_name),
        };
    });

    const toRemove = toRemoveIds.map(id => {
        const memberInfo = allFactionMembers.find(m => m.character_id === id);
        return { character_id: id, character_name: memberInfo?.character_name || `ID: ${id}`, rank_name: memberInfo?.rank_name || 'N/A' };
    });

    return NextResponse.json({ toAdd, toRemove });
}
