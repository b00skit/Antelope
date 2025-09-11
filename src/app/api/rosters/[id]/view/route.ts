
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { activityRosters, users, factionMembers } from '@/db/schema';
import { and, eq, or } from 'drizzle-orm';

interface RouteParams {
    params: {
        id: string;
    }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId || !session.gtaw_access_token) {
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
        
        // 1. Verify user has access to this roster
        const roster = await db.query.activityRosters.findFirst({
            where: and(
                eq(activityRosters.id, rosterId),
                eq(activityRosters.factionId, user.selected_faction_id),
                or(
                    eq(activityRosters.is_public, true),
                    eq(activityRosters.created_by, session.userId)
                )
            ),
            with: {
                faction: true
            }
        });

        if (!roster) {
            return NextResponse.json({ error: 'Roster not found or you do not have permission to view it.' }, { status: 404 });
        }

        // 2. Fetch faction data from GTA:W API
        const factionApiResponse = await fetch(`https://ucp.gta.world/api/faction/${roster.factionId}`, {
            headers: {
                Authorization: `Bearer ${session.gtaw_access_token}`,
                'Accept': 'application/json',
            },
        });
        
        if (!factionApiResponse.ok) {
            const errorBody = await factionApiResponse.text();
            console.error(`[API Roster View] Failed to fetch GTA:W faction data for faction ${roster.factionId}:`, errorBody);
            if (factionApiResponse.status === 401) {
                return NextResponse.json({ error: 'Your session has expired. Please log in again.', reauth: true }, { status: 401 });
            }
            return NextResponse.json({ error: 'Failed to fetch roster data from GTA:World API.' }, { status: 502 });
        }
        
        const gtawFactionData = await factionApiResponse.json();

        // 3. Return combined data
        return NextResponse.json({
            roster: {
                id: roster.id,
                name: roster.name,
                roster_setup_json: roster.roster_setup_json,
            },
            faction: {
                id: roster.faction.id,
                name: roster.faction.name,
            },
            members: gtawFactionData.data.members,
        });

    } catch (error) {
        console.error(`[API Roster View] Error fetching view data for roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
