
'use client';

import { useState } from 'react';
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function DataExportsClientPage() {
    const [isExporting, setIsExporting] = useState(false);
    const { toast } = useToast();

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await fetch('/api/exports/faction-roster');
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate export.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `faction-roster-${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
            
            toast({
                title: 'Export Started',
                description: 'Your faction roster download has begun.',
            });

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Export Failed',
                description: error.message,
            });
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8">
            <PageHeader
                title="Data Exports"
                description="Download your faction's data in various formats."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users />
                            Faction Roster
                        </CardTitle>
                        <CardDescription>
                            Export a full list of your faction members from the cache, including their alternative character status, ABAS, and last login time.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleExport} disabled={isExporting}>
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Export as CSV
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
