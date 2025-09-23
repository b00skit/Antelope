

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
import { AlertTriangle, Loader2, Plus, Trash2 } from 'lucide-react';
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
import { MultiSelect } from '@/components/ui/multi-select';
import { Switch } from '@/components/ui/switch';
import { useSession } from '@/hooks/use-session';
import { cn } from '@/lib/utils';


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
    access_json: z.array(z.number()).optional().nullable(),
}).refine(data => {
    if (data.visibility === 'private' && data.password === null) {
        return false;
    }
    return true;
}, {
    message: "A new password is required to make this roster private.",
    path: ["password"],
});

interface LabelConfig {
    color: string;
    title: string;
}

interface BasicFilters {
    include_ranks: string;
    exclude_ranks: string;
    include_members: string;
    exclude_members: string;
    include_cat2_ids: number[];
    include_cat3_ids: number[];
    forum_groups_included: number[];
    forum_groups_excluded: number[];
    show_assignment_titles: boolean;
    mark_alternative_characters: boolean;
    allow_roster_snapshots: boolean;
    labels: LabelConfig[];
}

const visibilityOptions = [
    { value: 'personal', label: 'Personal', description: 'Only you can see this roster.' },
    { value: 'private', label: 'Private', description: 'Only people with the password can see this roster.' },
    { value: 'unlisted', label: 'Unlisted', description: 'Anyone with the link can see it, but it\'s hidden from the main list.' },
    { value: 'public', label: 'Public', description: 'Everyone in the faction can see this roster.' },
];

const labelColors = [
    "red", "orange", "amber", "yellow", "lime", "green", "emerald", "teal", "cyan",
    "sky", "blue", "indigo", "violet", "purple", "fuchsia", "pink", "rose"
];


