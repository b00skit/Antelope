
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { factionOrganizationCat3, factionMembersCache, factionOrganizationMembership, factionMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';
import { canManageCat2 } from '../helpers';

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

    const cat3 = await db.query.factionOrganizationCat3.findFirst({
        where: eq(factionOrganizationCat3.id, cat3Id),
        with: {
            cat2: {
                with: {
                    cat1: {
                        columns: { id: true, name: true }
                    }
                }
            }
        }
    });

    if (!cat3) {
        return NextResponse.json({ error: 'Detail not found.' }, { status: 404 });
    }

    const { authorized } = await canManageCat2(session, cat3.cat2_id);

    const [factionCache, members, factionUsers, allCat3Members] = await Promise.all([
        db.query.factionMembersCache.findFirst({
            where: eq(factionMembersCache.faction_id, cat3.faction_id)
        }),
        db.query.factionOrganizationMembership.findMany({
            where: and(
                eq(factionOrganizationMembership.category_id, cat3Id),
                eq(factionOrganizationMembership.type, 'cat_3')
            ),
            with: {
                creator: {
                    columns: { username: true }
                }
            }
        }),
        db.query.factionMembers.findMany({
            where: and(eq(factionMembers.factionId, cat3.faction_id), eq(factionMembers.joined, true)),
            with: {
                user: {
                    columns: {
                        id: true,
                        username: true,
                    }
                }
            }
        }),
        db.query.factionOrganizationMembership.findMany({
            where: eq(factionOrganizationMembership.type, 'cat_3'),
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
    const assignedCat3CharacterIds = new Set(allCat3Members.map(m => m.character_id));

    return NextResponse.json({
        detail: cat3,
        members: memberDetails,
        allFactionMembers,
        assignedCat3CharacterIds: Array.from(assignedCat3CharacterIds),
        canManage: authorized,
        factionUsers: availableUsers,
    });
}
