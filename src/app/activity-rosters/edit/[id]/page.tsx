

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
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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
    visibility: z.enum(['personal', 'private', 'unlisted', 'public']).default('personal'),
    password: z.string().optional().nullable(),
    roster_setup_json: jsonString.optional().nullable(),
}).refine(data => {
    if (data.visibility === 'private' && data.password === null) {
        return false;
    }
    return true;
}, {
    message: "A new password is required to make this roster private.",
    path: ["password"],
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
  "show_assignment_titles": true,
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

const visibilityOptions = [
    { value: 'personal', label: 'Personal', description: 'Only you can see this roster.' },
    { value: 'private', label: 'Private', description: 'Only people with the password can see this roster.' },
    { value: 'unlisted', label: 'Unlisted', description: 'Anyone with the link can see it, but it\'s hidden from the main list.' },
    { value: 'public', label: 'Public', description: 'Everyone in the faction can see this roster.' },
];

export default function EditRosterPage() {
    const router = useRouter();
    const params = useParams();
    const rosterId = params.id as string;
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [initialVisibility, setInitialVisibility] = useState<string | null>(null);
    const [basicIncludeMembers, setBasicIncludeMembers] = useState('');

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });
    
    const watchVisibility = form.watch('visibility');
    const watchJson = form.watch('roster_setup_json');

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
                const rosterJson = data.roster.roster_setup_json ? JSON.stringify(JSON.parse(data.roster.roster_setup_json), null, 2) : '';

                form.reset({
                    name: data.roster.name,
                    visibility: data.roster.visibility,
                    password: null, 
                    roster_setup_json: rosterJson,
                });
                
                // Initialize basic editor state from fetched data
                try {
                    const json = rosterJson ? JSON.parse(rosterJson) : {};
                    const members = json.include_members || [];
                    setBasicIncludeMembers(members.join('\n'));
                } catch (e) {
                    setBasicIncludeMembers('');
                }

                setInitialVisibility(data.roster.visibility);
            } catch (err: any) {
                toast({ variant: 'destructive', title: 'Error', description: err.message });
                router.push('/activity-rosters');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRosterData();
    }, [rosterId, router, toast, form]);

    const handleTabChange = (newTab: string) => {
        if (newTab === 'basic') {
            try {
                const json = watchJson ? JSON.parse(watchJson) : {};
                const members = json.include_members || [];
                setBasicIncludeMembers(members.join('\n'));
            } catch (e) {
                setBasicIncludeMembers('');
            }
        } else if (newTab === 'advanced') {
            try {
                const json = watchJson ? JSON.parse(watchJson) : {};
                const members = basicIncludeMembers.split('\n').map(m => m.trim()).filter(Boolean);
                json.include_members = members;
                form.setValue('roster_setup_json', JSON.stringify(json, null, 2), { shouldValidate: true });
            } catch (e) {
                // If current JSON is invalid, do nothing
            }
        }
    };


    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            // Ensure the final JSON is up-to-date before submitting
            const finalValues = { ...values };
            try {
                const json = finalValues.roster_setup_json ? JSON.parse(finalValues.roster_setup_json) : {};
                const members = basicIncludeMembers.split('\n').map(m => m.trim()).filter(Boolean);
                json.include_members = members;
                finalValues.roster_setup_json = JSON.stringify(json);
            } catch (e) {
                // Ignore if JSON is malformed, it will be caught by validation
            }

            const response = await fetch(`/api/rosters/${rosterId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(finalValues),
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
                                name="visibility"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Visibility</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select visibility..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {visibilityOptions.map(option => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label} - <span className="text-muted-foreground text-xs">{option.description}</span>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            {watchVisibility === 'private' && (
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>New Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="Leave blank to keep current password" {...field} value={field.value ?? ''} />
                                            </FormControl>
                                            <FormDescription>
                                                 {initialVisibility === 'private'
                                                    ? 'Only enter a value here if you want to change the password.'
                                                    : 'A new password is required to make this roster private.'}
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                             <FormItem>
                                <FormLabel>Roster Configuration (Optional)</FormLabel>
                                <Tabs defaultValue="advanced" className="w-full" onValueChange={handleTabChange}>
                                    <TabsList>
                                        <TabsTrigger value="advanced">Advanced (JSON)</TabsTrigger>
                                        <TabsTrigger value="basic">Basic (Included Members)</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="advanced">
                                        <FormField
                                            control={form.control}
                                            name="roster_setup_json"
                                            render={({ field }) => (
                                                <FormItem>
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
                                    </TabsContent>
                                    <TabsContent value="basic">
                                        <Textarea
                                            placeholder='Enter one character name per line...'
                                            className="font-mono min-h-[150px]"
                                            value={basicIncludeMembers}
                                            onChange={(e) => setBasicIncludeMembers(e.target.value)}
                                        />
                                        <FormDescription>
                                            Only members with these names will be shown. This will only affect the `include_members` field.
                                        </FormDescription>
                                    </TabsContent>
                                </Tabs>
                            </FormItem>
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
