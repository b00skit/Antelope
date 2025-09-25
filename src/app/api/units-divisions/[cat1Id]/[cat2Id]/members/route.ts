
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionOrganizationMembership, factionOrganizationCat2 } from '@/db/schema';
import { z } from 'zod';
import { canManageCat2 } from '../helpers';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
    params: {
        cat1Id: string;
        cat2Id: string;
    }
}

const addMemberSchema = z.object({
    character_id: z.number().int(),
    title: z.string().optional().nullable(),
    manual: z.boolean().default(false),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);
    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cat2Id = parseInt(params.cat2Id, 10);
    if (isNaN(cat2Id)) {
        return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    }

    const { authorized, message, cat2 } = await canManageCat2(session, cat2Id);
    if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }
    
    const body = await request.json();
    const parsed = addMemberSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    const isSecondaryUnit = cat2?.settings_json?.secondary ?? false;
    let titleToSet = parsed.data.title;
    if (!titleToSet) {
        const cat2Data = await db.query.factionOrganizationCat2.findFirst({ where: eq(factionOrganizationCat2.id, cat2Id) });
        if (cat2Data?.settings_json?.default_title) {
            titleToSet = cat2Data.settings_json.default_title;
        }
    }

    try {
        if (!isSecondaryUnit) {
            const existingAssignment = await db.query.factionOrganizationMembership.findFirst({
                where: and(
                    eq(factionOrganizationMembership.character_id, parsed.data.character_id),
                    eq(factionOrganizationMembership.secondary, false)
                ),
            });

            if (existingAssignment) {
                return NextResponse.json({ error: 'This character is already assigned to a primary unit or detail.' }, { status: 409 });
            }
        }

        await db.insert(factionOrganizationMembership).values({
            type: 'cat_2',
            category_id: cat2Id,
            character_id: parsed.data.character_id,
            title: titleToSet,
            secondary: isSecondaryUnit,
            manual: parsed.data.manual,
            created_by: session.userId,
        });

        return NextResponse.json({ success: true, message: 'Member added successfully.' }, { status: 201 });
    } catch (error) {
        console.error(`[API Add Member to Cat2] Error for unit ${cat2Id}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
