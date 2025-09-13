
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { activityRosterFavorites, users } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

// GET /api/rosters/favorites - Fetches favorite rosters for the user's active faction
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
            return NextResponse.json({ favorites: [] });
        }

        const favorites = await db.query.activityRosterFavorites.findMany({
            where: and(
                eq(activityRosterFavorites.user_id, session.userId),
                eq(activityRosterFavorites.faction_id, user.selected_faction_id)
            ),
        });

        return NextResponse.json({ favorites });

    } catch (error) {
        console.error('[API Rosters Favorites GET] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
