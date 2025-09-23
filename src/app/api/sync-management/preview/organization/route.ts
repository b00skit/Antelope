
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionOrganizationCat2, factionOrganizationCat3, forumApiCache, factionMembersCache, factionOrganizationMembership } from '@/db/schema';
import { eq, inArray, and, or } from 'drizzle-orm';

interface Diff {
    added: any[];
    updated: any[];
    removed: any[];
    sourceData: any[];
}

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

        const [cat2s, cat3s, factionCache] = await Promise.all([
            db.query.factionOrganizationCat2.findMany({ where: and(eq(factionOrganizationCat2.faction_id, factionId), eq(factionOrganizationCat2.forum_group_id, 0)) }),
            db.query.factionOrganizationCat3.findMany({ where: and(eq(factionOrganizationCat3.faction_id, factionId), eq(factionOrganizationCat3.forum_group_id, 0)) }),
            db.query.factionMembersCache.findFirst({ where: eq(factionMembersCache.faction_id, factionId) }),
        ]);

        const allUnits = [...cat2s, ...cat3s];
        if (allUnits.length === 0) {
            return NextResponse.json({ added: [], updated: [], removed: [], sourceData: [] });
        }

        const groupIds = allUnits.map(u => u.forum_group_id).filter((id): id is number => id !== null);
        if (groupIds.length === 0) {
             return NextResponse.json({ added: [], updated: [], removed: [], sourceData: [] });
        }
        
        const [forumCaches, currentMemberships] = await Promise.all([
             db.query.forumApiCache.findMany({ where: and(eq(forumApiCache.faction_id, factionId), inArray(forumApiCache.group_id, groupIds))}),
             db.query.factionOrganizationMembership.findMany({ where: or(
                inArray(factionOrganizationMembership.category_id, cat2s.map(c => c.id)),
                inArray(factionOrganizationMembership.category_id, cat3s.map(c => c.id))
             )})
        ]);

        const forumCacheMap = new Map(forumCaches.map(fc => [fc.group_id, fc]));
        const factionMembersMap = new Map((factionCache?.members || []).map((m: any) => [m.character_name, m.character_id]));
        const currentMembershipMap = new Map(currentMemberships.map(m => [`${m.type}-${m.category_id}-${m.character_id}`, m]));
        
        const diff: Diff = { added: [], updated: [], removed: [], sourceData: [] };

        for (const unit of allUnits) {
            if (!unit.forum_group_id) continue;

            const forumCache = forumCacheMap.get(unit.forum_group_id);
            if (!forumCache || !forumCache.data) continue;
            
            const unitType = 'cat1_id' in unit ? 'cat_2' : 'cat_3';
            
            const forumUsernames = new Set((forumCache.data.members || []).map((m: any) => m.username.replace(/_/g, ' ')));
            const forumCharacterIds = new Set(
                Array.from(forumUsernames)
                    .map(username => factionMembersMap.get(username))
                    .filter((id): id is number => id !== undefined)
            );

            const sourceDataItem = {
                type: unitType,
                category_id: unit.id,
                character_ids: Array.from(forumCharacterIds),
            };
            diff.sourceData.push(sourceDataItem);
            
            const currentUnitCharacterIds = new Set(
                currentMemberships
                    .filter(m => m.category_id === unit.id && m.type === unitType)
                    .map(m => m.character_id)
            );

            // Find added members
            for (const charId of forumCharacterIds) {
                if (!currentUnitCharacterIds.has(charId)) {
                    diff.added.push({
                        unit_name: unit.name,
                        character_name: allFactionMembers.find((m: any) => m.character_id === charId)?.character_name || `ID: ${charId}`,
                        change_summary: `Will be added to unit.`
                    });
                }
            }

            // Find removed members
            for (const charId of currentUnitCharacterIds) {
                if (!forumCharacterIds.has(charId)) {
                     diff.removed.push({
                        unit_name: unit.name,
                        character_name: allFactionMembers.find((m: any) => m.character_id === charId)?.character_name || `ID: ${charId}`,
                        change_summary: `Will be removed from unit.`
                    });
                }
            }
        }
        
        return NextResponse.json(diff);

    } catch (error) {
        console.error('[API Preview Org Sync] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
