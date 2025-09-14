
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionOrganizationMembership } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { canManageCat2 } from '../../../[cat1Id]/[cat2Id]/helpers';
import { z } from 'zod';

interface RouteParams {
    params: {
        membershipId: string;
    }
}

const moveMemberSchema = z.object({
    source_cat2_id: z.number().int(),
    destination_type: z.enum(['cat_2', 'cat_3']),
    destination_id: z.number().int(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const membershipId = parseInt(params.membershipId, 10);
    if (isNaN(membershipId)) {
        return NextResponse.json({ error: 'Invalid membership ID.' }, { status: 400 });
    }

    const body = await request.json();
    const parsed = moveMemberSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const { source_cat2_id, destination_type, destination_id } = parsed.data;

    // Check permissions on the SOURCE unit
    const { authorized, message } = await canManageCat2(session, source_cat2_id);
    if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    try {
        const result = await db.update(factionOrganizationMembership)
            .set({
                type: destination_type,
                category_id: destination_id,
                created_by: session.userId, // Update creator to the person who moved them
            })
            .where(eq(factionOrganizationMembership.id, membershipId))
            .returning();
        
        if (result.length === 0) {
            return NextResponse.json({ error: 'Membership record not found.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Member moved successfully.' });

    } catch (error) {
        console.error(`[API Move Member] Error moving member ${membershipId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
