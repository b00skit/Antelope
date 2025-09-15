
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionOrganizationMembership, factionOrganizationCat3 } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { canManageCat2, canUserManage } from '../../../[cat1Id]/[cat2Id]/helpers';
import { z } from 'zod';
import { users, factionMembers } from '@/db/schema';


interface RouteParams {
    params: {
        membershipId: string;
    }
}

const transferMemberSchema = z.object({
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
    const parsed = transferMemberSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const { source_cat2_id, destination_type, destination_id } = parsed.data;

    // Check permissions on the SOURCE unit
    // If the member is in a Cat3, we still check permissions on the parent Cat2.
    const { authorized, message, user, membership, faction } = await canManageCat2(session, source_cat2_id);
    if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    // Check permissions on the DESTINATION unit
    const canManageDestination = await canUserManage(session, user, membership, faction, destination_type, destination_id);
    if (!canManageDestination.authorized) {
        return NextResponse.json({ error: "You do not have permission to transfer members to the selected destination." }, { status: 403 });
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

        return NextResponse.json({ success: true, message: 'Member transferred successfully.' });

    } catch (error) {
        console.error(`[API Transfer Member] Error transferring member ${membershipId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
