import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Info } from 'lucide-react';
import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData, sessionOptions } from '@/lib/session';
import { db } from '@/db';
import { users, factions, factionMembers } from '@/db/schema';
import { eq, and, gt, or, isNull } from 'drizzle-orm';

async function syncFactions(session: SessionData) {
    if (!session.isLoggedIn || !session.gtaw_access_token) {
        return { success: false, error: 'Not authenticated or no access token available.' };
    }

    const user = await db.query.users.findFirst({
        where: eq(users.id, session.userId!),
    });

    if (!user) {
        return { success: false, error: 'User not found.' };
    }

    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Sync if last_sync_timestamp is null or older than 24 hours
    if (user.last_sync_timestamp && user.last_sync_timestamp > oneDayAgo) {
        return { success: true, message: 'Faction data is up to date.' };
    }

    try {
        const factionsResponse = await fetch('https://ucp.gta.world/api/factions', {
            headers: {
                Authorization: `Bearer ${session.gtaw_access_token}`,
            },
        });

        if (!factionsResponse.ok) {
            const errorBody = await factionsResponse.text();
            console.error('Failed to fetch factions:', errorBody);
            return { success: false, error: 'Failed to fetch faction data from GTA:World API.' };
        }

        const gtawFactionsData = await factionsResponse.json();
        
        const characterFactions = gtawFactionsData.data;
        if (!characterFactions || Object.keys(characterFactions).length === 0) {
            return { success: true, message: 'No faction data found for your characters.' };
        }
        
        // Group by faction_name to find the highest rank per faction
        const highestRanks: { [key: string]: { id: number; name: string; rank: number } } = {};
        for (const charId in characterFactions) {
            const factionInfo = characterFactions[charId];
            const name = factionInfo.faction_name;
            if (!highestRanks[name] || factionInfo.faction_rank > highestRanks[name].rank) {
                highestRanks[name] = {
                    id: factionInfo.faction,
                    name: name,
                    rank: factionInfo.faction_rank,
                };
            }
        }
        
        const allDbFactions = await db.query.factions.findMany();
        const userFactionMemberships = await db.query.factionMembers.findMany({
            where: eq(factionMembers.userId, user.id)
        });

        for (const factionName in highestRanks) {
            const { id: factionId, rank } = highestRanks[factionName];
            
            const dbFaction = allDbFactions.find(f => f.id === factionId);
            if (!dbFaction) continue; // Skip if faction doesn't exist in our DB

            const existingMembership = userFactionMemberships.find(m => m.factionId === factionId);

            if (existingMembership) {
                // Update if new rank is higher
                if (rank > existingMembership.rank) {
                    await db.update(factionMembers)
                        .set({ rank })
                        .where(and(eq(factionMembers.userId, user.id), eq(factionMembers.factionId, factionId)));
                }
            } else {
                // Insert new membership
                await db.insert(factionMembers).values({
                    userId: user.id,
                    factionId: factionId,
                    rank: rank,
                });
            }
        }
        
        // Update the sync timestamp
        await db.update(users).set({ last_sync_timestamp: now }).where(eq(users.id, user.id));

        return { success: true, message: 'Successfully synced faction data.' };

    } catch (error) {
        console.error('Faction sync error:', error);
        return { success: false, error: 'An internal error occurred during faction sync.' };
    }
}


export default async function FactionsPage() {
    const session = await getIronSession<SessionData>(cookies(), sessionOptions);
    
    if (!session.isLoggedIn) {
        return (
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Access Denied</AlertTitle>
                  <AlertDescription>You must be logged in to view this page.</AlertDescription>
                </Alert>
            </div>
        )
    }

    const syncResult = await syncFactions(session);

    const userFactions = await db.query.factionMembers.findMany({
        where: eq(factionMembers.userId, session.userId!),
        with: {
            faction: true,
        },
    });

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <PageHeader
                title="Your Factions"
                description="Your faction memberships synced from GTA:World."
            />
            
            {syncResult && !syncResult.success && syncResult.error && (
                 <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Sync Error</AlertTitle>
                  <AlertDescription>{syncResult.error}</AlertDescription>
                </Alert>
            )}

            {userFactions.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>No Factions Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>We couldn't find any factions for your account that are registered with this panel.</p>
                        <p className="text-sm text-muted-foreground mt-2">
                           This page automatically syncs with your GTA:World UCP data. If you've recently joined a faction, it may take up to 24 hours to appear.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userFactions.map(({ faction, rank }) => (
                        <Card key={faction.id}>
                            <CardHeader>
                                <CardTitle>{faction.name}</CardTitle>
                                <CardDescription>Your Rank: {rank}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {/* Future content can go here */}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
