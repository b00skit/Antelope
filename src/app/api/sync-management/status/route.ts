import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembersCache, factionMembersAbasCache, forumApiCache } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';

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

        const [membersCache, abasCache, forumCache] = await Promise.all([
            db.query.factionMembersCache.findFirst({
                where: eq(factionMembersCache.faction_id, factionId),
            }),
            db.query.factionMembersAbasCache.findFirst({
                where: eq(factionMembersAbasCache.faction_id, factionId),
                orderBy: [desc(factionMembersAbasCache.last_sync_timestamp)],
            }),
             db.query.forumApiCache.findFirst({
                orderBy: [desc(forumApiCache.last_sync_timestamp)],
            })
        ]);

        return NextResponse.json({
            membersLastSync: membersCache?.last_sync_timestamp || null,
            abasLastSync: abasCache?.last_sync_timestamp || null,
            forumLastSync: forumCache?.last_sync_timestamp || null,
            isForumEnabled: !!(user.selectedFaction.phpbb_api_url && user.selectedFaction.phpbb_api_key),
        });

    } catch (error) {
        console.error('[API Sync Status] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
