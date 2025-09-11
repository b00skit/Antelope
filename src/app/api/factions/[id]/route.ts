import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factions, factionMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

interface RouteParams {
    params: {
        id: string;
    }
}

const updateSchema = z.object({
    name: z.string().min(3, "Faction name must be at least 3 characters long."),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be a valid hex code.").optional().nullable(),
    access_rank: z.number().int().min(1).max(20),
    moderation_rank: z.number().int().min(1).max(20),
    activity_rosters_enabled: z.boolean().default(true),
});

export async function PUT(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const factionId = parseInt(params.id, 10);
    if (isNaN(factionId)) {
        return NextResponse.json({ error: 'Invalid faction ID.' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    try {
        const membership = await db.query.factionMembers.findFirst({
            where: and(
                eq(factionMembers.userId, session.userId),
                eq(factionMembers.factionId, factionId)
            ),
            with: {
                faction: true,
            }
        });
        
        if (!membership) {
            return NextResponse.json({ error: 'You are not a member of this faction.' }, { status: 403 });
        }
        
        if (membership.rank < membership.faction.moderation_rank) {
            return NextResponse.json({ error: 'You do not have the required rank to manage this faction.' }, { status: 403 });
        }

        if (!membership.joined) {
            return NextResponse.json({ error: 'You must join the faction panel before managing it.' }, { status: 403 });
        }
        
        const { activity_rosters_enabled, ...factionData } = parsed.data;

        await db.update(factions)
            .set({
                ...factionData,
                feature_flags: {
                    activity_rosters_enabled,
                }
            })
            .where(eq(factions.id, factionId));

        return NextResponse.json({ success: true, message: 'Faction updated successfully.' });

    } catch (error) {
        console.error(`[API Faction Update] Error updating faction ${factionId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const factionId = parseInt(params.id, 10);
    if (isNaN(factionId)) {
        return NextResponse.json({ error: 'Invalid faction ID.' }, { status: 400 });
    }

    try {
        const membership = await db.query.factionMembers.findFirst({
            where: and(
                eq(factionMembers.userId, session.userId),
                eq(factionMembers.factionId, factionId)
            ),
            with: {
                faction: true,
            }
        });

        if (!membership) {
            return NextResponse.json({ error: 'You are not a member of this faction.' }, { status: 403 });
        }
        
        if (membership.rank < membership.faction.moderation_rank) {
            return NextResponse.json({ error: 'You do not have the required rank to manage this faction.' }, { status: 403 });
        }

        if (!membership.joined) {
            return NextResponse.json({ error: 'You must join the faction panel before managing it.' }, { status: 403 });
        }
        
        // Use a transaction to delete all members first, then the faction itself.
        db.transaction((tx) => {
            tx.delete(factionMembers).where(eq(factionMembers.factionId, factionId)).run();
            tx.delete(factions).where(eq(factions.id, factionId)).run();
        });

        return NextResponse.json({ success: true, message: 'Faction has been unenrolled successfully.' });

    } catch (error) {
        console.error(`[API Faction Delete] Error deleting faction ${factionId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
