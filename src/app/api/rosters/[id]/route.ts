import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { activityRosters } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

interface RouteParams {
    params: {
        id: string;
    }
}

// DELETE /api/rosters/[id] - Deletes a specific roster
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rosterId = parseInt(params.id, 10);
    if (isNaN(rosterId)) {
        return NextResponse.json({ error: 'Invalid roster ID.' }, { status: 400 });
    }

    try {
        const result = await db.delete(activityRosters)
            .where(and(
                eq(activityRosters.id, rosterId),
                eq(activityRosters.created_by, session.userId)
            )).returning();

        if (result.length === 0) {
            return NextResponse.json({ error: 'Roster not found or you do not have permission to delete it.' }, { status: 404 });
        }
        
        return NextResponse.json({ success: true, message: 'Roster deleted successfully.' });

    } catch (error) {
        console.error(`[API Roster Delete] Error deleting roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
