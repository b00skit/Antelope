import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembersCache } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { processFactionMemberAlts } from '@/lib/faction-sync';

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId || !session.gtaw_access_token) {
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
        
        const factionApiResponse = await fetch(`https://ucp.gta.world/api/faction/${factionId}`, {
            headers: { Authorization: `Bearer ${session.gtaw_access_token}` },
        });

        if (!factionApiResponse.ok) {
            if (factionApiResponse.status === 401) return NextResponse.json({ error: 'GTA:World session expired. Please log in again.', reauth: true }, { status: 401 });
            return NextResponse.json({ error: 'Failed to fetch member data from GTA:World API.' }, { status: 502 });
        }
        
        const gtawFactionData = await factionApiResponse.json();
        const members = gtawFactionData.data.members;

        await db.insert(factionMembersCache)
            .values({ faction_id: factionId, members, last_sync_timestamp: new Date() })
            .onConflictDoUpdate({ 
                target: factionMembersCache.faction_id, 
                set: { members, last_sync_timestamp: new Date() } 
            });
            
        // Process alternative characters
        await processFactionMemberAlts(factionId, members);

        return NextResponse.json({ success: true, message: 'Faction members sync completed.' });

    } catch (error) {
        console.error('[API Sync Members] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
