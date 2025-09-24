
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
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { MultiSelect } from '../ui/multi-select';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

interface ForumGroup {
    id: number;
    name: string;
}

interface ForumGroupsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    factionId: number;
}

export function ForumGroupsDialog({ open, onOpenChange, factionId }: ForumGroupsDialogProps) {
    const { toast } = useToast();
    const [allGroups, setAllGroups] = useState<ForumGroup[]>([]);
    const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            const fetchGroups = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const res = await fetch(`/api/factions/${factionId}/forum-groups`);
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    setAllGroups(data.allGroups || []);
                    setSelectedGroupIds((data.syncableGroups || []).map((g: any) => g.group_id.toString()));
                } catch (err: any) {
                    setError(err.message);
                    setAllGroups([]);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchGroups();
        }
    }, [open, factionId]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const groupsToSave = selectedGroupIds.map(id => {
                const group = allGroups.find(g => g.id.toString() === id);
                return { id: parseInt(id), name: group?.name || '' };
            }).filter(g => g.name);

            const res = await fetch(`/api/factions/${factionId}/forum-groups`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groups: groupsToSave }),
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            toast({ title: 'Success', description: 'Syncable forum groups have been updated.' });
            onOpenChange(false);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsSaving(false);
        }
    };

    const groupOptions = allGroups.map(group => ({
        value: group.id.toString(),
        label: group.name,
    }));

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                    <DialogTitle>Manage Syncable Forum Groups</DialogTitle>
                    <DialogDescription>
                        Select which forum groups should be available for syncing in features like Units & Divisions.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-24">
                            <Loader2 className="animate-spin" />
                        </div>
                    ) : error ? (
                        <Alert variant="destructive">
                            <AlertTriangle />
                            <AlertTitle>Failed to load groups</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : (
                        <MultiSelect
                            options={groupOptions}
                            onValueChange={setSelectedGroupIds}
                            defaultValue={selectedGroupIds}
                            placeholder="Select groups to sync..."
                            className="w-full"
                        />
                    )}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving || isLoading}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
