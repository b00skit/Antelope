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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { Cat1 } from './units-divisions-client-page';
import { useEffect } from 'react';

const cat1FormSchema = z.object({
    name: z.string().min(1, "Name cannot be empty."),
    short_name: z.string().optional().nullable(),
    access_json: z.array(z.number()).optional().nullable(),
});

interface Cat1DialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: () => void;
    cat1: Cat1 | null;
    settings: { category_1_name: string };
}

export function Cat1Dialog({ open, onOpenChange, onSave, cat1, settings }: Cat1DialogProps) {
    const { toast } = useToast();
    const form = useForm<z.infer<typeof cat1FormSchema>>({
        resolver: zodResolver(cat1FormSchema),
        defaultValues: {
            name: '',
            short_name: '',
            access_json: [],
        }
    });

    useEffect(() => {
        if (cat1) {
            form.reset({
                name: cat1.name,
                short_name: cat1.short_name,
                access_json: cat1.access_json,
            });
        } else {
            form.reset({
                name: '',
                short_name: '',
                access_json: [],
            });
        }
    }, [cat1, form]);

    const handleSubmit = async (values: z.infer<typeof cat1FormSchema>) => {
        try {
            const url = cat1 ? `/api/units-divisions/cat1/${cat1.id}` : '/api/units-divisions/cat1';
            const method = cat1 ? 'PUT' : 'POST';
            
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            
            toast({ title: 'Success', description: `Successfully ${cat1 ? 'updated' : 'created'} ${settings.category_1_name}.` });
            onSave();
            onOpenChange(false);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{cat1 ? 'Edit' : 'Create'} {settings.category_1_name}</DialogTitle>
                    <DialogDescription>
                        {cat1 ? 'Update the details for this unit.' : `Create a new top-level unit for your faction.`}
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
                                    <FormLabel>Management Access (User IDs, Optional)</FormLabel>
                                    <FormControl>
                                        <Input 
                                            placeholder="e.g., 1, 2, 3"
                                            value={field.value?.join(', ') ?? ''}
                                            onChange={(e) => {
                                                const value = e.target.value;
                                                const numbers = value.split(/[, ]+/).filter(Boolean).map(Number).filter(n => !isNaN(n));
                                                field.onChange(numbers);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="animate-spin" />}
                                {cat1 ? 'Save Changes' : 'Create'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
