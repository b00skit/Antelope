

'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Button } from '@/components/ui/button';
import { Loader2, PlusCircle, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RosterContent } from './roster-content';

interface RosterViewPageProps {
    rosterId: number;
}

const COOLDOWN_HOURS = 1;

interface Member {
    character_id: number;
    character_name: string;
    rank: number;
    rank_name: string;
    last_online: string | null;
    last_duty: string | null;
    abas?: string | null;
}

interface Section {
    id: number;
    name: string;
    description: string | null;
    character_ids_json: number[];
    order: number;
}

interface RosterData {
    roster: { id: number; name: string };
    faction: { id: number; name: string };
    members: Member[];
    missingForumUsers: string[];
    sections: Section[];
}

export function RosterViewPage({ rosterId }: RosterViewPageProps) {
    const [data, setData] = useState<RosterData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);
    const { toast } = useToast();
    
    const canSync = !lastSyncTime || (Date.now() - lastSyncTime > COOLDOWN_HOURS * 60 * 60 * 1000);

    const fetchData = async (forceSync = false) => {
        if (forceSync) {
            setIsSyncing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const url = `/api/rosters/${rosterId}/view${forceSync ? '?forceSync=true' : ''}`;
            const res = await fetch(url);
            const result = await res.json();
            if (!res.ok) {
                throw new Error(result.error || 'Failed to fetch roster data.');
            }
            setData(result);
            if (forceSync) {
                const now = Date.now();
                setLastSyncTime(now);
                localStorage.setItem(`lastSyncTime_${rosterId}`, now.toString());
            }
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
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

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 md:p-6 lg:p-8 flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
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
            <PageHeader
                title={data.roster.name}
                description={`Viewing roster for ${data.faction.name}`}
                actions={
                    <div className="flex gap-2">
                         <Button onClick={handleForceSync} disabled={isSyncing || !canSync}>
                            {isSyncing ? <Loader2 className="animate-spin" /> : <RefreshCw />}
                            Force Sync
                        </Button>
                    </div>
                }
            />
            {data && <RosterContent initialData={data} rosterId={rosterId} />}
        </div>
    );
}
