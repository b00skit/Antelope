
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { activityRosters, activityRosterSnapshots, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { getRosterViewData } from '../view/helper';

interface RouteParams {
    params: {
        id: string; // Roster ID
    }
}

const createSnapshotSchema = z.object({
    name: z.string().min(3, "Snapshot name must be at least 3 characters long."),
});

// POST /api/rosters/[id]/snapshots - Creates a new snapshot
export async function POST(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rosterId = parseInt(params.id, 10);
    if (isNaN(rosterId)) {
        return NextResponse.json({ error: 'Invalid roster ID.' }, { status: 400 });
    }
    
    const body = await request.json();
    const parsed = createSnapshotSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
        });
        if (!user || !user.selected_faction_id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }
        
        // Fetch the fully processed roster data, just like the view endpoint
        const rosterDataResult = await getRosterViewData(rosterId, session, true);

        if ('error' in rosterDataResult) {
            const status = rosterDataResult.reauth ? 401 : 500;
            return NextResponse.json(rosterDataResult, { status });
        }

        await db.insert(activityRosterSnapshots).values({
            faction_id: user.selected_faction_id,
            source_roster_id: rosterId,
            name: parsed.data.name,
            created_by: session.userId,
            data_json: rosterDataResult,
        });

        return NextResponse.json({ success: true, message: 'Snapshot created successfully.' }, { status: 201 });

    } catch (error) {
        console.error(`[API Create Snapshot] Error for roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

