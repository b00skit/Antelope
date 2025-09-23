
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembersAbasCache } from '@/db/schema';
import { eq } from 'drizzle-orm';

interface AbasData {
    character_id: number;
    abas: string;
}

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId || !session.gtaw_access_token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // The source data is now sent from the client after preview
    const abasValues: AbasData[] = await request.json();

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
            with: { selectedFaction: true },
        });

        if (!user?.selectedFaction?.id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }
        const factionId = user.selectedFaction.id;
        
        const now = new Date();

        // Use a transaction for bulk updates
        db.transaction((tx) => {
            for (const abasEntry of abasValues) {
                tx.insert(factionMembersAbasCache)
                    .values({
                        character_id: abasEntry.character_id,
                        faction_id: factionId,
                        abas: abasEntry.abas,
                        last_sync_timestamp: now,
                    })
                    .onConflictDoUpdate({
                        target: [factionMembersAbasCache.character_id, factionMembersAbasCache.faction_id],
                        set: {
                            abas: abasEntry.abas,
                            last_sync_timestamp: now,
                        }
                    }).run();
            }
        });

        return NextResponse.json({ success: true, message: `ABAS data for ${abasValues.length} characters synced.` });

    } catch (error) {
        console.error('[API Sync ABAS] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
