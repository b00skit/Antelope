
'use client';

import { useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { MoreVertical, GripVertical, Pencil, Trash2, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RosterMember } from './roster-member';
import { Checkbox } from '../ui/checkbox';

const ItemTypes = {
    MEMBER: 'member',
    SECTION: 'section',
};

// Interfaces for data types
interface Member {
    character_id: number;
    character_name: string;
    rank: number;
    rank_name: string;
    last_online: string | null;
    last_duty: string | null;
    abas?: string | null;
    assignmentTitle?: string | null;
}

interface Section {
    id: number | 'unassigned';
    name: string;
    description?: string | null;
}

interface RosterSectionProps {
    section: Section;
    members: Member[];
    allSections: Section[];
    onMoveMember: (characterId: number, sourceSectionId: number | 'unassigned', destinationSectionId: number | 'unassigned') => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onReorder?: (dragIndex: number, hoverIndex: number) => void;
    getAbasClass: (member: Member) => string;
    isUnassigned?: boolean;
    index?: number;
    showAssignmentTitles?: boolean;
    selectedMemberIds: Set<number>;
    onToggleSelection: (characterId: number) => void;
}


export function RosterSection({
    section,
    members,
    allSections,
    onMoveMember,
    onEdit,
    onDelete,
    onReorder,
    getAbasClass,
    isUnassigned = false,
    index,
    showAssignmentTitles = false,
    selectedMemberIds,
    onToggleSelection
}: RosterSectionProps) {
    const ref = useRef<HTMLDivElement>(null);

    const [, drop] = useDrop({
        accept: ItemTypes.MEMBER,
        drop: (item: { characterId: number, sourceSectionId: number | 'unassigned' }) => {
            onMoveMember(item.characterId, item.sourceSectionId, section.id);
        },
    });
    
    const [{ isDragging }, drag, preview] = useDrag({
        type: ItemTypes.SECTION,
        item: { index },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
        canDrag: !isUnassigned,
    });
    
    const [, dropReorder] = useDrop({
        accept: ItemTypes.SECTION,
        hover: (item: { index: number }) => {
            if (!ref.current || item.index === index || typeof index === 'undefined' || !onReorder) return;
            onReorder(item.index, index);
            item.index = index;
        },
    });

    drag(dropReorder(ref));

    const selectedInSection = members.filter(m => selectedMemberIds.has(m.character_id)).length;
    const isAllSelected = members.length > 0 && selectedInSection === members.length;
    const isPartiallySelected = selectedInSection > 0 && selectedInSection < members.length;

    const handleSelectAll = () => {
        const memberIds = members.map(m => m.character_id);
        if (isAllSelected) {
            memberIds.forEach(id => {
                if(selectedMemberIds.has(id)) onToggleSelection(id);
            });
        } else {
            memberIds.forEach(id => {
                if(!selectedMemberIds.has(id)) onToggleSelection(id);
            });
        }
    }


    return (
        <div ref={preview} style={{ opacity: isDragging ? 0.5 : 1 }}>
        <Card ref={drop}>
            <CardHeader className="flex flex-row items-start justify-between">
                <div className="flex items-center gap-2">
                    {!isUnassigned && (
                        <div ref={ref} className="cursor-move touch-none">
                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                        </div>
                    )}
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            {section.name}
                            <Badge variant="secondary">{members.length}</Badge>
                        </CardTitle>
                        {section.description && <CardDescription>{section.description}</CardDescription>}
                    </div>
                </div>
                {!isUnassigned && onEdit && onDelete && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={onEdit}><Pencil className="mr-2" /> Edit</DropdownMenuItem>
                            <DropdownMenuItem onSelect={onDelete} className="text-destructive"><Trash2 className="mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </CardHeader>
            <CardContent>
                {members.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">
                                     <Checkbox
                                        checked={isAllSelected || isPartiallySelected}
                                        onCheckedChange={handleSelectAll}
                                        aria-label="Select all members in this section"
                                        data-state={isPartiallySelected ? 'indeterminate' : isAllSelected ? 'checked' : 'unchecked'}
                                    />
                                </TableHead>
                                <TableHead className="w-1/3">Name</TableHead>
                                <TableHead>Rank</TableHead>
                                {showAssignmentTitles && <TableHead>Assignment Title</TableHead>}
                                <TableHead>Last On Duty</TableHead>
                                <TableHead>ABAS</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.map(member => (
                                <RosterMember
                                    key={member.character_id}
                                    member={member}
                                    sourceSectionId={section.id}
                                    allSections={allSections}
                                    onMoveMember={onMoveMember}
                                    abasClass={getAbasClass(member)}
                                    showAssignmentTitles={showAssignmentTitles}
                                    isSelected={selectedMemberIds.has(member.character_id)}
                                    onToggleSelection={onToggleSelection}
                                />
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="text-center py-8 text-muted-foreground">
                        <User className="mx-auto h-8 w-8 mb-2" />
                        <p>No members in this section.</p>
                    </div>
                )}
            </CardContent>
        </Card>
        </div>
    );
}
