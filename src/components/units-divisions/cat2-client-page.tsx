
'use client';

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, PlusCircle, Building, MoreVertical, Pencil, Trash2, Eye, Star, Users, BarChart, UserCog, Trophy } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import type { Cat2, FactionUser } from "./units-divisions-client-page";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Cat3Dialog } from "./cat3-dialog";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useOrganizationFavorites } from "@/hooks/use-organization-favorites";
import { cn } from "@/lib/utils";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "../ui/breadcrumb";
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

export interface Cat3 {
    id: number;
    name: string;
    short_name: string | null;
    access_json: number[] | null;
    creator: {
        username: string;
    }
}

interface PageData {
    unit: Cat2 & { cat1: { name: string }, cat3s: Cat3[] };
    members: Member[];
    allFactionMembers: any[];
    allAssignedCharacterIds: number[];
    canManage: boolean;
    factionUsers: FactionUser[];
    allUnitsAndDetails: { label: string; value: string; type: 'cat_2' | 'cat_3' }[];
    syncableForumGroups: { value: string; label: string; }[];
}

interface Cat2ClientPageProps {
    cat1Id: number;
    cat2Id: number;
}

export function Cat2ClientPage({ cat1Id, cat2Id }: Cat2ClientPageProps) {
    const [data, setData] = useState<PageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isCat3DialogOpen, setIsCat3DialogOpen] = useState(false);
    const [editingCat3, setEditingCat3] = useState<Cat3 | null>(null);
    const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
    const { toast } = useToast();
    const { favorites, toggleFavorite } = useOrganizationFavorites();

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
    
    const handleEditCat3 = (cat3: Cat3) => {
        setEditingCat3(cat3);
        setIsCat3DialogOpen(true);
    };

    const handleDeleteCat3 = async (cat3Id: number) => {
        try {
            const res = await fetch(`/api/units-divisions/cat3/${cat3Id}`, { method: 'DELETE' });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            toast({ title: 'Success', description: 'Detail deleted successfully.' });
            fetchData();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        }
    };
    
    const favoriteIdsCat3 = new Set(favorites.filter(f => f.category_type === 'cat_3').map(f => f.category_id));

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

    const { unit, members, canManage } = data;
    const totalAbas = members.reduce((sum, m) => sum + (m.abas || 0), 0);
    const averageAbas = members.length > 0 ? totalAbas / members.length : 0;
    const topPerformers = [...members].sort((a, b) => (b.abas || 0) - (a.abas || 0)).slice(0, 5);

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <Cat3Dialog 
                open={isCat3DialogOpen}
                onOpenChange={setIsCat3DialogOpen}
                onSave={fetchData}
                cat3={editingCat3}
                parentCat2={data.unit}
                settings={{ category_3_name: 'Detail' }} // This should be dynamic later
                factionUsers={data.factionUsers}
                syncableForumGroups={data.syncableForumGroups || []}
            />
            <ForumSyncDialog
                open={isSyncDialogOpen}
                onOpenChange={setIsSyncDialogOpen}
                onSyncSuccess={fetchData}
                categoryType="cat_2"
                categoryId={cat2Id}
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
                        <BreadcrumbPage>{data.unit.cat1.name}</BreadcrumbPage>
                    </BreadcrumbItem>
                </BreadcrumbList>
            </Breadcrumb>
            <PageHeader
                title={data.unit.name}
                actions={
                    canManage && (
                        <div className="flex gap-2">
                            {unit.settings_json?.forum_group_id && (
                                <Button variant="secondary" onClick={() => setIsSyncDialogOpen(true)}>Compare & Sync</Button>
                            )}
                            <Button asChild>
                                <Link href={`/units-divisions/${cat1Id}/${cat2Id}/members`}>
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


            {data.unit.settings_json?.allow_cat3 && (
                <Card>
                    <CardHeader>
                         <div className="flex justify-between items-start">
                             <div>
                                <CardTitle>Sub-Units (Details)</CardTitle>
                                <CardDescription>Manage the details within this unit.</CardDescription>
                            </div>
                            {data.canManage && (
                                <Button onClick={() => { setEditingCat3(null); setIsCat3DialogOpen(true); }}>
                                    <PlusCircle className="mr-2" />
                                    Create Detail
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        {data.unit.cat3s.length > 0 ? (
                            <div className="space-y-2">
                                {data.unit.cat3s.map(cat3 => {
                                    const isFavorited = favoriteIdsCat3.has(cat3.id);
                                    return (
                                     <div key={cat3.id} className="flex items-center justify-between p-2 border rounded-md">
                                        <div className="flex-1">
                                            <div className="font-medium flex items-center gap-2">
                                                {cat3.name}
                                                {cat3.short_name && <Badge variant="secondary">{cat3.short_name}</Badge>}
                                            </div>
                                            <p className="text-xs text-muted-foreground">Created by {cat3.creator.username}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                             <Button variant="ghost" size="icon" onClick={() => toggleFavorite('cat_3', cat3.id)}>
                                                <Star className={cn("h-4 w-4", isFavorited ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground")} />
                                            </Button>
                                             <Button asChild variant="outline" size="sm">
                                                <Link href={`/units-divisions/${cat1Id}/${cat2Id}/${cat3.id}`}>
                                                    <Eye className="mr-2 h-4 w-4" />
                                                    View
                                                </Link>
                                            </Button>
                                            {data.canManage && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon"><MoreVertical /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onSelect={() => handleEditCat3(cat3)}>
                                                            <Pencil className="mr-2" /> Edit
                                                        </DropdownMenuItem>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive">
                                                                    <Trash2 className="mr-2" /> Delete
                                                                </div>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                                    <AlertDialogDescription>This will permanently delete "{cat3.name}".</AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                    <AlertDialogAction onClick={() => handleDeleteCat3(cat3.id)}>Yes, Delete</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </div>
                                )})}
                            </div>
                        ) : (
                             <div className="text-center py-8 text-muted-foreground">
                                <Building className="mx-auto h-8 w-8 mb-2" />
                                <p>No sub-units have been created yet.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
