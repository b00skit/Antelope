
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Member {
    character_id: number;
    character_name: string;
    rank: number;
    rank_name: string;
    last_online: string | null;
    last_duty: string | null;
}

interface RosterData {
    roster: { name: string; };
    faction: { name: string; };
    members: Member[];
}

const MemberRowSkeleton = () => (
    <TableRow>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
        <TableCell><Skeleton className="h-5 w-40" /></TableCell>
    </TableRow>
);

const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return <Badge variant="secondary">Never</Badge>;
    const date = new Date(timestamp);
    // Check if date is valid
    if (isNaN(date.getTime())) {
        return <Badge variant="destructive">Invalid Date</Badge>;
    }
    return `${formatDistanceToNow(date)} ago`;
};


export default function RosterViewPage() {
    const [data, setData] = useState<RosterData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const params = useParams();
    const rosterId = params.id as string;

    useEffect(() => {
        if (!rosterId) return;

        const fetchRosterData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch(`/api/rosters/${rosterId}/view`);
                if (!res.ok) {
                    const errorData = await res.json();
                    if (errorData.reauth) router.push('/api/auth/logout');
                    throw new Error(errorData.error || 'Failed to fetch roster details.');
                }
                const responseData = await res.json();
                setData(responseData);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchRosterData();
    }, [rosterId, router]);
    
    // Sort members by rank descending
    const sortedMembers = data?.members?.sort((a, b) => b.rank - a.rank) || [];

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            {isLoading ? (
                <PageHeader title="Loading Roster..." description="Fetching the latest data..." />
            ) : data ? (
                <PageHeader title={data.roster.name} description={`Full member roster for ${data.faction.name}`} />
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
                                <TableHead>Last Online</TableHead>
                                <TableHead>Last On-Duty</TableHead>
                            </TableRow>
                        </TableHeader>
                         <TableBody>
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => <MemberRowSkeleton key={i} />)
                            ) : sortedMembers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center h-24">
                                        No members found for this faction.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                sortedMembers.map(member => (
                                    <TableRow key={member.character_id}>
                                        <TableCell className="font-medium">{member.character_name.replace('_', ' ')}</TableCell>
                                        <TableCell>{member.rank_name}</TableCell>
                                        <TableCell>{formatTimestamp(member.last_online)}</TableCell>
                                        <TableCell>{formatTimestamp(member.last_duty)}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
