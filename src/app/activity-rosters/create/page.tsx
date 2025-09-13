
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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

const jsonString = z.string().refine((value) => {
    if (!value) return true; // Allow empty string
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
  "exclude_members": ["Another_Name"],
  "forum_groups_included": [5, 8],
  "forum_groups_excluded": [10],
  "forum_users_included": [2, 123],
  "forum_users_excluded": [45],
  "alert_forum_users_missing": true,
  "abas_standards": {
    "by_rank": {
      "10": 5.0,
      "12": 7.5
    },
    "by_name": {
      "John_Doe": 10.0
    }
  }
}`;

export default function CreateRosterPage() {
    const router = useRouter();
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: '',
            is_public: false,
            roster_setup_json: '',
        },
    });

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            const response = await fetch('/api/rosters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create roster.');
            }

            toast({
                title: 'Success!',
                description: 'Roster created successfully.',
            });
            router.push('/activity-rosters');
            router.refresh();

        } catch (err: any) {
            form.setError("root", { message: err.message });
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <PageHeader title="Create New Roster" description="Set up a new activity roster for your faction." />

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
                                        <FormDescription>A descriptive name for this roster.</FormDescription>
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
                                            Use this to filter the roster by rank, name, or forum groups/users.
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
                                    <AlertTitle>Creation Failed</AlertTitle>
                                    <AlertDescription>{form.formState.errors.root.message}</AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Roster
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    );
}
