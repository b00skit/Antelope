
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembers, factionOrganizationCat1, factionOrganizationCat2 } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const cat2Schema = z.object({
    cat1_id: z.number().int(),
    name: z.string().min(1, "Name cannot be empty."),
    short_name: z.string().optional().nullable(),
    access_json: z.array(z.number()).optional().nullable(),
    settings_json: z.object({
        allow_cat3: z.boolean().optional(),
        forum_group_id: z.coerce.number().optional().nullable(),
        secondary: z.boolean().optional(),
    }).optional().nullable(),
});

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = cat2Schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const { cat1_id, name, short_name, access_json, settings_json } = parsed.data;

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        with: { selectedFaction: true }
    });
    if (!user?.selectedFaction?.id) {
        return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
    }
    const factionId = user.selectedFaction.id;

    // Authorization check
    const parentCat1 = await db.query.factionOrganizationCat1.findFirst({
        where: and(eq(factionOrganizationCat1.id, cat1_id), eq(factionOrganizationCat1.faction_id, factionId)),
    });
    if (!parentCat1) {
        return NextResponse.json({ error: 'Parent unit not found.' }, { status: 404 });
    }

    const membership = await db.query.factionMembers.findFirst({
        where: and(eq(factionMembers.userId, session.userId), eq(factionMembers.factionId, factionId))
    });

    const isFactionAdmin = membership && membership.rank >= (user.selectedFaction.administration_rank ?? 15);
    const hasCat1Access = parentCat1.access_json?.includes(session.userId);

    if (!isFactionAdmin && !hasCat1Access) {
        return NextResponse.json({ error: 'You do not have permission to create sub-units here.' }, { status: 403 });
    }

    try {
        const newCat2 = await db.insert(factionOrganizationCat2).values({
            faction_id: factionId,
            cat1_id,
            name,
            short_name,
            access_json,
            settings_json,
            created_by: session.userId,
        }).returning();

        return NextResponse.json({ success: true, category: newCat2[0] }, { status: 201 });
    } catch (error) {
        console.error('[API Cat2 POST] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
