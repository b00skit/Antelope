
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionOrganizationCat3 } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { canManageCat2 } from '../../[cat1Id]/[cat2Id]/helpers';
import { z } from 'zod';

interface RouteParams {
    params: {
        cat3Id: string;
    }
}

const cat3UpdateSchema = z.object({
    name: z.string().min(1, "Name cannot be empty."),
    short_name: z.string().optional().nullable(),
    access_json: z.array(z.number()).optional().nullable(),
    forum_group_id: z.coerce.number().optional().nullable(),
    settings_json: z.object({
        secondary: z.boolean().optional(),
        mark_alternative_characters: z.boolean().optional(),
        allow_roster_snapshots: z.boolean().optional(),
    }).optional().nullable(),
});


export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const parsed = cat3UpdateSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    try {
        const cat3 = await db.query.factionOrganizationCat3.findFirst({
            where: eq(factionOrganizationCat3.id, cat3Id),
        });

        if (!cat3) {
            return NextResponse.json({ error: 'Detail not found.' }, { status: 404 });
        }

        const { authorized, message } = await canManageCat2(session, cat3.cat2_id);
        if (!authorized) {
            return NextResponse.json({ error: message }, { status: 403 });
        }

        const result = await db.update(factionOrganizationCat3)
            .set({
                ...parsed.data,
                forum_group_id: parsed.data.forum_group_id ?? null,
            })
            .where(eq(factionOrganizationCat3.id, cat3Id))
            .returning();
            
        return NextResponse.json({ success: true, category: result[0] });

    } catch (error) {
        console.error(`[API Cat3 PUT] Error updating detail ${cat3Id}:`, error);
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
    if (isNaN(cat3Id)) {
        return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    }

    try {
        const cat3 = await db.query.factionOrganizationCat3.findFirst({
            where: eq(factionOrganizationCat3.id, cat3Id),
        });

        if (!cat3) {
            return NextResponse.json({ error: 'Detail not found.' }, { status: 404 });
        }

        const { authorized, message } = await canManageCat2(session, cat3.cat2_id);
        if (!authorized) {
            return NextResponse.json({ error: message }, { status: 403 });
        }

        await db.delete(factionOrganizationCat3).where(eq(factionOrganizationCat3.id, cat3Id));

        return NextResponse.json({ success: true, message: 'Detail deleted successfully.' });

    } catch (error) {
        console.error(`[API Cat3 DELETE] Error deleting detail ${cat3Id}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
