
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { z } from 'zod';
import { canManageCat2 } from '../../../[cat1Id]/[cat2Id]/helpers';
import { factionOrganizationMembership, factionOrganizationCat3 } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

interface RouteParams {
    params: {
        categoryType: 'cat_2' | 'cat_3';
        categoryId: string;
    }
}

const syncConfirmSchema = z.object({
    addIds: z.array(z.number()),
    removeIds: z.array(z.number()),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categoryType, categoryId } = params;
    const categoryIdNum = parseInt(categoryId, 10);
    if (isNaN(categoryIdNum)) {
        return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = syncConfirmSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }
    const { addIds, removeIds } = parsed.data;

    // Authorization check
    let cat2IdToCheck;
    if (categoryType === 'cat_2') {
        cat2IdToCheck = categoryIdNum;
    } else {
        const cat3 = await db.query.factionOrganizationCat3.findFirst({ where: eq(factionOrganizationCat3.id, categoryIdNum) });
        if (!cat3) return NextResponse.json({ error: 'Detail not found.' }, { status: 404 });
        cat2IdToCheck = cat3.cat2_id;
    }
    const { authorized, message } = await canManageCat2(session, cat2IdToCheck);
    if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    try {
        db.transaction((tx) => {
            if (addIds.length > 0) {
                tx.insert(factionOrganizationMembership).values(
                    addIds.map(charId => ({
                        type: categoryType,
                        category_id: categoryIdNum,
                        character_id: charId,
                        created_by: session.userId!,
                        manual: false,
                    }))
                ).run();
            }

            if (removeIds.length > 0) {
                tx.delete(factionOrganizationMembership).where(
                    and(
                        eq(factionOrganizationMembership.category_id, categoryIdNum),
                        eq(factionOrganizationMembership.type, categoryType),
                        inArray(factionOrganizationMembership.character_id, removeIds),
                        eq(factionOrganizationMembership.manual, false)
                    )
                ).run();
            }
        });

        return NextResponse.json({ success: true, message: 'Sync completed successfully.' });
    } catch (err) {
        console.error(`[API Sync Confirm]`, err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
