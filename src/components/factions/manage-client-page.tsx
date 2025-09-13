
'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useSession } from '@/hooks/use-session';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import type { factions } from '@/db/schema';
import { Switch } from '../ui/switch';
import Link from 'next/link';
import { Label } from '../ui/label';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Faction = typeof factions.$inferSelect;

interface ManageFactionClientPageProps {
    faction: Faction;
}

const formSchema = z.object({
    name: z.string().min(3, "Faction name must be at least 3 characters long."),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color code, e.g., #FFFFFF").optional().nullable(),
    access_rank: z.coerce.number().min(1, "Rank must be at least 1").max(15, "Rank must be 15 or less"),
    administration_rank: z.coerce.number().min(1, "Rank must be at least 1").max(15, "Rank must be 15 or less"),
    supervisor_rank: z.coerce.number().min(1, "Rank must be at least 1").max(15, "Rank must be 15 or less"),
    minimum_abas: z.coerce.number().min(0, "ABAS cannot be negative.").step(0.01).optional(),
    minimum_supervisor_abas: z.coerce.number().min(0, "ABAS cannot be negative.").step(0.01).optional(),
    activity_rosters_enabled: z.boolean().default(true),
    character_sheets_enabled: z.boolean().default(true),
    statistics_enabled: z.boolean().default(true),
    phpbb_api_url: z.string().url("Must be a valid URL").or(z.literal('')).optional().nullable(),
    phpbb_api_key: z.string().optional().nullable(),
});

export function ManageFactionClientPage({ faction }: ManageFactionClientPageProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { refreshSession } = useSession();
    const [isDeleting, setIsDeleting] = React.useState(false);
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: faction.name,
            color: faction.color,
            access_rank: faction.access_rank ?? 15,
            administration_rank: faction.administration_rank ?? 15,
            supervisor_rank: faction.supervisor_rank ?? 10,
            minimum_abas: faction.minimum_abas ?? 0,
            minimum_supervisor_abas: faction.minimum_supervisor_abas ?? 0,
            activity_rosters_enabled: faction.feature_flags?.activity_rosters_enabled ?? true,
            character_sheets_enabled: faction.feature_flags?.character_sheets_enabled ?? true,
            statistics_enabled: faction.feature_flags?.statistics_enabled ?? true,
            phpbb_api_url: faction.phpbb_api_url,
            phpbb_api_key: faction.phpbb_api_key,
        },
    });
    
    const watchUrl = form.watch('phpbb_api_url');
    const watchKey = form.watch('phpbb_api_key');

    const apiEndpointPreview = React.useMemo(() => {
        if (watchUrl && watchKey) {
            try {
                const url = new URL(watchUrl);
                const baseUrl = url.pathname.endsWith('/') ? url.href : `${url.href}/`;
                return `${baseUrl}app.php/booskit/phpbbapi/groups?key=${watchKey}`;
            } catch (e) {
                return "Invalid URL provided.";
            }
        }
        return "Fill out both URL and Key to see the preview.";
    }, [watchUrl, watchKey]);


    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const response = await fetch(`/api/factions/${faction.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update faction.');
            }

            toast({
                title: 'Success!',
                description: `Faction "${values.name}" has been updated.`,
            });
            await refreshSession();
            router.push('/factions');
            router.refresh();

        } catch (err: any) {
            form.setError("root", { message: err.message });
        }
    };
    
    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const res = await fetch(`/api/factions/${faction.id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast({ title: 'Success', description: data.message });
            await refreshSession();
            router.push('/factions');
            router.refresh();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsDeleting(false);
        }
    };


    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <PageHeader title={`Manage: ${faction.name}`} description="Update your faction's settings on the panel." />

            <Card>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <CardContent className="pt-6 space-y-4">
                                <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Faction Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Los Santos Police Department" {...field} />
                                        </FormControl>
                                        <FormDescription>This will be the display name for the faction on the panel.</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="color"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Faction Color</FormLabel>
                                        <FormControl>
                                            <div className="flex items-center gap-2">
                                                <Input type="color" className="w-12 h-10 p-1" {...field} value={field.value ?? ''} />
                                                <Input placeholder="#FFFFFF" {...field} value={field.value ?? ''} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="access_rank"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Access Rank</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="1" max="15" {...field} />
                                            </FormControl>
                                            <FormDescription>Minimum rank to join the panel.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="administration_rank"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Administration Rank</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="1" max="15" {...field} />
                                            </FormControl>
                                            <FormDescription>Minimum rank to manage the faction.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="supervisor_rank"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Supervisor Rank</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="1" max="15" {...field} />
                                            </FormControl>
                                            <FormDescription>Minimum rank to be considered a supervisor, only comes into account for ABAS calculations.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="minimum_abas"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Minimum ABAS</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="0" step="0.01" {...field} />
                                            </FormControl>
                                            <FormDescription>Minimum weekly ABAS for members.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="minimum_supervisor_abas"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Supervisor Minimum ABAS</FormLabel>
                                            <FormControl>
                                                <Input type="number" min="0" step="0.01" {...field} />
                                            </FormControl>
                                            <FormDescription>Minimum weekly ABAS for supervisors.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Feature Flags</CardTitle>
                                    <CardDescription>Enable or disable specific features for this faction.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="activity_rosters_enabled"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Activity Rosters</FormLabel>
                                                    <FormDescription>
                                                        Allow members to create and view activity rosters.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="character_sheets_enabled"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Character Sheets</FormLabel>
                                                    <FormDescription>
                                                        Allow members to view detailed character sheets.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="statistics_enabled"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                <div className="space-y-0.5">
                                                    <FormLabel>Statistics Page</FormLabel>
                                                    <FormDescription>
                                                        Allow members to view faction statistics.
                                                    </FormDescription>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </FormItem>
                                        )}
                                    />
                                </CardContent>
                            </Card>

                             <Card>
                                <CardHeader>
                                    <CardTitle>Forum Integration (Optional)</CardTitle>
                                    <CardDescription>
                                        Connect your phpBB forum to enable roster syncing and more. This requires the{' '}
                                        <Link href="https://github.com/b00skit/phpbb-api-extension/" target="_blank" className="text-primary hover:underline">phpBB API Extension</Link> by booskit.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <FormField
                                        control={form.control}
                                        name="phpbb_api_url"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>phpBB Forum URL</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="https://your-forum.com/phpbb/" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                     <FormField
                                        control={form.control}
                                        name="phpbb_api_key"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>phpBB API Key</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Enter your API key" {...field} value={field.value ?? ''} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <div>
                                        <Label>REST API Endpoint Preview</Label>
                                        <Input readOnly value={apiEndpointPreview} className="mt-1 font-mono text-xs" />
                                    </div>
                                </CardContent>
                            </Card>
                            
                            {form.formState.errors.root && (
                                <Alert variant="destructive">
                                    <AlertTriangle className="h-4 w-4" />
                                    <AlertTitle>Update Failed</AlertTitle>
                                    <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={isDeleting}>
                                        {isDeleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
                                        Unenroll Faction
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently unenroll the faction from the panel for everyone. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete}>
                                            Yes, Unenroll Faction
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    );
}
