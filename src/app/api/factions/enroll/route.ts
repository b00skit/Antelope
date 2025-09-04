import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factions, factionMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

const enrollSchema = z.object({
    id: z.number().int(),
    name: z.string().min(3, "Faction name must be at least 3 characters long."),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex code.").optional().nullable(),
    access_rank: z.number().int().min(1).max(20),
    moderation_rank: z.number().int().min(1).max(20),
    user_rank: z.number().int()
});

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = enrollSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const { id, name, color, access_rank, moderation_rank, user_rank } = parsed.data;

    try {
        // Check if faction already exists
        const existingFaction = await db.query.factions.findFirst({
            where: eq(factions.id, id),
        });

        if (existingFaction) {
            return NextResponse.json({ error: 'This faction has already been enrolled.' }, { status: 409 });
        }

        // Use a transaction to ensure both operations succeed or fail together
        await db.transaction(async (tx) => {
            // 1. Insert the new faction
            await tx.insert(factions).values({
                id,
                name,
                color,
                access_rank,
                moderation_rank,
            });

            // 2. Add the current user as a member of this new faction
            await tx.insert(factionMembers).values({
                userId: session.userId!,
                factionId: id,
                rank: user_rank,
                joined: false, // User has not "joined" it in the panel yet
            });
        });

        return NextResponse.json({ success: true, message: 'Faction enrolled successfully.' }, { status: 201 });

    } catch (error) {
        console.error('[API Factions Enroll] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
