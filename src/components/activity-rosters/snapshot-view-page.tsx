
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RosterContent } from './roster-content';
import { format } from 'date-fns';

interface SnapshotViewPageProps {
    snapshotId: number;
}

interface RosterData {
    roster: { id: number; name: string };
    [key: string]: any; // Other properties
}


export function SnapshotViewPage({ snapshotId }: SnapshotViewPageProps) {
    const [data, setData] = useState<RosterData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const url = `/api/rosters/snapshots/${snapshotId}`;
                const res = await fetch(url);
                const result = await res.json();
                
                if (!res.ok) {
                    throw new Error(result.error || 'Failed to fetch snapshot data.');
                }
                setData(result);
            } catch (err: any) {
                toast({ variant: 'destructive', title: 'Error', description: err.message });
                router.push('/roster-snapshots');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [snapshotId]);
    
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
                <PageHeader title="Snapshot Not Found" description="Could not load the requested snapshot." />
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
             <PageHeader
                title={data.roster.name}
                description={`Viewing a snapshot of this roster.`}
            />
            <RosterContent initialData={data} rosterId={data.roster.id} readOnly />
        </div>
    )
}
