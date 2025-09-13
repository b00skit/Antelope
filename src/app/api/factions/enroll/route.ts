
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factions, factionMembers, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

const enrollSchema = z.object({
    id: z.number().int(),
    name: z.string().min(3, "Faction name must be at least 3 characters long."),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex color code.").optional().nullable(),
    access_rank: z.number().int().min(1).max(20),
    moderation_rank: z.number().int().min(1).max(20),
    supervisor_rank: z.coerce.number().min(1, "Rank must be at least 1").max(20, "Rank must be 20 or less"),
    minimum_abas: z.coerce.number().min(0, "ABAS cannot be negative.").optional(),
    minimum_supervisor_abas: z.coerce.number().min(0, "ABAS cannot be negative.").optional(),
    user_rank: z.number().int(),
    activity_rosters_enabled: z.boolean().default(true),
    character_sheets_enabled: z.boolean().default(true),
    phpbb_api_url: z.string().url("Must be a valid URL").or(z.literal('')).optional().nullable(),
    phpbb_api_key: z.string().optional().nullable(),
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

    const { id, name, color, access_rank, moderation_rank, supervisor_rank, minimum_abas, minimum_supervisor_abas, user_rank, activity_rosters_enabled, character_sheets_enabled, phpbb_api_url, phpbb_api_key } = parsed.data;

    try {
        // Check if faction already exists
        const existingFaction = await db.query.factions.findFirst({
            where: eq(factions.id, id),
        });

        if (existingFaction) {
            return NextResponse.json({ error: 'This faction has already been enrolled.' }, { status: 409 });
        }

        // Use a transaction to ensure both operations succeed or fail together
        db.transaction((tx) => {
            // 1. Insert the new faction
            tx.insert(factions).values({
                id,
                name,
                color,
                access_rank,
                moderation_rank,
                supervisor_rank,
                minimum_abas,
                minimum_supervisor_abas,
                feature_flags: {
                    activity_rosters_enabled,
                    character_sheets_enabled,
                },
                phpbb_api_url,
                phpbb_api_key
            }).run();

            // 2. Add the current user as a member of this new faction
            tx.insert(factionMembers).values({
                userId: session.userId!,
                factionId: id,
                rank: user_rank,
                joined: true, // Auto-join the faction upon enrollment
            }).run();

            // 3. Make the new faction the user's active faction
            tx.update(users)
                .set({ selected_faction_id: id })
                .where(eq(users.id, session.userId!))
                .run();
        });

        return NextResponse.json({ success: true, message: 'Faction enrolled successfully.' }, { status: 201 });

    } catch (error) {
        console.error('[API Factions Enroll] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
