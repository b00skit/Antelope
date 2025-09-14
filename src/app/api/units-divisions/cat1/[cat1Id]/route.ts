import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembers, factionOrganizationCat1 } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

interface RouteParams {
    params: {
        cat1Id: string;
    }
}

const cat1Schema = z.object({
    name: z.string().min(1, "Name cannot be empty."),
    short_name: z.string().optional().nullable(),
    access_json: z.array(z.number()).optional().nullable(),
});

async function checkPermissions(session: any, factionId: number, cat1Id: number) {
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        with: { selectedFaction: true }
    });

    if (user?.selectedFaction?.id !== factionId) {
        return { authorized: false, message: 'Mismatched faction.' };
    }
    
    const membership = await db.query.factionMembers.findFirst({
        where: and(eq(factionMembers.userId, session.userId), eq(factionMembers.factionId, factionId))
    });

    if (!membership) {
        return { authorized: false, message: 'Not a member of this faction.' };
    }

    // Check for admin rank
    if (membership.rank >= (user.selectedFaction.administration_rank ?? 15)) {
        return { authorized: true };
    }
    
    // Check for access_json
    const cat1 = await db.query.factionOrganizationCat1.findFirst({
        where: eq(factionOrganizationCat1.id, cat1Id)
    });

    if (cat1?.access_json?.includes(session.userId)) {
        return { authorized: true };
    }

    return { authorized: false, message: 'You do not have permission to manage this unit.' };
}


export async function PUT(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const cat1Id = parseInt(params.cat1Id, 10);
    if (isNaN(cat1Id)) return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });

    const body = await request.json();
    const parsed = cat1Schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }
    
    const cat1Unit = await db.query.factionOrganizationCat1.findFirst({ where: eq(factionOrganizationCat1.id, cat1Id) });
    if (!cat1Unit) return NextResponse.json({ error: 'Unit not found.' }, { status: 404 });

    const { authorized, message } = await checkPermissions(session, cat1Unit.faction_id, cat1Id);
    if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    try {
        const updatedCat1 = await db.update(factionOrganizationCat1).set({
            name: parsed.data.name,
            short_name: parsed.data.short_name,
            access_json: parsed.data.access_json,
        }).where(eq(factionOrganizationCat1.id, cat1Id)).returning();

        return NextResponse.json({ success: true, category: updatedCat1[0] });
    } catch (error) {
        console.error(`[API Cat1 PUT] Error updating unit ${cat1Id}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const cat1Id = parseInt(params.cat1Id, 10);
    if (isNaN(cat1Id)) return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    
    const cat1Unit = await db.query.factionOrganizationCat1.findFirst({ where: eq(factionOrganizationCat1.id, cat1Id) });
    if (!cat1Unit) return NextResponse.json({ error: 'Unit not found.' }, { status: 404 });

    const { authorized, message } = await checkPermissions(session, cat1Unit.faction_id, cat1Id);
    if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    try {
        await db.delete(factionOrganizationCat1).where(eq(factionOrganizationCat1.id, cat1Id));
        return NextResponse.json({ success: true, message: 'Unit deleted successfully.' });
    } catch (error) {
        console.error(`[API Cat1 DELETE] Error deleting unit ${cat1Id}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
