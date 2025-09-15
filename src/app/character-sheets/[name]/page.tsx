

import { PageHeader } from '@/components/dashboard/page-header';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembersCache, factionMembersAbasCache, factionOrganizationMembership, factionOrganizationCat2, factionOrganizationCat3, factionOrganizationCat1 } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, User, Briefcase, Users, Hash, Calendar, Clock, Sigma, BookUser, Building } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { CharacterImage } from '@/components/character-sheets/character-image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

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

    // Check feature flag
    if (!characterSheetsEnabled) {
        return { error: 'Character sheets are not enabled for this faction.' };
    }

    // 1. Refresh faction members cache if stale
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
    
    // 2. Find character ID from name
    const characterName = decodeURIComponent(name).replace(/_/g, ' ');
    const character = members.find((m: any) => m.character_name.toLowerCase() === characterName.toLowerCase());
    if (!character) {
        return { error: `Character "${characterName}" not found in faction.` };
    }
    const characterId = character.character_id;

    // 3. Fetch specific character data from GTA:W API
    const charApiResponse = await fetch(`https://ucp.gta.world/api/faction/${factionId}/character/${characterId}`, {
        headers: { Authorization: `Bearer ${session.gtaw_access_token}` },
    });
    if (!charApiResponse.ok) {
        if (charApiResponse.status === 401) return { error: 'GTA:World session expired.', reauth: true };
        return { error: 'Failed to fetch character data from GTA:World API.' };
    }
    const charData = await charApiResponse.json();

    // De-duplicate alternative characters
    if (charData.data.alternative_characters) {
        const uniqueAlts = Array.from(new Map(charData.data.alternative_characters.map((item: any) => [item['character_id'], item])).values());
        charData.data.alternative_characters = uniqueAlts;
    }

    // 4. Update ABAS cache
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
    
    // 5. Fetch forum data if integration is enabled
    let forumData: ForumData | null = null;
    if (selectedFaction.phpbb_api_url && selectedFaction.phpbb_api_key) {
        try {
            const forumUsername = characterName;
            const baseUrl = selectedFaction.phpbb_api_url.endsWith('/') ? selectedFaction.phpbb_api_url : `${selectedFaction.phpbb_api_url}/`;
            const apiKey = selectedFaction.phpbb_api_key;
            const forumApiUrl = `${baseUrl}app.php/booskit/phpbbapi/user/username/${forumUsername}?key=${apiKey}`;

            const forumApiResponse = await fetch(forumApiUrl, { next: { revalidate: 3600 } }); // Cache for 1 hour
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
    
    // 6. Fetch Units & Divisions assignment
    let assignment: AssignmentData | null = null;
    if (selectedFaction.feature_flags?.units_divisions_enabled) {
        const membership = await db.query.factionOrganizationMembership.findFirst({
            where: eq(factionOrganizationMembership.character_id, characterId)
        });

        if (membership) {
            if (membership.type === 'cat_2') {
                const cat2 = await db.query.factionOrganizationCat2.findFirst({
                    where: eq(factionOrganizationCat2.id, membership.category_id),
                    with: { cat1: true }
                });
                if (cat2) {
                    assignment = {
                        path: `${cat2.cat1.name} / ${cat2.name}`,
                        link: `/units-divisions/${cat2.cat1.id}/${cat2.id}`
                    };
                }
            } else if (membership.type === 'cat_3') {
                const cat3 = await db.query.factionOrganizationCat3.findFirst({
                    where: eq(factionOrganizationCat3.id, membership.category_id),
                    with: { cat2: { with: { cat1: true } } }
                });
                 if (cat3) {
                    assignment = {
                        path: `${cat3.cat2.cat1.name} / ${cat3.cat2.name} / ${cat3.name}`,
                        link: `/units-divisions/${cat3.cat2.cat1.id}/${cat3.cat2.id}/${cat3.id}`
                    };
                }
            }
        }
    }

    return { character: charData.data, totalAbas, characterSheetsEnabled, forumData, abasSettings, assignment };
}

const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return <Badge variant="secondary">Never</Badge>;
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return <Badge variant="destructive">Invalid Date</Badge>;
    return `${formatDistanceToNow(date)} ago`;
};

const getAbasClass = (abas: number | null | undefined, rank: number, settings: FactionAbasSettings) => {
    const abasValue = abas || 0;
    const isSupervisor = rank >= settings.supervisor_rank;
    const requiredAbas = isSupervisor ? settings.minimum_supervisor_abas : settings.minimum_abas;
    if (requiredAbas > 0 && abasValue < requiredAbas) {
        return "text-red-500 font-bold";
    }
    return "";
};

const formatAbas = (abas: string | number | null | undefined) => {
    const num = typeof abas === 'string' ? parseFloat(abas) : abas;
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    return num.toFixed(2);
}

