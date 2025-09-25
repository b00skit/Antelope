
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { PlusCircle, MoreVertical, Pencil, Trash2, User, Loader2, Move, UserCog, RefreshCw } from "lucide-react";
import { format } from "date-fns";
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
import { TransferMemberDialog } from './transfer-member-dialog';
import { Badge } from '../ui/badge';
import { ForumSyncDialog } from './forum-sync-dialog';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';

interface Member {
    id: number;
    character_id: number;
    character_name: string;
    rank_name: string;
    title: string | null;
    created_at: string;
    creator: {
        username: string;
    },
    manual: boolean;
}

interface Cat3MembersTableProps {
    members: Member[];
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

export function Cat3MembersTable({ members, allFactionMembers, allAssignedCharacterIds, canManage, cat1Id, cat2Id, cat3Id, onDataChange, allUnitsAndDetails, forumGroupId, isSecondary }: Cat3MembersTableProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [namesToAdd, setNamesToAdd] = useState('');
    const [newTitle, setNewTitle] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [isDeleting, setIsDeleting] = useState<number | null>(null);
    const [transferringMember, setTransferringMember] = useState<Member | null>(null);
    const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
    const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
    const { toast } = useToast();

    const handleAddMember = async () => {
        const names = namesToAdd.split('\n').map(n => n.trim()).filter(Boolean);
        if (names.length === 0) {
            toast({ variant: 'destructive', title: 'Error', description: 'Please enter at least one character name.' });
            return;
        }

        setIsSubmitting(true);
        try {
            const characterIds = names.map(name => {
                const member = allFactionMembers.find(fm => fm.character_name === name);
                return member ? member.character_id : null;
            }).filter((id): id is number => id !== null);

            if (characterIds.length !== names.length) {
                toast({ variant: 'destructive', title: 'Error', description: 'One or more character names were not found.' });
                return;
            }
            
            const res = await fetch(`/api/units-divisions/${cat1Id}/${cat2Id}/${cat3Id}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ character_ids: characterIds, title: newTitle, manual: true }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            toast({ title: 'Success', description: `${result.message}` });
            onDataChange();
            setIsAdding(false);
            setNamesToAdd('');
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
            const res = await fetch(`/api/units-divisions/${cat1Id}/${cat2Id}/${cat3Id}/members/${editingMember.id}`, {
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
            const res = await fetch(`/api/units-divisions/${cat1Id}/${cat2Id}/${cat3Id}/members/${membershipId}`, { method: 'DELETE' });
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

    const handleOpenTransferDialog = (member: Member) => {
        setTransferringMember(member);
        setIsTransferDialogOpen(true);
    }

    return (
        <>
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
            {forumGroupId && (
                <ForumSyncDialog
                    open={isSyncDialogOpen}
                    onOpenChange={setIsSyncDialogOpen}
                    onSyncSuccess={onDataChange}
                    categoryType="cat_3"
                    categoryId={cat3Id}
                    allFactionMembers={allFactionMembers}
                />
            )}
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Member Roster</CardTitle>
                            <CardDescription>A list of all members assigned to this detail.</CardDescription>
                        </div>
                        {canManage && (
                           <div className="flex gap-2">
                               {forumGroupId && (
                                    <Button variant="secondary" onClick={() => setIsSyncDialogOpen(true)}>
                                        <RefreshCw className="mr-2" />
                                        Compare &amp; Sync
                                    </Button>
                                )}
                                <Button onClick={() => setIsAdding(!isAdding)}>
                                    <PlusCircle className="mr-2" />
                                    {isAdding ? 'Cancel' : 'Add Members'}
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {isAdding && (
                         <div className="p-4 border rounded-md mb-4 flex flex-col sm:flex-row gap-4 items-end">
                            <div className="flex-1 w-full">
                                <Label htmlFor="names-to-add-cat3">Character Names (one per line)</Label>
                                <Textarea id="names-to-add-cat3" value={namesToAdd} onChange={(e) => setNamesToAdd(e.target.value)} placeholder="Firstname_Lastname&#10;Firstname_Lastname" />
                            </div>
                            <div className="w-full sm:w-auto">
                                <Label htmlFor="title-to-add-cat3">Title (Optional)</Label>
                                <Input id="title-to-add-cat3" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="e.g., Senior Deputy" />
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
                                        <TableCell className="flex items-center gap-2">
                                            {member.character_name}
                                            {member.manual && <Badge variant="secondary"><UserCog className="mr-1 h-3 w-3" /> Manual</Badge>}
                                        </TableCell>
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
                                                            {!isSecondary && (
                                                                <DropdownMenuItem onSelect={() => handleOpenTransferDialog(member)}>
                                                                    <Move className="mr-2" /> Transfer Member
                                                                </DropdownMenuItem>
                                                            )}
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
                                                                This will remove {member.character_name} from this detail.
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
                            <p>No members have been assigned to this detail yet.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    )
}
