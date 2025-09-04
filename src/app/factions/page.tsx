'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

interface Faction {
    id: number;
    name: string;
    color: string | null;
}

interface UserFaction {
    faction: Faction;
    rank: number;
}

const FactionCardSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent>
            <Skeleton className="h-4 w-full" />
        </CardContent>
    </Card>
);

export default function FactionsPage() {
    const [userFactions, setUserFactions] = useState<UserFaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    useEffect(() => {
        const fetchAndSyncFactions = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/factions/sync');
                
                if (!response.ok) {
                    const errorData = await response.json();
                     if (errorData.reauth) {
                        router.push('/api/auth/logout');
                     }
                    throw new Error(errorData.error || 'Failed to sync factions.');
                }
                
                const data = await response.json();
                setUserFactions(data.factions);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndSyncFactions();
    }, [router]);

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <PageHeader
                title="Your Factions"
                description="Your faction memberships synced from GTA:World."
                actions={
                    <Button asChild>
                        <Link href="/factions/enroll">
                            <PlusCircle />
                            Enroll Faction
                        </Link>
                    </Button>
                }
            />
            
            {error && (
                 <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Sync Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FactionCardSkeleton />
                    <FactionCardSkeleton />
                    <FactionCardSkeleton />
                </div>
            ) : userFactions.length === 0 && !error ? (
                <Card>
                    <CardHeader>
                        <CardTitle>No Factions Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>We couldn't find any of your factions registered with this panel.</p>
                        <p className="text-sm text-muted-foreground mt-2">
                           If you are in a high-ranking position within a faction, you can add it to the panel using the button above.
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
