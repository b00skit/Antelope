import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembersAbasCache, factionMembersCache } from '@/db/schema';
import { eq, inArray } from 'drizzle-orm';

interface AbasData {
    character_id: number;
    abas: string;
}

interface Diff {
    added: any[];
    updated: any[];
    removed: any[];
    sourceData: any;
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
        const abasApiResponse = await fetch(`https://ucp.gta.world/api/faction/${factionId}/abas`, {
            headers: { Authorization: `Bearer ${session.gtaw_access_token}` },
        });
        if (!abasApiResponse.ok) {
            if (abasApiResponse.status === 401) return NextResponse.json({ error: 'GTA:World session expired.', reauth: true }, { status: 401 });
            return NextResponse.json({ error: 'Failed to fetch ABAS data from GTA:World API.' }, { status: 502 });
        }
        const abasData = await abasApiResponse.json();
        const liveAbas: AbasData[] = abasData.data;

        // 2. Fetch cached data
        const cachedMembers = await db.query.factionMembersCache.findFirst({
            where: eq(factionMembersCache.faction_id, factionId),
        });
        const characterIds = cachedMembers?.members?.map((m: any) => m.character_id) || [];
        
        const cachedAbas = characterIds.length > 0 ? await db.query.factionMembersAbasCache.findMany({
            where: eq(factionMembersAbasCache.faction_id, factionId)
        }) : [];

        // 3. Compare and generate diff
        const liveMap = new Map(liveAbas.map(a => [a.character_id, a]));
        const cachedMap = new Map(cachedAbas.map(a => [a.character_id, a]));
        const memberMap = new Map(cachedMembers?.members?.map((m: any) => [m.character_id, m.character_name]) || []);

        const diff: Diff = { added: [], updated: [], removed: [], sourceData: liveAbas };

        for (const [charId, liveEntry] of liveMap.entries()) {
            const cachedEntry = cachedMap.get(charId);
            const characterName = memberMap.get(charId) || `Character #${charId}`;

            if (!cachedEntry) {
                diff.added.push({ character_id: charId, character_name: characterName, new_abas: liveEntry.abas, old_abas: 'N/A' });
            } else if (cachedEntry.abas !== liveEntry.abas) {
                diff.updated.push({ character_id: charId, character_name: characterName, new_abas: liveEntry.abas, old_abas: cachedEntry.abas });
            }
        }
        
        // Removed are not tracked for ABAS as it's a sparse dataset

        return NextResponse.json(diff);

    } catch (error) {
        console.error('[API Preview ABAS] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
