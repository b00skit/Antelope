
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factions, apiForumSyncableGroups, factionMembers } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { z } from 'zod';

interface RouteParams {
    params: {
        id: string;
    }
}

const syncableGroupsSchema = z.object({
    groups: z.array(z.object({
        id: z.number(),
        name: z.string(),
    })),
});

// GET /api/factions/[id]/forum-groups - Fetches all groups from the external forum API
export async function GET(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const factionId = parseInt(params.id, 10);
    if (isNaN(factionId)) {
        return NextResponse.json({ error: 'Invalid faction ID.' }, { status: 400 });
    }

    try {
        const faction = await db.query.factions.findFirst({
            where: eq(factions.id, factionId)
        });

        if (!faction || !faction.phpbb_api_url || !faction.phpbb_api_key) {
            return NextResponse.json({ error: 'Forum integration not configured.' }, { status: 400 });
        }

        const baseUrl = faction.phpbb_api_url.endsWith('/') ? faction.phpbb_api_url : `${faction.phpbb_api_url}/`;
        const url = `${baseUrl}app.php/booskit/phpbbapi/groups?key=${faction.phpbb_api_key}`;
        
        const response = await fetch(url, { next: { revalidate: 300 } }); // Cache for 5 mins
        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch groups from forum API.' }, { status: 502 });
        }
        
        const data = await response.json();
        
        const syncableGroups = await db.query.apiForumSyncableGroups.findMany({ where: eq(apiForumSyncableGroups.faction_id, factionId) });

        return NextResponse.json({
            allGroups: data.groups || [],
            syncableGroups: syncableGroups,
        });

    } catch (error) {
        console.error(`[API Get Forum Groups] Error for faction ${factionId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


// POST /api/factions/[id]/forum-groups - Updates the syncable groups for a faction
export async function POST(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);
     if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const factionId = parseInt(params.id, 10);
    if (isNaN(factionId)) {
        return NextResponse.json({ error: 'Invalid faction ID.' }, { status: 400 });
    }
    
    const body = await request.json();
    const parsed = syncableGroupsSchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid input.', details: parsed.error.flatten() }, { status: 400 });
    }
    
    try {
        const membership = await db.query.factionMembers.findFirst({
            where: and(
                eq(factionMembers.userId, session.userId),
                eq(factionMembers.factionId, factionId)
            ),
            with: { faction: true }
        });

        if (!membership || membership.rank < (membership.faction.administration_rank ?? 15)) {
            return NextResponse.json({ error: 'You do not have permission to modify these settings.' }, { status: 403 });
        }
        
        db.transaction((tx) => {
            tx.delete(apiForumSyncableGroups).where(eq(apiForumSyncableGroups.faction_id, factionId)).run();
            
            if (parsed.data.groups.length > 0) {
                tx.insert(apiForumSyncableGroups).values(
                    parsed.data.groups.map(group => ({
                        faction_id: factionId,
                        group_id: group.id,
                        name: group.name,
                        created_by: session.userId!,
                    }))
                ).run();
            }
        });
        
        return NextResponse.json({ success: true, message: 'Syncable forum groups updated.' });

    } catch (error) {
        console.error(`[API Update Forum Groups] Error for faction ${factionId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
