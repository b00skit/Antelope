import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionOrganizationCat1 } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
            with: { selectedFaction: true }
        });

        if (!user?.selectedFaction?.id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }
        
        const factionId = user.selectedFaction.id;

        const allCat1s = await db.query.factionOrganizationCat1.findMany({
            where: eq(factionOrganizationCat1.faction_id, factionId),
            with: {
                cat2s: {
                    with: {
                        cat3s: true
                    }
                }
            }
        });
        
        const organizationOptions: { label: string; value: string }[] = [];
        for (const cat1 of allCat1s) {
            for (const cat2 of cat1.cat2s) {
                organizationOptions.push({
                    label: `${cat1.name} / ${cat2.name}`,
                    value: `cat_2:${cat2.id}`
                });
                if (cat2.cat3s) {
                    for (const cat3 of cat2.cat3s) {
                        organizationOptions.push({
                            label: `${cat1.name} / ${cat2.name} / ${cat3.name}`,
                            value: `cat_3:${cat3.id}`
                        });
                    }
                }
            }
        }

        return NextResponse.json({ organizations: organizationOptions });

    } catch (error) {
        console.error('[API Get Organizations for Rosters] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
