
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, forumApiCache } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

interface SyncPayload {
    group_id: number;
    name: string;
    members: { id: number; username: string }[];
}

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
    
    const sourceData: SyncPayload[] = await request.json();

    try {
        const now = new Date();
        
        for (const group of sourceData) {
            await db.insert(forumApiCache).values({
                faction_id: factionId,
                group_id: group.group_id,
                data: { members: group.members },
                last_sync_timestamp: now,
            }).onConflictDoUpdate({
                target: [forumApiCache.faction_id, forumApiCache.group_id],
                set: {
                    data: { members: group.members },
                    last_sync_timestamp: now,
                }
            });
        }
        
        return NextResponse.json({ success: true, message: `Successfully synced data for ${sourceData.length} forum groups.` });

    } catch (error) {
        console.error('[API Sync Forum] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
