
'use client';

import { useState, useCallback } from 'react';
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Loader2, GripVertical, PlusCircle, Trash2, Sheet as SheetIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const ItemTypes = {
    COLUMN: 'column',
};

interface Column {
    key: string;
    label: string;
}

interface Sheet {
    id: string;
    name: string;
    columns: Column[];
}

const ALL_COLUMNS: Column[] = [
    { key: 'character_id', label: 'Character ID' },
    { key: 'character_name', label: 'Name' },
    { key: 'user_id', label: 'User ID' },
    { key: 'rank', label: 'Rank' },
    { key: 'rank_name', label: 'Rank Name' },
    { key: 'abas', label: 'ABAS' },
    { key: 'primary_character', label: 'Primary Character' },
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
    const [sheets, setSheets] = useState<Sheet[]>([
        { id: 'sheet1', name: 'Roster Overview', columns: [
            { key: 'character_id', label: 'Character ID' },
            { key: 'character_name', label: 'Name' },
            { key: 'rank_name', label: 'Rank' },
            { key: 'abas', label: 'ABAS' },
            { key: 'primary_character', label: 'Primary Character' },
            { key: 'last_duty_date', label: 'Last Duty (Date)' },
        ]},
    ]);
    const [activeSheetId, setActiveSheetId] = useState('sheet1');
    const [filters, setFilters] = useState({
        onlyWithAlts: false,
        dutyActiveDays: 'all', // 'all', '7', '14', '30'
        belowMinimumAbas: false,
        rank: 'all',
    });

    const activeSheet = sheets.find(s => s.id === activeSheetId);
    const selectedColumnKeys = new Set(activeSheet?.columns.map(c => c.key));
    
    const addSheet = () => {
        const newSheetId = `sheet${Date.now()}`;
        setSheets(prev => [...prev, { id: newSheetId, name: `Sheet ${prev.length + 1}`, columns: [] }]);
        setActiveSheetId(newSheetId);
    };
    
    const removeSheet = (id: string) => {
        if (sheets.length === 1) {
            toast({ variant: 'destructive', title: 'Cannot remove the last sheet.'});
            return;
        }
        setSheets(prev => prev.filter(s => s.id !== id));
        if (activeSheetId === id) {
            setActiveSheetId(sheets[0].id);
        }
    };
    
    const updateSheetName = (id: string, name: string) => {
        setSheets(prev => prev.map(s => s.id === id ? { ...s, name } : s));
    };

    const handleColumnToggle = (key: string) => {
        setSheets(prev => prev.map(sheet => {
            if (sheet.id !== activeSheetId) return sheet;
            const newColumns = [...sheet.columns];
            const keyIndex = newColumns.findIndex(c => c.key === key);
            if (keyIndex > -1) {
                newColumns.splice(keyIndex, 1);
            } else {
                const columnToAdd = ALL_COLUMNS.find(c => c.key === key);
                if (columnToAdd) {
                    newColumns.push(columnToAdd);
                }
            }
            return { ...sheet, columns: newColumns };
        }));
    };
    
    const moveColumn = (dragIndex: number, hoverIndex: number) => {
        setSheets(prev => prev.map(sheet => {
            if (sheet.id !== activeSheetId) return sheet;
            const newColumns = [...sheet.columns];
            const draggedColumn = newColumns[dragIndex];
            newColumns.splice(dragIndex, 1);
            newColumns.splice(hoverIndex, 0, draggedColumn);
            return { ...sheet, columns: newColumns };
        }));
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const response = await fetch('/api/exports/faction-roster', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sheets, filters }),
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
                            Configure multiple sheets, select columns, and apply filters for your custom XLSX export.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1 space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Available Columns</h3>
                                    <div className="space-y-2 p-2 border rounded-md max-h-96 overflow-y-auto">
                                        {ALL_COLUMNS.map(col => (
                                            <div key={col.key} className="flex items-center space-x-2">
                                                <Checkbox 
                                                    id={`col-${col.key}`} 
                                                    checked={selectedColumnKeys.has(col.key)} 
                                                    onCheckedChange={() => handleColumnToggle(col.key)}
                                                    disabled={!activeSheet}
                                                />
                                                <Label htmlFor={`col-${col.key}`} className="cursor-pointer">{col.label}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                     <h3 className="font-semibold mb-2">Filters</h3>
                                     <div className="space-y-4 p-4 border rounded-md">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox 
                                                id="filter-alts"
                                                checked={filters.onlyWithAlts}
                                                onCheckedChange={(checked) => setFilters(f => ({ ...f, onlyWithAlts: !!checked }))}
                                            />
                                            <Label htmlFor="filter-alts">Only include characters with alts</Label>
                                        </div>
                                         <div className="flex items-center space-x-2">
                                            <Checkbox 
                                                id="filter-abas"
                                                checked={filters.belowMinimumAbas}
                                                onCheckedChange={(checked) => setFilters(f => ({ ...f, belowMinimumAbas: !!checked }))}
                                            />
                                            <Label htmlFor="filter-abas">Only include members below minimum ABAS</Label>
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="filter-duty">Duty Activity</Label>
                                            <Select value={filters.dutyActiveDays} onValueChange={(value) => setFilters(f => ({ ...f, dutyActiveDays: value }))}>
                                                <SelectTrigger id="filter-duty">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="all">All Members</SelectItem>
                                                    <SelectItem value="7">Active in last 7 days</SelectItem>
                                                    <SelectItem value="14">Active in last 14 days</SelectItem>
                                                    <SelectItem value="30">Active in last 30 days</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor="filter-rank">Rank (Exact Match)</Label>
                                            <Input id="filter-rank" placeholder="e.g. Sergeant" onChange={(e) => setFilters(f => ({ ...f, rank: e.target.value || 'all' }))} />
                                        </div>
                                     </div>
                                </div>
                            </div>
                            <div className="lg:col-span-2">
                                <Tabs value={activeSheetId} onValueChange={setActiveSheetId}>
                                    <div className="flex items-center gap-2 border-b">
                                        <TabsList className="flex-1 justify-start h-auto rounded-none bg-transparent p-0">
                                            {sheets.map(sheet => (
                                                <TabsTrigger key={sheet.id} value={sheet.id} className="relative h-10 px-4">
                                                    <SheetIcon className="mr-2" />
                                                    {sheet.name}
                                                </TabsTrigger>
                                            ))}
                                        </TabsList>
                                        <Button variant="ghost" size="sm" onClick={addSheet}>
                                            <PlusCircle className="mr-2" />
                                            Add Sheet
                                        </Button>
                                    </div>
                                    {sheets.map(sheet => (
                                        <TabsContent key={sheet.id} value={sheet.id} className="mt-4">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Input value={sheet.name} onChange={(e) => updateSheetName(sheet.id, e.target.value)} className="font-semibold text-lg h-auto p-1 border-0 shadow-none focus-visible:ring-1 focus-visible:ring-ring" />
                                                <Button variant="ghost" size="icon" onClick={() => removeSheet(sheet.id)} className="h-8 w-8">
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                             <div className="space-y-2 p-2 border rounded-md min-h-48 max-h-96 overflow-y-auto">
                                                <AnimatePresence>
                                                    {sheet.columns.map((col, i) => (
                                                        <motion.div layout key={col.key} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                                                            <DraggableColumn col={col} index={i} moveColumn={moveColumn} onRemove={handleColumnToggle} />
                                                        </motion.div>
                                                    ))}
                                                </AnimatePresence>
                                                {sheet.columns.length === 0 && (
                                                    <p className="text-sm text-center text-muted-foreground p-4">Select columns from the left to add them to this sheet.</p>
                                                )}
                                            </div>
                                        </TabsContent>
                                    ))}
                                </Tabs>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button onClick={handleExport} disabled={isExporting || sheets.every(s => s.columns.length === 0)}>
                            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                            Export as XLSX
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        </DndProvider>
    );
}
