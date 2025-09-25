
'use client';

import { useState, useEffect } from 'react';
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
import { Label } from '../ui/label';
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from 'lucide-react';

interface Member {
    id: number;
    character_id: number;
    character_name: string;
    membershipId?: number;
    assignmentTitle?: string | null;
}

interface TitleEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    members: Member[];
    organizationInfo?: {
        type: 'cat_2' | 'cat_3';
        id: number;
        parentId?: number;
    };
}

export function TitleEditDialog({ open, onOpenChange, onSuccess, members, organizationInfo }: TitleEditDialogProps) {
    const { toast } = useToast();
    const [title, setTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (open && members.length === 1) {
            setTitle(members[0].assignmentTitle || '');
        } else {
            setTitle('');
        }
    }, [open, members]);

    const handleSave = async () => {
        if (!organizationInfo) return;

        const targetMembers = members.filter(member => member.membershipId);
        if (targetMembers.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'No eligible members found for updating titles.' });
            return;
        }

        if (targetMembers.length !== members.length) {
            toast({ variant: 'destructive', title: 'Error', description: 'Some selected members are missing membership data.' });
            return;
        }

        const cat2Id = organizationInfo.type === 'cat_2' ? organizationInfo.id : organizationInfo.parentId;
        if (!cat2Id) {
            toast({ variant: 'destructive', title: 'Error', description: 'Organization data is incomplete for this roster.' });
            return;
        }

        const cat1Id = organizationInfo.type === 'cat_2' ? (organizationInfo.parentId ?? 0) : 0;
        const basePath = organizationInfo.type === 'cat_2'
            ? `/api/units-divisions/${cat1Id}/${organizationInfo.id}/members`
            : `/api/units-divisions/${cat1Id}/${cat2Id}/${organizationInfo.id}/members`;

        setIsSaving(true);
        try {
            const promises = targetMembers.map(member =>
                fetch(`${basePath}/${member.membershipId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title }),
                })
            );

            const responses = await Promise.all(promises);
            const errorResponse = responses.find(res => !res.ok);
            if (errorResponse) {
                const data = await errorResponse.json();
                throw new Error(data.error || 'Failed to update one or more titles.');
            }
            
            toast({ title: 'Success', description: `Title updated for ${members.length} member(s).` });
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsSaving(false);
        }
    };

    const titleText = members.length > 1
        ? `Mass Assign Title for ${members.length} Members`
        : members.length === 1
            ? `Edit Title for ${members[0]?.character_name}`
            : 'Edit Title';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{titleText}</DialogTitle>
                    <DialogDescription>
                        Set a new assignment title. Leave blank to remove the title.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="assignment-title">New Title</Label>
                    <Input 
                        id="assignment-title" 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g., Team Leader"
                    />
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
