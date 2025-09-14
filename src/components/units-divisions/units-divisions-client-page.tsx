'use client';

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-session";
import { PageHeader } from "@/components/dashboard/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle, Building, Loader2, Settings } from "lucide-react";
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
import { Label } from "../ui/label";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { useToast } from "@/hooks/use-toast";

interface OrgSettings {
    category_1_name: string;
    category_2_name: string;
    category_3_name: string;
}

interface PageData {
    settings: OrgSettings | null;
    cat1s: any[]; // Replace with proper type later
    canAdminister: boolean;
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
    const { toast } = useToast();
    
    useEffect(() => {
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
                <div>
                    {/* Phase 1: Just show this message if settings exist */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Structure Overview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p>Organizational structure is set up. The display of divisions and units will be implemented in the next phase.</p>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
