
'use client';

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, Building, BarChart, Users, UserCog, Trophy } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import type { FactionUser } from "./units-divisions-client-page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../ui/breadcrumb";
import Link from "next/link";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { ForumSyncDialog } from "./forum-sync-dialog";

interface Member {
    id: number;
    character_id: number;
    character_name: string;
    rank_name: string;
    title: string | null;
    created_at: string;
    creator: {
        username: string;
    },
    abas: number;
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
    canManage: boolean;
}

interface Cat3ClientPageProps {
    cat1Id: number;
    cat2Id: number;
    cat3Id: number;
}

export function Cat3ClientPage({ cat1Id, cat2Id, cat3Id }: Cat3ClientPageProps) {
    const [data, setData] = useState<PageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);

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
                <PageHeader title="Loading Detail..." description="Fetching details and member roster..." />
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
    
    const { detail, members, canManage } = data;
    const totalAbas = members.reduce((sum, m) => sum + (m.abas || 0), 0);
    const averageAbas = members.length > 0 ? totalAbas / members.length : 0;
    const topPerformers = [...members].sort((a, b) => (b.abas || 0) - (a.abas || 0)).slice(0, 5);

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <ForumSyncDialog
                open={isSyncDialogOpen}
                onOpenChange={setIsSyncDialogOpen}
                onSyncSuccess={fetchData}
                categoryType="cat_3"
                categoryId={cat3Id}
                allFactionMembers={data.allFactionMembers}
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
                        <BreadcrumbPage>{data.detail.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <PageHeader
                title={data.detail.name}
                actions={
                    canManage && (
                        <div className="flex gap-2">
                            {detail.settings_json?.forum_group_id && (
                                <Button variant="secondary" onClick={() => setIsSyncDialogOpen(true)}>Compare & Sync</Button>
                            )}
                            <Button asChild>
                                <Link href={`/units-divisions/${cat1Id}/${cat2Id}/${cat3Id}/members`}>
                                    <UserCog className="mr-2" />
                                    Manage Members
                                </Link>
                            </Button>
                        </div>
                    )
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Total Members</CardTitle>
                        <Users className="text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{members.length}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle>Average ABAS</CardTitle>
                        <BarChart className="text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <p className="text-3xl font-bold">{averageAbas.toFixed(2)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                         <CardTitle className="flex items-center gap-2"><Trophy /> Top Performers</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {topPerformers.length > 0 ? (
                             <ul className="space-y-2">
                                {topPerformers.map(m => (
                                    <li key={m.id} className="flex justify-between items-center text-sm">
                                        <span>{m.character_name}</span>
                                        <span className="font-semibold">{m.abas.toFixed(2)}</span>
                                    </li>
                                ))}
                             </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">No member data to display.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Member Roster</CardTitle>
                    <CardDescription>A brief overview of members assigned to this detail.</CardDescription>
                </CardHeader>
                <CardContent>
                     {members.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>Title</TableHead>
                                    <TableHead className="text-right">ABAS</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.slice(0, 10).map(member => (
                                    <TableRow key={member.id}>
                                        <TableCell>{member.character_name}</TableCell>
                                        <TableCell>{member.rank_name}</TableCell>
                                        <TableCell>{member.title || <span className="text-muted-foreground">N/A</span>}</TableCell>
                                        <TableCell className="text-right">{member.abas.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8 text-muted-foreground">
                            <Building className="mx-auto h-8 w-8 mb-2" />
                            <p>No members assigned to this detail yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>

        </div>
    )
}
