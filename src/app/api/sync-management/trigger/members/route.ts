import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembersCache, factionAuditLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { processFactionMemberAlts } from '@/lib/faction-sync';

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId || !session.gtaw_access_token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { sourceData: members, ...diff } = await request.json();

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
            with: { selectedFaction: true },
        });

        if (!user?.selectedFaction?.id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }
        const factionId = user.selectedFaction.id;
        
        db.transaction((tx) => {
            tx.insert(factionMembersCache)
                .values({ faction_id: factionId, members, last_sync_timestamp: new Date() })
                .onConflictDoUpdate({
                    target: factionMembersCache.faction_id,
                    set: { members, last_sync_timestamp: new Date() }
                }).run();

            tx.insert(factionAuditLogs).values({
                faction_id: factionId,
                user_id: session.userId!,
                category: 'sync_management',
                action: 'Synced Faction Members',
                details: diff,
            }).run();
        });

        await processFactionMemberAlts(factionId, members);

        return NextResponse.json({ success: true, message: 'Faction members sync completed.' });

    } catch (error) {
        console.error('[API Sync Members] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
