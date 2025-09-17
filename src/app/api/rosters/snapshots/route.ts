
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, activityRosterSnapshots } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';


// GET /api/rosters/snapshots - Fetches all snapshots for a faction
export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
        });

        if (!user || !user.selected_faction_id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }

        const snapshots = await db.query.activityRosterSnapshots.findMany({
            where: eq(activityRosterSnapshots.faction_id, user.selected_faction_id),
            with: {
                creator: {
                    columns: {
                        username: true,
                    }
                }
            },
            orderBy: [desc(activityRosterSnapshots.created_at)],
        });

        return NextResponse.json({ snapshots });

    } catch (error) {
        console.error('[API Snapshots GET] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

