
'use client';

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import type { Cat1, Cat2, FactionUser } from "./units-divisions-client-page";
import { MembersTable } from "./members-table";

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

interface PageData {
    unit: Cat2 & { cat1: { name: string }};
    members: Member[];
    allFactionMembers: any[];
    canManage: boolean;
}

interface Cat2ClientPageProps {
    cat1Id: number;
    cat2Id: number;
}

export function Cat2ClientPage({ cat1Id, cat2Id }: Cat2ClientPageProps) {
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
                <PageHeader title="Loading Unit..." description="Fetching details and member roster..." />
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
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <PageHeader
                title={data.unit.name}
                description={`Viewing members of this unit within ${data.unit.cat1.name}.`}
            />
            <MembersTable 
                members={data.members}
                allFactionMembers={data.allFactionMembers}
                canManage={data.canManage}
                cat2Id={cat2Id}
                onDataChange={fetchData}
            />
        </div>
    )
}
