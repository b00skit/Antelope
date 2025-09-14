
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionOrganizationMembership } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { canManageCat2 } from '../../../helpers';
import { z } from 'zod';

interface RouteParams {
    params: {
        cat1Id: string;
        cat2Id: string;
        cat3Id: string;
        membershipId: string;
    }
}

const updateMemberSchema = z.object({
    title: z.string().optional().nullable(),
});


export async function PUT(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);
    if (!session.isLoggedIn) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cat2Id = parseInt(params.cat2Id, 10);
    const cat3Id = parseInt(params.cat3Id, 10);
    const membershipId = parseInt(params.membershipId, 10);
    if (isNaN(cat2Id) || isNaN(cat3Id) || isNaN(membershipId)) {
        return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    }
    
    const body = await request.json();
    const parsed = updateMemberSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const { authorized, message } = await canManageCat2(session, cat2Id);
    if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }
    
    try {
        const result = await db.update(factionOrganizationMembership)
            .set({ title: parsed.data.title })
            .where(and(
                eq(factionOrganizationMembership.id, membershipId),
                eq(factionOrganizationMembership.category_id, cat3Id),
                eq(factionOrganizationMembership.type, 'cat_3')
            )).returning();

        if (result.length === 0) {
            return NextResponse.json({ error: 'Membership record not found or does not belong to this detail.' }, { status: 404 });
        }
        
        return NextResponse.json({ success: true, message: 'Member updated.' });
    } catch (err) {
        console.error(`[API Update Member Title Cat3] Error:`, err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);
    if (!session.isLoggedIn) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const cat2Id = parseInt(params.cat2Id, 10);
    const cat3Id = parseInt(params.cat3Id, 10);
    const membershipId = parseInt(params.membershipId, 10);
    if (isNaN(cat2Id) || isNaN(cat3Id) || isNaN(membershipId)) {
        return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    }
    
    const { authorized, message } = await canManageCat2(session, cat2Id);
    if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    try {
        const result = await db.delete(factionOrganizationMembership).where(
            and(
                eq(factionOrganizationMembership.id, membershipId),
                eq(factionOrganizationMembership.category_id, cat3Id),
                eq(factionOrganizationMembership.type, 'cat_3')
            )
        ).returning();
        
        if (result.length === 0) {
            return NextResponse.json({ error: 'Membership record not found or does not belong to this detail.' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: 'Member removed.' });
    } catch (err) {
        console.error(`[API Delete Member Cat3] Error:`, err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
