import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { activityRosters, activityRosterSections } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

interface RouteParams {
    params: {
        id: string; // Roster ID
    }
}

const assignSchema = z.object({
    characterId: z.number(),
    sourceSectionId: z.union([z.number(), z.literal('unassigned')]),
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
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }
    
    const { characterId, sourceSectionId, destinationSectionId } = parsed.data;

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
        
        // This transaction ensures data consistency
        await db.transaction(async (tx) => {
            // Remove from source section
            if (typeof sourceSectionId === 'number') {
                const sourceSection = roster.sections.find(s => s.id === sourceSectionId);
                if (sourceSection) {
                    const updatedIds = (sourceSection.character_ids_json || []).filter(id => id !== characterId);
                    await tx.update(activityRosterSections)
                        .set({ character_ids_json: updatedIds })
                        .where(eq(activityRosterSections.id, sourceSectionId));
                }
            }

            // Add to destination section
            if (typeof destinationSectionId === 'number') {
                const destSection = roster.sections.find(s => s.id === destinationSectionId);
                if (destSection) {
                    const updatedIds = [...(destSection.character_ids_json || []), characterId];
                    await tx.update(activityRosterSections)
                        .set({ character_ids_json: updatedIds })
                        .where(eq(activityRosterSections.id, destinationSectionId));
                }
            }
        });

        return NextResponse.json({ success: true, message: 'Member moved successfully.' });

    } catch (error) {
        console.error(`[API Assign Section] Error for roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}