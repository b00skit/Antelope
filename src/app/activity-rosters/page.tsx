
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, PlusCircle, Pencil, Trash2, Eye, Star, Lock, EyeOff, User as UserIcon, Building } from 'lucide-react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/hooks/use-favorites';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface Roster {
  id: number;
  name: string;
  visibility: 'personal' | 'private' | 'unlisted' | 'public' | 'organization';
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

const visibilityDetails = {
    public: { label: 'Public', icon: Eye, color: 'bg-green-500/10 text-green-500 border-green-500/50', description: 'Visible to all faction members.' },
    private: { label: 'Private', icon: Lock, color: 'bg-red-500/10 text-red-500 border-red-500/50', description: 'Requires a password to view.' },
    unlisted: { label: 'Unlisted', icon: EyeOff, color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50', description: 'Only accessible via direct link.' },
    personal: { label: 'Personal', icon: UserIcon, color: 'bg-blue-500/10 text-blue-500 border-blue-500/50', description: 'Only visible to you.' },
    organization: { label: 'Organization', icon: Building, color: 'bg-purple-500/10 text-purple-500 border-purple-500/50', description: 'This roster is linked to a unit/detail.' },
};


export default function ActivityRostersPage() {
    const [rosters, setRosters] = useState<Roster[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();
    const { favorites, toggleFavorite } = useFavorites();

    const favoriteIds = new Set(favorites.map(f => f.activity_roster_id));

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
                     <TooltipProvider>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead></TableHead>
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
                                        <TableCell colSpan={6} className="text-center h-24">
                                            No rosters found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    rosters.map(roster => {
                                        const isFavorited = favoriteIds.has(roster.id);
                                        const visibility = visibilityDetails[roster.visibility] || { label: 'Unknown', icon: Eye, color: 'bg-gray-500/10 text-gray-500 border-gray-500/50', description: '' };
                                        const canModify = roster.isOwner && roster.visibility !== 'organization';
                                        return (
                                            <TableRow key={roster.id}>
                                                <TableCell>
                                                    <Button variant="ghost" size="icon" onClick={() => toggleFavorite(roster.id)}>
                                                        <Star className={cn("h-4 w-4", isFavorited ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")} />
                                                    </Button>
                                                </TableCell>
                                                <TableCell className="font-medium">{roster.name}</TableCell>
                                                <TableCell>{roster.author.username}</TableCell>
                                                <TableCell>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                             <Badge variant="outline" className={cn('capitalize', visibility.color)}>
                                                                <visibility.icon className="mr-1 h-3 w-3" />
                                                                {visibility.label}
                                                            </Badge>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>{visibility.description}</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TableCell>
                                                <TableCell>{new Date(roster.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button variant="outline" size="icon" asChild>
                                                            <Link href={`/activity-rosters/${roster.id}`}>
                                                                <Eye className="h-4 w-4" />
                                                            </Link>
                                                        </Button>
                                                        {canModify && (
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
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </TooltipProvider>
                </CardContent>
            </Card>
        </div>
    );
}
