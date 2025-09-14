import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionOrganizationMembership } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { canManageCat2 } from '../helpers';
import { z } from 'zod';

interface RouteParams {
    params: {
        cat1Id: string;
        cat2Id: string;
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
    const membershipId = parseInt(params.membershipId, 10);
    if (isNaN(cat2Id) || isNaN(membershipId)) {
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
        await db.update(factionOrganizationMembership)
            .set({ title: parsed.data.title })
            .where(eq(factionOrganizationMembership.id, membershipId));
        return NextResponse.json({ success: true, message: 'Member updated.' });
    } catch (err) {
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
    const membershipId = parseInt(params.membershipId, 10);
    if (isNaN(cat2Id) || isNaN(membershipId)) {
        return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    }
    
    const { authorized, message } = await canManageCat2(session, cat2Id);
    if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    try {
        await db.delete(factionOrganizationMembership).where(eq(factionOrganizationMembership.id, membershipId));
        return NextResponse.json({ success: true, message: 'Member removed.' });
    } catch (err) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
