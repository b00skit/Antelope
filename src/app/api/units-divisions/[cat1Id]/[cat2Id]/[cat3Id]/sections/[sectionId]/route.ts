
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionOrganizationCat3, factionOrganizationCat3Sections } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { canUserManage } from '../../../../../helpers';
import { z } from 'zod';

interface RouteParams {
    params: {
        cat3Id: string;
        sectionId: string;
    }
}

const updateSectionSchema = z.object({
    name: z.string().min(1, "Section name cannot be empty.").optional(),
    description: z.string().optional().nullable(),
});

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cat3Id = parseInt(params.cat3Id, 10);
    const sectionId = parseInt(params.sectionId, 10);
    if (isNaN(cat3Id) || isNaN(sectionId)) {
        return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateSectionSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const cat3 = await db.query.factionOrganizationCat3.findFirst({ where: eq(factionOrganizationCat3.id, cat3Id), with: { cat2: { with: { cat1: true }}}});
    if (!cat3) return NextResponse.json({ error: 'Detail not found.' }, { status: 404 });

    const { authorized, message, user, membership, faction } = await canUserManage(session, cat3.faction_id, 'cat_3', cat3Id);
    if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    try {
        const result = await db.update(factionOrganizationCat3Sections)
            .set(parsed.data)
            .where(eq(factionOrganizationCat3Sections.id, sectionId))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ error: 'Section not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, section: result[0] });

    } catch (error) {
        console.error(`[API Cat3 Section Update] Error for detail ${cat3Id}, section ${sectionId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const cat3Id = parseInt(params.cat3Id, 10);
    const sectionId = parseInt(params.sectionId, 10);
     if (isNaN(cat3Id) || isNaN(sectionId)) {
        return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    }

    const cat3 = await db.query.factionOrganizationCat3.findFirst({ where: eq(factionOrganizationCat3.id, cat3Id), with: { cat2: { with: { cat1: true }}}});
    if (!cat3) return NextResponse.json({ error: 'Detail not found.' }, { status: 404 });
    
    const { authorized, message } = await canUserManage(session, cat3.faction_id, 'cat_3', cat3Id);
     if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    try {
        const result = await db.delete(factionOrganizationCat3Sections)
            .where(eq(factionOrganizationCat3Sections.id, sectionId))
            .returning();
        
        if (result.length === 0) {
            return NextResponse.json({ error: 'Section not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Section deleted successfully.' });

    } catch (error) {
        console.error(`[API Cat3 Section Delete] Error for detail ${cat3Id}, section ${sectionId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
