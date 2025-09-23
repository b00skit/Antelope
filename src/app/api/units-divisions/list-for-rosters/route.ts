
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionOrganizationCat1 } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET /api/units-divisions/list-for-rosters
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
        
        const factionId = user.selectedFaction.id;

        if (!user.selectedFaction.feature_flags?.units_divisions_enabled) {
            return NextResponse.json({ allUnits: [] });
        }

        const allUnits = await db.query.factionOrganizationCat1.findMany({
            where: eq(factionOrganizationCat1.faction_id, factionId),
            with: {
                cat2s: {
                    with: {
                        cat3s: {
                            columns: {
                                id: true,
                                name: true,
                            }
                        }
                    },
                    columns: {
                        id: true,
                        name: true,
                    }
                }
            },
            columns: {
                name: true,
            }
        });

        return NextResponse.json({ allUnits });

    } catch (error) {
        console.error(`[API List Units for Rosters] Error:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