export default function EditRosterPage() {
    const router = useRouter();
    const params = useParams();
    const rosterId = params.id as string;
    const { toast } = useToast();
    const { session } = useSession();
    const [isLoading, setIsLoading] = useState(true);
    const [initialVisibility, setInitialVisibility] = useState<string | null>(null);
    const [factionUsers, setFactionUsers] = useState<{ id: number; username: string }[]>([]);
    const [syncableForumGroups, setSyncableForumGroups] = useState<{ value: string; label: string; }[]>([]);
    const [organizationalUnits, setOrganizationalUnits] = useState<{ value: string; label: string; }[]>([]);
    const [basicFilters, setBasicFilters] = useState<BasicFilters>({
        include_ranks: '',
        exclude_ranks: '',
        include_members: '',
        exclude_members: '',
        include_cat2_ids: [],
        include_cat3_ids: [],
        forum_groups_included: [],
        forum_groups_excluded: [],
        show_assignment_titles: true,
        mark_alternative_characters: true,
        allow_roster_snapshots: false,
        labels: [],
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });
    
    const watchVisibility = form.watch('visibility');

    useEffect(() => {
        if (!rosterId) return;

        const fetchRosterData = async () => {
            setIsLoading(true);
            try {
                const [rosterRes, orgUnitsRes] = await Promise.all([
                    fetch(`/api/rosters/${rosterId}`),
                    fetch('/api/units-divisions/list-for-rosters')
                ]);

                if (!rosterRes.ok) {
                    const err = await rosterRes.json();
                    throw new Error(err.error || 'Failed to fetch roster data.');
                }
                const data = await rosterRes.json();
                const rosterJson = data.roster.roster_setup_json ? JSON.stringify(JSON.parse(data.roster.roster_setup_json), null, 2) : '';
                setFactionUsers(data.factionUsers || []);

                form.reset({
                    name: data.roster.name,
                    visibility: data.roster.visibility,
                    password: null, 
                    roster_setup_json: rosterJson,
                    access_json: data.roster.access_json || [],
                });
                
                // Initialize basic editor state from fetched data
                try {
                    const json = rosterJson ? JSON.parse(rosterJson) : {};
                    setBasicFilters({
                        include_ranks: (json.include_ranks || []).join(','),
                        exclude_ranks: (json.exclude_ranks || []).join(','),
                        include_members: (json.include_members || []).join('\n'),
                        exclude_members: (json.exclude_members || []).join('\n'),
                        include_cat2_ids: json.include_cat2_ids || [],
                        include_cat3_ids: json.include_cat3_ids || [],
                        forum_groups_included: json.forum_groups_included || [],
                        forum_groups_excluded: json.forum_groups_excluded || [],
                        show_assignment_titles: json.show_assignment_titles ?? true,
                        mark_alternative_characters: json.mark_alternative_characters ?? true,
                        allow_roster_snapshots: json.allow_roster_snapshots ?? false,
                        labels: json.labels ? Object.entries(json.labels).map(([color, title]) => ({ color, title: title as string })) : [],
                    });
                } catch (e) {
                    // ignore
                }

                setInitialVisibility(data.roster.visibility);

                if(session?.hasActiveFaction) {
                    const groupsRes = await fetch(`/api/factions/${session.activeFaction?.id}/forum-groups`);
                    const groupsData = await groupsRes.json();
                    if (groupsRes.ok) {
                        setSyncableForumGroups((groupsData.syncableGroups || []).map((g: any) => ({ value: g.id.toString(), label: g.name })));
                    }
                }

                 const orgUnitsData = await orgUnitsRes.json();
                if (orgUnitsRes.ok) {
                    const options: { value: string; label: string; }[] = [];
                    (orgUnitsData.allUnits || []).forEach((cat1: any) => {
                        (cat1.cat2s || []).forEach((cat2: any) => {
                            options.push({ value: `cat2-${cat2.id}`, label: `${cat1.name} / ${cat2.name}`});
                            (cat2.cat3s || []).forEach((cat3: any) => {
                                options.push({ value: `cat3-${cat3.id}`, label: `${cat1.name} / ${cat2.name} / ${cat3.name}`});
                            });
                        });
                    });
                    setOrganizationalUnits(options);
                }
            } catch (err: any) {
                toast({ variant: 'destructive', title: 'Error', description: err.message });
                router.push('/activity-rosters');
            } finally {
                setIsLoading(false);
            }
        };

        fetchRosterData();
    }, [rosterId, router, toast, form, session]);

    const syncJsonToBasic = () => {
        try {
            const jsonString = form.getValues('roster_setup_json');
            const json = jsonString ? JSON.parse(jsonString) : {};
            setBasicFilters({
                include_ranks: (json.include_ranks || []).join(','),
                exclude_ranks: (json.exclude_ranks || []).join(','),
                include_members: (json.include_members || []).join('\n'),
                exclude_members: (json.exclude_members || []).join('\n'),
                include_cat2_ids: json.include_cat2_ids || [],
                include_cat3_ids: json.include_cat3_ids || [],
                forum_groups_included: json.forum_groups_included || [],
                forum_groups_excluded: json.forum_groups_excluded || [],
                show_assignment_titles: json.show_assignment_titles ?? true,
                mark_alternative_characters: json.mark_alternative_characters ?? true,
                allow_roster_snapshots: json.allow_roster_snapshots ?? false,
                labels: json.labels ? Object.entries(json.labels).map(([color, title]) => ({ color, title: title as string })) : [],
            });
        } catch (e) {
            // Invalid JSON, do nothing
        }
    };

    const syncBasicToJson = () => {
        try {
            const jsonString = form.getValues('roster_setup_json');
            const currentJson = jsonString ? JSON.parse(jsonString) : {};
            
            const parseRanks = (rankString: string) => rankString.split(',').map(r => parseInt(r.trim(), 10)).filter(r => !isNaN(r));
            const parseMembers = (memberString: string) => memberString.split('\n').map(m => m.trim()).filter(Boolean);
            const parseLabels = (labels: LabelConfig[]) => labels.reduce((acc, label) => {
                if (label.color && label.title) {
                    acc[label.color] = label.title;
                }
                return acc;
            }, {} as Record<string, string>);

            const newJson = {
                ...currentJson,
                include_ranks: parseRanks(basicFilters.include_ranks),
                exclude_ranks: parseRanks(basicFilters.exclude_ranks),
                include_members: parseMembers(basicFilters.include_members),
                exclude_members: parseMembers(basicFilters.exclude_members),
                include_cat2_ids: basicFilters.include_cat2_ids,
                include_cat3_ids: basicFilters.include_cat3_ids,
                forum_groups_included: basicFilters.forum_groups_included,
                forum_groups_excluded: basicFilters.forum_groups_excluded,
                show_assignment_titles: basicFilters.show_assignment_titles,
                mark_alternative_characters: basicFilters.mark_alternative_characters,
                allow_roster_snapshots: basicFilters.allow_roster_snapshots,
                labels: parseLabels(basicFilters.labels),
            };
            form.setValue('roster_setup_json', JSON.stringify(newJson, null, 2), { shouldValidate: true });
        } catch (e) {
            // Could happen if json is malformed, but we proceed anyway
        }
    };
    
    const handleOrgUnitChange = (selected: string[]) => {
        const cat2_ids: number[] = [];
        const cat3_ids: number[] = [];
        selected.forEach(s => {
            const [type, id] = s.split('-');
            if (type === 'cat2') cat2_ids.push(Number(id));
            if (type === 'cat3') cat3_ids.push(Number(id));
        });
        setBasicFilters(f => ({ ...f, include_cat2_ids: cat2_ids, include_cat3_ids: cat3_ids }));
    };


    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        try {
            syncBasicToJson();
            const finalValues = form.getValues();

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
    
    const userOptions = factionUsers.map(user => ({ value: user.id.toString(), label: user.username }));

    const handleLabelChange = (index: number, field: 'color' | 'title', value: string) => {
        const newLabels = [...basicFilters.labels];
        newLabels[index][field] = value;
        setBasicFilters(f => ({ ...f, labels: newLabels }));
    };

    const addLabel = () => {
        setBasicFilters(f => ({ ...f, labels: [...f.labels, { color: 'red', title: '' }] }));
    };

    const removeLabel = (index: number) => {
        const newLabels = basicFilters.labels.filter((_, i) => i !== index);
        setBasicFilters(f => ({ ...f, labels: newLabels }));
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
                             {watchVisibility !== 'personal' && (
                                <FormField
                                    control={form.control}
                                    name="access_json"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Edit Access</FormLabel>
                                            <FormControl>
                                                 <MultiSelect
                                                    options={userOptions}
                                                    onValueChange={(selected) => field.onChange(selected.map(Number))}
                                                    defaultValue={field.value?.map(String) ?? []}
                                                    placeholder="Select users..."
                                                />
                                            </FormControl>
                                            <FormDescription>Grant other users permission to edit this roster.</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}
                             <FormItem>
                                <FormLabel>Roster Configuration (Optional)</FormLabel>
                                <Tabs defaultValue="basic" className="w-full" onValueChange={(tab) => tab === 'basic' ? syncJsonToBasic() : syncBasicToJson()}>
                                    <TabsList>
                                        <TabsTrigger value="basic">Basic</TabsTrigger>
                                        <TabsTrigger value="advanced">Advanced (JSON)</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="basic" className="space-y-4 pt-2">
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-base">Filters</CardTitle>
                                            </CardHeader>
                                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormItem>
                                                    <FormLabel>Include Ranks</FormLabel>
                                                    <Input value={basicFilters.include_ranks} onChange={(e) => setBasicFilters(f => ({...f, include_ranks: e.target.value}))} placeholder="e.g., 1,5,10" />
                                                    <FormDescription>Comma-separated rank IDs to include.</FormDescription>
                                                </FormItem>
                                                <FormItem>
                                                    <FormLabel>Exclude Ranks</FormLabel>
                                                    <Input value={basicFilters.exclude_ranks} onChange={(e) => setBasicFilters(f => ({...f, exclude_ranks: e.target.value}))} placeholder="e.g., 14,15" />
                                                    <FormDescription>Comma-separated rank IDs to exclude.</FormDescription>
                                                </FormItem>
                                                <FormItem>
                                                    <FormLabel>Include Forum Groups</FormLabel>
                                                    <MultiSelect
                                                        options={syncableForumGroups}
                                                        onValueChange={(selected) => setBasicFilters(f => ({...f, forum_groups_included: selected.map(Number)}))}
                                                        defaultValue={basicFilters.forum_groups_included.map(String)}
                                                        placeholder="Select groups..."
                                                    />
                                                </FormItem>
                                                <FormItem>
                                                    <FormLabel>Exclude Forum Groups</FormLabel>
                                                    <MultiSelect
                                                        options={syncableForumGroups}
                                                        onValueChange={(selected) => setBasicFilters(f => ({...f, forum_groups_excluded: selected.map(Number)}))}
                                                        defaultValue={basicFilters.forum_groups_excluded.map(String)}
                                                        placeholder="Select groups..."
                                                    />
                                                </FormItem>
                                                <FormItem className="col-span-1 md:col-span-2">
                                                    <FormLabel>Include Units / Divisions</FormLabel>
                                                     <MultiSelect
                                                        options={organizationalUnits}
                                                        onValueChange={handleOrgUnitChange}
                                                        defaultValue={[
                                                            ...basicFilters.include_cat2_ids.map(id => `cat2-${id}`),
                                                            ...basicFilters.include_cat3_ids.map(id => `cat3-${id}`),
                                                        ]}
                                                        placeholder="Select units/details..."
                                                    />
                                                    <FormDescription>Include all members from the selected organizational units or details.</FormDescription>
                                                </FormItem>
                                            </CardContent>
                                        </Card>
                                        <Card>
                                            <CardHeader>
                                                <CardTitle className="text-base">Display Options</CardTitle>
                                            </CardHeader>
                                            <CardContent className="space-y-4">
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                    <div className="space-y-0.5">
                                                        <FormLabel>Show Assignment Titles</FormLabel>
                                                    </div>
                                                    <Switch checked={basicFilters.show_assignment_titles} onCheckedChange={(checked) => setBasicFilters(f => ({...f, show_assignment_titles: checked}))} />
                                                </FormItem>
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                    <div className="space-y-0.5">
                                                        <FormLabel>Mark Alternative Characters</FormLabel>
                                                    </div>
                                                    <Switch checked={basicFilters.mark_alternative_characters} onCheckedChange={(checked) => setBasicFilters(f => ({...f, mark_alternative_characters: checked}))} />
                                                </FormItem>
                                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                                    <div className="space-y-0.5">
                                                        <FormLabel>Allow Roster Snapshots</FormLabel>
                                                    </div>
                                                    <Switch checked={basicFilters.allow_roster_snapshots} onCheckedChange={(checked) => setBasicFilters(f => ({...f, allow_roster_snapshots: checked}))} />
                                                </FormItem>
                                            </CardContent>
                                        </Card>
                                         <Card>
                                            <CardHeader>
                                                <CardTitle className="text-base">Labels</CardTitle>
                                                <CardDescription>Create color-coded labels for members on this roster.</CardDescription>
                                            </CardHeader>
                                            <CardContent className="space-y-2">
                                                {basicFilters.labels.map((label, index) => (
                                                    <div key={index} className="flex items-center gap-2">
                                                        <Select value={label.color} onValueChange={(value) => handleLabelChange(index, 'color', value)}>
                                                            <SelectTrigger className="w-[120px]">
                                                                <SelectValue>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={cn('h-2 w-2 rounded-full', `bg-${label.color}-500`)} />
                                                                        {label.color}
                                                                    </div>
                                                                </SelectValue>
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {labelColors.map(color => (
                                                                    <SelectItem key={color} value={color}>
                                                                         <div className="flex items-center gap-2">
                                                                            <span className={cn('h-2 w-2 rounded-full', `bg-${color}-500`)} />
                                                                            {color}
                                                                        </div>
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                        <Input value={label.title} onChange={(e) => handleLabelChange(index, 'title', e.target.value)} placeholder="Label Title" />
                                                        <Button variant="ghost" size="icon" onClick={() => removeLabel(index)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                                    </div>
                                                ))}
                                                <Button type="button" variant="outline" size="sm" onClick={addLabel}><Plus className="mr-2" /> Add Label</Button>
                                            </CardContent>
                                        </Card>
                                    </TabsContent>
                                    <TabsContent value="advanced">
                                        <FormField
                                            control={form.control}
                                            name="roster_setup_json"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder='Paste your JSON configuration here...'
                                                            className="font-mono min-h-[250px]"
                                                            {...field}
                                                            value={field.value ?? ''}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
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
