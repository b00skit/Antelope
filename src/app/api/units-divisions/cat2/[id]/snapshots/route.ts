
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionOrganizationCat2Snapshots } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getCat2ViewData } from '../../helpers';

interface RouteParams {
    params: {
        id: string; // Cat2 ID
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

    const cat2Id = parseInt(params.id, 10);
    if (isNaN(cat2Id)) {
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
        
        const rosterDataResult = await getCat2ViewData(session, cat2Id);

        if ('error' in rosterDataResult) {
            const status = rosterDataResult.reauth ? 401 : 500;
            return NextResponse.json(rosterDataResult, { status });
        }

        await db.insert(factionOrganizationCat2Snapshots).values({
            faction_id: user.selected_faction_id,
            source_category_id: cat2Id,
            name: parsed.data.name,
            created_by: session.userId,
            data_json: rosterDataResult,
        });

        return NextResponse.json({ success: true, message: 'Snapshot created successfully.' }, { status: 201 });

    } catch (error) {
        console.error(`[API Create Cat2 Snapshot] Error for unit ${cat2Id}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
