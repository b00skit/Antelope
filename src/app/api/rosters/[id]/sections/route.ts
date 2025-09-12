import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { activityRosters, activityRosterSections } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';

interface RouteParams {
    params: {
        id: string; // This is the roster ID
    }
}

const sectionSchema = z.object({
    name: z.string().min(1, "Section name cannot be empty."),
    description: z.string().optional().nullable(),
});

// POST /api/rosters/[id]/sections - Create a new section for a roster
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
    const parsed = sectionSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    try {
        // Check if user has permission to edit this roster
        const roster = await db.query.activityRosters.findFirst({
            where: and(
                eq(activityRosters.id, rosterId),
                eq(activityRosters.created_by, session.userId)
            ),
        });

        if (!roster) {
            return NextResponse.json({ error: 'Roster not found or you do not have permission to edit it.' }, { status: 404 });
        }
        
        // Get the highest current order to append the new section
        const highestOrderResult = await db.select({ value: sql`MAX(${activityRosterSections.order})` }).from(activityRosterSections).where(eq(activityRosterSections.activity_roster_id, rosterId));
        const nextOrder = (highestOrderResult[0].value as number | null ?? -1) + 1;

        const newSection = await db.insert(activityRosterSections).values({
            activity_roster_id: rosterId,
            name: parsed.data.name,
            description: parsed.data.description,
            order: nextOrder
        }).returning();

        return NextResponse.json({ success: true, section: newSection[0] }, { status: 201 });

    } catch (error) {
        console.error(`[API Section Create] Error for roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}