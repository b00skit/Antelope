
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, RefreshCw, UserX } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Link from 'next/link';

interface Member {
    character_id: number;
    character_name: string;
    rank: number;
    rank_name: string;
    last_online: string | null;
    last_duty: string | null;
    abas?: string | null;
    abas_last_sync?: string | null;
    total_abas?: number | null;
}

interface RosterData {
    roster: { name: string; };
    faction: { 
        name: string;
        features: {
            character_sheets_enabled?: boolean;
        } | null
    };
    members: Member[];
    missingForumUsers?: string[];
}

const MemberRowSkeleton = () => (
    <TableRow>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
    </TableRow>
);

const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return <Badge variant="secondary">Never</Badge>;
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
        return <Badge variant="destructive">Invalid Date</Badge>;
    }
    return `${formatDistanceToNow(date)} ago`;
};


export default function RosterViewPage() {
    const [data, setData] = useState<RosterData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const params = useParams();
    const rosterId = params.id as string;
    const { toast } = useToast();

    const fetchRosterData = useCallback(async (forceSync = false) => {
        if (forceSync) {
            setIsSyncing(true);
        } else {
            setIsLoading(true);
        }
        setError(null);

        try {
            const url = forceSync ? `/api/rosters/${rosterId}/view?forceSync=true` : `/api/rosters/${rosterId}/view`;
            const res = await fetch(url);
            if (!res.ok) {
                const errorData = await res.json();
                if (errorData.reauth) router.push('/api/auth/logout');
                throw new Error(errorData.error || 'Failed to fetch roster details.');
            }
            const responseData = await res.json();
            
            // De-duplicate members based on character_id
            if (responseData.members) {
                const uniqueMembers = Array.from(new Map(responseData.members.map((item: Member) => [item['character_id'], item])).values());
                responseData.members = uniqueMembers;
            }

            setData(responseData);

            if (forceSync) {
                toast({ title: 'Success', description: 'Roster has been synced with the latest data.' });
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
            setIsSyncing(false);
        }
    }, [rosterId, router, toast]);

    useEffect(() => {
        if (!rosterId) return;
        fetchRosterData();
    }, [rosterId, fetchRosterData]);
    
    // Sort members by rank descending
    const sortedMembers = data?.members?.sort((a, b) => b.rank - a.rank) || [];
    const characterSheetsEnabled = data?.faction?.features?.character_sheets_enabled ?? false;
    const missingForumUsers = data?.missingForumUsers || [];

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            {isLoading ? (
                <PageHeader title="Loading Roster..." description="Fetching the latest data..." />
            ) : data ? (
                <PageHeader 
                    title={data.roster.name} 
                    description={`Full member roster for ${data.faction.name}`}
                    actions={
                        <Button variant="outline" onClick={() => fetchRosterData(true)} disabled={isSyncing}>
                           {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                            Force Sync
                        </Button>
                    }
                />
            ) : (
                 <PageHeader title="Error" description="Could not load roster." />
            )}

            {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            
            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Faction Roster</CardTitle>
                        <CardDescription>
                            Displaying {isLoading ? '...' : sortedMembers.length} members.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Character Name</TableHead>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>ABAS</TableHead>
                                    <TableHead>Last Online</TableHead>
                                    <TableHead>Last On-Duty</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array.from({ length: 10 }).map((_, i) => <MemberRowSkeleton key={i} />)
                                ) : sortedMembers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            No members found for this roster's filters.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    sortedMembers.map(member => (
                                        <TableRow key={member.character_id}>
                                            <TableCell className="font-medium">
                                                {characterSheetsEnabled ? (
                                                    <Link href={`/character-sheets/${member.character_name.replace(/ /g, '_')}`} className="hover:underline text-primary">
                                                        {member.character_name.replace(/_/g, ' ')}
                                                    </Link>
                                                ) : (
                                                    member.character_name.replace(/_/g, ' ')
                                                )}
                                            </TableCell>
                                            <TableCell>{member.rank_name}</TableCell>
                                            <TableCell>
                                                {member.abas ? (
                                                    <TooltipProvider>
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="cursor-help">{member.abas}</span>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                <p><strong>Total ABAS:</strong> {member.total_abas?.toFixed(2) ?? 'N/A'}</p>
                                                                <p>Last synced: {formatTimestamp(member.abas_last_sync)}</p>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    </TooltipProvider>
                                                ) : (
                                                    'N/A'
                                                )}
                                            </TableCell>
                                            <TableCell>{formatTimestamp(member.last_online)}</TableCell>
                                            <TableCell>{formatTimestamp(member.last_duty)}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                {missingForumUsers.length > 0 && (
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><UserX className="text-destructive"/> Missing Forum Users</CardTitle>
                            <CardDescription>
                                These forum users were found in the specified groups but do not have a corresponding character in the faction.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {missingForumUsers.map(username => (
                                    <Badge key={username} variant="secondary">{username}</Badge>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}

    