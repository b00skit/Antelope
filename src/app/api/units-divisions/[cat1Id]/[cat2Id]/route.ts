import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionOrganizationCat2, factionMembersCache, factionOrganizationMembership, factionOrganizationCat3, factionMembers } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';
import { canManageCat2 } from './helpers';

interface RouteParams {
    params: {
        cat1Id: string;
        cat2Id: string;
    }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);
    if (!session.isLoggedIn) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const cat2Id = parseInt(params.cat2Id, 10);
    if (isNaN(cat2Id)) {
        return NextResponse.json({ error: 'Invalid ID.' }, { status: 400 });
    }

    const cat2 = await db.query.factionOrganizationCat2.findFirst({
        where: eq(factionOrganizationCat2.id, cat2Id),
        with: {
            cat1: {
                columns: { name: true }
            },
            cat3s: {
                with: {
                    creator: { columns: { username: true } }
                }
            }
        }
    });

    if (!cat2) {
        return NextResponse.json({ error: 'Unit not found.' }, { status: 404 });
    }

    const { authorized } = await canManageCat2(session, cat2Id);

    const [factionCache, members, factionUsers] = await Promise.all([
        db.query.factionMembersCache.findFirst({
            where: eq(factionMembersCache.faction_id, cat2.faction_id)
        }),
        db.query.factionOrganizationMembership.findMany({
            where: and(
                eq(factionOrganizationMembership.category_id, cat2Id),
                eq(factionOrganizationMembership.type, 'cat_2')
            ),
            with: {
                creator: {
                    columns: { username: true }
                }
            }
        }),
        db.query.factionMembers.findMany({
            where: and(eq(factionMembers.factionId, cat2.faction_id), eq(factionMembers.joined, true)),
            with: {
                user: {
                    columns: {
                        id: true,
                        username: true,
                    }
                }
            }
        })
    ]);

    const allFactionMembers = factionCache?.members || [];
    const memberDetails = members.map(m => {
        const factionMember = allFactionMembers.find((fm: any) => fm.character_id === m.character_id);
        return {
            ...m,
            character_name: factionMember?.character_name || 'Unknown',
            rank_name: factionMember?.rank_name || 'Unknown',
        }
    });
    
    const availableUsers = factionUsers.map(fm => fm.user).filter(Boolean);

    return NextResponse.json({
        unit: cat2,
        members: memberDetails,
        allFactionMembers,
        canManage: authorized,
        factionUsers: availableUsers,
    });
}
