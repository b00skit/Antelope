
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { activityRosters, users, factionMembers } from '@/db/schema';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { canUserManage } from '../../units-divisions/[cat1Id]/[cat2Id]/helpers';


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
    visibility: z.enum(['personal', 'private', 'unlisted', 'public', 'organization']).default('personal'),
    password: z.string().optional().nullable(),
    roster_setup_json: jsonString.optional().nullable(),
    access_json: z.array(z.number()).optional().nullable(),
    organization_category_type: z.enum(['cat_2', 'cat_3']).optional().nullable(),
    organization_category_id: z.number().optional().nullable(),
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
            where: eq(activityRosters.id, rosterId),
            with: { faction: true }
        });

        if (!roster) {
            return NextResponse.json({ error: 'Roster not found.' }, { status: 404 });
        }
        
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
        });

        if (!user || !user.selected_faction_id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }

        let hasAccess = false;
        if (roster.visibility === 'organization' && roster.organization_category_type && roster.organization_category_id) {
             const userMembership = await db.query.factionMembers.findFirst({
                where: and(eq(factionMembers.userId, session.userId!), eq(factionMembers.factionId, roster.factionId))
            });
            if (userMembership) {
                const result = await canUserManage(session, user, userMembership, roster.faction, roster.organization_category_type, roster.organization_category_id);
                hasAccess = result.authorized;
            }
        } else {
            hasAccess = roster.created_by === session.userId || roster.access_json?.includes(session.userId);
        }
        
        if (!hasAccess) {
             return NextResponse.json({ error: 'You do not have permission to edit this roster.' }, { status: 403 });
        }
        
        const { password, ...rosterData } = roster;
        
        const factionUsers = await db.query.users.findMany({
            where: eq(users.selected_faction_id, user.selected_faction_id)
        });

        return NextResponse.json({ roster: rosterData, factionUsers });

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
        const roster = await db.query.activityRosters.findFirst({
            where: eq(activityRosters.id, rosterId),
            with: { faction: true }
        });

        if (!roster) {
            return NextResponse.json({ error: 'Roster not found.' }, { status: 404 });
        }

        let hasAccess = false;
        if (roster.visibility === 'organization' && roster.organization_category_type && roster.organization_category_id) {
            const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
            const userMembership = await db.query.factionMembers.findFirst({
                where: and(eq(factionMembers.userId, session.userId!), eq(factionMembers.factionId, roster.factionId))
            });
            if (user && userMembership) {
                const result = await canUserManage(session, user, userMembership, roster.faction, roster.organization_category_type, roster.organization_category_id);
                hasAccess = result.authorized;
            }
        } else {
            hasAccess = roster.created_by === session.userId || roster.access_json?.includes(session.userId);
        }

        if (!hasAccess) {
            return NextResponse.json({ error: 'You do not have permission to edit this roster.' }, { status: 403 });
        }
        
        const updateData: Partial<typeof activityRosters.$inferInsert> = {
            name: parsed.data.name,
            visibility: roster.visibility === 'organization' ? 'organization' : parsed.data.visibility,
            roster_setup_json: parsed.data.roster_setup_json,
            access_json: parsed.data.visibility === 'personal' ? null : parsed.data.access_json,
            organization_category_type: roster.visibility === 'organization' ? roster.organization_category_type : parsed.data.organization_category_type,
            organization_category_id: roster.visibility === 'organization' ? roster.organization_category_id : parsed.data.organization_category_id,
            updated_at: sql`(strftime('%s', 'now'))`
        };

        if (parsed.data.visibility === 'private' && parsed.data.password) {
            updateData.password = await bcrypt.hash(parsed.data.password, 10);
        } else if (parsed.data.visibility !== 'private') {
            updateData.password = null;
        }

        const result = await db.update(activityRosters)
            .set(updateData)
            .where(eq(activityRosters.id, rosterId))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ error: 'Roster not found or update failed.' }, { status: 404 });
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
        const roster = await db.query.activityRosters.findFirst({
            where: eq(activityRosters.id, rosterId)
        });

        if (!roster) {
            return NextResponse.json({ error: 'Roster not found.' }, { status: 404 });
        }
        
        if (roster.visibility === 'organization') {
            return NextResponse.json({ error: 'Organizational rosters cannot be deleted from here.' }, { status: 403 });
        }

        const hasAccess = roster.created_by === session.userId || roster.access_json?.includes(session.userId);
        if (!hasAccess) {
            return NextResponse.json({ error: 'You do not have permission to delete this roster.' }, { status: 403 });
        }

        const result = await db.delete(activityRosters)
            .where(eq(activityRosters.id, rosterId))
            .returning();

        if (result.length === 0) {
            return NextResponse.json({ error: 'Roster not found or delete failed.' }, { status: 404 });
        }
        
        return NextResponse.json({ success: true, message: 'Roster deleted successfully.' });

    } catch (error) {
        console.error(`[API Roster Delete] Error deleting roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
