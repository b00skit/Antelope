
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
        sectionId: string;
    }
}

const configSchema = z.object({
    include_names: z.array(z.string()).optional(),
    include_ranks: z.array(z.number()).optional(),
    include_forum_groups: z.array(z.number()).optional(),
    exclude_names: z.array(z.string()).optional(),
    alternative_characters: z.boolean().optional(),
}).optional().nullable();

const updateSectionSchema = z.object({
    name: z.string().min(1, "Section name cannot be empty.").optional(),
    description: z.string().optional().nullable(),
    character_ids_json: z.array(z.number()).optional(),
    configuration_json: configSchema,
});


// PUT /api/rosters/[id]/sections/[sectionId] - Update a section
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rosterId = parseInt(params.id, 10);
    const sectionId = parseInt(params.sectionId, 10);
    if (isNaN(rosterId) || isNaN(sectionId)) {
        return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = updateSectionSchema.safeParse(body);
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

        const result = await db.update(activityRosterSections)
            .set(parsed.data)
            .where(eq(activityRosterSections.id, sectionId))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ error: 'Section not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, section: result[0] });

    } catch (error) {
        console.error(`[API Section Update] Error for roster ${rosterId}, section ${sectionId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE /api/rosters/[id]/sections/[sectionId] - Delete a section
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const rosterId = parseInt(params.id, 10);
    const sectionId = parseInt(params.sectionId, 10);
     if (isNaN(rosterId) || isNaN(sectionId)) {
        return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
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

        const result = await db.delete(activityRosterSections)
            .where(eq(activityRosterSections.id, sectionId))
            .returning();
        
        if (result.length === 0) {
            return NextResponse.json({ error: 'Section not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Section deleted successfully.' });

    } catch (error) {
        console.error(`[API Section Delete] Error for roster ${rosterId}, section ${sectionId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
