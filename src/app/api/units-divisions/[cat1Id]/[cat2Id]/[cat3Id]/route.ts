
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getCatViewData } from '../../helpers';

interface RouteParams {
    params: {
        cat1Id: string;
        cat2Id: string;
        cat3Id: string;
    }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);
    if (!session.isLoggedIn) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const cat3Id = parseInt(params.cat3Id, 10);
    if (isNaN(cat3Id)) {
        return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    }

    try {
        const data = await getCatViewData(session, 'cat_3', cat3Id);
        if ('error' in data) {
            return NextResponse.json({ error: data.error }, { status: 400 });
        }
        return NextResponse.json(data);
    } catch (err) {
        console.error(`[API GET Cat3] Error:`, err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
