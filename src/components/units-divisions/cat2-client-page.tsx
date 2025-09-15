
'use client';

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Loader2, PlusCircle, Building, MoreVertical, Pencil, Trash2, Eye } from "lucide-react";
import { Skeleton } from "../ui/skeleton";
import type { Cat2, FactionUser } from "./units-divisions-client-page";
import { MembersTable } from "./members-table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Cat3Dialog } from "./cat3-dialog";
import Link from "next/link";
import { Badge } from "../ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

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
    const { toast } = useToast();

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
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <Cat3Dialog 
                open={isCat3DialogOpen}
                onOpenChange={setIsCat3DialogOpen}
                onSave={fetchData}
                cat3={editingCat3}
                parentCat2={data.unit}
                settings={{ category_3_name: 'Detail' }} // This should be dynamic later
                factionUsers={data.factionUsers}
            />
            <PageHeader
                title={data.unit.name}
                description={`Viewing members of this unit within ${data.unit.cat1.name}.`}
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
                                {data.unit.cat3s.map(cat3 => (
                                     <div key={cat3.id} className="flex items-center justify-between p-2 border rounded-md">
                                        <div className="flex-1">
                                            <div className="font-medium flex items-center gap-2">
                                                {cat3.name}
                                                {cat3.short_name && <Badge variant="secondary">{cat3.short_name}</Badge>}
                                            </div>
                                            <p className="text-xs text-muted-foreground">Created by {cat3.creator.username}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
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
                                ))}
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
