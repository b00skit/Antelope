
'use client';

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
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface SnapshotDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    categoryType: 'cat2' | 'cat3';
    categoryId: number;
}

export function SnapshotDialog({ open, onOpenChange, categoryType, categoryId }: SnapshotDialogProps) {
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (open) {
            setName(`Snapshot - ${new Date().toLocaleString()}`);
        }
    }, [open]);

    const handleCreate = async () => {
        setIsCreating(true);
        try {
            const res = await fetch(`/api/units-divisions/${categoryType}/${categoryId}/snapshots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            toast({ title: 'Success!', description: 'Snapshot created successfully.' });
            onOpenChange(false);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsCreating(false);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Roster Snapshot</DialogTitle>
                    <DialogDescription>
                        This will save a permanent, point-in-time copy of the current roster view.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-2">
                    <Label htmlFor="snapshot-name">Snapshot Name</Label>
                    <Input id="snapshot-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Snapshot
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
