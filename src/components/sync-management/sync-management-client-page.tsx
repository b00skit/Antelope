'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, RefreshCw, Users, Activity, MessageSquare } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/hooks/use-session';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface SyncStatus {
    membersLastSync: string | null;
    abasLastSync: string | null;
    forumLastSync: string | null;
    isForumEnabled: boolean;
}

const SyncCardSkeleton = () => (
    <Card>
        <CardHeader>
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
        </CardHeader>
        <CardContent className="flex items-center justify-between">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-10 w-24" />
        </CardContent>
    </Card>
);


export function SyncManagementClientPage() {
    const { session } = useSession();
    const [status, setStatus] = useState<SyncStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [syncing, setSyncing] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchStatus = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/sync-management/status');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setStatus(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session?.hasActiveFaction) {
            fetchStatus();
        }
    }, [session]);

    const handleSync = async (type: 'members' | 'abas' | 'forum') => {
        setSyncing(type);
        try {
            const res = await fetch(`/api/sync-management/trigger/${type}`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast({ title: 'Success', description: data.message });
            await fetchStatus();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Sync Failed', description: err.message });
        } finally {
            setSyncing(null);
        }
    };

    const isButtonDisabled = (lastSync: string | null) => {
        if (!lastSync) return false;
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        return new Date(lastSync) > oneHourAgo;
    };

    const renderSyncCard = (
        type: 'members' | 'abas' | 'forum',
        title: string,
        description: string,
        icon: React.ReactNode,
        lastSync: string | null,
    ) => (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    {icon} {title}
                </CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                    Last synced: {lastSync ? `${formatDistanceToNow(new Date(lastSync))} ago` : 'Never'}
                </p>
                <Button
                    onClick={() => handleSync(type)}
                    disabled={syncing === type || isButtonDisabled(lastSync)}
                >
                    {syncing === type && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sync Now
                </Button>
            </CardContent>
        </Card>
    );

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <PageHeader
                title="Sync Management"
                description="View sync statuses and manually trigger data synchronization from GTA:World."
            />

            {error && (
                <Alert variant="destructive" className="mb-4">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <div className="space-y-6">
                {isLoading ? (
                    <>
                        <SyncCardSkeleton />
                        <SyncCardSkeleton />
                    </>
                ) : status ? (
                    <>
                        {renderSyncCard(
                            'members',
                            'Faction Members',
                            'Syncs the full member list, ranks, and status from the GTA:W UCP.',
                            <Users className="h-5 w-5" />,
                            status.membersLastSync
                        )}
                        {renderSyncCard(
                            'abas',
                            'Character ABAS',
                            'Updates the weekly ABAS for all characters in the faction.',
                            <Activity className="h-5 w-5" />,
                            status.abasLastSync
                        )}
                        {status.isForumEnabled && renderSyncCard(
                            'forum',
                            'Forum Data Cache',
                            'Refreshes cached data from your phpBB forum for roster filtering.',
                            <MessageSquare className="h-5 w-5" />,
                            status.forumLastSync
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
}
