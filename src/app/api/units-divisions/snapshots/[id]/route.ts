
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionOrganizationCat2Snapshots, factionOrganizationCat3Snapshots } from '@/db/schema';
import { and, eq } from 'drizzle-orm';


interface RouteParams {
    params: {
        id: string; // type-id, e.g. cat2-123
    }
}

// GET /api/units-divisions/snapshots/[id] - Gets a single snapshot
export async function GET(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const [type, idStr] = params.id.split('-');
    const snapshotId = parseInt(idStr, 10);

    if (!['cat2', 'cat3'].includes(type) || isNaN(snapshotId)) {
        return NextResponse.json({ error: 'Invalid snapshot ID.' }, { status: 400 });
    }
    
    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
        });
        if (!user || !user.selected_faction_id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }

        let snapshot: any;
        if (type === 'cat2') {
            snapshot = await db.query.factionOrganizationCat2Snapshots.findFirst({
                where: and(
                    eq(factionOrganizationCat2Snapshots.id, snapshotId),
                    eq(factionOrganizationCat2Snapshots.faction_id, user.selected_faction_id)
                ),
            });
        } else {
             snapshot = await db.query.factionOrganizationCat3Snapshots.findFirst({
                where: and(
                    eq(factionOrganizationCat3Snapshots.id, snapshotId),
                    eq(factionOrganizationCat3Snapshots.faction_id, user.selected_faction_id)
                ),
            });
        }

        if (!snapshot) {
            return NextResponse.json({ error: 'Snapshot not found.' }, { status: 404 });
        }

        // The data is already stored as fully processed JSON
        return NextResponse.json(snapshot.data_json);

    } catch (error) {
        console.error(`[API Get Org Snapshot] Error for snapshot ${params.id}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE /api/units-divisions/snapshots/[id] - Deletes a snapshot
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const [type, idStr] = params.id.split('-');
    const snapshotId = parseInt(idStr, 10);

    if (!['cat2', 'cat3'].includes(type) || isNaN(snapshotId)) {
        return NextResponse.json({ error: 'Invalid snapshot ID.' }, { status: 400 });
    }

    try {
        let snapshot: any;
        if (type === 'cat2') {
            snapshot = await db.query.factionOrganizationCat2Snapshots.findFirst({
                where: eq(factionOrganizationCat2Snapshots.id, snapshotId),
            });
        } else {
             snapshot = await db.query.factionOrganizationCat3Snapshots.findFirst({
                where: eq(factionOrganizationCat3Snapshots.id, snapshotId),
            });
        }

        if (!snapshot) {
            return NextResponse.json({ error: 'Snapshot not found.' }, { status: 404 });
        }
        
        // For now, only the creator can delete. This could be expanded later.
        if (snapshot.created_by !== session.userId) {
             return NextResponse.json({ error: 'You do not have permission to delete this snapshot.' }, { status: 403 });
        }

        if (type === 'cat2') {
            await db.delete(factionOrganizationCat2Snapshots).where(eq(factionOrganizationCat2Snapshots.id, snapshotId));
        } else {
            await db.delete(factionOrganizationCat3Snapshots).where(eq(factionOrganizationCat3Snapshots.id, snapshotId));
        }

        return NextResponse.json({ success: true, message: 'Snapshot deleted.' });

    } catch (error) {
        console.error(`[API Delete Org Snapshot] Error for snapshot ${params.id}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
