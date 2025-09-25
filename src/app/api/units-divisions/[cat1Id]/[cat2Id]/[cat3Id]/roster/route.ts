
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { and, eq } from 'drizzle-orm';
import { activityRosters, factionOrganizationCat3 } from '@/db/schema';
import { canManageCat2 } from '../../helpers';

interface RouteParams {
    params: {
        cat1Id: string;
        cat2Id: string;
        cat3Id: string;
    }
}

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

    const { authorized, faction, message } = await canManageCat2(session, cat2Id);
    if (!authorized || !faction) {
        return NextResponse.json({ error: message }, { status: 403 });
    }

    try {
        const cat3 = await db.query.factionOrganizationCat3.findFirst({
            where: eq(factionOrganizationCat3.id, cat3Id)
        });
        if (!cat3) return NextResponse.json({ error: 'Detail not found.' }, { status: 404 });
        if (cat3.activity_roster_id) return NextResponse.json({ error: 'Roster already exists.' }, { status: 409 });
        
        const [newRoster] = await db.insert(activityRosters).values({
            factionId: faction.id,
            name: `${cat3.name} Roster`,
            visibility: 'organization',
            organization_category_type: 'cat_3',
            organization_category_id: cat3Id,
            created_by: session.userId,
            roster_setup_json: JSON.stringify({
                show_assignment_titles: true,
                mark_alternative_characters: true,
                allow_roster_snapshots: true,
            }),
        }).returning();

        await db.update(factionOrganizationCat3)
            .set({ activity_roster_id: newRoster.id })
            .where(eq(factionOrganizationCat3.id, cat3Id));

        return NextResponse.json({ success: true, roster: newRoster });
    } catch (err) {
        console.error(`[API Create Org Roster Cat3]`, err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    try {
        const cat3 = await db.query.factionOrganizationCat3.findFirst({
            where: eq(factionOrganizationCat3.id, cat3Id)
        });
        if (!cat3 || !cat3.activity_roster_id) return NextResponse.json({ error: 'Roster not found.' }, { status: 404 });

        await db.delete(activityRosters).where(eq(activityRosters.id, cat3.activity_roster_id));
        await db.update(factionOrganizationCat3).set({ activity_roster_id: null }).where(eq(factionOrganizationCat3.id, cat3Id));

        return NextResponse.json({ success: true, message: 'Roster deleted.' });
    } catch (err) {
        console.error(`[API Delete Org Roster Cat3]`, err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
