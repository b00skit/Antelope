
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionOrganizationCat3, factionOrganizationCat3Sections } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { canUserManage } from '../../../../../helpers';
import { z } from 'zod';

interface RouteParams {
    params: {
        cat3Id: string;
    }
}

const assignSchema = z.object({
    characterId: z.number(),
    sourceSectionId: z.union([z.number(), z.literal('unassigned')]),
    destinationSectionId: z.union([z.number(), z.literal('unassigned')]),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const cat3Id = parseInt(params.cat3Id, 10);
    if (isNaN(cat3Id)) {
        return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    }
    
    const body = await request.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }
    
    const { characterId, sourceSectionId, destinationSectionId } = parsed.data;

    const cat3 = await db.query.factionOrganizationCat3.findFirst({ where: eq(factionOrganizationCat3.id, cat3Id), with: { cat2: { with: { cat1: true }}, sections: true }});
    if (!cat3) return NextResponse.json({ error: 'Detail not found.' }, { status: 404 });
    
    const { authorized, message } = await canUserManage(session, cat3.faction_id, 'cat_3', cat3Id);
     if (!authorized) {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    try {
        if (typeof sourceSectionId === 'number') {
            const sourceSection = cat3.sections.find(s => s.id === sourceSectionId);
            if (sourceSection) {
                const updatedIds = (sourceSection.character_ids_json || []).filter(id => id !== characterId);
                await db.update(factionOrganizationCat3Sections)
                    .set({ character_ids_json: updatedIds })
                    .where(eq(factionOrganizationCat3Sections.id, sourceSectionId));
            }
        }

        if (typeof destinationSectionId === 'number') {
            const destSection = cat3.sections.find(s => s.id === destinationSectionId);
            if (destSection) {
                const currentIds = new Set(destSection.character_ids_json || []);
                currentIds.add(characterId);
                const updatedIds = Array.from(currentIds);
                
                await db.update(factionOrganizationCat3Sections)
                    .set({ character_ids_json: updatedIds })
                    .where(eq(factionOrganizationCat3Sections.id, destinationSectionId));
            }
        }

        return NextResponse.json({ success: true, message: 'Member moved successfully.' });

    } catch (error) {
        console.error(`[API Cat3 Assign Section] Error for detail ${cat3Id}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
