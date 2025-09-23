
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionOrganizationCat2Snapshots, factionOrganizationCat3Snapshots } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';


export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
        });

        if (!user || !user.selected_faction_id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }

        const [cat2Snapshots, cat3Snapshots] = await Promise.all([
            db.query.factionOrganizationCat2Snapshots.findMany({
                where: eq(factionOrganizationCat2Snapshots.faction_id, user.selected_faction_id),
                with: {
                    creator: { columns: { username: true } },
                    sourceCategory: { columns: { name: true } },
                },
                orderBy: [desc(factionOrganizationCat2Snapshots.created_at)],
            }),
            db.query.factionOrganizationCat3Snapshots.findMany({
                where: eq(factionOrganizationCat3Snapshots.faction_id, user.selected_faction_id),
                with: {
                    creator: { columns: { username: true } },
                    sourceCategory: { columns: { name: true } },
                },
                orderBy: [desc(factionOrganizationCat3Snapshots.created_at)],
            }),
        ]);
        
        const allSnapshots = [
            ...cat2Snapshots.map(s => ({ ...s, type: 'cat2' })),
            ...cat3Snapshots.map(s => ({ ...s, type: 'cat3' })),
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());


        return NextResponse.json({ snapshots: allSnapshots });

    } catch (error) {
        console.error('[API Org Snapshots GET] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
