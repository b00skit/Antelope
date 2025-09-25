
'use client';

import { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, HelpCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

interface Member {
    character_id: number;
    character_name: string;
    rank_name: string;
    isAlreadyAssigned?: boolean;
    isExcluded?: boolean;
}

interface DiffData {
    toAdd: Member[];
    toRemove: Member[];
}

interface ForumSyncDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSyncSuccess: () => void;
    categoryType: 'cat_2' | 'cat_3';
    categoryId: number;
    allFactionMembers: any[];
}

export function ForumSyncDialog({ open, onOpenChange, onSyncSuccess, categoryType, categoryId, allFactionMembers }: ForumSyncDialogProps) {
    const { toast } = useToast();
    const [diffData, setDiffData] = useState<DiffData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedAdd, setSelectedAdd] = useState<Set<number>>(new Set());
    const [selectedRemove, setSelectedRemove] = useState<Set<number>>(new Set());

    useEffect(() => {
        if (open) {
            const fetchDiff = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const res = await fetch(`/api/units-divisions/sync-preview/${categoryType}/${categoryId}`);
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error);
                    
                    setDiffData(data);
                    // Pre-select only those who are not already assigned to another primary unit and not excluded
                    setSelectedAdd(new Set(data.toAdd.filter((m: Member) => !m.isAlreadyAssigned && !m.isExcluded).map((m: Member) => m.character_id)));
                    setSelectedRemove(new Set(data.toRemove.map((m: Member) => m.character_id)));
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchDiff();
        }
    }, [open, categoryId, categoryType]);
    
    const handleSync = async () => {
        setIsSaving(true);
        try {
            const payload = {
                addIds: Array.from(selectedAdd),
                removeIds: Array.from(selectedRemove),
            };

            const res = await fetch(`/api/units-divisions/sync-confirm/${categoryType}/${categoryId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            toast({ title: 'Success', description: 'Sync completed successfully.' });
            onSyncSuccess();
            onOpenChange(false);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsSaving(false);
        }
    };
    
    const toggleSelection = (set: Set<number>, setter: React.Dispatch<React.SetStateAction<Set<number>>>, id: number) => {
        const newSet = new Set(set);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setter(newSet);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl">
                <DialogHeader>
                    <DialogTitle>Forum Group Sync Preview</DialogTitle>
                    <DialogDescription>
                        Review the changes below. Uncheck any members you wish to exclude from this sync operation.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    {isLoading ? (
                         <div className="flex justify-center items-center h-48">
                            <Loader2 className="animate-spin" />
                        </div>
                    ) : error ? (
                         <Alert variant="destructive">
                            <AlertTriangle />
                            <AlertTitle>Failed to load preview</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    ) : diffData ? (
                        <TooltipProvider>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Members to Add ({selectedAdd.size}/{diffData.toAdd.filter(m => !m.isAlreadyAssigned && !m.isExcluded).length})</h3>
                                    <ScrollArea className="h-64 border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-12"><Checkbox checked={selectedAdd.size === diffData.toAdd.filter(m => !m.isAlreadyAssigned && !m.isExcluded).length && diffData.toAdd.length > 0} onCheckedChange={(checked) => setSelectedAdd(new Set(checked ? diffData.toAdd.filter(m => !m.isAlreadyAssigned && !m.isExcluded).map(m => m.character_id) : []))} /></TableHead>
                                                    <TableHead>Name</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {diffData.toAdd.map(member => (
                                                    <TableRow key={member.character_id} className={ (member.isAlreadyAssigned || member.isExcluded) ? 'bg-muted/50' : ''}>
                                                        <TableCell>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <div className="flex items-center">
                                                                        <Checkbox 
                                                                            checked={selectedAdd.has(member.character_id)} 
                                                                            onCheckedChange={() => toggleSelection(selectedAdd, setSelectedAdd, member.character_id)}
                                                                            disabled={member.isAlreadyAssigned || member.isExcluded}
                                                                        />
                                                                        {(member.isAlreadyAssigned || member.isExcluded) && <HelpCircle className="h-4 w-4 ml-2 text-muted-foreground" />}
                                                                    </div>
                                                                </TooltipTrigger>
                                                                {(member.isAlreadyAssigned || member.isExcluded) && (
                                                                    <TooltipContent>
                                                                        <p>{member.isAlreadyAssigned ? 'This member is already in another primary assignment.' : 'This member is on the exclusion list.'}</p>
                                                                    </TooltipContent>
                                                                )}
                                                            </Tooltip>
                                                        </TableCell>
                                                        <TableCell>{member.character_name}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">Members to Remove ({selectedRemove.size}/{diffData.toRemove.length})</h3>
                                    <ScrollArea className="h-64 border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead className="w-12"><Checkbox checked={selectedRemove.size === diffData.toRemove.length && diffData.toRemove.length > 0} onCheckedChange={(checked) => setSelectedRemove(new Set(checked ? diffData.toRemove.map(m => m.character_id) : []))} /></TableHead>
                                                    <TableHead>Name</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {diffData.toRemove.map(member => (
                                                    <TableRow key={member.character_id}>
                                                        <TableCell><Checkbox checked={selectedRemove.has(member.character_id)} onCheckedChange={() => toggleSelection(selectedRemove, setSelectedRemove, member.character_id)} /></TableCell>
                                                        <TableCell>{member.character_name}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </ScrollArea>
                                </div>
                            </div>
                        </TooltipProvider>
                    ) : null}
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSync} disabled={isSaving || isLoading}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Sync
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
