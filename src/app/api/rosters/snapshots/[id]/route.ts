
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { activityRosterSnapshots, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';


interface RouteParams {
    params: {
        id: string; // Snapshot ID
    }
}

// GET /api/rosters/snapshots/[id] - Gets a single snapshot
export async function GET(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const snapshotId = parseInt(params.id, 10);
    if (isNaN(snapshotId)) {
        return NextResponse.json({ error: 'Invalid snapshot ID.' }, { status: 400 });
    }
    
    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
        });
        if (!user || !user.selected_faction_id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }

        const snapshot = await db.query.activityRosterSnapshots.findFirst({
            where: and(
                eq(activityRosterSnapshots.id, snapshotId),
                eq(activityRosterSnapshots.faction_id, user.selected_faction_id)
            ),
        });

        if (!snapshot) {
            return NextResponse.json({ error: 'Snapshot not found.' }, { status: 404 });
        }

        // The data is already stored as fully processed JSON
        return NextResponse.json(snapshot.data_json);

    } catch (error) {
        console.error(`[API Get Snapshot] Error for snapshot ${snapshotId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE /api/rosters/snapshots/[id] - Deletes a snapshot
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const snapshotId = parseInt(params.id, 10);
    if (isNaN(snapshotId)) {
        return NextResponse.json({ error: 'Invalid snapshot ID.' }, { status: 400 });
    }

    try {
         const snapshot = await db.query.activityRosterSnapshots.findFirst({
            where: eq(activityRosterSnapshots.id, snapshotId),
        });

        if (!snapshot) {
            return NextResponse.json({ error: 'Snapshot not found.' }, { status: 404 });
        }
        
        // For now, only the creator can delete. This could be expanded later.
        if (snapshot.created_by !== session.userId) {
             return NextResponse.json({ error: 'You do not have permission to delete this snapshot.' }, { status: 403 });
        }

        await db.delete(activityRosterSnapshots).where(eq(activityRosterSnapshots.id, snapshotId));

        return NextResponse.json({ success: true, message: 'Snapshot deleted.' });

    } catch (error) {
        console.error(`[API Delete Snapshot] Error for snapshot ${snapshotId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

