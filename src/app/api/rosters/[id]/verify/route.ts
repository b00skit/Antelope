
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { activityRosters, activityRosterAccess } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

interface RouteParams {
    params: {
        id: string;
    }
}

const verifySchema = z.object({
    password: z.string().min(1, "Password is required."),
});

export async function POST(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rosterId = parseInt(params.id, 10);
    if (isNaN(rosterId)) {
        return NextResponse.json({ error: 'Invalid roster ID.' }, { status: 400 });
    }
    
    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
    }
    
    try {
        const roster = await db.query.activityRosters.findFirst({
            where: and(
                eq(activityRosters.id, rosterId),
                eq(activityRosters.visibility, 'private')
            ),
        });

        if (!roster) {
            return NextResponse.json({ error: 'Private roster not found.' }, { status: 404 });
        }

        if (!roster.password) {
            return NextResponse.json({ error: 'This roster is not password protected.' }, { status: 400 });
        }

        const isPasswordValid = await bcrypt.compare(parsed.data.password, roster.password);
        if (!isPasswordValid) {
            return NextResponse.json({ error: 'Invalid password.' }, { status: 403 });
        }

        // Grant access
        await db.insert(activityRosterAccess)
            .values({
                user_id: session.userId,
                activity_roster_id: rosterId,
            })
            .onConflictDoNothing();

        return NextResponse.json({ success: true, message: 'Access granted.' });

    } catch (error) {
        console.error(`[API Roster Verify] Error for roster ${rosterId}:`, error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
