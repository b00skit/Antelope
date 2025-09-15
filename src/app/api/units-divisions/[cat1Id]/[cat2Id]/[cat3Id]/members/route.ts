
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionOrganizationMembership, factionOrganizationCat3 } from '@/db/schema';
import { z } from 'zod';
import { canManageCat2 } from '../../helpers';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
    params: {
        cat1Id: string;
        cat2Id: string;
        cat3Id: string;
    }
}

const addMemberSchema = z.object({
    character_id: z.number().int(),
    title: z.string().optional().nullable(),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cat2Id = parseInt(params.cat2Id, 10);
    const cat3Id = parseInt(params.cat3Id, 10);
    if (isNaN(cat2Id) || isNaN(cat3Id)) {
        return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    }

    const { authorized, message } = await canManageCat2(session, cat2Id);
    if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }
    
    const body = await request.json();
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    try {
        const cat3 = await db.query.factionOrganizationCat3.findFirst({
            where: eq(factionOrganizationCat3.id, cat3Id)
        });

        const isSecondaryUnit = cat3?.settings_json?.secondary ?? false;

        if (!isSecondaryUnit) {
            const existingAssignment = await db.query.factionOrganizationMembership.findFirst({
                where: and(
                    eq(factionOrganizationMembership.character_id, parsed.data.character_id),
                    eq(factionOrganizationMembership.secondary, false)
                )
            });

            if (existingAssignment) {
                return NextResponse.json({ error: 'This character is already assigned to a primary unit or detail.' }, { status: 409 });
            }
        }

        await db.insert(factionOrganizationMembership).values({
            type: 'cat_3',
            category_id: cat3Id,
            character_id: parsed.data.character_id,
            title: parsed.data.title,
            secondary: isSecondaryUnit,
            created_by: session.userId,
        });

        return NextResponse.json({ success: true, message: 'Member added successfully.' }, { status: 201 });
    } catch (error) {
        console.error(`[API Add Member to Cat3] Error for detail ${cat3Id}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
