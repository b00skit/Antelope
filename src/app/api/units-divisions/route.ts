import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factions, factionMembers, factionOrganizationSettings } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        with: { selectedFaction: true }
    });

    if (!user?.selectedFaction?.id) {
        return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
    }

    if (!user.selectedFaction.feature_flags?.units_divisions_enabled) {
        return NextResponse.json({ error: 'This feature is not enabled for your faction.' }, { status: 403 });
    }

    const factionId = user.selectedFaction.id;
    
    try {
        const settings = await db.query.factionOrganizationSettings.findFirst({
            where: eq(factionOrganizationSettings.faction_id, factionId),
        });

        // For phase 1, we just need the settings.
        // In the future, we will fetch cat1s, cat2s, etc. here.

        const membership = await db.query.factionMembers.findFirst({
            where: and(eq(factionMembers.userId, session.userId), eq(factionMembers.factionId, factionId))
        });
        
        const canAdminister = membership && membership.rank >= (user.selectedFaction.administration_rank ?? 15);

        return NextResponse.json({
            settings: settings,
            cat1s: [], // Placeholder for future phases
            canAdminister,
        });

    } catch (error) {
        console.error('[API Units & Divisions] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
