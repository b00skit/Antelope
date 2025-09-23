
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
import { Textarea } from '../ui/textarea';
import { useState, useEffect } from 'react';

interface Section {
    id: number | 'unassigned';
    name: string;
    description: string | null;
}

interface SectionDialogProps {
    open: boolean;
    onClose: () => void;
    onSave: (name: string, description: string) => void;
    section?: Section | null;
}

export function SectionDialog({
    open,
    onClose,
    onSave,
    section,
}: SectionDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (open) {
            setName(section?.name || '');
            setDescription(section?.description || '');
        }
    }, [section, open]);

    const handleSave = () => {
        onSave(name, description);
    };
    
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{section ? 'Edit Section' : 'Create Section'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="section-name">Name</Label>
                        <Input id="section-name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="section-description">Description (Optional)</Label>
                        <Textarea id="section-description" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
