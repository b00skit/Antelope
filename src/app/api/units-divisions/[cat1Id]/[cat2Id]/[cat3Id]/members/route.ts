
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionOrganizationMembership, factionOrganizationCat3 } from '@/db/schema';
import { z } from 'zod';
import { canManageCat2 } from '../../helpers';
import { eq, and, inArray } from 'drizzle-orm';

interface RouteParams {
    params: {
        cat1Id: string;
        cat2Id: string;
        cat3Id: string;
    }
}

const addMemberSchema = z.object({
    character_ids: z.array(z.number().int()),
    title: z.string().optional().nullable(),
    manual: z.boolean().default(false),
});

export async function POST(request: NextRequest, { params }: { params: RouteParams }) {
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
        
        if (!cat3) {
             return NextResponse.json({ error: 'Detail not found.' }, { status: 404 });
        }

        const { character_ids, title, manual } = parsed.data;

        if (character_ids.length === 0) {
            return NextResponse.json({ error: 'No members to add.' }, { status: 400 });
        }

        const isSecondaryUnit = cat3?.settings_json?.secondary ?? false;
        let titleToSet = title;
        if (!titleToSet && cat3?.settings_json?.default_title) {
            titleToSet = cat3.settings_json.default_title;
        }

        const valuesToInsert = character_ids.map(charId => ({
            type: 'cat_3' as const,
            category_id: cat3Id,
            character_id: charId,
            title: titleToSet,
            secondary: isSecondaryUnit,
            manual: manual,
            created_by: session.userId!,
        }));

        if (!isSecondaryUnit) {
            const existingAssignments = await db.query.factionOrganizationMembership.findMany({
                where: and(
                    inArray(factionOrganizationMembership.character_id, character_ids),
                    eq(factionOrganizationMembership.secondary, false)
                )
            });

            if (existingAssignments.length > 0) {
                 return NextResponse.json({ error: 'One or more members are already in a primary assignment.' }, { status: 409 });
            }
        }

        await db.insert(factionOrganizationMembership).values(valuesToInsert);

        return NextResponse.json({ success: true, message: `${character_ids.length} member(s) added successfully.` }, { status: 201 });
    } catch (error) {
        console.error(`[API Add Member to Cat3] Error for detail ${cat3Id}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
