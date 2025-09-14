import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembers, factionOrganizationCat1 } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const cat1Schema = z.object({
    name: z.string().min(1, "Name cannot be empty."),
    short_name: z.string().optional().nullable(),
    access_json: z.array(z.number()).optional().nullable(),
});

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        with: { selectedFaction: true }
    });

    if (!user?.selectedFaction?.id) {
        return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
    }
    const factionId = user.selectedFaction.id;

    const membership = await db.query.factionMembers.findFirst({
        where: and(eq(factionMembers.userId, session.userId), eq(factionMembers.factionId, factionId))
    });

    if (!membership || membership.rank < (user.selectedFaction.administration_rank ?? 15)) {
        return NextResponse.json({ error: 'You do not have permission to create organizational units.' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = cat1Schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    try {
        const newCat1 = await db.insert(factionOrganizationCat1).values({
            faction_id: factionId,
            name: parsed.data.name,
            short_name: parsed.data.short_name,
            access_json: parsed.data.access_json,
            created_by: session.userId,
        }).returning();

        return NextResponse.json({ success: true, category: newCat1[0] }, { status: 201 });
    } catch (error) {
        console.error('[API Units & Divisions Cat1 POST] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
