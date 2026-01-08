
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  } from '@/components/ui/alert-dialog';
import { AlertTriangle, Loader2, RefreshCw, Users, Activity, MessageSquare, Check, X, ArrowRight, Save, ArrowLeft, Trash } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { useSession } from '@/hooks/use-session';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

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

const formatTimestamp = (ts: string | null) => {
    if (!ts) return 'N/A';
    try {
        const date = new Date(ts);
        if (isNaN(date.getTime())) return 'Invalid Date';
        return formatDistanceToNow(date) + ' ago';
    } catch {
        return 'Invalid Date';
    }
}

const DiffCell = ({ value }: { value: any }) => {
    if (typeof value === 'object' && value !== null && 'old' in value && 'new' in value) {
        return (
            <div className="flex items-center gap-2">
                <span className="text-muted-foreground line-through">{value.old || 'N/A'}</span>
                <ArrowRight className="h-4 w-4 text-primary" />
                <span className="font-semibold">{value.new || 'N/A'}</span>
            </div>
        );
    }
    return <span>{value || 'N/A'}</span>;
};


const DiffTable = ({ diff, type }: { diff: any, type: 'members' | 'abas' | 'forum' }) => {
    if (!diff) return null;
    
     const allChanges = [
        ...diff.added.map((item: any) => ({ ...item, changeType: 'added' })),
        ...diff.updated.map((item: any) => ({ ...item, changeType: 'updated' })),
        ...diff.removed.map((item: any) => ({ ...item, changeType: 'removed' })),
    ];
    
    if (allChanges.length === 0) {
        return <p className="text-sm text-center text-muted-foreground p-4">No changes detected.</p>
    }
    
    if (type === 'forum') {
         return (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Status</TableHead>
                        <TableHead>Group</TableHead>
                        <TableHead>Character</TableHead>
                        <TableHead>Change</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {allChanges.map((item, index) => (
                        <TableRow key={index}>
                             <TableCell>
                                {item.changeType === 'added' && <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/50"><Check className="mr-1" /> Added</Badge>}
                                {item.changeType === 'removed' && <Badge variant="destructive"><X className="mr-1" /> Removed</Badge>}
                            </TableCell>
                            <TableCell>{item.group_name}</TableCell>
                            <TableCell>{item.character_name}</TableCell>
                            <TableCell>{item.change_summary}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );
    }

    const isMemberSync = type === 'members';

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Name</TableHead>
                    {isMemberSync ? (
                        <>
                            <TableHead>Rank</TableHead>
                            <TableHead>Last Online</TableHead>
                            <TableHead>Last Duty</TableHead>
                        </>
                    ) : (
                        <TableHead className="text-right">ABAS</TableHead>
                    )}
                </TableRow>
            </TableHeader>
            <TableBody>
                {allChanges.map((item, index) => (
                    <TableRow key={item.character_id || index}>
                         <TableCell>
                            {item.changeType === 'added' && <Badge variant="secondary" className="bg-green-500/10 text-green-500 border-green-500/50"><Check className="mr-1" /> Added</Badge>}
                            {item.changeType === 'updated' && <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/50"><ArrowRight className="mr-1" /> Updated</Badge>}
                            {item.changeType === 'removed' && <Badge variant="destructive"><X className="mr-1" /> Removed</Badge>}
                        </TableCell>
                        <TableCell><DiffCell value={item.character_name} /></TableCell>
                        {isMemberSync ? (
                            <>
                                <TableCell><DiffCell value={item.rank_name} /></TableCell>
                                <TableCell><DiffCell value={formatTimestamp(item.last_online?.new ?? item.last_online)} /></TableCell>
                                <TableCell><DiffCell value={formatTimestamp(item.last_duty?.new ?? item.last_duty)} /></TableCell>
                            </>
                        ) : (
                             <TableCell className="text-right"><DiffCell value={item.abas} /></TableCell>
                        )}
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
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
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
        setIsPreviewLoading(true);
        setError(null);
        setPreviewData(null);
        try {
            const res = await fetch(`/api/sync-management/preview/${type}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPreviewData(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsPreviewLoading(false);
        }
    };
    
    const handleConfirm = async () => {
        if (!previewing || !previewData) return;
        
        setIsLoading(true);
        try {
            const res = await fetch(`/api/sync-management/trigger/${previewing}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(previewData),
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

    const handleDeleteData = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/sync-management/delete', {
                method: 'DELETE',
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast({ title: 'Success', description: data.message });
            await fetchStatus();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: err.message });
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
                        {isPreviewLoading ? (
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
                            <DiffTable diff={previewData} type={previewing} />
                        )}
                    </CardContent>
                    <CardFooter className="flex justify-end gap-2">
                        <Button variant="outline" onClick={handleDiscard}>
                            <X className="mr-2" />
                            Discard
                        </Button>
                        <Button onClick={handleConfirm} disabled={isLoading || isPreviewLoading || error || !previewData}>
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
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
                                <p className="text-sm text-muted-foreground">Last synced: {formatTimestamp(status.membersLastSync)}</p>
                                <Button onClick={() => handlePreview('members')}>Preview Sync</Button>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Activity /> Character ABAS</CardTitle>
                                <CardDescription>Updates the weekly ABAS for all characters in the faction.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between">
                                <p className="text-sm text-muted-foreground">Last synced: {formatTimestamp(status.abasLastSync)}</p>
                                <Button onClick={() => handlePreview('abas')}>Preview Sync</Button>
                            </CardContent>
                        </Card>
                        {status.isForumEnabled && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2"><MessageSquare /> Forum Data Sync</CardTitle>
                                    <CardDescription>Syncs memberships from your selected forum groups into the cache.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex items-center justify-between">
                                     <p className="text-sm text-muted-foreground">Last synced: {formatTimestamp(status.forumLastSync)}</p>
                                    <Button onClick={() => handlePreview('forum')}>Preview Sync</Button>
                                </CardContent>
                            </Card>
                        )}

                        <Card className="border-destructive/50">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-destructive"><AlertTriangle /> Danger Zone</CardTitle>
                                <CardDescription>Manage destructive actions for your sync data.</CardDescription>
                            </CardHeader>
                            <CardContent className="flex items-center justify-between">
                                <div>
                                    <p className="font-semibold">Delete Sync Data</p>
                                    <p className="text-sm text-muted-foreground">Permanently delete all synced data. This acts as a hard reset for corrupted data.</p>
                                </div>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive"><Trash className="mr-2 h-4 w-4"/> Delete Data</Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This action cannot be undone. This will permanently delete all synced data (members, ABAS, forum cache) for your faction.
                                                You will need to re-sync all data manually.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={handleDeleteData} className="bg-destructive hover:bg-destructive/90">Delete Data</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </CardContent>
                        </Card>
                    </>
                ) : null}
            </div>
        </div>
    );
}
