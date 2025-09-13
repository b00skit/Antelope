
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { activityRosters, activityRosterFavorites, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

interface RouteParams {
    params: {
        id: string;
    }
}

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

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
        });
        if (!user || !user.selected_faction_id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }
        
        const roster = await db.query.activityRosters.findFirst({
            where: eq(activityRosters.id, rosterId)
        });
        if (!roster) {
            return NextResponse.json({ error: 'Roster not found.' }, { status: 404 });
        }

        const existingFavorite = await db.query.activityRosterFavorites.findFirst({
            where: and(
                eq(activityRosterFavorites.user_id, session.userId),
                eq(activityRosterFavorites.activity_roster_id, rosterId)
            ),
        });

        if (existingFavorite) {
            // Unfavorite
            await db.delete(activityRosterFavorites).where(eq(activityRosterFavorites.id, existingFavorite.id));
            return NextResponse.json({ success: true, message: 'Roster removed from favorites.' });
        } else {
            // Favorite
            await db.insert(activityRosterFavorites).values({
                user_id: session.userId,
                faction_id: user.selected_faction_id,
                activity_roster_id: rosterId,
                activity_roster_name: roster.name,
            });
            return NextResponse.json({ success: true, message: 'Roster added to favorites.' });
        }

    } catch (error) {
        console.error(`[API Roster Favorite] Error toggling favorite for roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
