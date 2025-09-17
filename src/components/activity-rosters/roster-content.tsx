
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, PlusCircle, MoreVertical, Pencil, Trash2, Filter, Loader2, Move, Tag } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Badge } from '../ui/badge';

// Interfaces matching the API response
interface Member {
    character_id: number;
    character_name: string;
    rank: number;
    rank_name: string;
    last_online: string | null;
    last_duty: string | null;
    abas?: string | null;
    assignmentTitle?: string | null;
    label?: string | null;
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
    id: number | 'unassigned';
    name: string;
    description: string | null;
    character_ids_json: number[];
    order: number;
    configuration_json: SectionConfig | null;
}

interface RosterConfig {
    labels?: Record<string, string>;
    [key: string]: any;
}

interface RosterData {
    roster: { id: number; name: string };
    faction: { id: number; name: string; supervisor_rank: number; minimum_abas: number; minimum_supervisor_abas: number; };
    members: Member[];
    missingForumUsers: string[];
    sections: Section[];
    rosterConfig: RosterConfig;
}

interface RosterContentProps {
    initialData: RosterData;
    rosterId: number;
    readOnly?: boolean;
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
    onSave: (name: string, description: string, config: SectionConfig | null) => void;
    section?: Section | null;
}) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [configJson, setConfigJson] = useState('');
    const [jsonError, setJsonError] = useState<string | null>(null);

    React.useEffect(() => {
        if (isOpen) {
            setName(section?.name || '');
            setDescription(section?.description || '');
            setConfigJson(section?.configuration_json ? JSON.stringify(section.configuration_json, null, 2) : '');
            setJsonError(null);
        }
    }, [section, isOpen]);

    const handleSave = () => {
        let finalConfig: SectionConfig | null = null;
        if (configJson) {
            try {
                finalConfig = JSON.parse(configJson);
                setJsonError(null);
            } catch (e) {
                setJsonError('Invalid JSON format.');
                return;
            }
        }
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
                    <div className="space-y-2">
                        <Label htmlFor="section-config">Auto-Filter Rules (JSON, Optional)</Label>
                        <Textarea
                            id="section-config"
                            value={configJson}
                            onChange={(e) => setConfigJson(e.target.value)}
                            placeholder='{ "include_ranks": [1, 5], "exclude_names": ["Some_Name"] }'
                            className="font-mono h-32"
                        />
                        {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}
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


// Main Roster Content Component
export function RosterContent({ initialData, rosterId, readOnly = false }: RosterContentProps) {
    const [sections, setSections] = useState<Section[]>((initialData.sections || []).sort((a,b) => a.order - b.order));
    const [members, setMembers] = useState<Member[]>(initialData.members);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingSection, setEditingSection] = useState<Section | null>(null);
    const [isFiltering, setIsFiltering] = useState(false);
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<number>>(new Set());
    const [labelFilter, setLabelFilter] = useState<string | null>(null);
    const { toast } = useToast();

    const assignedMemberIds = new Set(sections.flatMap(s => s.character_ids_json));
    const filteredMembers = React.useMemo(() => {
        return labelFilter ? members.filter(m => m.label === labelFilter) : members;
    }, [members, labelFilter]);

    const unassignedMembers = filteredMembers.filter(m => !assignedMemberIds.has(m.character_id));
    
    const showAssignmentTitles = React.useMemo(() => {
        try {
            return initialData.members.some(m => m.assignmentTitle);
        } catch {
            return false;
        }
    }, [initialData.members]);

    const getAbasClass = (member: Member): string => {
        const abasValue = parseFloat(member.abas || '0');
        const rosterStandards = initialData.rosterConfig?.abas_standards || {};

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
    const handleAddOrUpdateSection = async (name: string, description: string, config: SectionConfig | null) => {
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

                const memberName = member.character_name;
                const memberSlug = memberName.replace(/ /g, '_');

                const nameMatch = config.include_names?.some(n => n === memberName || n === memberSlug);
                const rankMatch = config.include_ranks?.includes(member.rank);
                
                const shouldBeIncluded = nameMatch || rankMatch;

                if (shouldBeIncluded) {
                    const isExcluded = config.exclude_names?.some(n => n === memberName || n === memberSlug);
                    if (!isExcluded) {
                        section.character_ids_json.push(member.character_id);
                        assignedMemberIds.add(member.character_id);
                        assigned = true;
                        break;
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

    const handleBulkMove = async (destinationSectionId: number | 'unassigned') => {
        const characterIds = Array.from(selectedMemberIds);
        try {
            const res = await fetch(`/api/rosters/${rosterId}/sections/bulk-move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterIds, destinationSectionId }),
            });
            if (!res.ok) throw new Error('Bulk move failed.');
            toast({ title: 'Success', description: `${characterIds.length} members moved.`});
            
            // Manually update state for responsiveness
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

    const handleSetLabel = async (characterId: number, color: string | null) => {
        const originalMembers = [...members];
        setMembers(prev => prev.map(m => m.character_id === characterId ? { ...m, label: color } : m));

        try {
            const res = await fetch(`/api/rosters/${rosterId}/label`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId, color }),
            });
            if (!res.ok) throw new Error('Failed to set label.');
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
            setMembers(originalMembers);
        }
    };
    
    const handleBulkSetLabel = async (color: string | null) => {
        const characterIds = Array.from(selectedMemberIds);
        const originalMembers = [...members];
        setMembers(prev => prev.map(m => characterIds.includes(m.character_id) ? { ...m, label: color } : m));
        setSelectedMemberIds(new Set());

        try {
            const res = await fetch(`/api/rosters/${rosterId}/bulk-label`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterIds, color }),
            });
             if (!res.ok) throw new Error('Failed to set labels.');
             toast({ title: 'Success', description: `Labels updated for ${characterIds.length} members.`});
        } catch (err: any) {
             toast({ variant: 'destructive', title: 'Error', description: err.message });
             setMembers(originalMembers);
        }
    }

    const labels = initialData.rosterConfig?.labels || {};
    
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
                
                <div className="space-y-4">
                    {!readOnly && (
                        <div className="flex flex-wrap gap-2 items-center">
                            <Button variant="outline" onClick={() => { setEditingSection(null); setIsDialogOpen(true); }}>
                                <PlusCircle />
                                Add Section
                            </Button>
                            <Button variant="secondary" onClick={handleAutoFilter} disabled={isFiltering}>
                                {isFiltering ? <Loader2 className="animate-spin" /> : <Filter />}
                                Auto-Filter Roster
                            </Button>
                        </div>
                    )}
                     {Object.keys(labels).length > 0 && (
                        <div className="flex items-center gap-2 flex-wrap">
                             <Badge variant={!labelFilter ? 'default' : 'secondary'} className="cursor-pointer" onClick={() => setLabelFilter(null)}>All</Badge>
                            {Object.entries(labels).map(([color, title]) => (
                                <Badge
                                    key={color}
                                    variant={labelFilter === color ? 'default' : 'secondary'}
                                    className="cursor-pointer"
                                    onClick={() => setLabelFilter(labelFilter === color ? null : color)}
                                >
                                    <span className={cn('mr-2 h-2 w-2 rounded-full', `bg-${color}-500`)} />
                                    {title}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>


                {sections.map((section, index) => {
                    const sectionMembers = filteredMembers.filter(m => section.character_ids_json.includes(m.character_id));
                    return (
                        <RosterSection
                            key={section.id}
                            index={index}
                            section={section}
                            members={sectionMembers}
                            allSections={sections}
                            onMoveMember={handleMoveMember}
                            onEdit={() => { setEditingSection(section); setIsDialogOpen(true); }}
                            onDelete={() => handleDeleteSection(section.id as number)}
                            onReorder={handleReorderSections}
                            getAbasClass={getAbasClass}
                            showAssignmentTitles={showAssignmentTitles}
                            selectedMemberIds={selectedMemberIds}
                            onToggleSelection={onToggleSelection}
                            labels={labels}
                            onSetLabel={handleSetLabel}
                            readOnly={readOnly}
                        />
                    );
                })}

                <RosterSection
                    section={{ id: 'unassigned', name: 'Unassigned', description: 'Members not assigned to a section.', order: 999, character_ids_json: [], configuration_json: null }}
                    members={unassignedMembers}
                    allSections={sections}
                    onMoveMember={handleMoveMember}
                    isUnassigned
                    getAbasClass={getAbasClass}
                    showAssignmentTitles={showAssignmentTitles}
                    selectedMemberIds={selectedMemberIds}
                    onToggleSelection={onToggleSelection}
                    labels={labels}
                    onSetLabel={handleSetLabel}
                    readOnly={readOnly}
                />
            </div>
             <SectionDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={handleAddOrUpdateSection}
                section={editingSection}
            />
            <AnimatePresence>
                {!readOnly && selectedMemberIds.size > 0 && (
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline">
                                    <Tag className="mr-2 h-4 w-4" />
                                    Set Label
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                                {Object.entries(labels).map(([color, title]) => (
                                    <DropdownMenuItem key={color} onSelect={() => handleBulkSetLabel(color)}>
                                        <span className={cn('mr-2 h-2 w-2 rounded-full', `bg-${color}-500`)} />
                                        {title}
                                    </DropdownMenuItem>
                                ))}
                                <DropdownMenuSeparator />
                                 <DropdownMenuItem onSelect={() => handleBulkSetLabel(null)}>
                                    Clear Label
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                         </DropdownMenu>
                    </motion.div>
                )}
            </AnimatePresence>
        </DndProvider>
    );
}
