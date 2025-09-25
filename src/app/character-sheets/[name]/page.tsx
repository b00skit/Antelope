
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembersCache, factionMembersAbasCache, factionOrganizationMembership, factionOrganizationCat2, factionOrganizationCat3, factionOrganizationCat1, factionMembers, apiCacheAlternativeCharacters } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { canUserManage } from '@/app/api/units-divisions/[cat1Id]/[cat2Id]/helpers';
import { CharacterSheetClientPage } from '@/components/character-sheets/character-sheet-client-page';
import config from '@config';

interface PageProps {
    params: {
        name: string;
    }
}

interface ForumData {
    id: number;
    username: string;
    email: string;
    groups: { id: number; name: string; leader: boolean }[];
}

interface FactionAbasSettings {
    supervisor_rank: number;
    minimum_abas: number;
    minimum_supervisor_abas: number;
}

interface AssignmentData {
    path: string;
    link: string;
    membershipId: number;
    sourceCat2Id: number;
    title: string | null;
}

interface SecondaryAssignmentData {
    path: string;
    link: string;
    title: string | null;
}

interface LoaTopic {
    id: number;
    title: string;
    author: string;
}

async function getCharacterData(name: string) {
    const cookieStore = cookies();
    const session = await getSession(cookieStore);
    if (!session.isLoggedIn || !session.userId || !session.gtaw_access_token) {
        return { error: 'Unauthorized', reauth: true };
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId),
        with: { selectedFaction: true }
    });
    if (!user?.selectedFaction?.id) {
        return { error: 'No active faction selected.' };
    }
    const factionId = user.selectedFaction.id;
    const { selectedFaction } = user;

    const abasSettings: FactionAbasSettings = {
        supervisor_rank: selectedFaction.supervisor_rank ?? 10,
        minimum_abas: selectedFaction.minimum_abas ?? 0,
        minimum_supervisor_abas: selectedFaction.minimum_supervisor_abas ?? 0,
    };

    const characterSheetsEnabled = selectedFaction.feature_flags?.character_sheets_enabled ?? false;

    if (!characterSheetsEnabled) {
        return { error: 'Character sheets are not enabled for this faction.' };
    }

    const cachedFaction = await db.query.factionMembersCache.findFirst({
        where: eq(factionMembersCache.faction_id, factionId)
    });

    if (!cachedFaction?.members || cachedFaction.members.length === 0) {
        return { error: 'Faction data has not been synced. Please go to Sync Management.' };
    }

    let members = cachedFaction.members || [];
    const membersByCharacterId = new Map<number, any>();
    for (const member of members) {
        if (member && typeof member.character_id === 'number') {
            membersByCharacterId.set(member.character_id, member);
        }
    }
    
    const characterName = decodeURIComponent(name).replace(/_/g, ' ');
    const character = members.find((m: any) => m.character_name.toLowerCase() === characterName.toLowerCase());
    if (!character) {
        return { error: `Character "${characterName}" not found in faction.` };
    }
    const characterId = character.character_id;

    const altCacheEntry = await db.query.apiCacheAlternativeCharacters.findFirst({
        where: and(
            eq(apiCacheAlternativeCharacters.faction_id, factionId),
            eq(apiCacheAlternativeCharacters.user_id, character.user_id),
        )
    });

    const alternativeCharactersRaw = Array.isArray(altCacheEntry?.alternative_characters_json)
        ? altCacheEntry.alternative_characters_json
        : [];

    const relatedCharacterIds = new Set<number>([characterId]);
    if (typeof altCacheEntry?.character_id === 'number') {
        relatedCharacterIds.add(altCacheEntry.character_id);
    }

    for (const alt of alternativeCharactersRaw) {
        if (alt && typeof alt.character_id === 'number') {
            relatedCharacterIds.add(alt.character_id);
        }
    }

    const characterIdsForAbas = Array.from(relatedCharacterIds);

    const abasEntries = characterIdsForAbas.length > 0
        ? await db.query.factionMembersAbasCache.findMany({
            where: and(
                eq(factionMembersAbasCache.faction_id, factionId),
                inArray(factionMembersAbasCache.character_id, characterIdsForAbas),
            )
        })
        : [];

    const abasMap = new Map(abasEntries.map(entry => [entry.character_id, entry]));
    const mainAbasEntry = abasMap.get(characterId);

    const totalAbas = mainAbasEntry?.total_abas ?? characterIdsForAbas.reduce((sum, id) => {
        const entry = abasMap.get(id);
        if (!entry?.abas) return sum;
        const value = parseFloat(entry.abas);
        return isNaN(value) ? sum : sum + value;
    }, 0);

    const deriveNameParts = (charName: string) => {
        const cleanedName = (charName || '').replace(/_/g, ' ').trim();
        if (!cleanedName) {
            return { firstname: '', lastname: '' };
        }
        const parts = cleanedName.split(' ');
        const firstname = parts.shift() ?? '';
        const lastname = parts.join(' ') || '';
        return { firstname, lastname };
    };

    const nameParts = deriveNameParts(character.character_name);

    const alternativeCharacters: any[] = [];
    const addAlternativeCharacter = (candidate: any) => {
        if (!candidate) {
            return;
        }

        const candidateId = typeof candidate.character_id === 'number'
            ? candidate.character_id
            : typeof candidate.characterId === 'number'
                ? candidate.characterId
                : undefined;

        if (typeof candidateId !== 'number' || candidateId === characterId) {
            return;
        }

        if (alternativeCharacters.some(alt => alt.character_id === candidateId)) {
            return;
        }

        const memberData = membersByCharacterId.get(candidateId) ?? candidate;
        const altAbasEntry = abasMap.get(candidateId);

        alternativeCharacters.push({
            ...memberData,
            character_id: candidateId,
            character_name: memberData.character_name ?? candidate.character_name,
            firstname: memberData.firstname ?? candidate.firstname,
            lastname: memberData.lastname ?? candidate.lastname,
            rank: memberData.rank ?? candidate.rank,
            rank_name: memberData.rank_name ?? candidate.rank_name,
            last_online: memberData.last_online ?? candidate.last_online,
            last_duty: memberData.last_duty ?? candidate.last_duty,
            user_id: memberData.user_id ?? candidate.user_id ?? character.user_id,
            abas: altAbasEntry?.abas ?? memberData.abas ?? candidate.abas,
        });
    };

    if (altCacheEntry) {
        const primaryMember = membersByCharacterId.get(altCacheEntry.character_id) ?? {
            character_id: altCacheEntry.character_id,
            character_name: altCacheEntry.character_name,
            rank: altCacheEntry.rank,
            user_id: character.user_id,
        };
        addAlternativeCharacter(primaryMember);
    }

    for (const alt of alternativeCharactersRaw) {
        addAlternativeCharacter(alt);
    }

    const charData = {
        data: {
            ...character,
            firstname: nameParts.firstname,
            lastname: nameParts.lastname,
            abas: mainAbasEntry?.abas ?? character.abas,
            alternative_characters: alternativeCharacters,
        }
    };
    
    let forumData: ForumData | null = null;
    let forumProfileUrl: string | null = null;
    let loaRecords: LoaTopic[] = [];

    if (selectedFaction.phpbb_api_url && selectedFaction.phpbb_api_key) {
        const baseUrl = selectedFaction.phpbb_api_url.endsWith('/') ? selectedFaction.phpbb_api_url : `${selectedFaction.phpbb_api_url}/`;
        const apiKey = selectedFaction.phpbb_api_key;
        
        try {
            const forumUsername = characterName;
            const forumApiUrl = `${baseUrl}app.php/booskit/phpbbapi/user/username/${forumUsername}?key=${apiKey}`;

            const forumApiResponse = await fetch(forumApiUrl, { next: { revalidate: config.FORUM_API_REFRESH_MINUTES * 60 } });
            if (forumApiResponse.ok) {
                const data = await forumApiResponse.json();
                if (data.user) {
                    forumData = data.user;
                    forumProfileUrl = `${baseUrl}memberlist.php?mode=viewprofile&u=${data.user.id}`;
                }
            } else {
                console.warn(`[Forum API] Failed to fetch data for ${forumUsername}. Status: ${forumApiResponse.status}`);
            }
        } catch (error) {
            console.error(`[Forum API] Error fetching forum data:`, error);
        }

        if (selectedFaction.phpbb_loa_forum_id) {
            try {
                const loaForumUrl = `${baseUrl}app.php/booskit/phpbbapi/forum/${selectedFaction.phpbb_loa_forum_id}?key=${apiKey}`;
                const loaResponse = await fetch(loaForumUrl, { next: { revalidate: config.FORUM_API_REFRESH_MINUTES * 60 } });
                if (loaResponse.ok) {
                    const data = await loaResponse.json();
                    if (data.forum?.topics) {
                        loaRecords = data.forum.topics.filter((topic: LoaTopic) => {
                            const match = topic.title.match(/\[.*?\]\s*(.*?)\s*\[/);
                            return match && match[1].toLowerCase() === characterName.toLowerCase();
                        });
                    }
                } else {
                     console.warn(`[Forum API] Failed to fetch LOA data. Status: ${loaResponse.status}`);
                }
            } catch (error) {
                console.error(`[Forum API] Error fetching LOA data:`, error);
            }
        }
    }
    
    let assignment: AssignmentData | null = null;
    let canManageAssignments = false;
    let allUnitsAndDetails: { label: string; value: string; type: 'cat_2' | 'cat_3' }[] = [];
    let secondaryAssignments: SecondaryAssignmentData[] = [];

    if (selectedFaction.feature_flags?.units_divisions_enabled) {
        const [membershipRecords, userMembership] = await Promise.all([
             db.query.factionOrganizationMembership.findMany({
                where: eq(factionOrganizationMembership.character_id, characterId),
            }),
             db.query.factionMembers.findFirst({
                where: and(eq(factionMembers.userId, session.userId), eq(factionMembers.factionId, factionId))
            })
        ]);

        const primaryAssignmentRecord = membershipRecords.find(m => !m.secondary);
        const secondaryAssignmentRecords = membershipRecords.filter(m => m.secondary);

        if (primaryAssignmentRecord && userMembership) {
             const { authorized } = await canUserManage(session, user, userMembership, selectedFaction, primaryAssignmentRecord.type, primaryAssignmentRecord.category_id);
             canManageAssignments = authorized;

            if (primaryAssignmentRecord.type === 'cat_2') {
                const cat2 = await db.query.factionOrganizationCat2.findFirst({
                    where: eq(factionOrganizationCat2.id, primaryAssignmentRecord.category_id),
                    with: { cat1: true }
                });
                if (cat2) {
                    assignment = {
                        path: `${cat2.cat1.name} / ${cat2.name}`,
                        link: `/units-divisions/${cat2.cat1.id}/${cat2.id}`,
                        membershipId: primaryAssignmentRecord.id,
                        sourceCat2Id: cat2.id,
                        title: primaryAssignmentRecord.title,
                    };
                }
            } else if (primaryAssignmentRecord.type === 'cat_3') {
                const cat3 = await db.query.factionOrganizationCat3.findFirst({
                    where: eq(factionOrganizationCat3.id, primaryAssignmentRecord.category_id),
                    with: { cat2: { with: { cat1: true } } }
                });
                 if (cat3) {
                    assignment = {
                        path: `${cat3.cat2.cat1.name} / ${cat3.cat2.name} / ${cat3.name}`,
                        link: `/units-divisions/${cat3.cat2.cat1.id}/${cat3.cat2.id}/${cat3.id}`,
                        membershipId: primaryAssignmentRecord.id,
                        sourceCat2Id: cat3.cat2.id,
                        title: primaryAssignmentRecord.title,
                    };
                }
            }
        }
        
        for (const record of secondaryAssignmentRecords) {
            if (record.type === 'cat_2') {
                const cat2 = await db.query.factionOrganizationCat2.findFirst({ where: eq(factionOrganizationCat2.id, record.category_id), with: { cat1: true } });
                if (cat2) {
                    secondaryAssignments.push({
                        path: `${cat2.cat1.name} / ${cat2.name}`,
                        link: `/units-divisions/${cat2.cat1.id}/${cat2.id}`,
                        title: record.title,
                    });
                }
            } else if (record.type === 'cat_3') {
                const cat3 = await db.query.factionOrganizationCat3.findFirst({ where: eq(factionOrganizationCat3.id, record.category_id), with: { cat2: { with: { cat1: true } } } });
                if (cat3) {
                     secondaryAssignments.push({
                        path: `${cat3.cat2.cat1.name} / ${cat3.cat2.name} / ${cat3.name}`,
                        link: `/units-divisions/${cat3.cat2.cat1.id}/${cat3.cat2.id}/${cat3.id}`,
                        title: record.title,
                    });
                }
            }
        }


        if (canManageAssignments) {
            const allCat1s = await db.query.factionOrganizationCat1.findMany({
                where: eq(factionOrganizationCat1.faction_id, factionId),
                with: { cat2s: { with: { cat3s: true } } }
            });

             for (const cat1 of allCat1s) {
                for (const c2 of cat1.cat2s) {
                    const canManage = await canUserManage(session, user, userMembership, selectedFaction, 'cat_2', c2.id);
                    if (canManage.authorized && !(c2.settings_json?.secondary)) {
                        allUnitsAndDetails.push({
                            label: `${cat1.name} / ${c2.name}`,
                            value: c2.id.toString(),
                            type: 'cat_2'
                        });
                    }
                    if (c2.cat3s) {
                        for (const c3 of c2.cat3s) {
                            const canManageCat3 = await canUserManage(session, user, userMembership, selectedFaction, 'cat_3', c3.id);
                            if(canManageCat3.authorized && !(c3.settings_json?.secondary)) {
                                allUnitsAndDetails.push({
                                    label: `${cat1.name} / ${c2.name} / ${c3.name}`,
                                    value: c3.id.toString(),
                                    type: 'cat_3'
                                });
                            }
                        }
                    }
                }
            }
        }
    }

    const mdcRecordUrl = `https://mdc.gta.world/record/${nameParts.firstname}_${nameParts.lastname}`;

    return { 
        character: { ...charData.data, id: characterId }, 
        totalAbas, 
        characterSheetsEnabled, 
        forumData, 
        abasSettings, 
        assignment, 
        canManageAssignments, 
        allUnitsAndDetails, 
        secondaryAssignments,
        forumProfileUrl,
        mdcRecordUrl,
        loaRecords,
    };
}


export default async function CharacterSheetPage({ params }: PageProps) {
    const data = await getCharacterData(params.name);

    if (data.error) {
         return (
             <div className="container mx-auto p-4 md:p-6 lg:p-8">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>An Error Occurred</AlertTitle>
                    <AlertDescription>{data.error}</AlertDescription>
                </Alert>
             </div>
        )
    }

    return <CharacterSheetClientPage initialData={data} />;
}
