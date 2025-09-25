
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionOrganizationCat2 } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { canManageCat2 } from '../../[cat1Id]/[cat2Id]/helpers';

interface RouteParams {
    params: {
        id: string;
    }
}

const cat2UpdateSchema = z.object({
    cat1_id: z.number().int(),
    name: z.string().min(1, "Name cannot be empty."),
    short_name: z.string().optional().nullable(),
    access_json: z.array(z.number()).optional().nullable(),
    settings_json: z.object({
        allow_cat3: z.boolean().optional(),
        forum_group_id: z.coerce.number().optional().nullable(),
        secondary: z.boolean().optional(),
        default_title: z.string().optional().nullable(),
    }).optional().nullable(),
});


export async function PUT(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cat2Id = parseInt(params.id, 10);
    if (isNaN(cat2Id)) {
        return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = cat2UpdateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const { authorized, message } = await canManageCat2(session, cat2Id);
    if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    try {
        const { cat1_id, ...updateData } = parsed.data;

        const updatedCat2 = await db.update(factionOrganizationCat2)
            .set(updateData)
            .where(eq(factionOrganizationCat2.id, cat2Id))
            .returning();

        return NextResponse.json({ success: true, category: updatedCat2[0] });

    } catch (error) {
        console.error(`[API Cat2 PUT] Error updating unit ${cat2Id}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cat2Id = parseInt(params.id, 10);
    if (isNaN(cat2Id)) return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });

    const { authorized, message } = await canManageCat2(session, cat2Id);
    if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }
    
    try {
        await db.delete(factionOrganizationCat2).where(eq(factionOrganizationCat2.id, cat2Id));
        return NextResponse.json({ success: true, message: 'Unit deleted successfully.' });
    } catch (error) {
        console.error(`[API Cat2 DELETE] Error deleting unit ${cat2Id}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
