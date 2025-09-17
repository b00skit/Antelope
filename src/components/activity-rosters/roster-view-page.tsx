
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RosterContent } from './roster-content';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFavorites } from '@/hooks/use-favorites';
import { cn } from '@/lib/utils';
import config from '@config';


interface RosterViewPageProps {
    rosterId: number;
}

const COOLDOWN_MINUTES = config.GTAW_API_REFRESH_MINUTES_FACTIONS;

interface Member {
    character_id: number;
    character_name: string;
    rank: number;
    rank_name: string;
    last_online: string | null;
    last_duty: string | null;
    abas?: string | null;
    label?: string | null;
}

interface Section {
    id: number;
    name: string;
    description: string | null;
    character_ids_json: number[];
    order: number;
}

interface RosterData {
    roster: { id: number; name: string, isPrivate?: boolean };
    faction: { id: number; name: string; supervisor_rank: number; minimum_abas: number; minimum_supervisor_abas: number; };
    members: Member[];
    missingForumUsers: string[];
    sections: Section[];
    rosterConfig: any;
}

const PasswordDialog = ({
    isOpen,
    onClose,
    onSubmit,
    isVerifying
}: {
    isOpen: boolean,
    onClose: () => void,
    onSubmit: (password: string) => void,
    isVerifying: boolean
}) => {
    const [password, setPassword] = useState('');

    const handleSubmit = () => {
        onSubmit(password);
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Password Required</DialogTitle>
                    <DialogDescription>This roster is private. Please enter the password to view it.</DialogDescription>
                </DialogHeader>
                <div className="py-2">
                    <Label htmlFor="roster-password">Password</Label>
                    <Input id="roster-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={isVerifying}>
                        {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Submit
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export function RosterViewPage({ rosterId }: RosterViewPageProps) {
    const [data, setData] = useState<RosterData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [requiresPassword, setRequiresPassword] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
    const [showSlowLoadMessage, setShowSlowLoadMessage] = useState(false);
    const router = useRouter();
    const { toast } = useToast();
    const { favorites, toggleFavorite } = useFavorites();

    const isFavorited = favorites.some(f => f.activity_roster_id === rosterId);
    
    const canSync = !lastSyncTime || (Date.now() - lastSyncTime > COOLDOWN_MINUTES * 60 * 1000);

    const fetchData = async (forceSync = false) => {
        if (forceSync) {
            setIsSyncing(true);
        } else {
            setIsLoading(true);
        }
        setShowSlowLoadMessage(false);

        const slowLoadTimer = setTimeout(() => {
            setShowSlowLoadMessage(true);
        }, 5000);

        try {
            const url = `/api/rosters/${rosterId}/view${forceSync ? '?forceSync=true' : ''}`;
            const res = await fetch(url);
            const result = await res.json();
            
            if (!res.ok) {
                if (result.requiresPassword) {
                    setRequiresPassword(true);
                    setData({ roster: { id: rosterId, name: 'Private Roster', isPrivate: true } } as RosterData); // Set dummy data
                } else {
                    throw new Error(result.error || 'Failed to fetch roster data.');
                }
            } else {
                setData(result);
                setRequiresPassword(false);
            }
            
            if (forceSync) {
                const now = Date.now();
                setLastSyncTime(now);
                localStorage.setItem(`lastSyncTime_${rosterId}`, now.toString());
            }
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
            router.push('/activity-rosters');
        } finally {
            clearTimeout(slowLoadTimer);
            setIsLoading(false);
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        const storedSyncTime = localStorage.getItem(`lastSyncTime_${rosterId}`);
        if (storedSyncTime) {
            setLastSyncTime(parseInt(storedSyncTime, 10));
        }
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rosterId]);

    const handleForceSync = () => {
        fetchData(true);
    };

    const handlePasswordSubmit = async (password: string) => {
        setIsVerifying(true);
        try {
            const res = await fetch(`/api/rosters/${rosterId}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            
            toast({ title: 'Success', description: 'Access granted.' });
            setRequiresPassword(false);
            await fetchData(); // Refetch data now that we have access
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsVerifying(false);
        }
    };

    const handlePasswordDialogClose = () => {
        if (!isVerifying) {
            setRequiresPassword(false);
            router.push('/activity-rosters');
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 md:p-6 lg:p-8 flex justify-center items-center h-full">
                <div className="flex flex-col items-center gap-4 text-center">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    {showSlowLoadMessage && (
                        <p className="text-sm text-muted-foreground animate-in fade-in duration-500">
                            Loading is taking a bit longer than usual.<br/>
                            This can happen when fetching a lot of data from the game server.
                        </p>
                    )}
                </div>
            </div>
        );
    }
    
     if (!data) {
        return (
             <div className="container mx-auto p-4 md:p-6 lg:p-8">
                <PageHeader title="Roster Not Found" description="Could not load the requested roster." />
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <PasswordDialog
                isOpen={requiresPassword}
                onClose={handlePasswordDialogClose}
                onSubmit={handlePasswordSubmit}
                isVerifying={isVerifying}
            />
            <PageHeader
                title={data.roster.name}
                description={data.faction ? `Viewing roster for ${data.faction.name}` : ''}
                actions={
                    <div className="flex gap-2">
                         <Button
                            variant="outline"
                            size="icon"
                            onClick={() => toggleFavorite(rosterId)}
                            disabled={requiresPassword}
                        >
                            <Star className={cn("h-4 w-4", isFavorited ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")} />
                            <span className="sr-only">{isFavorited ? 'Unfavorite' : 'Favorite'}</span>
                        </Button>
                         <Button onClick={handleForceSync} disabled={isSyncing || !canSync || requiresPassword}>
                            {isSyncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                            Force Sync
                        </Button>
                    </div>
                }
            />
            {data.members && <RosterContent initialData={data} rosterId={rosterId} />}
        </div>
    );
}
