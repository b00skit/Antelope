
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, apiForumSyncableGroups, factionOrganizationMembership, factionMembersCache } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import config from '@config';

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
        const faction = user.selectedFaction;

        if (!faction.phpbb_api_url || !faction.phpbb_api_key) {
            return NextResponse.json({ error: 'Forum integration is not enabled for this faction.' }, { status: 400 });
        }
        
        const syncableGroups = await db.query.apiForumSyncableGroups.findMany({
            where: eq(apiForumSyncableGroups.faction_id, faction.id)
        });

        if (syncableGroups.length === 0) {
            return NextResponse.json({ added: [], updated: [], removed: [], sourceData: [] });
        }

        const baseUrl = faction.phpbb_api_url.endsWith('/') ? faction.phpbb_api_url : `${faction.phpbb_api_url}/`;
        const apiKey = faction.phpbb_api_key;

        const groupPromises = syncableGroups.map(async (group) => {
            const url = `${baseUrl}app.php/booskit/phpbbapi/group/${group.group_id}?key=${apiKey}`;
            const res = await fetch(url, { next: { revalidate: config.FORUM_API_REFRESH_MINUTES * 60 } });
            if (!res.ok) return { groupId: group.group_id, members: [] };
            const data = await res.json();
            const allMembers = [
                ...(data.group?.members?.map((m: any) => m.username.replace(/_/g, ' ')) || []),
                ...(data.group?.leaders?.map((l: any) => l.username.replace(/_/g, ' ')) || [])
            ];
            return { groupId: group.group_id, members: allMembers };
        });

        const groupResults = await Promise.all(groupPromises);
        const liveForumUsernames = new Set<string>();
        for (const result of groupResults) {
            result.members.forEach(username => liveForumUsernames.add(username));
        }

        const [factionCache, existingMemberships] = await Promise.all([
            db.query.factionMembersCache.findFirst({ where: eq(factionMembersCache.faction_id, faction.id) }),
            db.query.factionOrganizationMembership.findMany({
                where: inArray(factionOrganizationMembership.category_id, syncableGroups.map(g => g.group_id))
            })
        ]);

        if (!factionCache?.members) {
             return NextResponse.json({ error: 'Faction member cache is missing. Please sync members first.' }, { status: 400 });
        }

        const factionCharacterMap = new Map(factionCache.members.map((m: any) => [m.character_name, m.character_id]));
        const existingCharacterIds = new Set(existingMemberships.map(m => m.character_id));
        const liveCharacterIds = new Set<number>();
        liveForumUsernames.forEach(username => {
            if (factionCharacterMap.has(username)) {
                liveCharacterIds.add(factionCharacterMap.get(username));
            }
        });

        const diff: Diff = { added: [], updated: [], removed: [], sourceData: { syncableGroups, groupResults } };

        const idToNameMap = new Map(factionCache.members.map((m: any) => [m.character_id, m.character_name]));

        // Added
        liveCharacterIds.forEach(id => {
            if (!existingCharacterIds.has(id)) {
                diff.added.push({ character_id: id, character_name: idToNameMap.get(id) || `Character #${id}` });
            }
        });

        // Removed
        existingCharacterIds.forEach(id => {
            if (!liveCharacterIds.has(id)) {
                diff.removed.push({ character_id: id, character_name: idToNameMap.get(id) || `Character #${id}` });
            }
        });

        return NextResponse.json(diff);

    } catch (error) {
        console.error('[API Preview Forum Sync] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
