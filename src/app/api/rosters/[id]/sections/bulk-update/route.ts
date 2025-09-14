
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

const sectionUpdateSchema = z.object({
    id: z.number(),
    character_ids_json: z.array(z.number()),
});

const bulkUpdateSchema = z.object({
    sections: z.array(sectionUpdateSchema),
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
    const parsed = bulkUpdateSchema.safeParse(body);
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
        
        const { sections } = parsed.data;
        
        // Drizzle transactions with better-sqlite3 are synchronous and do not support async callbacks.
        // We will execute updates sequentially within the transaction block.
        db.transaction((tx) => {
            for (const section of sections) {
                tx.update(activityRosterSections)
                    .set({ character_ids_json: section.character_ids_json })
                    .where(and(
                        eq(activityRosterSections.id, section.id),
                        eq(activityRosterSections.activity_roster_id, rosterId)
                    )).run(); // .run() executes the query synchronously for better-sqlite3
            }
        });
        
        return NextResponse.json({ success: true, message: 'Roster sections updated successfully.' });

    } catch (error) {
        console.error(`[API Bulk Update Sections] Error for roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
