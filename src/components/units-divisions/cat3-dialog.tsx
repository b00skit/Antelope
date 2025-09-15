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
import type { Cat2, FactionUser } from './units-divisions-client-page';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { MultiSelect } from '../ui/multi-select';

const cat3FormSchema = z.object({
    name: z.string().min(1, "Name cannot be empty."),
    short_name: z.string().optional().nullable(),
    access_json: z.array(z.number()).optional().nullable(),
    forum_group_id: z.coerce.number().optional().nullable(),
});

interface Cat3DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: () => void;
    cat3: any | null; // Replace with Cat3 type later
    parentCat2: Cat2;
    settings: { category_3_name: string };
    factionUsers: FactionUser[];
}

export function Cat3Dialog({ open, onOpenChange, onSave, cat3, parentCat2, settings, factionUsers }: Cat3DialogProps) {
    const { toast } = useToast();
    const form = useForm<z.infer<typeof cat3FormSchema>>({
        resolver: zodResolver(cat3FormSchema),
        defaultValues: {
            name: '',
            short_name: '',
            access_json: [],
            forum_group_id: undefined,
        }
    });

    useEffect(() => {
        if (cat3) {
            form.reset({
                name: cat3.name,
                short_name: cat3.short_name,
                access_json: cat3.access_json,
                forum_group_id: cat3.settings_json?.forum_group_id,
            });
        } else {
            form.reset({
                name: '',
                short_name: '',
                access_json: [],
                forum_group_id: undefined,
            });
        }
    }, [cat3, form]);

    const handleSubmit = async (values: z.infer<typeof cat3FormSchema>) => {
        try {
            const url = cat3 ? `/api/units-divisions/cat3/${cat3.id}` : '/api/units-divisions/cat3';
            const method = cat3 ? 'PUT' : 'POST';
            
            const payload = {
                cat2_id: parentCat2.id,
                name: values.name,
                short_name: values.short_name,
                access_json: values.access_json,
                settings_json: {
                    forum_group_id: values.forum_group_id,
                },
            };

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            
            toast({ title: 'Success', description: `Successfully ${cat3 ? 'updated' : 'created'} ${settings.category_3_name}.` });
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
                    <DialogTitle>{cat3 ? 'Edit' : 'Create'} {settings.category_3_name}</DialogTitle>
                    <DialogDescription>
                        {cat3 ? `Update the details for this detail in ${parentCat2.name}.` : `Create a new sub-unit within ${parentCat2.name}.`}
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
                                    <FormLabel>Forum Group ID (Optional)</FormLabel>
                                    <FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl>
                                    <FormDescription>Sync this detail with a phpBB forum group.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {cat3 ? 'Save Changes' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
