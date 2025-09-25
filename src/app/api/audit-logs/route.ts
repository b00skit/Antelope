
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionAuditLogs } from '@/db/schema';
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
            with: { selectedFaction: true },
        });

        if (!user?.selectedFaction?.id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }
        const factionId = user.selectedFaction.id;

        // For now, just fetch all logs for the faction. Later, add pagination/filtering.
        const logs = await db.query.factionAuditLogs.findMany({
            where: eq(factionAuditLogs.faction_id, factionId),
            with: {
                user: {
                    columns: {
                        username: true,
                    },
                },
            },
            orderBy: [desc(factionAuditLogs.created_at)],
            limit: 100, // Limit to recent 100 logs for now
        });

        return NextResponse.json({ logs });

    } catch (error) {
        console.error('[API Audit Logs] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
