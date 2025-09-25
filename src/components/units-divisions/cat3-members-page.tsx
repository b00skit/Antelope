
'use client';

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, UserX } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import { Cat3MembersTable } from "./cat3-members-table";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../ui/breadcrumb";
import Link from "next/link";
import { FactionUser } from "./units-divisions-client-page";
import { SyncExclusionsDialog } from "./sync-exclusions-dialog";
import { Button } from "../ui/button";

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

interface Cat3 {
    id: number;
    name: string;
    settings_json: { forum_group_id?: number; secondary?: boolean; } | null;
    cat2: {
        id: number;
        name: string;
        cat1: {
            id: number;
            name: string;
        }
    }
}

interface PageData {
    detail: Cat3;
    members: Member[];
    allFactionMembers: any[];
    allAssignedCharacterIds: number[];
    canManage: boolean;
    factionUsers: FactionUser[];
    allUnitsAndDetails: { label: string; value: string; type: 'cat_2' | 'cat_3' }[];
}


interface Cat3MembersPageProps {
    cat1Id: number;
    cat2Id: number;
    cat3Id: number;
}


export function Cat3MembersPage({ cat1Id, cat2Id, cat3Id }: Cat3MembersPageProps) {
    const [data, setData] = useState<PageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isExclusionsOpen, setIsExclusionsOpen] = useState(false);

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/units-divisions/${cat1Id}/${cat2Id}/${cat3Id}`);
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
    }, [cat1Id, cat2Id, cat3Id]);
    
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
            <SyncExclusionsDialog 
                open={isExclusionsOpen}
                onOpenChange={setIsExclusionsOpen}
                categoryType="cat_3"
                categoryId={cat3Id}
            />
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
                           <Link href={`/units-divisions/${data.detail.cat2.cat1.id}/${data.detail.cat2.id}`}>{data.detail.cat2.name}</Link>
                        </BreadcrumbLink>
                    </BreadcrumbItem>
                     <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbLink asChild>
                           <Link href={`/units-divisions/${data.detail.cat2.cat1.id}/${data.detail.cat2.id}/${data.detail.id}`}>{data.detail.name}</Link>
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
                description={`Manage members for ${data.detail.name}`}
                actions={
                    data.canManage && data.detail.settings_json?.forum_group_id ? (
                        <Button variant="outline" onClick={() => setIsExclusionsOpen(true)}>
                            <UserX className="mr-2" />
                            Manage Sync Exclusions
                        </Button>
                    ) : null
                }
            />
            <Cat3MembersTable 
                members={data.members}
                allFactionMembers={data.allFactionMembers}
                allAssignedCharacterIds={data.allAssignedCharacterIds}
                canManage={data.canManage}
                cat1Id={cat1Id}
                cat2Id={cat2Id}
                cat3Id={cat3Id}
                onDataChange={fetchData}
                allUnitsAndDetails={data.allUnitsAndDetails}
                forumGroupId={data.detail.settings_json?.forum_group_id}
                isSecondary={data.detail.settings_json?.secondary ?? false}
            />
        </div>
    )
}
