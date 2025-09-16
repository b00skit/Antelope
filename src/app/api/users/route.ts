import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembers, factionBlockedUsers } from '@/db/schema';
import { and, eq, notInArray } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
            with: { selectedFaction: true },
        });

        if (!user?.selectedFaction?.id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }
        
        const factionId = user.selectedFaction.id;

        const membership = await db.query.factionMembers.findFirst({
            where: and(
                eq(factionMembers.userId, session.userId),
                eq(factionMembers.factionId, factionId)
            )
        });

        if (!membership || membership.rank < (user.selectedFaction.administration_rank ?? 15)) {
            return NextResponse.json({ error: 'You do not have permission to view this page.' }, { status: 403 });
        }

        const allJoinedMembers = await db.query.factionMembers.findMany({
            where: and(
                eq(factionMembers.factionId, factionId),
                eq(factionMembers.joined, true)
            ),
            with: {
                user: {
                    columns: {
                        id: true,
                        username: true,
                        role: true,
                    }
                }
            }
        });

        const blocked = await db.query.factionBlockedUsers.findMany({
            where: eq(factionBlockedUsers.faction_id, factionId),
            with: {
                user: { columns: { id: true, username: true, role: true } },
                blockedBy: { columns: { username: true } },
            }
        });

        const blockedUserIds = blocked.map(b => b.user_id);

        const activeUsers = allJoinedMembers
            .filter(m => !blockedUserIds.includes(m.userId))
            .map(m => ({
                ...m.user,
                rank: m.rank,
            }));

        const blockedUsers = await Promise.all(blocked.map(async b => {
            const blockedUserMembership = await db.query.factionMembers.findFirst({
                where: and(eq(factionMembers.userId, b.user_id), eq(factionMembers.factionId, factionId))
            });
            return {
                ...b.user,
                rank: blockedUserMembership?.rank || 0,
                blockedBy: b.blockedBy.username,
                blockedAt: b.created_at,
            }
        }));


        return NextResponse.json({ 
            users: activeUsers, 
            blockedUsers: blockedUsers,
            currentUserRank: membership.rank 
        });

    } catch (error) {
        console.error('[API Users] Error fetching panel users:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
