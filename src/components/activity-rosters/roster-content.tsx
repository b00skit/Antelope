

'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, PlusCircle, MoreVertical, Pencil, Trash2, Filter, Loader2 } from 'lucide-react';
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
    // Added for forum integration
    forum_groups?: number[];
}

interface SectionConfig {
    include_names?: string[];
    include_ranks?: number[];
    include_forum_groups?: number[];
    exclude_names?: string[];
}
interface Section {
    id: number;
    name: string;
    description: string | null;
    character_ids_json: number[];
    order: number;
    configuration_json: SectionConfig | null;
}

interface RosterData {
    roster: { id: number; name: string };
    faction: { id: number; name: string; supervisor_rank: number; minimum_abas: number; minimum_supervisor_abas: number; };
    members: Member[];
    missingForumUsers: string[];
    sections: Section[];
    rosterAbasStandards: any;
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
    onSave: (name: string, description: string, config: SectionConfig) => void;
    section?: Section | null;
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    
    // State to hold the raw string input from the user
    const [rawConfig, setRawConfig] = useState({
        include_names: '',
        include_ranks: '',
        include_forum_groups: '',
        exclude_names: '',
    });

    React.useEffect(() => {
        if (isOpen) {
            setName(section?.name || '');
            setDescription(section?.description || '');
            const config = section?.configuration_json || {};
            // Populate raw string state for editing
            setRawConfig({
                include_names: (config.include_names || []).map(n => n.replace(/_/g, ' ')).join('\n'),
                include_ranks: (config.include_ranks || []).join('\n'),
                include_forum_groups: (config.include_forum_groups || []).join('\n'),
                exclude_names: (config.exclude_names || []).map(n => n.replace(/_/g, ' ')).join('\n'),
            });
        }
    }, [section, isOpen]);

    const handleRawConfigChange = (key: keyof typeof rawConfig, value: string) => {
        setRawConfig(prev => ({ ...prev, [key]: value }));
    };
    
