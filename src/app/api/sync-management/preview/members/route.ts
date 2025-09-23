import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembersCache } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface Member {
    character_id: number;
    character_name: string;
    rank: number;
    rank_name: string;
    [key: string]: any;
}

interface Diff {
    added: Member[];
    updated: any[];
    removed: Member[];
    sourceData: Member[];
}

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

        // 1. Fetch live data from GTA:W
        const factionApiResponse = await fetch(`https://ucp.gta.world/api/faction/${factionId}`, {
            headers: { Authorization: `Bearer ${session.gtaw_access_token}` },
        });
        if (!factionApiResponse.ok) {
            if (factionApiResponse.status === 401) return NextResponse.json({ error: 'GTA:World session expired.', reauth: true }, { status: 401 });
            return NextResponse.json({ error: 'Failed to fetch member data from GTA:World API.' }, { status: 502 });
        }
        const gtawFactionData = await factionApiResponse.json();
        const liveMembers: Member[] = gtawFactionData.data.members;

        // 2. Fetch cached data
        const cachedFaction = await db.query.factionMembersCache.findFirst({
            where: eq(factionMembersCache.faction_id, factionId),
        });
        const cachedMembers: Member[] = cachedFaction?.members || [];
        
        // 3. Compare and generate diff
        const liveMap = new Map(liveMembers.map(m => [m.character_id, m]));
        const cachedMap = new Map(cachedMembers.map(m => [m.character_id, m]));
        
        const diff: Diff = { added: [], updated: [], removed: [], sourceData: liveMembers };

        // Check for additions and updates
        for (const [charId, liveMember] of liveMap.entries()) {
            const cachedMember = cachedMap.get(charId);
            if (!cachedMember) {
                diff.added.push(liveMember);
            } else {
                const changes: string[] = [];
                if (cachedMember.character_name !== liveMember.character_name) {
                    changes.push(`Name: ${cachedMember.character_name} -> ${liveMember.character_name}`);
                }
                if (cachedMember.rank !== liveMember.rank) {
                     changes.push(`Rank: ${cachedMember.rank_name} -> ${liveMember.rank_name}`);
                }
                if (changes.length > 0) {
                     diff.updated.push({
                        ...liveMember,
                        change_summary: changes.join(', '),
                    });
                }
            }
        }
        
        // Check for removals
        for (const [charId, cachedMember] of cachedMap.entries()) {
            if (!liveMap.has(charId)) {
                diff.removed.push(cachedMember);
            }
        }

        return NextResponse.json(diff);

    } catch (error) {
        console.error('[API Preview Members] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
