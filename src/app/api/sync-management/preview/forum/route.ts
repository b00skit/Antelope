
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, activityRosters } from '@/db/schema';
import { eq, and, isNotNull, sql } from 'drizzle-orm';

interface Diff {
    added: any[];
    updated: any[];
    removed: any[];
    sourceData: any; // Using any to match other preview routes, though it's a simple list here
    rostersToReset?: { id: number; name: string }[];
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

        if (!user.selectedFaction.phpbb_api_url || !user.selectedFaction.phpbb_api_key) {
            return NextResponse.json({ error: 'Forum integration is not enabled for this faction.' }, { status: 400 });
        }
        
        // Since a global sync isn't practical, the "sync" action is to clear caches.
        // The preview will show which rosters have a forum cache that would be cleared.
        const rostersWithForumConfig = await db.query.activityRosters.findMany({
            where: and(
                eq(activityRosters.factionId, user.selectedFaction.id),
                isNotNull(activityRosters.roster_setup_json),
                // This is a bit of a trick to check for JSON keys in SQLite/MySQL
                sql`json_extract(${activityRosters.roster_setup_json}, '$.forum_groups_included') IS NOT NULL OR json_extract(${activityRosters.roster_setup_json}, '$.forum_groups_excluded') IS NOT NULL`
            ),
            columns: {
                id: true,
                name: true,
            }
        });

        const diff: Diff = { 
            added: [], 
            updated: [], 
            removed: [], 
            sourceData: null, // No source data to save, sync just clears cache
            rostersToReset: rostersWithForumConfig,
        };

        return NextResponse.json(diff);

    } catch (error) {
        console.error('[API Preview Forum] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
