
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionOrganizationCat3, factionOrganizationCat3Sections } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { canUserManage } from '../../../../helpers';
import { z } from 'zod';

interface RouteParams {
    params: {
        cat3Id: string;
    }
}

const reorderSchema = z.object({
    orderedSectionIds: z.array(z.number()),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cat3Id = parseInt(params.cat3Id, 10);
    if (isNaN(cat3Id)) {
        return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    }
    
    const body = await request.json();
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const cat3 = await db.query.factionOrganizationCat3.findFirst({ where: eq(factionOrganizationCat3.id, cat3Id), with: { cat2: { with: { cat1: true }}}});
    if (!cat3) return NextResponse.json({ error: 'Detail not found.' }, { status: 404 });
    
    const { authorized, message } = await canUserManage(session, cat3.faction_id, 'cat_3', cat3Id);
     if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    try {
        const { orderedSectionIds } = parsed.data;
        
        db.transaction((tx) => {
            orderedSectionIds.forEach((sectionId, index) => {
                tx.update(factionOrganizationCat3Sections)
                    .set({ order: index })
                    .where(and(
                        eq(factionOrganizationCat3Sections.id, sectionId),
                        eq(factionOrganizationCat3Sections.category_id, cat3Id)
                    ))
                    .run();
            });
        });
        
        return NextResponse.json({ success: true, message: 'Sections reordered successfully.' });

    } catch (error) {
        console.error(`[API Cat3 Reorder Sections] Error for detail ${cat3Id}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
