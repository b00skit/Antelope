import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factions } from '@/db/schema';
import { inArray } from 'drizzle-orm';

const MIN_ENROLL_RANK = 15;

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);
    if (!session.isLoggedIn || !session.gtaw_access_token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // 1. Fetch factions from GTA:W API
        const factionsResponse = await fetch('https://ucp.gta.world/api/factions', {
            headers: {
                Authorization: `Bearer ${session.gtaw_access_token}`,
            },
        });

        if (!factionsResponse.ok) {
            const errorBody = await factionsResponse.text();
            console.error('Failed to fetch GTA:W factions:', errorBody);
            if (factionsResponse.status === 401) {
                return NextResponse.json({ error: 'Your session has expired. Please log in again.', reauth: true }, { status: 401 });
            }
            return NextResponse.json({ error: 'Failed to fetch faction data from GTA:World API.' }, { status: 502 });
        }

        const gtawFactionsData = await factionsResponse.json();
        const characterFactions = gtawFactionsData.data;

        if (!characterFactions || Object.keys(characterFactions).length === 0) {
            return NextResponse.json({ eligibleFactions: [] });
        }

        // 2. Filter for eligible factions (rank >= MIN_ENROLL_RANK)
        const eligibleGtawFactions: { [key: string]: { id: number; name: string; rank: number } } = {};
        for (const charId in characterFactions) {
            const f = characterFactions[charId];
            if (f.faction_rank >= MIN_ENROLL_RANK) {
                // Keep the highest rank if the user is in the same faction on multiple characters
                if (!eligibleGtawFactions[f.faction_name] || f.faction_rank > eligibleGtawFactions[f.faction_name].rank) {
                    eligibleGtawFactions[f.faction_name] = {
                        id: f.faction,
                        name: f.faction_name,
                        rank: f.faction_rank,
                    };
                }
            }
        }

        const eligibleGtawFactionIds = Object.values(eligibleGtawFactions).map(f => f.id);

        if (eligibleGtawFactionIds.length === 0) {
            return NextResponse.json({ eligibleFactions: [] });
        }

        // 3. Check which of these factions are already in our database
        const alreadyEnrolledFactions = await db.query.factions.findMany({
            where: inArray(factions.id, eligibleGtawFactionIds),
        });
        const enrolledIds = new Set(alreadyEnrolledFactions.map(f => f.id));

        // 4. Return the factions that are eligible but not yet enrolled
        const finalEligibleFactions = Object.values(eligibleGtawFactions).filter(f => !enrolledIds.has(f.id));

        return NextResponse.json({ eligibleFactions: finalEligibleFactions });

    } catch (error) {
        console.error('[API Factions Eligible] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
