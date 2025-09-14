import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembers, factionOrganizationSettings } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const settingsSchema = z.object({
    category_1_name: z.string().min(1, "Name cannot be empty.").default('Division'),
    category_2_name: z.string().min(1, "Name cannot be empty.").default('Unit'),
    category_3_name: z.string().min(1, "Name cannot be empty.").default('Detail'),
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

    // Authorization Check
    const membership = await db.query.factionMembers.findFirst({
        where: and(eq(factionMembers.userId, session.userId), eq(factionMembers.factionId, factionId))
    });

    if (!membership || membership.rank < (user.selectedFaction.administration_rank ?? 15)) {
        return NextResponse.json({ error: 'You do not have permission to manage these settings.' }, { status: 403 });
    }
    
    const body = await request.json();
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    try {
        const result = await db.insert(factionOrganizationSettings)
            .values({
                faction_id: factionId,
                ...parsed.data,
            })
            .onConflictDoUpdate({
                target: factionOrganizationSettings.faction_id,
                set: parsed.data,
            })
            .returning();
            
        return NextResponse.json({ success: true, settings: result[0] });

    } catch (error) {
        console.error(`[API Units & Divisions Settings] Error:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
