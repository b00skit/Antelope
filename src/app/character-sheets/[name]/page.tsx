

import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembersCache, factionMembersAbasCache, factionOrganizationMembership, factionOrganizationCat2, factionOrganizationCat3, factionOrganizationCat1, factionMembers } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { canUserManage } from '@/app/api/units-divisions/[cat1Id]/[cat2Id]/helpers';
import { CharacterSheetClientPage } from '@/components/character-sheets/character-sheet-client-page';

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

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const cachedFaction = await db.query.factionMembersCache.findFirst({
        where: eq(factionMembersCache.faction_id, factionId)
    });

    let members = cachedFaction?.members || [];
    if (!cachedFaction || !cachedFaction.last_sync_timestamp || new Date(cachedFaction.last_sync_timestamp) < oneDayAgo) {
        const factionApiResponse = await fetch(`https://ucp.gta.world/api/faction/${factionId}`, {
            headers: { Authorization: `Bearer ${session.gtaw_access_token}` },
        });

        if (!factionApiResponse.ok) {
            if (factionApiResponse.status === 401) return { error: 'GTA:World session expired.', reauth: true };
            return { error: 'Failed to sync with GTA:World API.' };
        }
        
        const gtawFactionData = await factionApiResponse.json();
        members = gtawFactionData.data.members;

        await db.insert(factionMembersCache)
            .values({ faction_id: factionId, members: members, last_sync_timestamp: now })
            .onConflictDoUpdate({ target: factionMembersCache.faction_id, set: { members: members, last_sync_timestamp: now } });
    }
    
    const characterName = decodeURIComponent(name).replace(/_/g, ' ');
    const character = members.find((m: any) => m.character_name.toLowerCase() === characterName.toLowerCase());
    if (!character) {
        return { error: `Character "${characterName}" not found in faction.` };
    }
    const characterId = character.character_id;

    const charApiResponse = await fetch(`https://ucp.gta.world/api/faction/${factionId}/character/${characterId}`, {
        headers: { Authorization: `Bearer ${session.gtaw_access_token}` },
    });
    if (!charApiResponse.ok) {
        if (charApiResponse.status === 401) return { error: 'GTA:World session expired.', reauth: true };
        return { error: 'Failed to fetch character data from GTA:World API.' };
    }
    const charData = await charApiResponse.json();

    if (charData.data.alternative_characters) {
        const uniqueAlts = Array.from(new Map(charData.data.alternative_characters.map((item: any) => [item['character_id'], item])).values());
        charData.data.alternative_characters = uniqueAlts;
    }

    const charactersToCache = [
        { character_id: charData.data.character_id, abas: charData.data.abas },
        ...charData.data.alternative_characters.map((alt: any) => ({ character_id: alt.character_id, abas: alt.abas }))
    ];
    
    const totalAbas = charactersToCache.reduce((sum, char) => sum + parseFloat(char.abas || '0'), 0);

    for (const char of charactersToCache) {
        if (char.character_id && char.abas !== undefined) {
            await db.insert(factionMembersAbasCache)
                .values({
                    character_id: char.character_id,
                    faction_id: factionId,
                    abas: char.abas,
                    total_abas: totalAbas,
                    last_sync_timestamp: now,
                })
                .onConflictDoUpdate({
                    target: [factionMembersAbasCache.character_id, factionMembersAbasCache.faction_id],
                    set: {
                        abas: char.abas,
                        total_abas: totalAbas,
                        last_sync_timestamp: now,
                    }
                });
        }
    }
    
    let forumData: ForumData | null = null;
    if (selectedFaction.phpbb_api_url && selectedFaction.phpbb_api_key) {
        try {
            const forumUsername = characterName;
            const baseUrl = selectedFaction.phpbb_api_url.endsWith('/') ? selectedFaction.phpbb_api_url : `${selectedFaction.phpbb_api_url}/`;
            const apiKey = selectedFaction.phpbb_api_key;
            const forumApiUrl = `${baseUrl}app.php/booskit/phpbbapi/user/username/${forumUsername}?key=${apiKey}`;

            const forumApiResponse = await fetch(forumApiUrl, { next: { revalidate: 3600 } });
            if (forumApiResponse.ok) {
                const data = await forumApiResponse.json();
                if (data.user) {
                    forumData = data.user;
                }
            } else {
                console.warn(`[Forum API] Failed to fetch data for ${forumUsername}. Status: ${forumApiResponse.status}`);
            }
        } catch (error) {
            console.error(`[Forum API] Error fetching forum data:`, error);
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


    return { character: { ...charData.data, id: characterId }, totalAbas, characterSheetsEnabled, forumData, abasSettings, assignment, canManageAssignments, allUnitsAndDetails, secondaryAssignments };
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
