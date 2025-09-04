'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, PlusCircle, LogIn, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Faction {
    id: number;
    name: string;
    color: string | null;
    access_rank: number;
    moderation_rank: number;
}

interface UserFaction {
    faction: Faction;
    rank: number;
    joined: boolean;
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
        <CardFooter>
            <Skeleton className="h-10 w-24" />
        </CardFooter>
    </Card>
);

export default function FactionsPage() {
    const [userFactions, setUserFactions] = useState<UserFaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

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

    useEffect(() => {
        fetchAndSyncFactions();
    }, [router]);

    const handleJoin = async (factionId: number) => {
        setActionLoading(factionId);
        try {
            const res = await fetch(`/api/factions/${factionId}/join`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast({ title: 'Success', description: data.message });
            fetchAndSyncFactions(); // Refresh data
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setActionLoading(null);
        }
    };

    const handleDelete = async (factionId: number) => {
        setActionLoading(factionId);
        try {
            const res = await fetch(`/api/factions/${factionId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast({ title: 'Success', description: data.message });
            fetchAndSyncFactions(); // Refresh data
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setActionLoading(null);
        }
    };


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
                    {userFactions.map(({ faction, rank, joined }) => {
                        const canJoin = !joined && rank >= faction.access_rank;
                        const canManage = joined && rank >= faction.moderation_rank;

                        return (
                            <Card key={faction.id}>
                                <CardHeader>
                                    <CardTitle>{faction.name}</CardTitle>
                                    <CardDescription>Your Rank: {rank}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        {joined ? "You have joined this faction's panel." : "You have not joined this faction's panel yet."}
                                    </p>
                                </CardContent>
                                <CardFooter className="flex gap-2">
                                    {canJoin && (
                                        <Button onClick={() => handleJoin(faction.id)} disabled={actionLoading === faction.id}>
                                            {actionLoading === faction.id ? <Loader2 className="animate-spin" /> : <LogIn />}
                                            Join Panel
                                        </Button>
                                    )}
                                    {canManage && (
                                        <>
                                        <Button variant="secondary" asChild>
                                            <Link href={`/factions/manage/${faction.id}`}>
                                                <Settings />
                                                Manage
                                            </Link>
                                        </Button>
                                         <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="destructive" size="icon" disabled={actionLoading === faction.id}>
                                                    {actionLoading === faction.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will permanently unenroll the faction from the panel for everyone. This action cannot be undone.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(faction.id)}>
                                                        Yes, Unenroll Faction
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                        </>
                                    )}
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
