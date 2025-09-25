
'use client';

import { useDrag } from 'react-dnd';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { Checkbox } from '../ui/checkbox';
import { MoreVertical, Move, Tag, User, UserCheck, Award } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

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
    label?: string | null;
    isPrimary?: boolean;
    isAlternative?: boolean;
    membershipId?: number;
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
    labels: Record<string, string>;
    onSetLabel?: (characterId: number, color: string | null) => void;
    onEditTitle?: (member: Member) => void;
    readOnly?: boolean;
    markAlts?: boolean;
    isOrganizational?: boolean;
}

const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return <Badge variant="secondary">Never</Badge>;
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return <Badge variant="destructive">Invalid</Badge>;
    return `${formatDistanceToNow(date)} ago`;
};

export function RosterMember({ 
    member, 
    sourceSectionId, 
    allSections, 
    onMoveMember, 
    abasClass, 
    showAssignmentTitles, 
    isSelected, 
    onToggleSelection,
    labels,
    onSetLabel,
    onEditTitle,
    readOnly = false,
    markAlts = false,
    isOrganizational = false,
}: RosterMemberProps) {
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.MEMBER,
        item: { characterId: member.character_id, sourceSectionId },
        canDrag: !readOnly,
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    const getLabelStyles = () => {
        if (!member.label) return {};
        const colorMap: Record<string, { border: string, bg: string }> = {
            red: { border: 'hsl(0, 72%, 51%)', bg: 'hsla(0, 72%, 51%, 0.1)' },
            orange: { border: 'hsl(25, 95%, 53%)', bg: 'hsla(25, 95%, 53%, 0.1)' },
            amber: { border: 'hsl(45, 93%, 47%)', bg: 'hsla(45, 93%, 47%, 0.1)' },
            yellow: { border: 'hsl(53, 98%, 50%)', bg: 'hsla(53, 98%, 50%, 0.1)' },
            lime: { border: 'hsl(84, 81%, 48%)', bg: 'hsla(84, 81%, 48%, 0.1)' },
            green: { border: 'hsl(142, 71%, 45%)', bg: 'hsla(142, 71%, 45%, 0.1)' },
            emerald: { border: 'hsl(145, 63%, 42%)', bg: 'hsla(145, 63%, 42%, 0.1)' },
            teal: { border: 'hsl(170, 80%, 40%)', bg: 'hsla(170, 80%, 40%, 0.1)' },
            cyan: { border: 'hsl(190, 95%, 53%)', bg: 'hsla(190, 95%, 53%, 0.1)' },
            sky: { border: 'hsl(197, 88%, 53%)', bg: 'hsla(197, 88%, 53%, 0.1)' },
            blue: { border: 'hsl(221, 83%, 53%)', bg: 'hsla(221, 83%, 53%, 0.1)' },
            indigo: { border: 'hsl(243, 75%, 60%)', bg: 'hsla(243, 75%, 60%, 0.1)' },
            violet: { border: 'hsl(262, 84%, 60%)', bg: 'hsla(262, 84%, 60%, 0.1)' },
            purple: { border: 'hsl(271, 76%, 53%)', bg: 'hsla(271, 76%, 53%, 0.1)' },
            fuchsia: { border: 'hsl(291, 76%, 53%)', bg: 'hsla(291, 76%, 53%, 0.1)' },
            pink: { border: 'hsl(322, 84%, 60%)', bg: 'hsla(322, 84%, 60%, 0.1)' },
            rose: { border: 'hsl(347, 84%, 60%)', bg: 'hsla(347, 84%, 60%, 0.1)' },
        };
        const color = colorMap[member.label];
        if (!color) return {};
        return {
            borderLeft: `3px solid ${color.border}`,
            backgroundColor: color.bg,
        };
    };

    return (
        <TableRow 
            ref={drag} 
            style={{ 
                opacity: isDragging ? 0.5 : 1,
                ...getLabelStyles(),
            }} 
            className={cn(!readOnly && 'cursor-move')} 
            data-state={isSelected ? 'selected' : undefined}
        >
             <TableCell>
                <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onToggleSelection(member.character_id)}
                    aria-label={`Select ${member.character_name}`}
                    disabled={readOnly}
                />
            </TableCell>
            <TableCell>
                <div className="flex items-center gap-2">
                    <Link
                        href={`/character-sheets/${member.character_name.replace(/ /g, '_')}`}
                        className="hover:underline text-primary"
                    >
                        {member.character_name}
                    </Link>
                    {markAlts && (member.isPrimary || member.isAlternative) && (
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="ml-auto inline-flex items-center">
                                        {member.isPrimary ? (
                                            <UserCheck className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <User className="h-4 w-4 text-muted-foreground" />
                                        )}
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{member.isPrimary ? 'Primary Character' : 'Alternative Character'}</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
            </TableCell>
            <TableCell>{member.rank_name}</TableCell>
            {showAssignmentTitles && (
                <TableCell>{member.assignmentTitle || <span className="text-muted-foreground/50">N/A</span>}</TableCell>
            )}
            <TableCell>{formatTimestamp(member.last_duty)}</TableCell>
            <TableCell className={abasClass}>{member.abas ?? 'N/A'}</TableCell>
            <TableCell className="text-right">
                {!readOnly && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                             {isOrganizational && showAssignmentTitles && onEditTitle && (
                                <>
                                    <DropdownMenuItem onSelect={() => onEditTitle(member)}>
                                        <Award className="mr-2" /> Edit Title
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            )}
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
                            {onSetLabel && (
                                <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                        <Tag className="mr-2" /> Set Label
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                        {Object.entries(labels).map(([color, title]) => (
                                            <DropdownMenuItem key={color} onSelect={() => onSetLabel(member.character_id, color)}>
                                                <span className={cn('mr-2 h-2 w-2 rounded-full', `bg-${color}-500`)} />
                                                {title}
                                            </DropdownMenuItem>
                                        ))}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onSelect={() => onSetLabel(member.character_id, null)}>
                                            Clear Label
                                        </DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                </DropdownMenuSub>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </TableCell>
        </TableRow>
    );
}
