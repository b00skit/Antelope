
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionOrganizationMembership } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

interface SyncPayloadItem {
    type: 'cat_2' | 'cat_3';
    category_id: number;
    character_ids: number[];
}

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId)
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }
    
    const sourceData: SyncPayloadItem[] = await request.json();

    try {
        db.transaction((tx) => {
            for (const unitSync of sourceData) {
                const { type, category_id, character_ids } = unitSync;

                // 1. Get current members
                const currentMembers = tx.select({ character_id: factionOrganizationMembership.character_id })
                    .from(factionOrganizationMembership)
                    .where(and(
                        eq(factionOrganizationMembership.category_id, category_id),
                        eq(factionOrganizationMembership.type, type),
                        eq(factionOrganizationMembership.manual, false)
                    )).all();
                const currentMemberIds = new Set(currentMembers.map(m => m.character_id));

                const characterIdsSet = new Set(character_ids);

                // 2. Find members to remove
                const toRemove = Array.from(currentMemberIds).filter(id => !characterIdsSet.has(id));
                if (toRemove.length > 0) {
                    tx.delete(factionOrganizationMembership).where(and(
                        eq(factionOrganizationMembership.category_id, category_id),
                        eq(factionOrganizationMembership.type, type),
                        inArray(factionOrganizationMembership.character_id, toRemove)
                    )).run();
                }

                // 3. Find members to add
                const toAdd = Array.from(characterIdsSet).filter(id => !currentMemberIds.has(id));
                if (toAdd.length > 0) {
                    const valuesToInsert = toAdd.map(charId => ({
                        type: type,
                        category_id: category_id,
                        character_id: charId,
                        created_by: session.userId!,
                        manual: false,
                    }));
                    tx.insert(factionOrganizationMembership).values(valuesToInsert).run();
                }
            }
        });
        
        return NextResponse.json({ success: true, message: `Successfully synced organizational rosters.` });

    } catch (error) {
        console.error('[API Sync Organization] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
