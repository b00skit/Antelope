import { PageHeader } from '@/components/dashboard/page-header';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSession } from '@/lib/session';
import { db } from '@/db';
import { users, factionMembersCache } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

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
        // This won't work in a server component, but we can display a message.
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
    
    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <PageHeader
                title={`${character.firstname} ${character.lastname}`}
                description={`Character Sheet - ${character.rank_name}`}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Character Information</CardTitle>
                        <CardDescription>Details for {character.firstname}.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div><strong className="text-muted-foreground">Character ID:</strong> {character.character_id}</div>
                        <div><strong className="text-muted-foreground">User ID:</strong> {character.user_id}</div>
                        <div><strong className="text-muted-foreground">Rank:</strong> {character.rank_name} (Level {character.rank})</div>
                        <div><strong className="text-muted-foreground">ABAS:</strong> {character.abas}</div>
                        <div><strong className="text-muted-foreground">Last Online:</strong> {formatTimestamp(character.last_online)}</div>
                        <div><strong className="text-muted-foreground">Last On Duty:</strong> {formatTimestamp(character.last_duty)}</div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Alternative Characters</CardTitle>
                        <CardDescription>Other characters on this account.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {character.alternative_characters && character.alternative_characters.length > 0 ? (
                             <ul className="space-y-4">
                                {character.alternative_characters.map((alt: any) => (
                                    <li key={alt.character_id} className="p-3 border rounded-md">
                                        <p className="font-semibold">{alt.character_name}</p>
                                        <p className="text-sm text-muted-foreground">{alt.rank_name} (Rank {alt.rank})</p>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">No alternative characters found.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
