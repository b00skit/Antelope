
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { activityRosters, activityRosterSections } from '@/db/schema';
import { and, eq, inArray, sql } from 'drizzle-orm';
import { z } from 'zod';

interface RouteParams {
    params: {
        id: string; // Roster ID
    }
}

const bulkMoveSchema = z.object({
    characterIds: z.array(z.number()),
    destinationSectionId: z.union([z.number(), z.literal('unassigned')]),
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
    const parsed = bulkMoveSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }
    
    const { characterIds, destinationSectionId } = parsed.data;

    try {
        const roster = await db.query.activityRosters.findFirst({
            where: and(
                eq(activityRosters.id, rosterId),
                eq(activityRosters.created_by, session.userId)
            ),
            with: { sections: true }
        });

        if (!roster) {
            return NextResponse.json({ error: 'Roster not found or you lack permission.' }, { status: 404 });
        }
        
        // Use a transaction for atomicity
        db.transaction((tx) => {
            // 1. Remove characters from ALL sections in this roster
            for (const section of roster.sections) {
                const currentIds = section.character_ids_json || [];
                const updatedIds = currentIds.filter(id => !characterIds.includes(id));
                if (updatedIds.length !== currentIds.length) {
                    tx.update(activityRosterSections)
                        .set({ character_ids_json: updatedIds })
                        .where(eq(activityRosterSections.id, section.id))
                        .run();
                }
            }

            // 2. Add characters to the destination section (if it's not 'unassigned')
            if (typeof destinationSectionId === 'number') {
                const destSection = roster.sections.find(s => s.id === destinationSectionId);
                if (destSection) {
                    const currentIds = new Set(destSection.character_ids_json || []);
                    characterIds.forEach(id => currentIds.add(id));
                    const updatedIds = Array.from(currentIds);

                    tx.update(activityRosterSections)
                        .set({ character_ids_json: updatedIds })
                        .where(eq(activityRosterSections.id, destinationSectionId))
                        .run();
                }
            }
        });

        return NextResponse.json({ success: true, message: 'Members moved successfully.' });

    } catch (error) {
        console.error(`[API Bulk Move] Error for roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
