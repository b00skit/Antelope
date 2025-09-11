import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const selectFactionSchema = z.object({
    factionId: z.number().int(),
});

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = selectFactionSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }
    
    const { factionId } = parsed.data;

    try {
        // Verify the user is a member of the faction and has joined
        const membership = await db.query.factionMembers.findFirst({
            where: and(
                eq(factionMembers.userId, session.userId),
                eq(factionMembers.factionId, factionId),
                eq(factionMembers.joined, true)
            )
        });

        if (!membership) {
            return NextResponse.json({ error: 'You are not a joined member of this faction.' }, { status: 403 });
        }
        
        // Update the user's selected faction
        await db.update(users)
            .set({ selected_faction_id: factionId })
            .where(eq(users.id, session.userId));
        
        return NextResponse.json({ success: true, message: 'Active faction updated.' });

    } catch (error) {
        console.error(`[API Select Faction] Error:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
