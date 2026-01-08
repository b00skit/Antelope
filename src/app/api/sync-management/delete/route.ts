
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionMembersCache } from '@/db/schema/factionMembersCache';
import { factionMembersAbasCache } from '@/db/schema/factionMembersAbasCache';
import { forumApiCache } from '@/db/schema/forumApiCache';
import { apiCacheAlternativeCharacters } from '@/db/schema/apiCacheAlternativeCharacters';
import { factionAuditLogs } from '@/db/schema/auditLogs';
import { eq } from 'drizzle-orm';

export async function DELETE(request: NextRequest) {
    try {
        const session = await getSession(request.cookies);
        if (!session.isLoggedIn || !session.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, session.userId!),
            with: {
                selectedFaction: true,
            }
        });

        if (!user || !user.selectedFaction) {
             return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }

        const factionId = user.selectedFaction.id;

        // Delete data from caches
        await db.delete(factionMembersCache).where(eq(factionMembersCache.faction_id, factionId));
        await db.delete(factionMembersAbasCache).where(eq(factionMembersAbasCache.faction_id, factionId));
        await db.delete(forumApiCache).where(eq(forumApiCache.faction_id, factionId));
        await db.delete(apiCacheAlternativeCharacters).where(eq(apiCacheAlternativeCharacters.faction_id, factionId));

        // Log the action
        await db.insert(factionAuditLogs).values({
            faction_id: factionId,
            user_id: session.userId,
            category: 'sync_management',
            action: 'delete_data',
            details: {
                timestamp: new Date().toISOString(),
                user_agent: request.headers.get('user-agent'),
            }
        });

        return NextResponse.json({ message: 'Sync data deleted successfully.' });

    } catch (error: any) {
        console.error('Error deleting sync data:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
