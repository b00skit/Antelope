'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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
                let csrfToken: string | null = null;
                if (typeof window !== 'undefined') {
                    csrfToken = sessionStorage.getItem('csrfToken');
                    if (!csrfToken) {
                        const match = document.cookie
                            .split('; ')
                            .find(row => row.startsWith('csrf-token='));
                        csrfToken = match ? match.split('=')[1] : null;
                        if (csrfToken) {
                            sessionStorage.setItem('csrfToken', csrfToken);
                        }
                    }
                }
                const response = await fetch('/api/factions/sync', {
                    headers: { 'x-csrf-token': csrfToken || '' },
                });
                
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
