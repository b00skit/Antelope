
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionOrganizationMembership, factionMembersCache } from '@/db/schema';
import { eq, inArray, and } from 'drizzle-orm';

interface SyncPayload {
    syncableGroups: { group_id: number }[];
    groupResults: { groupId: number; members: string[] }[];
}

export async function POST(request: NextRequest) {
    const cookieStore = await cookies();
    const session = await getSession(cookieStore);

    if (!session.isLoggedIn || !session.userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { syncableGroups, groupResults }: SyncPayload = await request.json();

    try {
        const user = await db.query.users.findFirst({
            where: eq(users.id, session.userId),
            with: { selectedFaction: true },
        });

        if (!user?.selectedFaction?.id) {
            return NextResponse.json({ error: 'No active faction selected.' }, { status: 400 });
        }
        const factionId = user.selectedFaction.id;

        const factionCache = await db.query.factionMembersCache.findFirst({
            where: eq(factionMembersCache.faction_id, factionId)
        });

        if (!factionCache?.members) {
            return NextResponse.json({ error: 'Faction member cache is missing.' }, { status: 400 });
        }
        const factionCharacterMap = new Map(factionCache.members.map((m: any) => [m.character_name, m.character_id]));

        const groupIds = syncableGroups.map(g => g.group_id);

        await db.transaction(async (tx) => {
            // 1. Clear existing memberships for these groups
            if (groupIds.length > 0) {
                 await tx.delete(factionOrganizationMembership).where(
                    inArray(factionOrganizationMembership.category_id, groupIds)
                );
            }

            // 2. Insert new members
            const newMembers: { category_id: number; type: 'cat_2'; character_id: number; created_by: number; secondary: boolean; }[] = [];
            for (const group of groupResults) {
                for (const username of group.members) {
                    const characterId = factionCharacterMap.get(username);
                    if (characterId) {
                        newMembers.push({
                            category_id: group.groupId,
                            type: 'cat_2', // Assuming forum groups map to cat_2
                            character_id: characterId,
                            created_by: session.userId!,
                            secondary: false, // Defaulting to not secondary
                        });
                    }
                }
            }
            
            if (newMembers.length > 0) {
                await tx.insert(factionOrganizationMembership).values(newMembers);
            }
        });

        return NextResponse.json({ success: true, message: 'Forum group memberships synced successfully.' });

    } catch (error) {
        console.error('[API Sync Forum] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
