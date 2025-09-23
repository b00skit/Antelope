import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
  } from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Cat1, Cat2, FactionUser } from './units-divisions-client-page';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { MultiSelect } from '../ui/multi-select';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const cat2FormSchema = z.object({
    name: z.string().min(1, "Name cannot be empty."),
    short_name: z.string().optional().nullable(),
    access_json: z.array(z.number()).optional().nullable(),
    allow_cat3: z.boolean().default(false),
    forum_group_id: z.coerce.number().optional().nullable(),
    secondary: z.boolean().default(false),
    mark_alternative_characters: z.boolean().default(true),
    allow_roster_snapshots: z.boolean().default(false),
});

interface Cat2DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: () => void;
    cat2: Cat2 | null;
    parentCat1: Cat1;
    settings: { category_2_name: string; category_3_name: string };
    factionUsers: FactionUser[];
    syncableForumGroups: { value: string; label: string; }[];
}

export function Cat2Dialog({ open, onOpenChange, onSave, cat2, parentCat1, settings, factionUsers, syncableForumGroups }: Cat2DialogProps) {
    const { toast } = useToast();
    const form = useForm<z.infer<typeof cat2FormSchema>>({
        resolver: zodResolver(cat2FormSchema),
        defaultValues: {
            name: '',
            short_name: '',
            access_json: [],
            allow_cat3: false,
            forum_group_id: undefined,
            secondary: false,
            mark_alternative_characters: true,
            allow_roster_snapshots: false,
        }
    });

    useEffect(() => {
        if (cat2) {
            form.reset({
                name: cat2.name,
                short_name: cat2.short_name,
                access_json: cat2.access_json,
                allow_cat3: cat2.settings_json?.allow_cat3 ?? false,
                forum_group_id: cat2.forum_group_id,
                secondary: cat2.settings_json?.secondary ?? false,
                mark_alternative_characters: cat2.settings_json?.mark_alternative_characters ?? true,
                allow_roster_snapshots: cat2.settings_json?.allow_roster_snapshots ?? false,
            });
        } else {
            form.reset({
                name: '',
                short_name: '',
                access_json: [],
                allow_cat3: false,
                forum_group_id: undefined,
                secondary: false,
                mark_alternative_characters: true,
                allow_roster_snapshots: false,
            });
        }
    }, [cat2, form]);

    const handleSubmit = async (values: z.infer<typeof cat2FormSchema>) => {
        try {
            const url = cat2 ? `/api/units-divisions/cat2/${cat2.id}` : '/api/units-divisions/cat2';
            const method = cat2 ? 'PUT' : 'POST';
            
            const payload = {
                cat1_id: parentCat1.id,
                name: values.name,
                short_name: values.short_name,
                access_json: values.access_json,
                forum_group_id: values.forum_group_id,
                settings_json: {
                    allow_cat3: values.allow_cat3,
                    secondary: values.secondary,
                    mark_alternative_characters: values.mark_alternative_characters,
                    allow_roster_snapshots: values.allow_roster_snapshots,
                },
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            
            toast({ title: 'Success', description: `Successfully ${cat2 ? 'updated' : 'created'} ${settings.category_2_name}.` });
            onSave();
            onOpenChange(false);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        }
    };

    const userOptions = factionUsers.map(user => ({
        value: user.id.toString(),
        label: user.username,
    }));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{cat2 ? 'Edit' : 'Create'} {settings.category_2_name}</DialogTitle>
                    <DialogDescription>
                        {cat2 ? `Update the details for this unit in ${parentCat1.name}.` : `Create a new sub-unit within ${parentCat1.name}.`}
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-2">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Name</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="short_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Short Name / Abbreviation (Optional)</FormLabel>
                                    <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="access_json"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Management Access (Optional)</FormLabel>
                                    <FormControl>
                                        <MultiSelect
                                            options={userOptions}
                                            onValueChange={(selected) => field.onChange(selected.map(Number))}
                                            defaultValue={field.value?.map(String) ?? []}
                                            placeholder="Select users..."
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="forum_group_id"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Forum Group for Roster Sync (Optional)</FormLabel>
                                     <Select onValueChange={(value) => field.onChange(value === 'none' ? undefined : parseInt(value))} defaultValue={field.value?.toString() ?? 'none'}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select a forum group..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {syncableForumGroups.map(group => (
                                                <SelectItem key={group.value} value={group.value}>{group.label}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>Sync this unit with a phpBB forum group.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="allow_cat3"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Allow Sub-Units</FormLabel>
                                        <FormDescription>
                                            Permit the creation of {settings.category_3_name}s within this {settings.category_2_name}.
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
                            name="secondary"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Secondary {settings.category_2_name}</FormLabel>
                                        <FormDescription>
                                            Allow members to join this {settings.category_2_name.toLowerCase()} even if they have a primary assignment.
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
                            name="mark_alternative_characters"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Mark Alternative Characters</FormLabel>
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
                            name="allow_roster_snapshots"
                            render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Allow Roster Snapshots</FormLabel>
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
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {cat2 ? 'Save Changes' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
