import { db } from '@/db';
import { apiCacheAlternativeCharacters } from '@/db/schema';
import { and, eq, inArray } from 'drizzle-orm';

interface FactionMember {
    user_id: number;
    character_id: number;
    character_name: string;
    rank: number;
    [key: string]: any; 
}

export async function processFactionMemberAlts(factionId: number, allMembers: FactionMember[]) {
    if (!allMembers || allMembers.length === 0) {
        // If there are no members, we should clear out all entries for this faction
        await db.delete(apiCacheAlternativeCharacters).where(eq(apiCacheAlternativeCharacters.faction_id, factionId));
        return;
    }

    // Group members by user_id
    const membersByUser = allMembers.reduce((acc, member) => {
        if (!acc[member.user_id]) {
            acc[member.user_id] = [];
        }
        acc[member.user_id].push(member);
        return acc;
    }, {} as Record<number, FactionMember[]>);
    
    const usersWithAltsInFaction = Object.keys(membersByUser).map(Number).filter(userId => membersByUser[userId].length > 1);
    const usersWithOnlyOneChar = Object.keys(membersByUser).map(Number).filter(userId => membersByUser[userId].length === 1);

    const existingCacheEntries = usersWithAltsInFaction.length > 0
        ? await db.query.apiCacheAlternativeCharacters.findMany({
            where: and(
                eq(apiCacheAlternativeCharacters.faction_id, factionId),
                inArray(apiCacheAlternativeCharacters.user_id, usersWithAltsInFaction)
            )
          })
        : [];
        
    const existingCacheMap = new Map(existingCacheEntries.map(entry => [entry.user_id, entry]));

    for (const userId of usersWithAltsInFaction) {
        const userCharacters = membersByUser[userId];
        const existingEntry = existingCacheMap.get(userId);

        let primaryCharacter: FactionMember | undefined;
        let alternativeCharacters: FactionMember[] = [];

        if (existingEntry && existingEntry.manually_set) {
            // Flow 3: Manually set primary character
            const manualPrimary = userCharacters.find(c => c.character_id === existingEntry.character_id);

            if (manualPrimary) {
                // The manually set character is still in the faction.
                primaryCharacter = manualPrimary;
                alternativeCharacters = userCharacters.filter(c => c.character_id !== primaryCharacter.character_id);

                if (alternativeCharacters.length === 0) {
                    await db.delete(apiCacheAlternativeCharacters)
                        .where(eq(apiCacheAlternativeCharacters.id, existingEntry.id));
                } else {
                    await db.update(apiCacheAlternativeCharacters)
                        .set({
                            rank: primaryCharacter.rank,
                            alternative_characters_json: alternativeCharacters,
                        })
                        .where(eq(apiCacheAlternativeCharacters.id, existingEntry.id));
                }
                continue; // Move to next user
            } else {
                // The manually set primary character is no longer in the faction.
                // We fall through to default logic as if it wasn't manually set.
            }
        }

        // Flow 1 & 2: Default logic (not manually set, or manual char left faction)
        userCharacters.sort((a, b) => b.rank - a.rank);
        primaryCharacter = userCharacters[0];
        alternativeCharacters = userCharacters.slice(1);

        if (!primaryCharacter || alternativeCharacters.length === 0) {
            if (existingEntry) {
                await db.delete(apiCacheAlternativeCharacters)
                    .where(eq(apiCacheAlternativeCharacters.id, existingEntry.id));
            }
            continue;
        }

        await db.insert(apiCacheAlternativeCharacters)
            .values({
                character_id: primaryCharacter.character_id,
                user_id: userId,
                faction_id: factionId,
                character_name: primaryCharacter.character_name,
                rank: primaryCharacter.rank,
                manually_set: false,
                alternative_characters_json: alternativeCharacters,
            })
            .onConflictDoUpdate({
                target: [apiCacheAlternativeCharacters.user_id, apiCacheAlternativeCharacters.faction_id],
                set: {
                    character_id: primaryCharacter.character_id,
                    character_name: primaryCharacter.character_name,
                    rank: primaryCharacter.rank,
                    alternative_characters_json: alternativeCharacters,
                }
            });
    }

    // Flow 4: Cleanup
    // Remove entries for users who now only have one character in the faction
    if (usersWithOnlyOneChar.length > 0) {
        await db.delete(apiCacheAlternativeCharacters).where(and(
            eq(apiCacheAlternativeCharacters.faction_id, factionId),
            inArray(apiCacheAlternativeCharacters.user_id, usersWithOnlyOneChar)
        ));
    }
    
    // Cleanup users who are no longer in the faction at all
    const allUserIdsInFaction = new Set(Object.keys(membersByUser).map(Number));
    const allCachedUserIds = (await db.query.apiCacheAlternativeCharacters.findMany({
        where: eq(apiCacheAlternativeCharacters.faction_id, factionId),
        columns: { user_id: true }
    })).map(e => e.user_id);

    const usersToRemove = allCachedUserIds.filter(id => !allUserIdsInFaction.has(id));
    if (usersToRemove.length > 0) {
         await db.delete(apiCacheAlternativeCharacters).where(and(
            eq(apiCacheAlternativeCharacters.faction_id, factionId),
            inArray(apiCacheAlternativeCharacters.user_id, usersToRemove)
        ));
    }
}
