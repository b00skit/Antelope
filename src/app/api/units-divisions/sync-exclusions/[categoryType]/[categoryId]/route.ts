
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionOrganizationSyncExclusions } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { canManageCat2 } from '../../../[cat1Id]/[cat2Id]/helpers';
import { z } from 'zod';

interface RouteParams {
    params: {
        categoryType: 'cat_2' | 'cat_3';
        categoryId: string;
    }
}

const updateExclusionsSchema = z.object({
    excludedNames: z.array(z.string()),
});

export async function GET(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);
    if (!session.isLoggedIn) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categoryType, categoryId } = params;
    const categoryIdNum = parseInt(categoryId, 10);
    if (isNaN(categoryIdNum)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });

    try {
        const exclusions = await db.query.factionOrganizationSyncExclusions.findMany({
            where: and(
                eq(factionOrganizationSyncExclusions.category_id, categoryIdNum),
                eq(factionOrganizationSyncExclusions.category_type, categoryType)
            )
        });
        return NextResponse.json({ excludedNames: exclusions.map(e => e.character_name) });
    } catch (err) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


export async function POST(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);
    if (!session.isLoggedIn) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categoryType, categoryId } = params;
    const categoryIdNum = parseInt(categoryId, 10);
    if (isNaN(categoryIdNum)) return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    
    const body = await request.json();
    const parsed = updateExclusionsSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });

    try {
        // Simple transaction: delete all, then insert new
        db.transaction((tx) => {
            tx.delete(factionOrganizationSyncExclusions).where(and(
                eq(factionOrganizationSyncExclusions.category_id, categoryIdNum),
                eq(factionOrganizationSyncExclusions.category_type, categoryType)
            )).run();

            if (parsed.data.excludedNames.length > 0) {
                tx.insert(factionOrganizationSyncExclusions).values(
                    parsed.data.excludedNames.map(name => ({
                        category_id: categoryIdNum,
                        category_type: categoryType,
                        character_name: name,
                    }))
                ).run();
            }
        });

        return NextResponse.json({ success: true, message: 'Exclusion list updated.' });
    } catch (err) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
