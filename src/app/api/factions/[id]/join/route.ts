import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionMembers, factions } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

interface RouteParams {
    params: {
        id: string;
    }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
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
        
        if (membership.rank < membership.faction.access_rank) {
            return NextResponse.json({ error: 'You do not have the required rank to join.' }, { status: 403 });
        }

        if (membership.joined) {
            return NextResponse.json({ error: 'You have already joined this faction panel.' }, { status: 400 });
        }

        await db.update(factionMembers)
            .set({ joined: true })
            .where(and(
                eq(factionMembers.userId, session.userId),
                eq(factionMembers.factionId, factionId)
            ));

        return NextResponse.json({ success: true, message: 'Successfully joined faction panel.' });

    } catch (error) {
        console.error(`[API Faction Join] Error joining faction ${factionId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
