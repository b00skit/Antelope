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

const formSchema = z.object({
    name: z.string().min(3, "Roster name must be at least 3 characters long."),
    is_public: z.boolean().default(false),
    roster_setup_json: z.string().optional(), // For now, this is a placeholder
});

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
                            <FormItem>
                                <Label>JSON Configuration</Label>
                                <Input type="file" accept=".json" disabled />
                                <FormDescription>JSON file upload will be enabled in a future update.</FormDescription>
                            </FormItem>
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
