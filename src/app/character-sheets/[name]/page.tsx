import { PageHeader } from '@/components/dashboard/page-header';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembersCache } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, User, Briefcase, Users, Hash, Calendar, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { CharacterImage } from '@/components/character-sheets/character-image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface PageProps {
    params: {
        name: string;
    }
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

    // Check feature flag
    if (!user.selectedFaction.feature_flags?.character_sheets_enabled) {
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
    const characterName = name.replace(/_/g, ' ');
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
    
    return { character: charData.data };
}

const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return <Badge variant="secondary">Never</Badge>;
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return <Badge variant="destructive">Invalid Date</Badge>;
    return `${formatDistanceToNow(date)} ago`;
};

export default async function CharacterSheetPage({ params }: PageProps) {
    const { name } = params;
    if (!name) return notFound();

    const data = await getCharacterData(decodeURIComponent(name));

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

    const { character } = data;
    const characterImage = `https://mdc.gta.world/img/persons/${character.firstname}_${character.lastname}.png?${Date.now()}`;

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <PageHeader
                title="Character Record"
                description={`Viewing file for ${character.firstname} ${character.lastname}`}
            />
            
            <Card>
                <CardHeader>
                    <CardTitle>Personnel File</CardTitle>
                    <CardDescription>Official information for {character.firstname} {character.lastname}.</CardDescription>
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
                                    <div><strong className="text-muted-foreground block text-sm">ABAS</strong> {character.abas}</div>
                                </div>
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
                                        <TableCell className="font-medium">{alt.character_name}</TableCell>
                                        <TableCell>{alt.rank_name}</TableCell>
                                        <TableCell>{alt.abas}</TableCell>
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
