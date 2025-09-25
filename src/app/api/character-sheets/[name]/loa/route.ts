
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import config from '@config';

interface RouteParams {
    params: {
        name: string;
    }
}

interface LoaTopic {
    id: number;
    title: string;
    author: string;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const characterName = decodeURIComponent(params.name).replace(/_/g, ' ');

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
            with: { selectedFaction: true }
        });

        if (!user?.selectedFaction?.id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }
        
        const { selectedFaction: faction } = user;

        if (!faction.phpbb_api_url || !faction.phpbb_api_key || !faction.phpbb_loa_forum_id) {
            return NextResponse.json({ loaRecords: [] }); // No config, so no records
        }

        const baseUrl = faction.phpbb_api_url.endsWith('/') ? faction.phpbb_api_url : `${faction.phpbb_api_url}/`;
        const apiKey = faction.phpbb_api_key;
        const loaForumUrl = `${baseUrl}app.php/booskit/phpbbapi/forum/${faction.phpbb_loa_forum_id}?key=${apiKey}`;
        
        const loaResponse = await fetch(loaForumUrl, { next: { revalidate: config.FORUM_API_REFRESH_MINUTES * 60 } });
        
        if (!loaResponse.ok) {
            console.error(`[API LOA Fetch] Failed for ${characterName}. Status: ${loaResponse.status}`);
            return NextResponse.json({ error: 'Failed to fetch LOA data from forum.' }, { status: 502 });
        }

        const data = await loaResponse.json();
        let loaRecords: LoaTopic[] = [];

        if (data.forum?.topics) {
            loaRecords = data.forum.topics.filter((topic: LoaTopic) => {
                const match = topic.title.match(/\[.*?\]\s*(.*?)\s*\[/);
                return match && match[1].toLowerCase() === characterName.toLowerCase();
            });
        }
        
        return NextResponse.json({ loaRecords });

    } catch (error) {
        console.error('[API LOA Fetch] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
