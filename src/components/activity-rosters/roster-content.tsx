
'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, PlusCircle, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { RosterSection } from './roster-section';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '../ui/skeleton';
import * as React from 'react';

// Interfaces matching the API response
interface Member {
    character_id: number;
    character_name: string;
    rank: number;
    rank_name: string;
    last_online: string | null;
    last_duty: string | null;
    abas?: string | null;
}

interface Section {
    id: number;
    name: string;
    description: string | null;
    character_ids_json: number[];
    order: number;
}

interface RosterData {
    roster: { id: number; name: string };
    faction: { id: number; name: string };
    members: Member[];
    missingForumUsers: string[];
    sections: Section[];
}

interface RosterContentProps {
    initialData: RosterData;
    rosterId: number;
}

// Dialog for creating/editing sections
const SectionDialog = ({
    isOpen,
    onClose,
    onSave,
    section,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (name: string, description: string) => void;
    section?: Section | null;
}) => {
    const [name, setName] = useState(section?.name || '');
    const [description, setDescription] = useState(section?.description || '');

    React.useEffect(() => {
        setName(section?.name || '');
        setDescription(section?.description || '');
    }, [section]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{section ? 'Edit Section' : 'Create Section'}</DialogTitle>
                    <DialogDescription>
                        {section ? 'Update the details for this section.' : 'Create a new section to organize your roster.'}
                    </DialogDescription>
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
                    <Button onClick={() => onSave(name, description)}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};


// Main Roster Content Component
export function RosterContent({ initialData, rosterId }: RosterContentProps) {
    const [sections, setSections] = useState<Section[]>((initialData.sections || []).sort((a,b) => a.order - b.order));
    const [members, setMembers] = useState<Member[]>(initialData.members);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<Section | null>(null);
    const { toast } = useToast();

    const assignedMemberIds = new Set(sections.flatMap(s => s.character_ids_json));
    const unassignedMembers = members.filter(m => !assignedMemberIds.has(m.character_id));

    // API Handlers
    const handleAddOrUpdateSection = async (name: string, description: string) => {
        const url = editingSection
            ? `/api/rosters/${rosterId}/sections/${editingSection.id}`
            : `/api/rosters/${rosterId}/sections`;
        const method = editingSection ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            if (editingSection) {
                setSections(prev => prev.map(s => s.id === editingSection.id ? data.section : s));
            } else {
                setSections(prev => [...prev, data.section]);
            }
            toast({ title: 'Success', description: `Section ${editingSection ? 'updated' : 'created'}.` });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsDialogOpen(false);
            setEditingSection(null);
        }
    };
    
    const handleDeleteSection = async (sectionId: number) => {
        if (!confirm('Are you sure you want to delete this section? All members will become unassigned.')) return;

        try {
            const res = await fetch(`/api/rosters/${rosterId}/sections/${sectionId}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
            setSections(prev => prev.filter(s => s.id !== sectionId));
            toast({ title: 'Success', description: 'Section deleted.' });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        }
    };
    
    const handleMoveMember = async (characterId: number, sourceSectionId: number | 'unassigned', destinationSectionId: number | 'unassigned') => {
        if (sourceSectionId === destinationSectionId) return;

        // Optimistic UI update
        const originalSections = [...sections];
        if (typeof destinationSectionId === 'number') {
            const newSections = sections.map(s => {
                if (s.id === sourceSectionId) {
                    return { ...s, character_ids_json: s.character_ids_json.filter(id => id !== characterId) };
                }
                if (s.id === destinationSectionId) {
                    return { ...s, character_ids_json: [...s.character_ids_json, characterId] };
                }
                return s;
            });
            setSections(newSections);
        }

        try {
            const res = await fetch(`/api/rosters/${rosterId}/sections/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId, sourceSectionId, destinationSectionId }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error);
            }
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Move Failed', description: err.message });
            setSections(originalSections); // Revert on error
        }
    };
    
    const handleReorderSections = async (dragIndex: number, hoverIndex: number) => {
        const draggedSection = sections[dragIndex];
        const newSections = [...sections];
        newSections.splice(dragIndex, 1);
        newSections.splice(hoverIndex, 0, draggedSection);
        
        const orderedIds = newSections.map(s => s.id);
        setSections(newSections); // Optimistic update

        try {
            const res = await fetch(`/api/rosters/${rosterId}/sections/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderedSectionIds: orderedIds }),
            });
            if (!res.ok) throw new Error('Failed to save order.');
        } catch(err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
            setSections(sections); // Revert
        }
    };

    return (
        <DndProvider backend={HTML5Backend}>
            <div className="space-y-6">
                {initialData.missingForumUsers.length > 0 && (
                     <Alert variant="warning">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Forum Sync Mismatch</AlertTitle>
                        <AlertDescription>
                            The following forum users specified in the filters could not be found in the GTA:W faction roster: {initialData.missingForumUsers.join(', ')}.
                        </AlertDescription>
                    </Alert>
                )}

                {sections.map((section, index) => {
                    const sectionMembers = members.filter(m => section.character_ids_json.includes(m.character_id));
                    return (
                        <RosterSection
                            key={section.id}
                            index={index}
                            section={section}
                            members={sectionMembers}
                            onMoveMember={handleMoveMember}
                            onEdit={() => { setEditingSection(section); setIsDialogOpen(true); }}
                            onDelete={() => handleDelete(section.id)}
                            onReorder={handleReorderSections}
                        />
                    );
                })}

                <RosterSection
                    section={{ id: 'unassigned', name: 'Unassigned', description: 'Members not yet assigned to a section.' }}
                    members={unassignedMembers}
                    onMoveMember={handleMoveMember}
                    isUnassigned
                />

                <Button variant="outline" onClick={() => { setEditingSection(null); setIsDialogOpen(true); }}>
                    <PlusCircle />
                    Add Section
                </Button>
            </div>
             <SectionDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleAddOrUpdateSection}
                section={editingSection}
            />
        </DndProvider>
    );
}
