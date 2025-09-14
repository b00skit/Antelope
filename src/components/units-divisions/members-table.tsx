
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreVertical, Pencil, Trash2, User, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Combobox } from '../ui/combobox';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';


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

interface MembersTableProps {
    members: Member[];
    allFactionMembers: any[];
    assignedCharacterIds: number[];
    canManage: boolean;
    cat1Id: number;
    cat2Id: number;
    onDataChange: () => void;
}

export function MembersTable({ members, allFactionMembers, assignedCharacterIds, canManage, cat1Id, cat2Id, onDataChange }: MembersTableProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
    const [newTitle, setNewTitle] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const { toast } = useToast();

    const currentMemberIds = new Set(members.map(m => m.character_id));
    const assignedIds = new Set(assignedCharacterIds);
    const characterOptions = allFactionMembers
        .filter(fm => !assignedIds.has(fm.character_id) || currentMemberIds.has(fm.character_id))
        .map(fm => fm.character_name);

    const handleAddMember = async () => {
        if (!selectedCharacterId) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please select a character.' });
            return;
        }
        setIsSubmitting(true);
        try {
            const character = allFactionMembers.find(fm => fm.character_name === selectedCharacterId);
            const res = await fetch(`/api/units-divisions/${cat1Id}/${cat2Id}/members`, {
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
    
    const handleUpdateTitle = async () => {
        if (!editingMember) return;
        setIsSubmitting(true);
         try {
            const res = await fetch(`/api/units-divisions/${cat1Id}/${cat2Id}/members/${editingMember.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            toast({ title: 'Success', description: 'Title updated.' });
            onDataChange();
            setEditingMember(null);
            setNewTitle('');
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsSubmitting(false);
        }
    }
    
    const handleDelete = async (membershipId: number) => {
        setIsDeleting(membershipId);
        try {
            const res = await fetch(`/api/units-divisions/${cat1Id}/${cat2Id}/members/${membershipId}`, { method: 'DELETE' });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            toast({ title: 'Success', description: 'Member removed.' });
            onDataChange();
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsDeleting(null);
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle>Member Roster</CardTitle>
                        <CardDescription>A list of all members assigned to this unit.</CardDescription>
                    </div>
                    {canManage && (
                         <Button onClick={() => setIsAdding(!isAdding)}>
                            <PlusCircle className="mr-2" />
                            {isAdding ? 'Cancel' : 'Add Member'}
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                {isAdding && (
                    <div className="p-4 border rounded-md mb-4 flex flex-col sm:flex-row gap-4 items-end">
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
                {members.length > 0 ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Rank</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Added By</TableHead>
                                <TableHead>Date Added</TableHead>
                                {canManage && <TableHead></TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.map(member => (
                                <TableRow key={member.id}>
                                    <TableCell>{member.character_name}</TableCell>
                                    <TableCell>{member.rank_name}</TableCell>
                                    <TableCell>
                                        {editingMember?.id === member.id ? (
                                            <Input 
                                                value={newTitle} 
                                                onChange={(e) => setNewTitle(e.target.value)} 
                                                onBlur={handleUpdateTitle} 
                                                onKeyDown={(e) => e.key === 'Enter' && handleUpdateTitle()}
                                                autoFocus 
                                                disabled={isSubmitting}
                                            />
                                        ) : (
                                            <div 
                                                className={cn("group flex items-center gap-2", canManage && "cursor-pointer")}
                                                onClick={() => {
                                                    if (canManage) {
                                                        setEditingMember(member);
                                                        setNewTitle(member.title || '');
                                                    }
                                                }}
                                            >
                                                {member.title || <span className="text-muted-foreground">N/A</span>}
                                                {canManage && <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>{member.creator.username}</TableCell>
                                    <TableCell>{format(new Date(member.created_at), 'PPP')}</TableCell>
                                    {canManage && (
                                         <TableCell className="text-right">
                                            <AlertDialog>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon"><MoreVertical /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent>
                                                        <DropdownMenuItem onSelect={() => { setEditingMember(member); setNewTitle(member.title || '') }}>
                                                            <Pencil className="mr-2" /> Edit Title
                                                        </DropdownMenuItem>
                                                        <AlertDialogTrigger asChild>
                                                            <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive">
                                                                <Trash2 className="mr-2" /> Remove
                                                            </div>
                                                        </AlertDialogTrigger>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            This will remove {member.character_name} from this unit.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(member.id)} disabled={isDeleting === member.id}>
                                                            {isDeleting === member.id && <Loader2 className="mr-2 animate-spin" />}
                                                            Yes, Remove
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                         </TableCell>
                                    )}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                     <div className="text-center py-8 text-muted-foreground">
                        <User className="mx-auto h-8 w-8 mb-2" />
                        <p>No members have been assigned to this unit yet.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
