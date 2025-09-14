import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembers, factionOrganizationCat2, factionOrganizationCat3 } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { canManageCat2 } from '../[cat1Id]/[cat2Id]/helpers';

const cat3Schema = z.object({
    cat2_id: z.number().int(),
    name: z.string().min(1, "Name cannot be empty."),
    short_name: z.string().optional().nullable(),
    access_json: z.array(z.number()).optional().nullable(),
    settings_json: z.object({}).optional().nullable(),
});

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = cat3Schema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const { cat2_id, name, short_name, access_json, settings_json } = parsed.data;

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        with: { selectedFaction: true }
    });
    if (!user?.selectedFaction?.id) {
        return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
    }
    const factionId = user.selectedFaction.id;

    // Authorization check
    const parentCat2 = await db.query.factionOrganizationCat2.findFirst({
        where: and(eq(factionOrganizationCat2.id, cat2_id), eq(factionOrganizationCat2.faction_id, factionId)),
    });
    if (!parentCat2) {
        return NextResponse.json({ error: 'Parent unit not found.' }, { status: 404 });
    }
    
    if (!parentCat2.settings_json?.allow_cat3) {
        return NextResponse.json({ error: 'This unit does not allow sub-units.' }, { status: 403 });
    }

    const { authorized, message } = await canManageCat2(session, cat2_id);
    if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    try {
        const newCat3 = await db.insert(factionOrganizationCat3).values({
            faction_id: factionId,
            cat2_id,
            name,
            short_name,
            access_json,
            settings_json,
            created_by: session.userId,
        }).returning();

        return NextResponse.json({ success: true, category: newCat3[0] }, { status: 201 });
    } catch (error) {
        console.error('[API Cat3 POST] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
