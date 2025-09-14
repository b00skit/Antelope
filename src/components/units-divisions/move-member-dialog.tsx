
import { useState, useMemo } from 'react';
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
import { Loader2 } from 'lucide-react';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
  } from "@/components/ui/command"
import { ScrollArea } from '../ui/scroll-area';

interface Member {
    id: number;
    character_name: string;
}

interface UnitDetailOption {
    label: string;
    value: string;
    type: 'cat_2' | 'cat_3';
}

interface MoveMemberDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    member: Member | null;
    sourceCat2Id: number;
    allUnitsAndDetails: UnitDetailOption[];
}

export function MoveMemberDialog({ open, onOpenChange, onSuccess, member, sourceCat2Id, allUnitsAndDetails }: MoveMemberDialogProps) {
    const { toast } = useToast();
    const [selectedDestination, setSelectedDestination] = useState<UnitDetailOption | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleMove = async () => {
        if (!member || !selectedDestination) {
            toast({ variant: 'destructive', title: 'Error', description: 'No member or destination selected.' });
            return;
        }
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/units-divisions/members/${member.id}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    source_cat2_id: sourceCat2Id,
                    destination_type: selectedDestination.type,
                    destination_id: parseInt(selectedDestination.value, 10),
                }),
            });
            const result = await res.json();
            if (!res.ok) throw new Error(result.error);
            toast({ title: 'Success', description: 'Member moved successfully.' });
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            toast({ variant: 'destructive', title: 'Error', description: err.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Move {member?.character_name}</DialogTitle>
                    <DialogDescription>
                        Select a new unit or detail to move this member to.
                    </DialogDescription>
                </DialogHeader>
                <Command>
                    <CommandInput placeholder="Search for a unit or detail..." />
                    <CommandList>
                        <ScrollArea className="h-48">
                            <CommandEmpty>No results found.</CommandEmpty>
                            <CommandGroup>
                                {allUnitsAndDetails.map((option) => (
                                <CommandItem
                                    key={`${option.type}-${option.value}`}
                                    value={option.label}
                                    onSelect={() => setSelectedDestination(option)}
                                >
                                    {option.label}
                                </CommandItem>
                                ))}
                            </CommandGroup>
                        </ScrollArea>
                    </CommandList>
                </Command>

                {selectedDestination && (
                    <div className="text-sm p-2 bg-muted rounded-md">
                        Selected: <span className="font-semibold">{selectedDestination.label}</span>
                    </div>
                )}
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleMove} disabled={isSubmitting || !selectedDestination}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Move
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
