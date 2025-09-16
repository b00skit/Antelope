import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembers, factionBlockedUsers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

interface RouteParams {
    params: {
        id: string;
    }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);
    const targetUserId = parseInt(params.id, 10);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (isNaN(targetUserId)) {
        return NextResponse.json({ error: 'Invalid user ID.' }, { status: 400 });
    }
    if (targetUserId === session.userId) {
        return NextResponse.json({ error: 'You cannot block yourself.' }, { status: 400 });
    }

    try {
        const adminUser = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
            with: { selectedFaction: true },
        });

        if (!adminUser?.selectedFaction?.id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }
        const factionId = adminUser.selectedFaction.id;

        const [adminMembership, targetMembership] = await Promise.all([
            db.query.factionMembers.findFirst({ where: and(eq(factionMembers.userId, session.userId), eq(factionMembers.factionId, factionId)) }),
            db.query.factionMembers.findFirst({ where: and(eq(factionMembers.userId, targetUserId), eq(factionMembers.factionId, factionId)) })
        ]);

        if (!adminMembership || adminMembership.rank < (adminUser.selectedFaction.administration_rank ?? 15)) {
            return NextResponse.json({ error: 'You do not have permission to block users.' }, { status: 403 });
        }

        if (!targetMembership) {
            return NextResponse.json({ error: 'Target user is not a member of this faction panel.' }, { status: 404 });
        }
        
        if (adminMembership.rank <= targetMembership.rank) {
            return NextResponse.json({ error: 'You cannot block a user with an equal or higher rank.' }, { status: 403 });
        }
        
        const existingBlock = await db.query.factionBlockedUsers.findFirst({
            where: and(
                eq(factionBlockedUsers.faction_id, factionId),
                eq(factionBlockedUsers.user_id, targetUserId)
            )
        });

        if (existingBlock) {
            return NextResponse.json({ error: 'This user is already blocked.' }, { status: 409 });
        }

        await db.insert(factionBlockedUsers).values({
            faction_id: factionId,
            user_id: targetUserId,
            blocked_by_user_id: session.userId,
        });

        return NextResponse.json({ success: true, message: 'User blocked successfully.' });

    } catch (error) {
        console.error(`[API User Block] Error:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
