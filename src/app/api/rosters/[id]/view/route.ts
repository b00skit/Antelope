
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getRosterViewData } from './helper';

interface RouteParams {
    params: {
        id: string;
    }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId || !session.gtaw_access_token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rosterId = parseInt(params.id, 10);
    if (isNaN(rosterId)) {
        return NextResponse.json({ error: 'Invalid roster ID.' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const forceSync = searchParams.get('forceSync') === 'true';

    try {
        const result = await getRosterViewData(rosterId, session, forceSync);

        if ('error' in result) {
            const status = result.reauth ? 401 : result.requiresPassword ? 403 : 500;
            return NextResponse.json(result, { status });
        }
        
        return NextResponse.json(result);

    } catch (error) {
        console.error(`[API Roster View] Error fetching view data for roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
