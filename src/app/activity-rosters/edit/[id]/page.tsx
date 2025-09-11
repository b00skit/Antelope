'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';

const jsonString = z.string().refine((value) => {
    if (!value) return true;
    try {
      JSON.parse(value);
      return true;
    } catch (e) {
      return false;
    }
}, { message: "Must be a valid JSON object." });

const formSchema = z.object({
    name: z.string().min(3, "Roster name must be at least 3 characters long."),
    is_public: z.boolean().default(false),
    roster_setup_json: jsonString.optional().nullable(),
});

const jsonExample = `{
  "include_ranks": [1, 2, 3],
  "exclude_ranks": [4],
  "include_members": ["First_Name"],
  "exclude_members": ["Another_Name"]
}`;

export default function EditRosterPage() {
    const router = useRouter();
    const params = useParams();
    const rosterId = params.id as string;
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    useEffect(() => {
        if (!rosterId) return;

        const fetchRosterData = async () => {
            setIsLoading(true);
            try {
                const res = await fetch(`/api/rosters/${rosterId}`);
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.error || 'Failed to fetch roster data.');
                }
                const data = await res.json();
                form.reset({
                    name: data.roster.name,
                    is_public: data.roster.is_public,
                    roster_setup_json: data.roster.roster_setup_json ? JSON.stringify(JSON.parse(data.roster.roster_setup_json), null, 2) : '',
                });
            } catch (err: any) {
                toast({ variant: 'destructive', title: 'Error', description: err.message });
                router.push('/activity-rosters');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRosterData();
    }, [rosterId, router, toast, form]);

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const response = await fetch(`/api/rosters/${rosterId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update roster.');
            }

            toast({ title: 'Success!', description: 'Roster updated successfully.' });
            router.push('/activity-rosters');
            router.refresh();

        } catch (err: any) {
            form.setError("root", { message: err.message });
        }
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-4">
                 <PageHeader title="Loading Roster..." description="Fetching details for editing." />
                 <Card>
                    <CardContent className="pt-6 space-y-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </CardContent>
                 </Card>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <PageHeader title={`Edit Roster: ${form.getValues('name')}`} description="Update the details for this roster." />

            <Card>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                         <CardContent className="pt-6 space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Roster Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g., Weekly Patrol Roster" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="is_public"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                        <div className="space-y-0.5">
                                            <FormLabel>Public Roster</FormLabel>
                                            <FormDescription>
                                                If enabled, any member of the faction can view this roster.
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
                                name="roster_setup_json"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>JSON Configuration (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder='Paste your JSON configuration here...'
                                                className="font-mono min-h-[150px]"
                                                {...field}
                                                value={field.value ?? ''}
                                            />
                                        </FormControl>
                                        <FormDescription>
                                            Use this to filter the roster. Only `include_ranks`, `exclude_ranks`, `include_members`, and `exclude_members` keys are supported.
                                        </FormDescription>
                                        <details className="text-sm">
                                            <summary className="cursor-pointer text-muted-foreground">View Example</summary>
                                            <pre className="mt-2 p-2 bg-muted rounded-md text-xs">{jsonExample}</pre>
                                        </details>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
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
