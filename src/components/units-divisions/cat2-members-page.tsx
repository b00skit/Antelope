
'use client';

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { MembersTable } from "./members-table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../ui/breadcrumb";
import Link from "next/link";
import { FactionUser } from "./units-divisions-client-page";

interface Member {
    id: number;
    character_id: number;
    character_name: string;
    rank_name: string;
    title: string | null;
    created_at: string;
    creator: {
        username: string;
    }
}

interface Cat2 {
    id: number;
    name: string;
    settings_json: { forum_group_id?: number; secondary?: boolean; } | null;
    cat1: {
        id: number;
        name: string;
    }
}

interface PageData {
    unit: Cat2;
    members: Member[];
    allFactionMembers: any[];
    allAssignedCharacterIds: number[];
    canManage: boolean;
    factionUsers: FactionUser[];
    allUnitsAndDetails: { label: string; value: string; type: 'cat_2' | 'cat_3' }[];
}


interface Cat2MembersPageProps {
    cat1Id: number;
    cat2Id: number;
}


export function Cat2MembersPage({ cat1Id, cat2Id }: Cat2MembersPageProps) {
    const [data, setData] = useState<PageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/units-divisions/${cat1Id}/${cat2Id}`);
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            setData(result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cat1Id, cat2Id]);
    
    if (isLoading) {
        return (
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
                <PageHeader title="Loading Members..." description="Fetching member roster..." />
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
                <Alert variant="destructive">
                    <AlertTriangle />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        )
    }

    if (!data) return null;
    
    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <Breadcrumb>
                <BreadcrumbList>
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                            <Link href="/units-divisions">Units & Divisions</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                           <Link href={`/units-divisions/${cat1Id}/${data.unit.id}`}>{data.unit.name}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                     <BreadcrumbSeparator />
                    <BreadcrumbItem>
                        <BreadcrumbPage>Member Management</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <PageHeader
                title="Member Management"
                description={`Manage members for ${data.unit.name}`}
            />
            <MembersTable 
                members={data.members}
                allFactionMembers={data.allFactionMembers}
                allAssignedCharacterIds={data.allAssignedCharacterIds}
                canManage={data.canManage}
                cat1Id={cat1Id}
                cat2Id={cat2Id}
                onDataChange={fetchData}
                allUnitsAndDetails={data.allUnitsAndDetails}
                forumGroupId={data.unit.settings_json?.forum_group_id}
                isSecondary={data.unit.settings_json?.secondary ?? false}
            />
        </div>
    )
}
