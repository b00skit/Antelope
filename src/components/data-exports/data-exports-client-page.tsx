
'use client';

import { useState } from 'react';
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, GripVertical, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

const ItemTypes = {
    COLUMN: 'column',
};

interface Column {
    key: string;
    label: string;
}

const ALL_COLUMNS: Column[] = [
    { key: 'character_id', label: 'Character ID' },
    { key: 'character_name', label: 'Name' },
    { key: 'user_id', label: 'User ID' },
    { key: 'rank', label: 'Rank' },
    { key: 'rank_name', label: 'Rank Name' },
    { key: 'abas', label: 'ABAS' },
    { key: 'alt_status', label: 'Alternative Character' },
    { key: 'last_online_date', label: 'Last Online (Date)' },
    { key: 'last_online_time', label: 'Last Online (Time)' },
    { key: 'last_duty_date', label: 'Last Duty (Date)' },
    { key: 'last_duty_time', label: 'Last Duty (Time)' },
];

const DraggableColumn = ({ col, index, moveColumn, onRemove }: { col: Column, index: number, moveColumn: (dragIndex: number, hoverIndex: number) => void, onRemove: (key: string) => void }) => {
    const ref = React.useRef<HTMLDivElement>(null);

    const [, drop] = useDrop({
        accept: ItemTypes.COLUMN,
        hover(item: { index: number }, monitor) {
            if (!ref.current) return;
            const dragIndex = item.index;
            const hoverIndex = index;
            if (dragIndex === hoverIndex) return;
            moveColumn(dragIndex, hoverIndex);
            item.index = hoverIndex;
        },
    });

    const [{ isDragging }, drag, preview] = useDrag({
        type: ItemTypes.COLUMN,
        item: () => ({ id: col.key, index }),
        collect: (monitor) => ({
            isDragging: monitor.isDragging(),
        }),
    });
    
    drag(drop(ref));

    return (
        <div ref={preview} style={{ opacity: isDragging ? 0.5 : 1 }}>
            <div ref={ref} className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                <GripVertical className="cursor-grab" />
                <span className="flex-1 font-medium">{col.label}</span>
                <Button variant="ghost" size="icon" onClick={() => onRemove(col.key)} className="h-6 w-6">
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </div>
        </div>
    );
};


export function DataExportsClientPage() {
    const [isExporting, setIsExporting] = useState(false);
    const { toast } = useToast();
    const [selectedColumns, setSelectedColumns] = useState<Column[]>([
        { key: 'character_id', label: 'Character ID' },
        { key: 'character_name', label: 'Name' },
        { key: 'user_id', label: 'User ID' },
        { key: 'rank_name', label: 'Rank' },
        { key: 'abas', label: 'ABAS' },
        { key: 'alt_status', label: 'Alternative Character' },
        { key: 'last_duty_date', label: 'Last Duty (Date)' },
    ]);

    const selectedColumnKeys = new Set(selectedColumns.map(c => c.key));

    const handleColumnToggle = (key: string) => {
        if (selectedColumnKeys.has(key)) {
            setSelectedColumns(prev => prev.filter(c => c.key !== key));
        } else {
            const columnToAdd = ALL_COLUMNS.find(c => c.key === key);
            if (columnToAdd) {
                setSelectedColumns(prev => [...prev, columnToAdd]);
            }
        }
    };
    
    const moveColumn = (dragIndex: number, hoverIndex: number) => {
        const draggedColumn = selectedColumns[dragIndex];
        const newColumns = [...selectedColumns];
        newColumns.splice(dragIndex, 1);
        newColumns.splice(hoverIndex, 0, draggedColumn);
        setSelectedColumns(newColumns);
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await fetch('/api/exports/faction-roster', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ columns: selectedColumns }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate export.');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `faction-roster-${new Date().toISOString().split('T')[0]}.xlsx`;
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
        <DndProvider backend={HTML5Backend}>
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
                <PageHeader
                    title="Data Exports"
                    description="Build and download custom reports for your faction."
                />
    
                <Card>
                    <CardHeader>
                        <CardTitle>Faction Roster Report Builder</CardTitle>
                        <CardDescription>
                            Select the columns you want to include in your export and arrange them in your desired order.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-1">
                            <h3 className="font-semibold mb-2">Available Columns</h3>
                            <div className="space-y-2 p-2 border rounded-md max-h-96 overflow-y-auto">
                                {ALL_COLUMNS.map(col => (
                                    <div key={col.key} className="flex items-center space-x-2">
                                        <Checkbox 
                                            id={`col-${col.key}`} 
                                            checked={selectedColumnKeys.has(col.key)} 
                                            onCheckedChange={() => handleColumnToggle(col.key)}
                                        />
                                        <Label htmlFor={`col-${col.key}`} className="cursor-pointer">{col.label}</Label>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="md:col-span-2">
                             <h3 className="font-semibold mb-2">Selected Columns (Drag to Reorder)</h3>
                             <div className="space-y-2 p-2 border rounded-md min-h-48 max-h-96 overflow-y-auto">
                                 <AnimatePresence>
                                     {selectedColumns.map((col, i) => (
                                        <motion.div layout key={col.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                            <DraggableColumn col={col} index={i} moveColumn={moveColumn} onRemove={handleColumnToggle} />
                                        </motion.div>
                                     ))}
                                 </AnimatePresence>
                                 {selectedColumns.length === 0 && (
                                     <p className="text-sm text-center text-muted-foreground p-4">Select columns from the left to get started.</p>
                                 )}
                             </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleExport} disabled={isExporting || selectedColumns.length === 0}>
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Export as XLSX
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </DndProvider>
    );
}
