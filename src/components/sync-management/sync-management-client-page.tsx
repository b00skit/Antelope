
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, RefreshCw, Users, Activity, MessageSquare, Check, X, ArrowRight, Save, Trash2, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/hooks/use-session';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import config from '@config';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';

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

const DiffTable = ({ diff, type }: { diff: any, type: 'members' | 'abas' }) => {
    if (!diff) return null;

    const allChanges = [
        ...diff.added.map((item: any) => ({ ...item, type: 'added' })),
        ...diff.updated.map((item: any) => ({ ...item, type: 'updated' })),
        ...diff.removed.map((item: any) => ({ ...item, type: 'removed' })),
    ];
    
    if (allChanges.length === 0) {
        return <p className="text-sm text-center text-muted-foreground p-4">No changes detected.</p>
    }

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Character</TableHead>
                    <TableHead>Change</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {allChanges.map((item, index) => (
                    <TableRow key={index}>
                        <TableCell>
                            {item.type === 'added' && <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/50"><Check className="mr-1" /> Added</Badge>}
                            {item.type === 'updated' && <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/50"><ArrowRight className="mr-1" /> Updated</Badge>}
                            {item.type === 'removed' && <Badge variant="destructive"><X className="mr-1" /> Removed</Badge>}
                        </TableCell>
                        <TableCell>{item.character_name}</TableCell>
                        <TableCell>
                            {type === 'members' && item.type === 'updated' && (
                                <span className="text-muted-foreground">{item.old_rank_name} &rarr; <span className="font-semibold text-foreground">{item.rank_name}</span></span>
                            )}
                             {type === 'members' && item.type !== 'updated' && item.rank_name}
                             {type === 'abas' && (
                                <span className="text-muted-foreground">{item.old_abas} &rarr; <span className="font-semibold text-foreground">{item.new_abas}</span></span>
                             )}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

export function SyncManagementClientPage() {
    const { session } = useSession();
    const [status, setStatus] = useState<SyncStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [previewing, setPreviewing] = useState< 'members' | 'abas' | 'forum' | null>(null);
    const [previewData, setPreviewData] = useState<any | null>(null);
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

    const handlePreview = async (type: 'members' | 'abas' | 'forum') => {
        setPreviewing(type);
        setError(null);
        try {
            const res = await fetch(`/api/sync-management/preview/${type}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPreviewData(data);
        } catch (err: any) {
            setError(err.message);
            setPreviewing(null);
        }
    };
    
    const handleConfirm = async () => {
        if (!previewing) return;
        
        setIsLoading(true); // Reuse isLoading for confirm action
        try {
            const res = await fetch(`/api/sync-management/trigger/${previewing}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(previewData.sourceData), // Send the source data to be saved
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast({ title: 'Success', description: data.message });
            setPreviewing(null);
            setPreviewData(null);
            await fetchStatus();
        } catch (err: any) {
             toast({ variant: 'destructive', title: 'Sync Failed', description: err.message });
        } finally {
            setIsLoading(false);
        }
    }
    
    const handleDiscard = () => {
        setPreviewing(null);
        setPreviewData(null);
        setError(null);
    }

    if (previewing) {
        return (
             <div className="container mx-auto p-4 md:p-6 lg:p-8">
                 <Button variant="outline" onClick={handleDiscard} className="mb-4">
                     <ArrowLeft className="mr-2" />
                     Back to Sync Management
                 </Button>
                 <Card>
                    <CardHeader>
                        <CardTitle>Sync Preview: {previewing.charAt(0).toUpperCase() + previewing.slice(1)}</CardTitle>
                        <CardDescription>Review the changes below before confirming the sync.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading && !previewData ? (
                            <div className="flex justify-center items-center h-48">
                                <Loader2 className="animate-spin" />
                            </div>
                        ) : error ? (
                            <Alert variant="destructive">
                                <AlertTriangle />
                                <AlertTitle>Preview Failed</AlertTitle>
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        ) : (
                            <DiffTable diff={previewData} type={previewing as 'members' | 'abas'} />
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handleDiscard}>
                            <X className="mr-2" />
                            Discard
                        </Button>
                        <Button onClick={handleConfirm} disabled={isLoading || error || !previewData}>
                            <Save className="mr-2" />
                            Confirm & Save
                        </Button>
                    </CardFooter>
                 </Card>
             </div>
        )
    }

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <PageHeader
                title="Sync Management"
                description="View sync statuses and manually trigger data synchronization from GTA:World."
            />

            <div className="space-y-6">
                {isLoading && !status ? (
                    <>
                        <SyncCardSkeleton />
                        <SyncCardSkeleton />
                    </>
                ) : status ? (
                    <>
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Users /> Faction Members</CardTitle>
                                <CardDescription>Syncs the full member list, ranks, and status from the GTA:W UCP.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Last synced: {status.membersLastSync ? `${formatDistanceToNow(new Date(status.membersLastSync))} ago` : 'Never'}</p>
                                <Button onClick={() => handlePreview('members')}>Preview Sync</Button>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Activity /> Character ABAS</CardTitle>
                                <CardDescription>Updates the weekly ABAS for all characters in the faction.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Last synced: {status.abasLastSync ? `${formatDistanceToNow(new Date(status.abasLastSync))} ago` : 'Never'}</p>
                                <Button onClick={() => handlePreview('abas')}>Preview Sync</Button>
                            </CardContent>
                        </Card>
                        {status.isForumEnabled && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><MessageSquare /> Forum Data Cache</CardTitle>
                                    <CardDescription>Refreshes cached data from your phpBB forum for roster filtering.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex items-center justify-between">
                                    <p className="text-sm text-muted-foreground">Last synced: {status.forumLastSync ? `${formatDistanceToNow(new Date(status.forumLastSync))} ago` : 'Never'}</p>
                                    <Button onClick={() => handlePreview('forum')}>Preview Sync</Button>
                                </CardContent>
                            </Card>
                        )}
                    </>
                ) : null}
            </div>
        </div>
    );
}
