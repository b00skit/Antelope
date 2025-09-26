
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembersCache } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
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

        const [ranksResponse, membersCache] = await Promise.all([
             fetch(`https://ucp.gta.world/api/faction/${factionId}/ranks`, {
                headers: { Authorization: `Bearer ${session.gtaw_access_token}` },
            }),
             db.query.factionMembersCache.findFirst({
                where: eq(factionMembersCache.faction_id, factionId)
            })
        ]);

        let ranksData = [];
        if (ranksResponse.ok) {
            const data = await ranksResponse.json();
            ranksData = data.data;
        } else {
             if (ranksResponse.status === 401) return NextResponse.json({ error: 'GTA:World session expired.', reauth: true }, { status: 401 });
             console.warn(`[API Fiscal Data] Failed to fetch ranks from GTA:W API. Status: ${ranksResponse.status}`);
        }
        
        const membersByRank = (membersCache?.members || []).reduce((acc: Record<number, number>, member: any) => {
            acc[member.rank] = (acc[member.rank] || 0) + 1;
            return acc;
        }, {});
        
        const totalMembers = membersCache?.members?.length || 0;

        return NextResponse.json({
            ranks: ranksData,
            membersByRank,
            totalMembers,
        });

    } catch (error) {
        console.error('[API Fiscal Data] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
