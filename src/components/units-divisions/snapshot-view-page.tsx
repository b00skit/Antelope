
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Cat2ClientPage } from './cat2-client-page';
import { Cat3ClientPage } from './cat3-client-page';
import { MembersTable } from './members-table';
import { Cat3MembersTable } from './cat3-members-table';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../ui/breadcrumb';
import Link from 'next/link';

interface SnapshotViewPageProps {
    snapshotId: number;
    type: 'cat2' | 'cat3';
}

export function SnapshotViewPage({ snapshotId, type }: SnapshotViewPageProps) {
    const [data, setData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();
    const { toast } = useToast();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const url = `/api/units-divisions/snapshots/${type}-${snapshotId}`;
                const res = await fetch(url);
                const result = await res.json();
                
                if (!res.ok) {
                    throw new Error(result.error || 'Failed to fetch snapshot data.');
                }
                setData(result);
            } catch (err: any) {
                toast({ variant: 'destructive', title: 'Error', description: err.message });
                router.push('/units-divisions/snapshots');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [snapshotId, type]);
    
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

    const unit = data.unit || data.detail;
    const isCat2 = type === 'cat2';

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
             <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild><Link href="/units-divisions">Units & Divisions</Link></BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                     <BreadcrumbItem>
                        <BreadcrumbLink asChild><Link href="/units-divisions/snapshots">Snapshots</Link></BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>{unit.name} (Snapshot)</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
             <PageHeader
                title={unit.name}
                description={`Viewing a snapshot of this roster.`}
            />

            {isCat2 ? (
                <MembersTable 
                    members={data.members}
                    allFactionMembers={data.allFactionMembers}
                    canManage={false} // read-only
                    cat1Id={unit.cat1.id}
                    cat2Id={unit.id}
                    onDataChange={() => {}}
                    allUnitsAndDetails={[]}
                    isSecondary={unit.settings_json?.secondary ?? false}
                />
            ) : (
                <Cat3MembersTable 
                    members={data.members}
                    allFactionMembers={data.allFactionMembers}
                    allAssignedCharacterIds={[]}
                    canManage={false} // read-only
                    cat1Id={unit.cat2.cat1.id}
                    cat2Id={unit.cat2.id}
                    cat3Id={unit.id}
                    onDataChange={() => {}}
                    allUnitsAndDetails={[]}
                    isSecondary={unit.settings_json?.secondary ?? false}
                />
            )}
        </div>
    )
}
