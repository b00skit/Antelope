
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionOrganizationCat3Snapshots } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getCatViewData } from '../../../helpers';

interface RouteParams {
    params: {
        cat3Id: string; // Cat3 ID
    }
}

const createSnapshotSchema = z.object({
    name: z.string().min(3, "Snapshot name must be at least 3 characters long."),
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
    const parsed = createSnapshotSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
        });
        if (!user || !user.selected_faction_id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }
        
        const rosterDataResult = await getCatViewData(session, 'cat_3', cat3Id);

        if ('error' in rosterDataResult) {
            return NextResponse.json({ error: rosterDataResult.error }, { status: 500 });
        }

        await db.insert(factionOrganizationCat3Snapshots).values({
            faction_id: user.selected_faction_id,
            source_category_id: cat3Id,
            name: parsed.data.name,
            created_by: session.userId,
            data_json: rosterDataResult,
        });

        return NextResponse.json({ success: true, message: 'Snapshot created successfully.' }, { status: 201 });

    } catch (error) {
        console.error(`[API Create Cat3 Snapshot] Error for detail ${cat3Id}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
