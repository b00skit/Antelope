'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { factions } from '@/db/schema';

type Faction = typeof factions.$inferSelect;

interface ManageFactionClientPageProps {
    faction: Faction;
}

const formSchema = z.object({
    name: z.string().min(3, "Faction name must be at least 3 characters long."),
    color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color code, e.g., #FFFFFF").optional().nullable(),
    access_rank: z.coerce.number().min(1, "Rank must be at least 1").max(20, "Rank must be 20 or less"),
    moderation_rank: z.coerce.number().min(1, "Rank must be at least 1").max(20, "Rank must be 20 or less"),
});

export function ManageFactionClientPage({ faction }: ManageFactionClientPageProps) {
    const router = useRouter();
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: faction.name,
            color: faction.color,
            access_rank: faction.access_rank ?? 15,
            moderation_rank: faction.moderation_rank ?? 15,
        },
    });

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
            router.push('/factions');
            router.refresh();

        } catch (err: any) {
            form.setError("root", { message: err.message });
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
                                    <AlertTitle>Update Failed</AlertTitle>
                                    <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    );
}
