
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, PlusCircle, Pencil, Trash2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface Roster {
  id: number;
  name: string;
  is_public: boolean;
  author: {
    username: string;
  };
  created_at: string;
  isOwner: boolean;
}

const RosterRowSkeleton = () => (
    <TableRow>
        <TableCell><Skeleton className="h-5 w-3/4" /></TableCell>
        <TableCell><Skeleton className="h-5 w-1/2" /></TableCell>
        <TableCell><Skeleton className="h-5 w-1/4" /></TableCell>
        <TableCell><Skeleton className="h-5 w-1/3" /></TableCell>
        <TableCell className="flex gap-2"><Skeleton className="h-8 w-8" /><Skeleton className="h-8 w-8" /></TableCell>
    </TableRow>
);

export default function ActivityRostersPage() {
    const [rosters, setRosters] = useState<Roster[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const fetchRosters = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/rosters');
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error || 'Failed to fetch rosters.');
                }
                const data = await res.json();
                setRosters(data.rosters);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchRosters();
    }, []);

    const handleDelete = async (rosterId: number) => {
        try {
            const res = await fetch(`/api/rosters/${rosterId}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete roster.');
            }
            toast({ title: 'Success', description: 'Roster deleted successfully.' });
            setRosters(prev => prev.filter(r => r.id !== rosterId));
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <PageHeader
                title="Activity Rosters"
                description="Manage and view activity rosters for your faction."
                actions={
                    <Button asChild>
                        <Link href="/activity-rosters/create">
                            <PlusCircle />
                            Create Roster
                        </Link>
                    </Button>
                }
            />

            {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Your Rosters</CardTitle>
                    <CardDescription>A list of all available rosters for your current faction.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Created By</TableHead>
                                <TableHead>Visibility</TableHead>
                                <TableHead>Created At</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => <RosterRowSkeleton key={i} />)
                            ) : rosters.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center h-24">
                                        No rosters found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rosters.map(roster => (
                                    <TableRow key={roster.id}>
                                        <TableCell className="font-medium">{roster.name}</TableCell>
                                        <TableCell>{roster.author.username}</TableCell>
                                        <TableCell>
                                            <Badge variant={roster.is_public ? 'default' : 'secondary'}>
                                                {roster.is_public ? 'Public' : 'Private'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{format(new Date(roster.created_at), 'PPP')}</TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button variant="outline" size="icon" asChild>
                                                    <Link href={`/activity-rosters/${roster.id}`}>
                                                        <Eye className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                {roster.isOwner && (
                                                    <>
                                                        <Button variant="outline" size="icon" asChild>
                                                            <Link href={`/activity-rosters/edit/${roster.id}`}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="destructive" size="icon">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        This will permanently delete the roster "{roster.name}". This action cannot be undone.
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDelete(roster.id)}>
                                                                        Yes, Delete Roster
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
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
