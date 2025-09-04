'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
});

export function EnrollClientPage() {
    const [eligibleFactions, setEligibleFactions] = useState<EligibleFaction[]>([]);
    const [selectedFaction, setSelectedFaction] = useState<EligibleFaction | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            color: '#FFFFFF',
            access_rank: 15,
            moderation_rank: 15,
        },
    });

    useEffect(() => {
        const fetchEligible = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/factions/eligible');
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
    }, [router]);

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
                        <CardDescription>Choose a faction you have leadership permissions for.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Select onValueChange={handleSelectFaction}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a faction..." />
                            </SelectTrigger>
                            <SelectContent>
                                {eligibleFactions.map(f => (
                                    <SelectItem key={f.id} value={f.id.toString()}>{f.name} (Rank {f.rank})</SelectItem>
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
