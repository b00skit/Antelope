
'use client';

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { useSession } from '@/hooks/use-session';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';


interface AuditLog {
    id: number;
    user: { username: string };
    category: string;
    action: string;
    details: any;
    created_at: string;
}

const LogRowSkeleton = () => (
    <TableRow>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-32" /></TableCell>
        <TableCell><Skeleton className="h-5 w-24" /></TableCell>
        <TableCell><Skeleton className="h-5 w-48" /></TableCell>
        <TableCell><Skeleton className="h-8 w-20" /></TableCell>
    </TableRow>
);

const DetailView = ({ details }: { details: any }) => {
    const { added = [], updated = [], removed = [] } = details;

    const renderChange = (item: any) => {
        if (typeof item === 'object' && item !== null && 'old' in item && 'new' in item) {
            return (
                <div className="flex items-center gap-1">
                    <span className="text-muted-foreground line-through">{item.old ?? 'N/A'}</span>
                    <span>&rarr;</span>
                    <span className="font-semibold">{item.new ?? 'N/A'}</span>
                </div>
            );
        }
        return JSON.stringify(item);
    };

    return (
        <div className="space-y-4 text-sm">
            {added.length > 0 && (
                <div>
                    <h4 className="font-semibold text-green-600">Added ({added.length})</h4>
                    <ul className="list-disc pl-5 mt-1 space-y-1">
                        {added.map((item, i) => <li key={i}>{item.character_name || item.name}</li>)}
                    </ul>
                </div>
            )}
             {updated.length > 0 && (
                <div>
                    <h4 className="font-semibold text-yellow-600">Updated ({updated.length})</h4>
                     <ul className="list-disc pl-5 mt-1 space-y-1">
                        {updated.map((item, i) => (
                             <li key={i} className="grid grid-cols-2 gap-2">
                                <span>{item.character_name || item.name}</span>
                                <div className="space-y-1">
                                    {Object.entries(item).filter(([key]) => key !== 'character_name' && key !== 'name' && key !== 'character_id').map(([key, value]) => (
                                        <div key={key} className="flex gap-2">
                                            <span className="font-medium capitalize">{key.replace(/_/g, ' ')}:</span>
                                            {renderChange(value)}
                                        </div>
                                    ))}
                                </div>
                             </li>
                        ))}
                    </ul>
                </div>
            )}
             {removed.length > 0 && (
                <div>
                    <h4 className="font-semibold text-red-600">Removed ({removed.length})</h4>
                     <ul className="list-disc pl-5 mt-1 space-y-1">
                        {removed.map((item, i) => <li key={i}>{item.character_name || item.name}</li>)}
                    </ul>
                </div>
            )}
        </div>
    );
};


export function AuditLogClientPage() {
    const { session } = useSession();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

    useEffect(() => {
        const fetchLogs = async () => {
            if (!session?.hasActiveFaction) return;

            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/audit-logs');
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setLogs(data.logs);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchLogs();
    }, [session]);

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <PageHeader
                title="Audit Logs"
                description="A record of all significant actions performed within your faction's panel."
            />
            {error && (
                 <Alert variant="destructive" className="mb-4">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card>
                <CardContent className="pt-6">
                     <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>User</TableHead>
                                <TableHead>Category</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead>Details</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                Array.from({ length: 10 }).map((_, i) => <LogRowSkeleton key={i} />)
                            ) : logs.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No audit logs found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                logs.map(log => (
                                    <TableRow key={log.id}>
                                        <TableCell>{format(new Date(log.created_at), 'PPP p')}</TableCell>
                                        <TableCell>{log.user.username}</TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{log.category.replace(/_/g, ' ')}</Badge>
                                        </TableCell>
                                        <TableCell>{log.action}</TableCell>
                                        <TableCell>
                                            <Button variant="outline" size="sm" onClick={() => setSelectedLog(log)}>
                                                View Details
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Log Details</DialogTitle>
                        <DialogDescription>
                            Detailed changes for the selected log entry.
                        </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] p-4">
                       {selectedLog && <DetailView details={selectedLog.details} />}
                    </ScrollArea>
                </DialogContent>
            </Dialog>
        </div>
    )
}
