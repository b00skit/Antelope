import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factions, users } from '@/db/schema';
import { inArray, eq } from 'drizzle-orm';

const MIN_ENROLL_RANK = 15;

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);
    if (!session.isLoggedIn || !session.gtaw_access_token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const isSuperAdminMode = searchParams.get('superadmin') === 'true';

    try {
        const currentUser = await db.query.users.findFirst({
            where: eq(users.id, session.userId!),
        });

        const isSuperAdmin = currentUser?.role === 'superadmin';

        let gtawFactions: { id: number; name: string; rank?: number }[] = [];

        // Super Admin Flow: Fetch all factions
        if (isSuperAdmin && isSuperAdminMode) {
            const allFactionsResponse = await fetch('https://ucp.gta.world/api/factions/list', {
                headers: {
                    Authorization: `Bearer ${session.gtaw_access_token}`,
                },
            });

            if (!allFactionsResponse.ok) {
                 if (allFactionsResponse.status === 401) return NextResponse.json({ error: 'Your session has expired. Please log in again.', reauth: true }, { status: 401 });
                return NextResponse.json({ error: 'Failed to fetch all factions list from GTA:World API.' }, { status: 502 });
            }
            const allFactionsData = await allFactionsResponse.json();
            // Assuming the API returns an array of objects like { id: number, name: string }
            gtawFactions = allFactionsData.data.map((f: any) => ({ id: f.ID, name: f.Name, rank: 99 })); // Assign a dummy high rank
        
        // Regular User Flow: Fetch user's factions
        } else {
            const factionsResponse = await fetch('https://ucp.gta.world/api/factions', {
                headers: { Authorization: `Bearer ${session.gtaw_access_token}` },
            });

            if (!factionsResponse.ok) {
                if (factionsResponse.status === 401) return NextResponse.json({ error: 'Your session has expired. Please log in again.', reauth: true }, { status: 401 });
                return NextResponse.json({ error: 'Failed to fetch faction data from GTA:World API.' }, { status: 502 });
            }

            const gtawFactionsData = await factionsResponse.json();
            const characterFactions = gtawFactionsData.data;

            if (!characterFactions || Object.keys(characterFactions).length === 0) {
                return NextResponse.json({ eligibleFactions: [] });
            }

            const highestRanks: { [key: string]: { id: number; name: string; rank: number } } = {};
            for (const charId in characterFactions) {
                const f = characterFactions[charId];
                if (f.faction_rank >= MIN_ENROLL_RANK) {
                    if (!highestRanks[f.faction_name] || f.faction_rank > highestRanks[f.faction_name].rank) {
                        highestRanks[f.faction_name] = { id: f.faction, name: f.faction_name, rank: f.faction_rank };
                    }
                }
            }
            gtawFactions = Object.values(highestRanks);
        }

        if (gtawFactions.length === 0) {
            return NextResponse.json({ eligibleFactions: [] });
        }

        const eligibleGtawFactionIds = gtawFactions.map(f => f.id);

        const alreadyEnrolledFactions = await db.query.factions.findMany({
            where: inArray(factions.id, eligibleGtawFactionIds),
        });
        const enrolledIds = new Set(alreadyEnrolledFactions.map(f => f.id));

        const finalEligibleFactions = gtawFactions.filter(f => !enrolledIds.has(f.id));

        return NextResponse.json({ eligibleFactions: finalEligibleFactions });

    } catch (error) {
        console.error('[API Factions Eligible] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
