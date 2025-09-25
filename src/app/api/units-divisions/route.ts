import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factions, factionMembers, factionOrganizationSettings, factionOrganizationCat1, factionOrganizationCat2, apiForumSyncableGroups } from '@/db/schema';
import { and, eq, desc } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        with: { selectedFaction: true }
    });

    if (!user?.selectedFaction?.id) {
        return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
    }

    if (!user.selectedFaction.feature_flags?.units_divisions_enabled) {
        return NextResponse.json({ error: 'This feature is not enabled for your faction.' }, { status: 403 });
    }

    const factionId = user.selectedFaction.id;
    
    try {
        const [settings, cat1s, membership, factionUsers, syncableForumGroups] = await Promise.all([
            db.query.factionOrganizationSettings.findFirst({
                where: eq(factionOrganizationSettings.faction_id, factionId),
            }),
            db.query.factionOrganizationCat1.findMany({
                where: eq(factionOrganizationCat1.faction_id, factionId),
                with: {
                    creator: { columns: { username: true } },
                    cat2s: {
                        with: {
                            creator: { columns: { username: true } }
                        },
                         orderBy: [desc(factionOrganizationCat1.created_at)],
                    }
                },
                orderBy: [desc(factionOrganizationCat1.created_at)],
            }),
             db.query.factionMembers.findFirst({
                where: and(eq(factionMembers.userId, session.userId), eq(factionMembers.factionId, factionId))
            }),
            db.query.factionMembers.findMany({
                where: and(eq(factionMembers.factionId, factionId), eq(factionMembers.joined, true)),
                with: {
                    user: {
                        columns: {
                            id: true,
                            username: true,
                        }
                    }
                }
            }),
            db.query.apiForumSyncableGroups.findMany({
                where: eq(apiForumSyncableGroups.faction_id, factionId)
            })
        ]);

        const canAdminister = membership && membership.rank >= (user.selectedFaction.administration_rank ?? 15);
        
        const cat1sWithPermissions = cat1s.map(cat1 => {
            const canManageCat1 = canAdminister || cat1.access_json?.includes(session.userId as number) || false;
            
            const cat2sWithPermissions = cat1.cat2s.map(cat2 => ({
                ...cat2,
                canManage: canManageCat1 || cat2.access_json?.includes(session.userId as number) || false,
            }));

            return {
                ...cat1,
                canManage: canManageCat1,
                cat2s: cat2sWithPermissions,
            };
        });
        
        const availableUsers = factionUsers.map(fm => fm.user).filter(Boolean);
        
        const syncableGroupsOptions = syncableForumGroups.map(g => ({ value: g.group_id.toString(), label: g.name }));

        return NextResponse.json({
            settings: settings,
            cat1s: cat1sWithPermissions,
            canAdminister,
            factionUsers: availableUsers,
            syncableForumGroups: syncableGroupsOptions,
        });

    } catch (error) {
        console.error('[API Units & Divisions] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
