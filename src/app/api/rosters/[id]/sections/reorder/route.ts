import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { activityRosters, activityRosterSections } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';

interface RouteParams {
    params: {
        id: string; // Roster ID
    }
}

const reorderSchema = z.object({
    orderedSectionIds: z.array(z.number()),
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
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    try {
        const roster = await db.query.activityRosters.findFirst({
            where: and(
                eq(activityRosters.id, rosterId),
                eq(activityRosters.created_by, session.userId)
            ),
        });

        if (!roster) {
            return NextResponse.json({ error: 'Roster not found or you lack permission.' }, { status: 404 });
        }
        
        const { orderedSectionIds } = parsed.data;
        
        // Use a transaction to update all orders at once
        await db.transaction(async (tx) => {
            const updatePromises = orderedSectionIds.map((sectionId, index) => {
                return tx.update(activityRosterSections)
                    .set({ order: index })
                    .where(and(
                        eq(activityRosterSections.id, sectionId),
                        eq(activityRosterSections.activity_roster_id, rosterId)
                    ));
            });
            await Promise.all(updatePromises);
        });
        
        return NextResponse.json({ success: true, message: 'Sections reordered successfully.' });

    } catch (error) {
        console.error(`[API Reorder Sections] Error for roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}