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

    try {
        const adminUser = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
            with: { selectedFaction: true },
        });

        if (!adminUser?.selectedFaction?.id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }
        const factionId = adminUser.selectedFaction.id;

        const adminMembership = await db.query.factionMembers.findFirst({ 
            where: and(eq(factionMembers.userId, session.userId), eq(factionMembers.factionId, factionId)) 
        });

        if (!adminMembership || adminMembership.rank < (adminUser.selectedFaction.administration_rank ?? 15)) {
            return NextResponse.json({ error: 'You do not have permission to unblock users.' }, { status: 403 });
        }

        const result = await db.delete(factionBlockedUsers).where(and(
            eq(factionBlockedUsers.faction_id, factionId),
            eq(factionBlockedUsers.user_id, targetUserId)
        )).returning();

        if (result.length === 0) {
            return NextResponse.json({ error: 'User was not blocked.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'User unblocked successfully.' });

    } catch (error) {
        console.error(`[API User Unblock] Error:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
