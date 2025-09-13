import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { activityRosters } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';


interface RouteParams {
    params: {
        id: string;
    }
}

const jsonString = z.string().refine((value) => {
    if (!value) return true; // Allow empty string
    try {
      JSON.parse(value);
      return true;
    } catch (e) {
      return false;
    }
}, { message: "Must be a valid JSON object." });

const updateRosterSchema = z.object({
    name: z.string().min(3, "Roster name must be at least 3 characters long."),
    visibility: z.enum(['personal', 'private', 'unlisted', 'public']).default('personal'),
    password: z.string().optional().nullable(),
    roster_setup_json: jsonString.optional().nullable(),
}).refine(data => data.visibility !== 'private' || (data.password && data.password.length > 0) || (data.password === null), {
    message: "A new password is required to keep this roster private.",
    path: ["password"],
});

// GET /api/rosters/[id] - Gets a single roster for editing
export async function GET(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rosterId = parseInt(params.id, 10);
    if (isNaN(rosterId)) {
        return NextResponse.json({ error: 'Invalid roster ID.' }, { status: 400 });
    }

    try {
        const roster = await db.query.activityRosters.findFirst({
            where: and(
                eq(activityRosters.id, rosterId),
                eq(activityRosters.created_by, session.userId)
            ),
        });

        if (!roster) {
            return NextResponse.json({ error: 'Roster not found or you do not have permission to edit it.' }, { status: 404 });
        }
        
        // Don't expose the hashed password
        const { password, ...rosterData } = roster;
        return NextResponse.json({ roster: rosterData });

    } catch (error) {
        console.error(`[API Roster GET] Error getting roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


// PUT /api/rosters/[id] - Updates a specific roster
export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const parsed = updateRosterSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }
    
    try {
        const updateData: Partial<typeof activityRosters.$inferInsert> = {
            name: parsed.data.name,
            visibility: parsed.data.visibility,
            roster_setup_json: parsed.data.roster_setup_json,
            updated_at: sql`(strftime('%s', 'now'))`
        };

        // Only hash and update password if a new one is provided
        if (parsed.data.visibility === 'private' && parsed.data.password) {
            updateData.password = await bcrypt.hash(parsed.data.password, 10);
        } else if (parsed.data.visibility !== 'private') {
            updateData.password = null; // Clear password if not private
        }

        const result = await db.update(activityRosters)
            .set(updateData)
            .where(and(
                eq(activityRosters.id, rosterId),
                eq(activityRosters.created_by, session.userId)
            )).returning();

        if (result.length === 0) {
            return NextResponse.json({ error: 'Roster not found or you do not have permission to edit it.' }, { status: 404 });
        }
        
        return NextResponse.json({ success: true, message: 'Roster updated successfully.' });

    } catch (error) {
        console.error(`[API Roster PUT] Error updating roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


// DELETE /api/rosters/[id] - Deletes a specific roster
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rosterId = parseInt(params.id, 10);
    if (isNaN(rosterId)) {
        return NextResponse.json({ error: 'Invalid roster ID.' }, { status: 400 });
    }

    try {
        const result = await db.delete(activityRosters)
            .where(and(
                eq(activityRosters.id, rosterId),
                eq(activityRosters.created_by, session.userId)
            )).returning();

        if (result.length === 0) {
            return NextResponse.json({ error: 'Roster not found or you do not have permission to delete it.' }, { status: 404 });
        }
        
        return NextResponse.json({ success: true, message: 'Roster deleted successfully.' });

    } catch (error) {
        console.error(`[API Roster Delete] Error deleting roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
