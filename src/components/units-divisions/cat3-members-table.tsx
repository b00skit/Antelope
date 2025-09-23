
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, Loader2, Move } from "lucide-react";
import { Combobox } from '../ui/combobox';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { TransferMemberDialog } from './transfer-member-dialog';
import { SectionDialog } from './section-dialog';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { RosterSection } from '@/components/activity-rosters/roster-section';
import { motion, AnimatePresence } from 'framer-motion';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '../ui/dropdown-menu';


interface Member {
    id: number;
    character_id: number;
    character_name: string;
    rank_name: string;
    title: string | null;
    created_at: string;
    creator: {
        username: string;
    }
}

interface Section {
    id: number | 'unassigned';
    name: string;
    description: string | null;
    character_ids_json: number[];
    order: number;
}


interface Cat3MembersTableProps {
    members: Member[];
    sections: Section[];
    allFactionMembers: any[];
    allAssignedCharacterIds: number[];
    canManage: boolean;
    cat1Id: number;
    cat2Id: number;
    cat3Id: number;
    onDataChange: () => void;
    allUnitsAndDetails: { label: string; value: string; type: 'cat_2' | 'cat_3' }[];
    forumGroupId?: number | null;
    isSecondary: boolean;
}

export function Cat3MembersTable({ members, sections: initialSections = [], allFactionMembers, allAssignedCharacterIds, canManage, cat1Id, cat2Id, cat3Id, onDataChange, allUnitsAndDetails, forumGroupId, isSecondary }: Cat3MembersTableProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
    const [newTitle, setNewTitle] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [transferringMember, setTransferringMember] = useState<Member | null>(null);
    const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
    const [sections, setSections] = useState<Section[]>(initialSections.sort((a,b) => a.order - b.order));
    const [isSectionDialogOpen, setIsSectionDialogOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<Section | null>(null);
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(new Set());
    const { toast } = useToast();

    const assignedMemberIds = new Set(sections.flatMap(s => s.character_ids_json));
    const unassignedMembers = members.filter(m => !assignedMemberIds.has(m.character_id));

    const currentMemberIds = new Set(members.map(m => m.character_id));
    const assignedIds = new Set(allAssignedCharacterIds);
    const characterOptions = allFactionMembers
        .filter(fm => {
            if (isSecondary) return !currentMemberIds.has(fm.character_id);
            return !assignedIds.has(fm.character_id) || currentMemberIds.has(fm.character_id);
        })
        .map(fm => fm.character_name);
        


    const handleAddMember = async () => {
        if (!selectedCharacterId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a character.' });
            return;
        }
        setIsSubmitting(true);
        try {
            const character = allFactionMembers.find(fm => fm.character_name === selectedCharacterId);
            const res = await fetch(`/api/units-divisions/${cat1Id}/${cat2Id}/${cat3Id}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ character_id: character.character_id, title: newTitle }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            toast({ title: 'Success', description: 'Member added.' });
            onDataChange();
            setIsAdding(false);
            setSelectedCharacterId('');
            setNewTitle('');
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsSubmitting(false);
        }
    }
    
     const handleUpdateTitle = async (membershipId: number, title: string | null) => {
        setIsSubmitting(true);
         try {
            const res = await fetch(`/api/units-divisions/${cat1Id}/${cat2Id}/${cat3Id}/members/${membershipId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            toast({ title: 'Success', description: 'Title updated.' });
            onDataChange();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handleDelete = async (membershipId: number) => {
        try {
            const res = await fetch(`/api/units-divisions/${cat1Id}/${cat2Id}/${cat3Id}/members/${membershipId}`, { method: 'DELETE' });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            toast({ title: 'Success', description: 'Member removed.' });
            onDataChange();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        }
    }

    const handleOpenTransferDialog = (member: Member) => {
        setTransferringMember(member);
        setIsTransferDialogOpen(true);
    }
    
    // Section Handlers
    const handleAddOrUpdateSection = async (name: string, description: string) => {
        const url = editingSection ? `/api/units-divisions/${cat1Id}/${cat2Id}/${cat3Id}/sections/${editingSection.id}` : `/api/units-divisions/${cat1Id}/${cat2Id}/${cat3Id}/sections`;
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
                setSections(prev => prev.map(s => s.id === editingSection.id ? { ...s, name, description } : s));
            } else {
                setSections(prev => [...prev, { ...data.section, character_ids_json: [] }]);
            }
            toast({ title: 'Success', description: `Section ${editingSection ? 'updated' : 'created'}.` });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsSectionDialogOpen(false);
            setEditingSection(null);
        }
    };
    
    const handleDeleteSection = async (sectionId: number) => {
        if (!confirm('Are you sure? Members will be moved to Unassigned.')) return;
        try {
            const res = await fetch(`/api/units-divisions/${cat1Id}/${cat2Id}/${cat3Id}/sections/${sectionId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json()).error);
            setSections(prev => prev.filter(s => s.id !== sectionId));
            toast({ title: 'Success', description: 'Section deleted.' });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        }
    };

     const handleMoveMember = async (characterId: number, sourceSectionId: number | 'unassigned', destinationSectionId: number | 'unassigned') => {
        if (sourceSectionId === destinationSectionId) return;

        const originalSections = JSON.parse(JSON.stringify(sections));
        const newSections = sections.map(s => {
            let sectionCopy = { ...s, character_ids_json: [...s.character_ids_json] };
            if (s.id === sourceSectionId) {
                sectionCopy.character_ids_json = sectionCopy.character_ids_json.filter(id => id !== characterId);
            }
            if (s.id === destinationSectionId) {
                if (!sectionCopy.character_ids_json.includes(characterId)) {
                    sectionCopy.character_ids_json.push(characterId);
                }
            }
            return sectionCopy;
        });
        setSections(newSections);

        try {
            await fetch(`/api/units-divisions/${cat1Id}/${cat2Id}/${cat3Id}/sections/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId, sourceSectionId, destinationSectionId }),
            });
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Move Failed', description: err.message });
            setSections(originalSections);
        }
    };
    
    const handleReorderSections = async (dragIndex: number, hoverIndex: number) => {
        const draggedSection = sections[dragIndex];
        const newSections = [...sections];
        newSections.splice(dragIndex, 1);
        newSections.splice(hoverIndex, 0, draggedSection);
        
        const orderedIds = newSections.map(s => s.id);
        setSections(newSections);

        try {
            await fetch(`/api/units-divisions/${cat1Id}/${cat2Id}/${cat3Id}/sections/reorder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderedSectionIds: orderedIds }),
            });
        } catch(err: any) {
            toast({ variant: 'destructive', title: 'Error', description: 'Failed to save new order.' });
            setSections(sections);
        }
    };
    
     const handleToggleSelection = (characterId: number) => {
        setSelectedMemberIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(characterId)) {
                newSet.delete(characterId);
            } else {
                newSet.add(characterId);
            }
            return newSet;
        });
    };

    const handleSelectAllInSection = (section: Section | 'unassigned', isSelected: boolean) => {
        const membersInSection = section === 'unassigned' ? unassignedMembers : members.filter(m => section.character_ids_json.includes(m.character_id));
        const memberIds = membersInSection.map(m => m.character_id);

        setSelectedMemberIds(prev => {
            const newSet = new Set(prev);
            if (isSelected) {
                memberIds.forEach(id => newSet.add(id));
            } else {
                memberIds.forEach(id => newSet.delete(id));
            }
            return newSet;
        });
    };
    
     const handleBulkMove = async (destinationSectionId: number | 'unassigned') => {
        const characterIds = Array.from(selectedMemberIds);
        try {
            const res = await fetch(`/api/units-divisions/cat3/${cat3Id}/sections/bulk-move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterIds, destinationSectionId }),
            });
            if (!res.ok) throw new Error('Bulk move failed.');
            toast({ title: 'Success', description: `${characterIds.length} members moved.`});
            
            const newSections = sections.map(s => {
                let ids = (s.character_ids_json || []).filter(id => !characterIds.includes(id));
                if (s.id === destinationSectionId) {
                    ids = [...new Set([...ids, ...characterIds])];
                }
                return { ...s, character_ids_json: ids };
            });
            setSections(newSections);
            setSelectedMemberIds(new Set());
        } catch(err: any) {
             toast({ variant: 'destructive', title: 'Error', description: err.message });
        }
    };


    return (
        <DndProvider backend={HTML5Backend}>
            <TransferMemberDialog
                open={isTransferDialogOpen}
                onOpenChange={setIsTransferDialogOpen}
                onSuccess={onDataChange}
                member={transferringMember}
                sourceCat2Id={cat2Id}
                allUnitsAndDetails={allUnitsAndDetails.filter(
                    opt => !(opt.type === 'cat_3' && opt.value === cat3Id.toString())
                )}
            />
            <SectionDialog
                open={isSectionDialogOpen}
                onClose={() => setIsSectionDialogOpen(false)}
                onSave={handleAddOrUpdateSection}
                section={editingSection}
            />
             <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Member Roster</CardTitle>
                            <CardDescription>A list of all members assigned to this detail.</CardDescription>
                        </div>
                        {canManage && (
                           <div className="flex gap-2">
                                <Button variant="outline" onClick={() => { setEditingSection(null); setIsSectionDialogOpen(true); }}>
                                    <PlusCircle className="mr-2" />
                                    Add Section
                                </Button>
                                <Button onClick={() => setIsAdding(!isAdding)}>
                                    <PlusCircle className="mr-2" />
                                    {isAdding ? 'Cancel' : 'Add Member'}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {isAdding && (
                        <div className="p-4 border rounded-md flex flex-col sm:flex-row gap-4 items-end">
                            <div className="flex-1 w-full">
                                <label className="text-sm font-medium">Character</label>
                                <Combobox options={characterOptions} value={selectedCharacterId} onChange={setSelectedCharacterId} placeholder="Select a character..." />
                            </div>
                            <div className="flex-1 w-full">
                                <label className="text-sm font-medium">Title (Optional)</label>
                                <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g., Senior Deputy" />
                            </div>
                            <Button onClick={handleAddMember} disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm
                            </Button>
                        </div>
                    )}
                    
                    {sections.map((section, index) => (
                        <RosterSection
                            key={section.id}
                            index={index}
                            section={section}
                            members={members.filter(m => section.character_ids_json.includes(m.character_id))}
                            allSections={sections}
                            onMoveMember={handleMoveMember}
                            onEdit={() => { setEditingSection(section); setIsSectionDialogOpen(true); }}
                            onDelete={() => handleDeleteSection(section.id as number)}
                            onReorder={handleReorderSections}
                            onUpdateTitle={handleUpdateTitle}
                            onRemoveMember={handleDelete}
                            onTransferMember={handleOpenTransferDialog}
                            canManage={canManage}
                            selectedMemberIds={selectedMemberIds}
                            onToggleSelection={handleToggleSelection}
                            onSelectAll={handleSelectAllInSection}
                            isSecondary={isSecondary}
                        />
                    ))}

                     <RosterSection
                        section={{ id: 'unassigned', name: 'Unassigned', description: null, order: 999, character_ids_json: [] }}
                        members={unassignedMembers}
                        allSections={sections}
                        onMoveMember={handleMoveMember}
                        onUpdateTitle={handleUpdateTitle}
                        onRemoveMember={handleDelete}
                        onTransferMember={handleOpenTransferDialog}
                        canManage={canManage}
                        isUnassigned
                        selectedMemberIds={selectedMemberIds}
                        onToggleSelection={handleToggleSelection}
                        onSelectAll={handleSelectAllInSection}
                        isSecondary={isSecondary}
                    />

                </CardContent>
            </Card>
             <AnimatePresence>
                {canManage && selectedMemberIds.size > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                        className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto bg-card border shadow-lg rounded-lg p-2 flex items-center gap-4 z-50"
                    >
                         <p className="text-sm font-medium">{selectedMemberIds.size} selected</p>
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button>
                                    <Move className="mr-2 h-4 w-4" />
                                    Move Selected To...
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {sections.map(s => (
                                    <DropdownMenuItem key={s.id} onSelect={() => handleBulkMove(s.id as number)}>
                                        {s.name}
                                    </DropdownMenuItem>
                                ))}
                                 <DropdownMenuItem onSelect={() => handleBulkMove('unassigned')}>
                                    Unassigned
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                         </DropdownMenu>
                    </motion.div>
                )}
            </AnimatePresence>
        </DndProvider>
    )
}