    const handleSave = () => {
        // Parse the raw strings into the final config object ONLY on save
        const finalConfig: SectionConfig = {};

        const parseNumericArray = (str: string) => str.split(/[\s,]+/).map(item => parseInt(item.trim(), 10)).filter(n => !isNaN(n));
        const parseNameArray = (str: string) => str.split(/[\s,]+/).map(item => item.trim().replace(/ /g, '_')).filter(Boolean);

        if (rawConfig.include_names) finalConfig.include_names = parseNameArray(rawConfig.include_names);
        if (rawConfig.include_ranks) finalConfig.include_ranks = parseNumericArray(rawConfig.include_ranks);
        if (rawConfig.include_forum_groups) finalConfig.include_forum_groups = parseNumericArray(rawConfig.include_forum_groups);
        if (rawConfig.exclude_names) finalConfig.exclude_names = parseNameArray(rawConfig.exclude_names);

        onSave(name, description, finalConfig);
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{section ? 'Edit Section' : 'Create Section'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="space-y-2">
                        <Label htmlFor="section-name">Name</Label>
                        <Input id="section-name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="section-description">Description (Optional)</Label>
                        <Textarea id="section-description" value={description} onChange={(e) => setDescription(e.target.value)} />
                    </div>
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Auto-Filter Rules (Optional)</CardTitle>
                            <CardDescription className="text-xs">Define rules to automatically assign members. Separate multiple values with commas, spaces, or new lines.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="space-y-2">
                                <Label>Include Names</Label>
                                <Textarea value={rawConfig.include_names} onChange={e => handleRawConfigChange('include_names', e.target.value)} placeholder="E.g. John Doe, Jane Smith" />
                            </div>
                            <div className="space-y-2">
                                <Label>Include Ranks</Label>
                                <Textarea value={rawConfig.include_ranks} onChange={e => handleRawConfigChange('include_ranks', e.target.value)} placeholder="E.g. 1, 5, 10" />
                            </div>
                            <div className="space-y-2">
                                <Label>Include Forum Groups</Label>
                                <Textarea value={rawConfig.include_forum_groups} onChange={e => handleRawConfigChange('include_forum_groups', e.target.value)} placeholder="E.g. 25, 30" />
                            </div>
                             <div className="space-y-2">
                                <Label>Exclude Names</Label>
                                <Textarea value={rawConfig.exclude_names} onChange={e => handleRawConfigChange('exclude_names', e.target.value)} placeholder="E.g. Peter Jones" />
                                <p className="text-xs text-muted-foreground">Only applies if ranks or forum groups are included.</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSave}>Save</Button>
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
    const [isFiltering, setIsFiltering] = useState(false);
    const { toast } = useToast();

    const assignedMemberIds = new Set(sections.flatMap(s => s.character_ids_json));
    const unassignedMembers = members.filter(m => !assignedMemberIds.has(m.character_id));

    const getAbasClass = (member: Member): string => {
        const abasValue = parseFloat(member.abas || '0');
        const rosterStandards = initialData.rosterAbasStandards || {};

        if (rosterStandards.by_name && rosterStandards.by_name[member.character_name] !== undefined) {
            if (abasValue < rosterStandards.by_name[member.character_name]) return "text-red-500 font-bold";
        } else if (rosterStandards.by_rank && rosterStandards.by_rank[member.rank] !== undefined) {
            if (abasValue < rosterStandards.by_rank[member.rank]) return "text-red-500 font-bold";
        } else {
            const isSupervisor = member.rank >= initialData.faction.supervisor_rank;
            const requiredAbas = isSupervisor ? initialData.faction.minimum_supervisor_abas : initialData.faction.minimum_abas;
            if (requiredAbas > 0 && abasValue < requiredAbas) {
                return "text-red-500 font-bold";
            }
        }
        return "";
    };

    // API Handlers
    const handleAddOrUpdateSection = async (name: string, description: string, config: SectionConfig) => {
        const url = editingSection
            ? `/api/rosters/${rosterId}/sections/${editingSection.id}`
            : `/api/rosters/${rosterId}/sections`;
        const method = editingSection ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, configuration_json: config }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            const newSection: Section = { 
                ...data.section, 
                character_ids_json: data.section.character_ids_json || [],
                configuration_json: data.section.configuration_json || null,
            };

            if (editingSection) {
                setSections(prev => prev.map(s => s.id === editingSection.id ? newSection : s));
            } else {
                setSections(prev => [...prev, newSection]);
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
    
    const handleAutoFilter = async () => {
        setIsFiltering(true);
        
        const assignedMemberIds = new Set<number>();
        const newSections = sections.map(section => ({
            ...section,
            character_ids_json: [] as number[],
        }));

        const sectionsWithConfig = newSections.filter(s => s.configuration_json && Object.keys(s.configuration_json).length > 0);

        for (const member of members) {
            let assigned = false;
            for (const section of sectionsWithConfig) {
                const config = section.configuration_json!;
                
                const memberName = member.character_name.replace(/ /g, '_');
                
                const nameMatch = config.include_names?.includes(memberName);
                const rankMatch = config.include_ranks?.includes(member.rank);
                // const forumMatch = member.forum_groups && config.include_forum_groups?.some(fg => member.forum_groups!.includes(fg));

                const shouldBeIncluded = nameMatch || rankMatch; // || forumMatch;

                if (shouldBeIncluded) {
                    const isExcluded = config.exclude_names?.includes(memberName);
                    if (!isExcluded) {
                        section.character_ids_json.push(member.character_id);
                        assignedMemberIds.add(member.character_id);
                        assigned = true;
                        break; // Member is assigned, move to the next member
                    }
                }
            }
        }
        
        try {
            const res = await fetch(`/api/rosters/${rosterId}/sections/bulk-update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sections: newSections.map(s => ({ id: s.id, character_ids_json: s.character_ids_json })) }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save filtered sections.');
            }
            
            setSections(newSections);
            toast({ title: 'Success', description: 'Roster has been auto-filtered.' });
        } catch (err: any) {
             toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsFiltering(false);
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
                
                <div className="flex gap-2">
                     <Button variant="outline" onClick={() => { setEditingSection(null); setIsDialogOpen(true); }}>
                        <PlusCircle />
                        Add Section
                    </Button>
                     <Button variant="secondary" onClick={handleAutoFilter} disabled={isFiltering}>
                        {isFiltering ? <Loader2 className="animate-spin" /> : <Filter />}
                        Auto-Filter Roster
                    </Button>
                </div>

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
                            onDelete={() => handleDeleteSection(section.id)}
                            onReorder={handleReorderSections}
                            getAbasClass={getAbasClass}
                        />
                    );
                })}

                <RosterSection
                    section={{ id: 'unassigned', name: 'Unassigned', description: 'Members not assigned to a section.' }}
                    members={unassignedMembers}
                    onMoveMember={handleMoveMember}
                    isUnassigned
                    getAbasClass={getAbasClass}
                />
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