export default async function CharacterSheetPage({ params }: PageProps) {
    const { name } = params;
    if (!name) return notFound();

    const data = await getCharacterData(name);

    if (data.reauth) {
        return (
             <div className="container mx-auto p-4 md:p-6 lg:p-8">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Authentication Error</AlertTitle>
                    <AlertDescription>Your session with GTA:World has expired. Please log out and log back in.</AlertDescription>
                </Alert>
             </div>
        )
    }

    if (data.error) {
        return (
             <div className="container mx-auto p-4 md:p-6 lg:p-8">
                 <PageHeader title="Error" description="Could not load character sheet." />
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>An Error Occurred</AlertTitle>
                    <AlertDescription>{data.error}</AlertDescription>
                </Alert>
             </div>
        )
    }

    const { character, totalAbas, characterSheetsEnabled, forumData, abasSettings, assignment } = data;
    const characterImage = `https://mdc.gta.world/img/persons/${character.firstname}_${character.lastname}.png?${Date.now()}`;

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <PageHeader
                title="Character Record"
                description={`Viewing file for ${character.firstname} ${character.lastname}`}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className={cn(forumData ? 'lg:col-span-2' : 'lg:col-span-3')}>
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Personnel File</CardTitle>
                            <CardDescription>Official information for {character.firstname} ${character.lastname}.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col md:flex-row gap-6">
                            <div className="flex-shrink-0">
                                <CharacterImage
                                    initialSrc={characterImage}
                                    alt={`Mugshot of ${character.firstname} ${character.lastname}`}
                                />
                            </div>
                            <div className="flex-1 space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Identification</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-lg p-4">
                                        <div className="flex items-center gap-3">
                                            <Hash className="h-5 w-5 text-primary" />
                                            <div><strong className="text-muted-foreground block text-sm">Character ID</strong> {character.character_id}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <User className="h-5 w-5 text-primary" />
                                            <div><strong className="text-muted-foreground block text-sm">User ID</strong> {character.user_id}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Briefcase className="h-5 w-5 text-primary" />
                                            <div><strong className="text-muted-foreground block text-sm">Rank</strong> {character.rank_name} (Level {character.rank})</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Users className="h-5 w-5 text-primary" />
                                            <div><strong className="text-muted-foreground block text-sm">ABAS</strong> <span className={cn(getAbasClass(parseFloat(character.abas), character.rank, abasSettings))}>{formatAbas(character.abas)}</span></div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Sigma className="h-5 w-5 text-primary" />
                                            <div>
                                                <strong className="text-muted-foreground block text-sm">Total ABAS</strong> 
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className={cn('cursor-help', getAbasClass(totalAbas, character.rank, abasSettings))}>{formatAbas(totalAbas)}</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Sum of ABAS across all characters on this account.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>
                                        {assignment && (
                                            <div className="flex items-center gap-3">
                                                <Building className="h-5 w-5 text-primary" />
                                                <div>
                                                    <strong className="text-muted-foreground block text-sm">Assignment</strong>
                                                    <Link href={assignment.link} className="hover:underline text-primary">{assignment.path}</Link>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Status</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-lg p-4">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="h-5 w-5 text-primary" />
                                            <div><strong className="text-muted-foreground block text-sm">Last Online</strong> {formatTimestamp(character.last_online)}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Clock className="h-5 w-5 text-primary" />
                                            <div><strong className="text-muted-foreground block text-sm">Last On Duty</strong> {formatTimestamp(character.last_duty)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                {forumData && (
                    <div className="lg:col-span-1 space-y-6">
                         <Card className="h-full flex flex-col">
                             <CardHeader>
                                 <CardTitle className="flex items-center gap-2"><BookUser /> Forum Profile</CardTitle>
                                 <CardDescription>Roles and groups from the forum.</CardDescription>
                             </CardHeader>
                             <CardContent className="flex-grow">
                                 <ScrollArea className="h-48 pr-4">
                                     <div className="space-y-2">
                                         {forumData.groups.length > 0 ? (
                                             forumData.groups.map(group => (
                                                 <Badge key={group.id} variant={group.leader ? "default" : "secondary"} className="mr-1 mb-1">
                                                     {group.name}
                                                 </Badge>
                                             ))
                                         ) : (
                                             <p className="text-sm text-muted-foreground">No forum groups found.</p>
                                         )}
                                     </div>
                                 </ScrollArea>
                             </CardContent>
                         </Card>
                    </div>
                )}
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Alternative Characters</CardTitle>
                    <CardDescription>Other characters on this account.</CardDescription>
                </CardHeader>
                <CardContent>
                    {character.alternative_characters && character.alternative_characters.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Character Name</TableHead>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>ABAS</TableHead>
                                    <TableHead>Last Online</TableHead>
                                    <TableHead>Last On Duty</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {character.alternative_characters.map((alt: any) => (
                                    <TableRow key={alt.character_id}>
                                        <TableCell className="font-medium">
                                             {characterSheetsEnabled ? (
                                                <Link href={`/character-sheets/${alt.character_name.replace(/ /g, '_')}`} className="hover:underline text-primary">
                                                    {alt.character_name}
                                                </Link>
                                            ) : (
                                                alt.character_name
                                            )}
                                        </TableCell>
                                        <TableCell>{alt.rank_name}</TableCell>
                                        <TableCell className={cn(getAbasClass(parseFloat(alt.abas), alt.rank, abasSettings))}>{formatAbas(alt.abas)}</TableCell>
                                        <TableCell>{formatTimestamp(alt.last_online)}</TableCell>
                                        <TableCell>{formatTimestamp(alt.last_duty)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No alternative characters found.</p>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}
