
'use client';

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Building, Loader2, Settings, PlusCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "../ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from "../ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { useToast } from "@/hooks/use-toast";
import { Cat1Dialog } from "./cat1-dialog";
import { Cat1Card } from "./cat1-card";
import { Cat2Dialog } from "./cat2-dialog";
import { useOrganizationFavorites } from "@/hooks/use-organization-favorites";

interface OrgSettings {
    category_1_name: string;
    category_2_name: string;
    category_3_name: string;
}

export interface FactionUser {
    id: number;
    username: string;
}

export interface Cat2 {
    id: number;
    name: string;
    short_name: string | null;
    access_json: number[] | null;
    settings_json: { allow_cat3?: boolean; forum_group_id?: number, secondary?: boolean } | null;
    created_by: number;
    creator: { username: string };
    canManage?: boolean;
}

export interface Cat1 {
    id: number;
    name: string;
    short_name: string | null;
    access_json: number[] | null;
    created_by: number;
    created_at: string;
    updated_at: string;
    creator: { username: string; };
    canManage: boolean;
    cat2s: Cat2[];
}

interface PageData {
    settings: OrgSettings | null;
    cat1s: Cat1[];
    canAdminister: boolean;
    factionUsers: FactionUser[];
    syncableForumGroups: { value: string, label: string }[];
}

const settingsSchema = z.object({
    category_1_name: z.string().min(1, "Name cannot be empty.").default('Division'),
    category_2_name: z.string().min(1, "Name cannot be empty.").default('Unit'),
    category_3_name: z.string().min(1, "Name cannot be empty.").default('Detail'),
});

const SettingsDialog = ({ 
    open, 
    onOpenChange, 
    settings, 
    onSave 
}: { 
    open: boolean; 
    onOpenChange: (open: boolean) => void; 
    settings: OrgSettings | null;
    onSave: (values: z.infer<typeof settingsSchema>) => void;
}) => {
    const form = useForm<z.infer<typeof settingsSchema>>({
        resolver: zodResolver(settingsSchema),
        values: {
            category_1_name: settings?.category_1_name || 'Division',
            category_2_name: settings?.category_2_name || 'Unit',
            category_3_name: settings?.category_3_name || 'Detail',
        }
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Faction Organizational Settings</DialogTitle>
                    <DialogDescription>
                        Set the names for your organizational tiers.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSave)} className="space-y-4 py-2">
                         <FormField
                            control={form.control}
                            name="category_1_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tier 1 Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="category_2_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tier 2 Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="category_3_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tier 3 Name</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit">Save Settings</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
};


export function UnitsDivisionsClientPage() {
    const { session } = useSession();
    const [data, setData] = useState<PageData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isCat1DialogOpen, setIsCat1DialogOpen] = useState(false);
    const [isCat2DialogOpen, setIsCat2DialogOpen] = useState(false);
    const [editingCat1, setEditingCat1] = useState<Cat1 | null>(null);
    const [editingCat2, setEditingCat2] = useState<Cat2 | null>(null);
    const [currentParentCat1, setCurrentParentCat1] = useState<Cat1 | null>(null);
    const { toast } = useToast();
    const { favorites, toggleFavorite } = useOrganizationFavorites();
    
    const fetchData = async () => {
        if (!session?.hasActiveFaction) return;

        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/units-divisions');
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
    }, [session]);

    const handleSaveSettings = async (values: z.infer<typeof settingsSchema>) => {
        try {
            const res = await fetch('/api/units-divisions/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            
            setData(prev => prev ? { ...prev, settings: result.settings } : null);
            toast({ title: 'Success', description: 'Settings saved successfully.' });
            setIsSettingsOpen(false);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        }
    };

    const handleEditCat1 = (cat1: Cat1) => {
        setEditingCat1(cat1);
        setIsCat1DialogOpen(true);
    }

    const handleEditCat2 = (cat2: Cat2, parentCat1: Cat1) => {
        setEditingCat2(cat2);
        setCurrentParentCat1(parentCat1);
        setIsCat2DialogOpen(true);
    };
    
    const handleDeleteCat1 = async (cat1Id: number) => {
        try {
            const res = await fetch(`/api/units-divisions/cat1/${cat1Id}`, { method: 'DELETE' });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            toast({ title: 'Success', description: 'Unit deleted successfully.' });
            fetchData(); // Refresh list
        } catch (err: any) {
             toast({ variant: 'destructive', title: 'Error', description: err.message });
        }
    }

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
                <PageHeader title="Units & Divisions" description="Loading organizational structure..." />
                <Skeleton className="h-48 w-full" />
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

    const PageActions = () => {
        if (!data?.canAdminister) return null;
        return (
            <div className="flex gap-2">
                {data.settings && (
                    <Button onClick={() => { setEditingCat1(null); setIsCat1DialogOpen(true) }}>
                        <PlusCircle />
                        Create {data.settings.category_1_name}
                    </Button>
                )}
                <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
                    <Settings />
                    Organizational Settings
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <SettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} settings={data?.settings || null} onSave={handleSaveSettings} />
            {data?.settings && (
                 <Cat1Dialog 
                    open={isCat1DialogOpen} 
                    onOpenChange={setIsCat1DialogOpen} 
                    onSave={fetchData}
                    cat1={editingCat1}
                    settings={data.settings}
                    factionUsers={data.factionUsers || []}
                />
            )}
             {data?.settings && currentParentCat1 && (
                 <Cat2Dialog
                    open={isCat2DialogOpen}
                    onOpenChange={setIsCat2DialogOpen}
                    onSave={fetchData}
                    cat2={editingCat2}
                    parentCat1={currentParentCat1}
                    settings={data.settings}
                    factionUsers={data.factionUsers || []}
                    syncableForumGroups={data.syncableForumGroups || []}
                />
            )}
            <PageHeader
                title="Units & Divisions"
                description="Manage your faction's organizational structure."
                actions={<PageActions />}
            />

            {!data?.settings ? (
                <Card className="text-center">
                    <CardHeader>
                        <Building className="mx-auto h-12 w-12 text-muted-foreground" />
                        <CardTitle>Setup Required</CardTitle>
                        <CardDescription>The organizational structure has not been set up for this faction yet.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data?.canAdminister ? (
                            <Button onClick={() => setIsSettingsOpen(true)}>
                                <Settings className="mr-2" />
                                Configure Settings
                            </Button>
                        ) : (
                            <p className="text-sm text-muted-foreground">An administrator needs to configure the organizational settings before this module can be used.</p>
                        )}
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-6">
                    {data.cat1s.length > 0 ? (
                        data.cat1s.map(cat1 => (
                            <Cat1Card 
                                key={cat1.id} 
                                cat1={cat1}
                                onEdit={() => handleEditCat1(cat1)}
                                onDelete={() => handleDeleteCat1(cat1.id)}
                                onCreateCat2={() => { setEditingCat2(null); setCurrentParentCat1(cat1); setIsCat2DialogOpen(true); }}
                                onEditCat2={(cat2) => handleEditCat2(cat2, cat1)}
                                settings={data.settings!}
                                favorites={favorites}
                                onToggleFavorite={toggleFavorite}
                            />
                        ))
                    ) : (
                        <Card>
                            <CardHeader>
                                <CardTitle>No {data.settings.category_1_name}s Found</CardTitle>
                                <CardDescription>Get started by creating your first one.</CardDescription>
                            </CardHeader>
                        </Card>
                    )}
                </div>
            )}
        </div>
    );
}
