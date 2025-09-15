import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, forumApiCache } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';


export async function POST(request: NextRequest) {
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
        
        if (!user.selectedFaction.phpbb_api_url || !user.selectedFaction.phpbb_api_key) {
            return NextResponse.json({ error: 'Forum integration not configured.' }, { status: 400 });
        }

        // The forum cache is per-roster. A "global" sync isn't really possible.
        // We will just clear the existing cache to force re-fetches on next roster view.
        
        await db.delete(forumApiCache);

        return NextResponse.json({ success: true, message: 'Forum cache cleared. Data will re-sync on the next roster view.' });

    } catch (error) {
        console.error('[API Sync Forum] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
