'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from '@/components/ui/switch';
import Link from 'next/link';


interface EligibleFaction {
    id: number;
    name: string;
    rank: number;
}

const formSchema = z.object({
    id: z.number(),
    user_rank: z.number(),
    name: z.string().min(3, "Faction name must be at least 3 characters long."),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color code, e.g., #FFFFFF").optional().nullable(),
    access_rank: z.coerce.number().min(1, "Rank must be at least 1").max(20, "Rank must be 20 or less"),
    moderation_rank: z.coerce.number().min(1, "Rank must be at least 1").max(20, "Rank must be 20 or less"),
    activity_rosters_enabled: z.boolean().default(true),
    character_sheets_enabled: z.boolean().default(true),
    phpbb_api_url: z.string().url("Must be a valid URL").or(z.literal('')).optional().nullable(),
    phpbb_api_key: z.string().optional().nullable(),
});

export function EnrollClientPage() {
    const [eligibleFactions, setEligibleFactions] = useState<EligibleFaction[]>([]);
    const [selectedFaction, setSelectedFaction] = useState<EligibleFaction | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const searchParams = useSearchParams();
    const isSuperAdminMode = searchParams.get('superadmin') === 'true';
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            color: '#FFFFFF',
            access_rank: 15,
            moderation_rank: 15,
            activity_rosters_enabled: true,
            character_sheets_enabled: true,
            phpbb_api_url: '',
            phpbb_api_key: '',
        },
    });

    const watchUrl = form.watch('phpbb_api_url');
    const watchKey = form.watch('phpbb_api_key');

    const apiEndpointPreview = React.useMemo(() => {
        if (watchUrl && watchKey) {
            try {
                const url = new URL(watchUrl);
                // Ensure trailing slash
                const baseUrl = url.pathname.endsWith('/') ? url.href : `${url.href}/`;
                return `${baseUrl}app.php/booskit/phpbbapi/groups?key=${watchKey}`;
            } catch (e) {
                return "Invalid URL provided.";
            }
        }
        return "Fill out both URL and Key to see the preview.";
    }, [watchUrl, watchKey]);

    useEffect(() => {
        const fetchEligible = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const url = isSuperAdminMode ? '/api/factions/eligible?superadmin=true' : '/api/factions/eligible';
                const res = await fetch(url);
                if (!res.ok) {
                    const errorData = await res.json();
                    if (errorData.reauth) router.push('/api/auth/logout');
                    throw new Error(errorData.error || 'Failed to fetch data');
                }
                const data = await res.json();
                setEligibleFactions(data.eligibleFactions);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchEligible();
    }, [router, isSuperAdminMode]);

    const handleSelectFaction = (factionId: string) => {
        const faction = eligibleFactions.find(f => f.id.toString() === factionId);
        if (faction) {
            setSelectedFaction(faction);
            form.reset({
                id: faction.id,
                user_rank: faction.rank,
                name: faction.name,
                color: '#FFFFFF',
                access_rank: 15,
                moderation_rank: 15,
                activity_rosters_enabled: true,
                character_sheets_enabled: true,
                phpbb_api_url: '',
                phpbb_api_key: '',
            });
        }
    };

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const response = await fetch('/api/factions/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to enroll faction.');
            }

            toast({
                title: 'Success!',
                description: `Faction "${values.name}" has been enrolled.`,
            });
            router.push('/factions');
            router.refresh();

        } catch (err: any) {
            form.setError("root", { message: err.message });
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 md:p-6 lg:p-8 flex justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (error) {
        return (
             <div className="container mx-auto p-4 md:p-6 lg:p-8">
                <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
             </div>
        );
    }

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <PageHeader title="Enroll a Faction" description="Add one of your factions to the panel." />

            {eligibleFactions.length === 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>No Eligible Factions Found</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p>We could not find any factions on your GTA:World account where you hold a rank of 15 or higher that haven't already been enrolled.</p>
                        <p className="text-sm text-muted-foreground mt-2">If this is a mistake, please ensure you are logged into the correct account and try again later.</p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Select a Faction</CardTitle>
                        <CardDescription>
                            {isSuperAdminMode 
                                ? "Select any faction to enroll." 
                                : "Choose a faction you have leadership permissions for."
                            }
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Select onValueChange={handleSelectFaction}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a faction..." />
                            </SelectTrigger>
                            <SelectContent>
                                {eligibleFactions.map(f => (
                                    <SelectItem key={f.id} value={f.id.toString()}>{f.name} {f.rank !== 99 && `(Rank ${f.rank})`}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>

                    {selectedFaction && (
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                                <CardContent className="space-y-4">
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
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="access_rank"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Access Rank</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min="1" max="20" {...field} />
                                                    </FormControl>
                                                    <FormDescription>Minimum rank required to join this faction's panel.</FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <FormField
                                            control={form.control}
                                            name="moderation_rank"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Moderation Rank</FormLabel>
                                                    <FormControl>
                                                        <Input type="number" min="1" max="20" {...field} />
                                                    </FormControl>
                                                    <FormDescription>Minimum rank required to manage this faction's panel.</FormDescription>
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
                                            <AlertTitle>Enrollment Failed</AlertTitle>
                                            <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                                        </Alert>
                                    )}
                                </CardContent>
                                <CardFooter>
                                    <Button type="submit" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Enroll Faction
                                    </Button>
                                </CardFooter>
                            </form>
                        </Form>
                    )}
                </Card>
            )}
        </div>
    );
}
