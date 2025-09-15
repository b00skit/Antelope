import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { 
    users, 
    factionMembers, 
    factionOrganizationCat2, 
    factionOrganizationCat3, 
    factionOrganizationMembership,
    factionMembersCache
} from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

const syncSchema = z.object({
    categoryType: z.enum(['cat_2', 'cat_3']),
    categoryId: z.number().int(),
});

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = syncSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const { categoryType, categoryId } = parsed.data;

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
            with: { selectedFaction: true }
        });
        if (!user?.selectedFaction) {
            return NextResponse.json({ error: 'No active faction.' }, { status: 400 });
        }
        const faction = user.selectedFaction;

        if (!faction.phpbb_api_url || !faction.phpbb_api_key) {
            return NextResponse.json({ error: 'Forum integration is not configured for this faction.' }, { status: 400 });
        }
        
        let category: any;
        if (categoryType === 'cat_2') {
            category = await db.query.factionOrganizationCat2.findFirst({ where: eq(factionOrganizationCat2.id, categoryId) });
        } else {
            category = await db.query.factionOrganizationCat3.findFirst({ where: eq(factionOrganizationCat3.id, categoryId) });
        }

        if (!category) {
            return NextResponse.json({ error: 'Unit or detail not found.' }, { status: 404 });
        }
        
        const forumGroupId = category.settings_json?.forum_group_id;
        if (!forumGroupId) {
            return NextResponse.json({ error: 'No forum group is configured for this unit/detail.' }, { status: 400 });
        }

        // --- Fetch forum and faction data ---
        const baseUrl = faction.phpbb_api_url.endsWith('/') ? faction.phpbb_api_url : `${faction.phpbb_api_url}/`;
        const forumApiUrl = `${baseUrl}app.php/booskit/phpbbapi/group/${forumGroupId}?key=${faction.phpbb_api_key}`;
        
        const [forumResponse, factionCache] = await Promise.all([
            fetch(forumApiUrl, { next: { revalidate: 60 } }), // Cache for 1 min
            db.query.factionMembersCache.findFirst({ where: eq(factionMembersCache.faction_id, faction.id) })
        ]);

        if (!forumResponse.ok) {
            return NextResponse.json({ error: `Failed to fetch forum group data (Status: ${forumResponse.status})` }, { status: 502 });
        }

        const forumData = await forumResponse.json();
        const forumUsernames = new Set([
            ...(forumData.group?.members?.map((m: any) => m.username.replace(/_/g, ' ')) || []),
            ...(forumData.group?.leaders?.map((l: any) => l.username.replace(/_/g, ' ')) || [])
        ]);

        if (!factionCache?.members) {
            return NextResponse.json({ error: 'Faction member cache is not available. Please sync the roster first.' }, { status: 404 });
        }
        
        const factionMembersMap = new Map(factionCache.members.map((m: any) => [m.character_name, m.character_id]));
        const characterIdsToSync = Array.from(forumUsernames)
            .map(username => factionMembersMap.get(username))
            .filter((id): id is number => id !== undefined);

        // --- Perform Sync ---
        await db.transaction(async (tx) => {
            // 1. Remove all existing members from this category
            await tx.delete(factionOrganizationMembership)
              .where(and(
                eq(factionOrganizationMembership.category_id, categoryId),
                eq(factionOrganizationMembership.type, categoryType)
              ));
            
            // 2. Add the new members
            if (characterIdsToSync.length > 0) {
                 await tx.insert(factionOrganizationMembership).values(
                    characterIdsToSync.map(charId => ({
                        type: categoryType,
                        category_id: categoryId,
                        character_id: charId,
                        created_by: session.userId!,
                        title: 'Member' // Default title
                    }))
                );
            }
        });

        return NextResponse.json({ 
            success: true, 
            message: `Synced ${characterIdsToSync.length} members from forum group.` 
        });

    } catch (error) {
        console.error(`[API Sync Forum Group] Error:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
