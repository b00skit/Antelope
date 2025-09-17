
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { activityRosters, activityRosterLabels, factions, factionMembers } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

interface RouteParams {
    params: {
        id: string; // Roster ID
    }
}

const bulkLabelSchema = z.object({
    characterIds: z.array(z.number()),
    color: z.string().nullable(), // color name like 'red', or null to clear
});


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
    const parsed = bulkLabelSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }
    
    const { characterIds, color } = parsed.data;
    if (characterIds.length === 0) {
        return NextResponse.json({ success: true, message: 'No members selected.' });
    }

    try {
        const roster = await db.query.activityRosters.findFirst({
            where: eq(activityRosters.id, rosterId),
            with: {
                faction: {
                    with: {
                        factionMembers: {
                            where: eq(factionMembers.userId, session.userId)
                        }
                    }
                }
            }
        });

        if (!roster) {
            return NextResponse.json({ error: 'Roster not found.' }, { status: 404 });
        }
        
        const membership = roster.faction.factionMembers[0];
        const hasAccess = roster.created_by === session.userId || roster.access_json?.includes(session.userId);
        const canSupervise = membership && membership.rank >= (roster.faction.supervisor_rank ?? 10);

        if (!hasAccess && !canSupervise) {
            return NextResponse.json({ error: 'You do not have permission to edit labels on this roster.' }, { status: 403 });
        }
        
        // Use a transaction to perform the bulk operation
        db.transaction((tx) => {
            // First, remove existing labels for the selected characters in this roster
            tx.delete(activityRosterLabels).where(and(
                eq(activityRosterLabels.activity_roster_id, rosterId),
                inArray(activityRosterLabels.character_id, characterIds)
            )).run();

            // If a color is provided, insert the new labels
            if (color) {
                const valuesToInsert = characterIds.map(charId => ({
                    activity_roster_id: rosterId,
                    character_id: charId,
                    color: color,
                }));
                tx.insert(activityRosterLabels).values(valuesToInsert).run();
            }
        });
        
        return NextResponse.json({ success: true, message: 'Labels updated successfully.' });

    } catch (error) {
        console.error(`[API Roster Bulk Label] Error for roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
