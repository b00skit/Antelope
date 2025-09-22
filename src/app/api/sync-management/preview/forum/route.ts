
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, apiForumSyncableGroups, forumApiCache } from '@/db/schema';
import { eq } from 'drizzle-orm';
import config from '@config';

interface Diff {
    added: any[];
    updated: any[];
    removed: any[];
    sourceData: any[];
}

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
            const res = await fetch(url);
            if (!res.ok) return { group_id: group.group_id, name: group.name, members: [] };
            const data = await res.json();
            const allMembers = [
                ...(data.group?.members || []),
                ...(data.group?.leaders || [])
            ];
            return { group_id: group.group_id, name: group.name, members: allMembers };
        });
        
        const liveGroupData = await Promise.all(groupPromises);
        const cachedGroups = await db.query.forumApiCache.findMany({
            where: eq(forumApiCache.faction_id, faction.id)
        });
        const cachedGroupsMap = new Map(cachedGroups.map(g => [g.group_id, g]));

        const diff: Diff = { added: [], updated: [], removed: [], sourceData: liveGroupData };
        
        for (const liveGroup of liveGroupData) {
            const cachedGroup = cachedGroupsMap.get(liveGroup.group_id);
            const liveUsernames = new Set(liveGroup.members.map((m: any) => m.username));

            if (!cachedGroup) {
                if (liveUsernames.size > 0) {
                     diff.added.push({ 
                        group_name: liveGroup.name,
                        change_summary: `Syncing ${liveUsernames.size} members.`,
                        members: Array.from(liveUsernames)
                    });
                }
            } else {
                const cachedUsernames = new Set((cachedGroup.data?.members || []).map((m: any) => m.username));
                const addedMembers = [...liveUsernames].filter(u => !cachedUsernames.has(u));
                const removedMembers = [...cachedUsernames].filter(u => !liveUsernames.has(u));

                if (addedMembers.length > 0 || removedMembers.length > 0) {
                     diff.updated.push({ 
                        group_name: liveGroup.name, 
                        change_summary: `+${addedMembers.length} added, -${removedMembers.length} removed.`,
                        added: addedMembers,
                        removed: removedMembers,
                    });
                }
            }
        }
        
        return NextResponse.json(diff);

    } catch (error) {
        console.error('[API Preview Forum Sync] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
