
'use client';

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

interface SyncExclusionsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categoryType: 'cat_2' | 'cat_3';
    categoryId: number;
}

export function SyncExclusionsDialog({ open, onOpenChange, categoryType, categoryId }: SyncExclusionsDialogProps) {
    const { toast } = useToast();
    const [excludedNames, setExcludedNames] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            const fetchExclusions = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const res = await fetch(`/api/units-divisions/sync-exclusions/${categoryType}/${categoryId}`);
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    setExcludedNames((data.excludedNames || []).join('\n'));
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchExclusions();
        }
    }, [open, categoryId, categoryType]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const namesToSave = excludedNames.split('\n').map(name => name.trim()).filter(Boolean);
            const res = await fetch(`/api/units-divisions/sync-exclusions/${categoryType}/${categoryId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ excludedNames: namesToSave }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            toast({ title: 'Success', description: 'Exclusion list updated successfully.' });
            onOpenChange(false);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Member Sync Exclusions</DialogTitle>
                    <DialogDescription>
                        List character names (one per line) to exclude them from being added during a forum group sync.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-48">
                            <Loader2 className="animate-spin" />
                        </div>
                    ) : error ? (
                        <Alert variant="destructive">
                            <AlertTriangle />
                            <AlertTitle>Failed to load exclusions</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : (
                        <div>
                            <Label htmlFor="exclusion-names">Character Names (Firstname_Lastname)</Label>
                            <Textarea
                                id="exclusion-names"
                                value={excludedNames}
                                onChange={(e) => setExcludedNames(e.target.value)}
                                className="h-48 font-mono"
                                placeholder="Firstname_Lastname&#10;Another_Name"
                            />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || isLoading}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Exclusions
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
