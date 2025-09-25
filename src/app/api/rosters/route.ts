
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, activityRosters, activityRosterFavorites, factionMembersCache, apiCacheAlternativeCharacters } from '@/db/schema';
import { and, eq, or, desc } from 'drizzle-orm';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import { processFactionMemberAlts } from '@/lib/faction-sync';

const jsonString = z.string().refine((value) => {
    if (!value) return true; // Allow empty string
    try {
      JSON.parse(value);
      return true;
    } catch (e) {
      return false;
    }
}, { message: "Must be a valid JSON object." });

const createRosterSchema = z.object({
    name: z.string().min(3, "Roster name must be at least 3 characters long."),
    visibility: z.enum(['personal', 'private', 'unlisted', 'public']).default('personal'),
    password: z.string().optional().nullable(),
    roster_setup_json: jsonString.optional().nullable(),
    access_json: z.array(z.number()).optional().nullable(),
    organization_category_type: z.enum(['cat_2', 'cat_3']).optional().nullable(),
    organization_category_id: z.number().optional().nullable(),
}).refine(data => data.visibility !== 'private' || (data.password && data.password.length > 0), {
    message: "Password is required for private rosters.",
    path: ["password"],
});

// GET /api/rosters - Fetches rosters for the user's active faction
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

        const factionId = user.selected_faction_id;

        const [cachedFaction, cachedAlt] = await Promise.all([
            db.query.factionMembersCache.findFirst({
                where: eq(factionMembersCache.faction_id, factionId),
            }),
            db.query.apiCacheAlternativeCharacters.findFirst({
                where: eq(apiCacheAlternativeCharacters.faction_id, factionId),
                columns: { id: true },
            }),
        ]);

        if (!cachedAlt && cachedFaction?.members && Array.isArray(cachedFaction.members)) {
            await processFactionMemberAlts(factionId, cachedFaction.members);
        }

        const [rosters, favorites, factionUsers] = await Promise.all([
            db.query.activityRosters.findMany({
                where: and(
                    eq(activityRosters.factionId, user.selected_faction_id),
                    or(
                        eq(activityRosters.visibility, 'public'),
                        eq(activityRosters.visibility, 'private'),
                        eq(activityRosters.visibility, 'organization'),
                        eq(activityRosters.created_by, session.userId)
                    )
                ),
                with: {
                    author: {
                        columns: {
                            username: true,
                        }
                    }
                },
                orderBy: [desc(activityRosters.created_at)],
            }),
            db.query.activityRosterFavorites.findMany({
                where: and(
                    eq(activityRosterFavorites.user_id, session.userId),
                    eq(activityRosterFavorites.faction_id, user.selected_faction_id),
                ),
                columns: {
                    activity_roster_id: true,
                }
            }),
             db.query.users.findMany({
                where: eq(users.selected_faction_id, user.selected_faction_id)
            }),
        ]);
        
        const favoriteIds = new Set(favorites.map(f => f.activity_roster_id));

        const rostersWithDetails = rosters.map(r => ({
            ...r,
            isOwner: r.created_by === session.userId || r.access_json?.includes(session.userId!),
            isFavorited: favoriteIds.has(r.id),
        }));

        return NextResponse.json({ rosters: rostersWithDetails, factionUsers });

    } catch (error) {
        console.error('[API Rosters GET] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/rosters - Creates a new roster for the user's active faction
export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createRosterSchema.safeParse(body);

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

        let hashedPassword = null;
        if (parsed.data.visibility === 'private' && parsed.data.password) {
            hashedPassword = await bcrypt.hash(parsed.data.password, 10);
        }

        const newRoster = await db.insert(activityRosters).values({
            name: parsed.data.name,
            visibility: parsed.data.visibility,
            password: hashedPassword,
            roster_setup_json: parsed.data.roster_setup_json,
            factionId: user.selected_faction_id,
            created_by: session.userId,
            access_json: parsed.data.visibility === 'personal' ? null : parsed.data.access_json,
            organization_category_type: parsed.data.organization_category_type,
            organization_category_id: parsed.data.organization_category_id,
        }).returning();

        return NextResponse.json({ success: true, roster: newRoster[0] }, { status: 201 });

    } catch (error) {
        console.error('[API Rosters POST] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
