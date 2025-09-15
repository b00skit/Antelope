

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/dashboard/page-header';
import { User, Briefcase, Users, Hash, Calendar, Clock, Sigma, BookUser, Building, Move } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { CharacterImage } from '@/components/character-sheets/character-image';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import Link from 'next/link';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { TransferMemberDialog } from '@/components/units-divisions/transfer-member-dialog';
import { Button } from '@/components/ui/button';

interface CharacterSheetClientPageProps {
    initialData: any;
}

const formatTimestamp = (timestamp: string | null) => {
    if (!timestamp) return <Badge variant="secondary">Never</Badge>;
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return <Badge variant="destructive">Invalid Date</Badge>;
    return `${formatDistanceToNow(date)} ago`;
};

const getAbasClass = (abas: number | null | undefined, rank: number, settings: any) => {
    const abasValue = abas || 0;
    const isSupervisor = rank >= settings.supervisor_rank;
    const requiredAbas = isSupervisor ? settings.minimum_supervisor_abas : settings.minimum_abas;
    if (requiredAbas > 0 && abasValue < requiredAbas) {
        return "text-red-500 font-bold";
    }
    return "";
};

const formatAbas = (abas: string | number | null | undefined) => {
    const num = typeof abas === 'string' ? parseFloat(abas) : abas;
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    return num.toFixed(2);
}


