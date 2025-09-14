import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MoreVertical, Pencil, Trash2, PlusCircle } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Cat1 } from "./units-divisions-client-page";
import { format } from 'date-fns';
import { Badge } from "../ui/badge";
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

interface Cat1CardProps {
    cat1: Cat1;
    onEdit: () => void;
    onDelete: () => void;
    onCreateCat2: () => void;
    settings: { category_2_name: string };
}

export function Cat1Card({ cat1, onEdit, onDelete, onCreateCat2, settings }: Cat1CardProps) {
    return (
        <Card>
            <CardHeader className="flex flex-row items-start justify-between">
                <div>
                    <CardTitle className="flex items-center gap-2">
                        {cat1.name}
                        {cat1.short_name && <Badge variant="secondary">{cat1.short_name}</Badge>}
                    </CardTitle>
                    <CardDescription>
                        Created by {cat1.creator.username} on {format(new Date(cat1.created_at), 'PPP')}
                    </CardDescription>
                </div>
                {cat1.canManage && (
                     <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                            <DropdownMenuItem onSelect={onEdit}><Pencil className="mr-2" /> Edit</DropdownMenuItem>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <div className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 text-destructive">
                                        <Trash2 className="mr-2" /> Delete
                                    </div>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                     <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This will permanently delete "{cat1.name}" and all its subunits. This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={onDelete}>
                                            Yes, Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </CardHeader>
            <CardContent>
                {cat1.cat2s && cat1.cat2s.length > 0 ? (
                    <div className="space-y-2">
                        {cat1.cat2s.map(cat2 => (
                            <div key={cat2.id} className="flex items-center justify-between p-2 border rounded-md">
                                <div>
                                    <p className="font-medium">{cat2.name}</p>
                                    <p className="text-xs text-muted-foreground">Created by {cat2.creator.username}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No sub-units found.</p>
                )}
            </CardContent>
            {cat1.canManage && (
                 <CardFooter>
                    <Button variant="outline" size="sm" onClick={onCreateCat2}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Create {settings.category_2_name}
                    </Button>
                </CardFooter>
            )}
        </Card>
    );
}
