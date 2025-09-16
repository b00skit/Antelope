
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, User, ShieldCheck, Ban, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useSession } from '@/hooks/use-session';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface PanelUser {
    id: number;
    username: string;
    role: string;
    rank: number;
}

interface BlockedUser extends PanelUser {
    blockedBy: string;
    blockedAt: string;
}

const UserRowSkeleton = () => (
    <TableRow>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-16" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
    </TableRow>
);

export function UserManagementPage() {
    const { session } = useSession();
    const [users, setUsers] = useState<PanelUser[]>([]);
    const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
    const [currentUserRank, setCurrentUserRank] = useState<number>(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionLoading, setIsActionLoading] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { toast } = useToast();

    const fetchUsers = async () => {
        if (!session?.hasActiveFaction) return;

        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setUsers(data.users);
            setBlockedUsers(data.blockedUsers);
            setCurrentUserRank(data.currentUserRank);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, [session]);
    
    const handleBlock = async (userId: number) => {
        setIsActionLoading(userId);
        try {
            const res = await fetch(`/api/users/${userId}/block`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast({ title: 'Success', description: 'User has been blocked.' });
            fetchUsers();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsActionLoading(null);
        }
    };
    
    const handleUnblock = async (userId: number) => {
        setIsActionLoading(userId);
        try {
            const res = await fetch(`/api/users/${userId}/unblock`, { method: 'POST' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast({ title: 'Success', description: 'User has been unblocked.' });
            fetchUsers();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsActionLoading(null);
        }
    }


    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <PageHeader
                title="Panel User Management"
                description={`Viewing all joined panel users for ${session?.activeFaction?.name}.`}
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
                    <CardTitle>Joined Users</CardTitle>
                    <CardDescription>
                        This is a list of all users who have access to this faction's panel.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Username</TableHead>
                                <TableHead>Faction Rank</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 5 }).map((_, i) => <UserRowSkeleton key={i} />)
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center">
                                        No users have joined the panel yet.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map(user => {
                                    const canBlock = currentUserRank > user.rank && session?.userId !== user.id;
                                    return (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                {user.role === 'superadmin' ? <ShieldCheck className="h-4 w-4 text-destructive" /> : <User className="h-4 w-4 text-muted-foreground" />}
                                                {user.username}
                                            </TableCell>
                                            <TableCell>{user.rank}</TableCell>
                                            <TableCell>
                                                {canBlock ? (
                                                    <Button variant="destructive" size="sm" onClick={() => handleBlock(user.id)} disabled={isActionLoading === user.id}>
                                                        {isActionLoading === user.id ? <Loader2 className="animate-spin" /> : <Ban className="mr-2" />}
                                                        Block
                                                    </Button>
                                                ) : null}
                                            </TableCell>
                                        </TableRow>
                                    )
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Blocked Users</CardTitle>
                    <CardDescription>
                        Users in this list are blocked from accessing this faction's panel.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Username</TableHead>
                                <TableHead>Blocked By</TableHead>
                                <TableHead>Blocked At</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 2 }).map((_, i) => <UserRowSkeleton key={i} />)
                            ) : blockedUsers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No users are currently blocked.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                blockedUsers.map(user => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.username}</TableCell>
                                        <TableCell>{user.blockedBy}</TableCell>
                                        <TableCell>{format(new Date(user.blockedAt), 'PPP')}</TableCell>
                                        <TableCell>
                                             <Button variant="secondary" size="sm" onClick={() => handleUnblock(user.id)} disabled={isActionLoading === user.id}>
                                                {isActionLoading === user.id ? <Loader2 className="animate-spin" /> : <CheckCircle className="mr-2" />}
                                                Unblock
                                            </Button>
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
