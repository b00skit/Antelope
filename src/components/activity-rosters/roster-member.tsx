

'use client';

import { useDrag } from 'react-dnd';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import Link from 'next/link';

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

interface RosterMemberProps {
    member: Member;
    sourceSectionId: number | 'unassigned';
    abasClass?: string;
    showAssignmentTitles: boolean;
}

const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return <Badge variant="secondary">Never</Badge>;
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return <Badge variant="destructive">Invalid</Badge>;
    return `${formatDistanceToNow(date)} ago`;
};

export function RosterMember({ member, sourceSectionId, abasClass, showAssignmentTitles }: RosterMemberProps) {
    const [{ isDragging }, drag] = useDrag({
        type: ItemTypes.MEMBER,
        item: { characterId: member.character_id, sourceSectionId },
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });

    return (
        <TableRow ref={drag} style={{ opacity: isDragging ? 0.5 : 1 }} className="cursor-move">
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
        </TableRow>
    );
}
