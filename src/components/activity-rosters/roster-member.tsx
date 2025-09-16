
'use client';

import { useDrag } from 'react-dnd';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Checkbox } from '../ui/checkbox';
import { MoreVertical, Move } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';

const ItemTypes = {
    MEMBER: 'member',
};

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
}

interface RosterMemberProps {
    member: Member;
    sourceSectionId: number | 'unassigned';
    allSections: Section[];
    onMoveMember: (characterId: number, sourceSectionId: number | 'unassigned', destinationSectionId: number | 'unassigned') => void;
    abasClass?: string;
    showAssignmentTitles: boolean;
    isSelected: boolean;
    onToggleSelection: (characterId: number) => void;
}

const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return <Badge variant="secondary">Never</Badge>;
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return <Badge variant="destructive">Invalid</Badge>;
    return `${formatDistanceToNow(date)} ago`;
};

export function RosterMember({ member, sourceSectionId, allSections, onMoveMember, abasClass, showAssignmentTitles, isSelected, onToggleSelection }: RosterMemberProps) {
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.MEMBER,
        item: { characterId: member.character_id, sourceSectionId },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    return (
        <TableRow ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }} className="cursor-move" data-state={isSelected ? 'selected' : undefined}>
             <TableCell>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelection(member.character_id)}
                    aria-label={`Select ${member.character_name}`}
                />
            </TableCell>
            <TableCell>
                <Link href={`/character-sheets/${member.character_name.replace(/ /g, '_')}`} className="hover:underline text-primary">
                    {member.character_name}
                </Link>
            </TableCell>
            <TableCell>{member.rank_name}</TableCell>
            {showAssignmentTitles && (
                <TableCell>{member.assignmentTitle || <span className="text-muted-foreground/50">N/A</span>}</TableCell>
            )}
            <TableCell>{formatTimestamp(member.last_duty)}</TableCell>
            <TableCell className={abasClass}>{member.abas ?? 'N/A'}</TableCell>
            <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger>
                                <Move className="mr-2" /> Move To
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent>
                                {allSections.filter(s => s.id !== sourceSectionId).map(section => (
                                    <DropdownMenuItem key={section.id} onSelect={() => onMoveMember(member.character_id, sourceSectionId, section.id)}>
                                        {section.name}
                                    </DropdownMenuItem>
                                ))}
                                {sourceSectionId !== 'unassigned' && (
                                     <DropdownMenuItem onSelect={() => onMoveMember(member.character_id, sourceSectionId, 'unassigned')}>
                                        Unassigned
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
}