export function CharacterSheetClientPage({ initialData }: CharacterSheetClientPageProps) {
    const router = useRouter();
    const [data, setData] = useState<any>(initialData);
    const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
    
    if (data.reauth) {
        router.push('/api/auth/logout');
        return null;
    }

    const { character, totalAbas, characterSheetsEnabled, forumData, abasSettings, assignment, canManageAssignments, allUnitsAndDetails, secondaryAssignments } = data;
    const characterImage = `https://mdc.gta.world/img/persons/${character.firstname}_${character.lastname}.png?${Date.now()}`;
    
    const handleTransferSuccess = () => {
        // Simple reload to get fresh data
        window.location.reload();
    }
    
    const filteredTransferDestinations = (allUnitsAndDetails || []).filter((opt: any) => {
        if (!assignment) return true;
        
        let isCurrentAssignment = false;
        if (assignment.type === 'cat_2' && opt.type === 'cat_2') {
            isCurrentAssignment = parseInt(opt.value, 10) === assignment.category_id;
        } else if (assignment.type === 'cat_3' && opt.type === 'cat_3') {
            isCurrentAssignment = parseInt(opt.value, 10) === assignment.category_id;
        }

        return !isCurrentAssignment;
    });


    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
             <TransferMemberDialog
                open={isTransferDialogOpen}
                onOpenChange={setIsTransferDialogOpen}
                onSuccess={handleTransferSuccess}
                member={assignment ? { id: assignment.membershipId, character_name: character.firstname + ' ' + character.lastname } : null}
                sourceCat2Id={assignment?.sourceCat2Id}
                allUnitsAndDetails={filteredTransferDestinations || []}
            />
            <PageHeader
                title="Character Record"
                description={`Viewing file for ${character.firstname} ${character.lastname}`}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 <div className={cn(forumData ? 'lg:col-span-2' : 'lg:col-span-3')}>
                    <Card className="h-full">
                        <CardHeader>
                            <CardTitle>Personnel File</CardTitle>
                            <CardDescription>Official information for {character.firstname} {character.lastname}.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col md:flex-row gap-6">
                            <div className="flex-shrink-0">
                                <CharacterImage
                                    initialSrc={characterImage}
                                    alt={`Mugshot of ${character.firstname} ${character.lastname}`}
                                />
                            </div>
                            <div className="flex-1 space-y-6">
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Identification</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-lg p-4">
                                        <div className="flex items-center gap-3">
                                            <Hash className="h-5 w-5 text-primary" />
                                            <div><strong className="text-muted-foreground block text-sm">Character ID</strong> {character.character_id}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <User className="h-5 w-5 text-primary" />
                                            <div><strong className="text-muted-foreground block text-sm">User ID</strong> {character.user_id}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Briefcase className="h-5 w-5 text-primary" />
                                            <div><strong className="text-muted-foreground block text-sm">Rank</strong> {character.rank_name} (Level {character.rank})</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Users className="h-5 w-5 text-primary" />
                                            <div><strong className="text-muted-foreground block text-sm">ABAS</strong> <span className={cn(getAbasClass(parseFloat(character.abas), character.rank, abasSettings))}>{formatAbas(character.abas)}</span></div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Sigma className="h-5 w-5 text-primary" />
                                            <div>
                                                <strong className="text-muted-foreground block text-sm">Total ABAS</strong> 
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <span className={cn('cursor-help', getAbasClass(totalAbas, character.rank, abasSettings))}>{formatAbas(totalAbas)}</span>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            <p>Sum of ABAS across all characters on this account.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>
                                        {assignment && (
                                            <div className="flex items-center gap-3">
                                                <Building className="h-5 w-5 text-primary" />
                                                <div>
                                                    <strong className="text-muted-foreground block text-sm">Primary Assignment</strong>
                                                    <div className="flex items-center gap-2">
                                                        <Link href={assignment.link} className="hover:underline text-primary">{assignment.path}</Link>
                                                        {canManageAssignments && (
                                                             <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsTransferDialogOpen(true)}>
                                                                            <Move className="h-4 w-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Transfer Member</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-lg font-semibold mb-2">Status</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border rounded-lg p-4">
                                        <div className="flex items-center gap-3">
                                            <Calendar className="h-5 w-5 text-primary" />
                                            <div><strong className="text-muted-foreground block text-sm">Last Online</strong> {formatTimestamp(character.last_online)}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Clock className="h-5 w-5 text-primary" />
                                            <div><strong className="text-muted-foreground block text-sm">Last On Duty</strong> {formatTimestamp(character.last_duty)}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                {forumData && (
                    <div className="lg:col-span-1 space-y-6">
                         <Card className="h-full flex flex-col">
                             <CardHeader>
                                 <CardTitle className="flex items-center gap-2"><BookUser /> Forum Profile</CardTitle>
                                 <CardDescription>Roles and groups from the forum.</CardDescription>
                             </CardHeader>
                             <CardContent className="flex-grow">
                                 <ScrollArea className="h-48 pr-4">
                                     <div className="space-y-2">
                                         {forumData.groups.length > 0 ? (
                                             forumData.groups.map((group: any) => (
                                                 <Badge key={group.id} variant={group.leader ? "default" : "secondary"} className="mr-1 mb-1">
                                                     {group.name}
                                                 </Badge>
                                             ))
                                         ) : (
                                             <p className="text-sm text-muted-foreground">No forum groups found.</p>
                                         )}
                                     </div>
                                 </ScrollArea>
                             </CardContent>
                         </Card>
                    </div>
                )}
            </div>
            
            {secondaryAssignments && secondaryAssignments.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle>Secondary Assignments</CardTitle>
                        <CardDescription>Additional roles and details for this character.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Assignment</TableHead>
                                    <TableHead>Title</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {secondaryAssignments.map((assignment: any, index: number) => (
                                    <TableRow key={index}>
                                        <TableCell>
                                            <Link href={assignment.link} className="hover:underline text-primary">
                                                {assignment.path}
                                            </Link>
                                        </TableCell>
                                        <TableCell>{assignment.title || <span className="text-muted-foreground">N/A</span>}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Alternative Characters</CardTitle>
                    <CardDescription>Other characters on this account.</CardDescription>
                </CardHeader>
                <CardContent>
                    {character.alternative_characters && character.alternative_characters.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Character Name</TableHead>
                                    <TableHead>Rank</TableHead>
                                    <TableHead>ABAS</TableHead>
                                    <TableHead>Last Online</TableHead>
                                    <TableHead>Last On Duty</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {character.alternative_characters.map((alt: any) => (
                                    <TableRow key={alt.character_id}>
                                        <TableCell className="font-medium">
                                             {characterSheetsEnabled ? (
                                                <Link href={`/character-sheets/${alt.character_name.replace(/ /g, '_')}`} className="hover:underline text-primary">
                                                    {alt.character_name}
                                                </Link>
                                            ) : (
                                                alt.character_name
                                            )}
                                        </TableCell>
                                        <TableCell>{alt.rank_name}</TableCell>
                                        <TableCell className={cn(getAbasClass(parseFloat(alt.abas), alt.rank, abasSettings))}>{formatAbas(alt.abas)}</TableCell>
                                        <TableCell>{formatTimestamp(alt.last_online)}</TableCell>
                                        <TableCell>{formatTimestamp(alt.last_duty)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No alternative characters found.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
