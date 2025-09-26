
'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from "@/components/dashboard/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Loader2, DollarSign, Calendar, Users, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis } from 'recharts';
import { useSession } from '@/hooks/use-session';
import { useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Rank {
    rank_id: number;
    rank_name: string;
    rank_wage: number;
}

interface FiscalData {
    ranks: Rank[];
    membersByRank: Record<number, number>;
    totalMembers: number;
    membersWithAbas: { rank: number; abas: number }[];
}

const StatCard = ({ title, value, icon, description }: { title: string; value: string; icon: React.ReactNode; description: string; }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            {icon}
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{description}</p>
        </CardContent>
    </Card>
);

export default function FiscalPage() {
    const { session } = useSession();
    const router = useRouter();
    const [data, setData] = useState<FiscalData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [rankPay, setRankPay] = useState<Record<number, { wage: number; included: boolean }>>({});
    const [memberAdjustment, setMemberAdjustment] = useState(0);
    const [calculationMode, setCalculationMode] = useState<'absolute' | 'relative'>('absolute');

    const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/fiscal/data');
            const result = await res.json();
            if (!res.ok) {
                if(result.reauth) router.push('/api/auth/logout');
                throw new Error(result.error);
            }
            setData(result);

            const initialPay: Record<number, { wage: number, included: boolean }> = {};
            const gtawRanks = new Map((result.ranks || []).map((r: Rank) => [r.rank_id, r.rank_wage]));

            for (let i = 1; i <= 15; i++) {
                initialPay[i] = {
                    wage: gtawRanks.get(i) || 0,
                    included: true,
                };
            }
            setRankPay(initialPay);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (session?.hasActiveFaction) {
            fetchData();
        }
    }, [session]);

    const handleWageChange = (rankId: number, value: string) => {
        const wage = parseInt(value, 10) || 0;
        setRankPay(prev => ({
            ...prev,
            [rankId]: { ...prev[rankId], wage },
        }));
    };

    const handleIncludeToggle = (rankId: number, checked: boolean) => {
        setRankPay(prev => ({
            ...prev,
            [rankId]: { ...prev[rankId], included: checked },
        }));
    };
    
    const { weeklyTotal, projections, chartData } = useMemo(() => {
        if (!data) return { weeklyTotal: 0, projections: {}, chartData: [] };

        let weeklyTotal = 0;
        const includedRanks = Object.entries(rankPay)
            .filter(([, payInfo]) => payInfo.included)
            .map(([rankId]) => parseInt(rankId, 10));

        if (calculationMode === 'absolute') {
            weeklyTotal = includedRanks.reduce((total, rankId) => {
                const memberCount = data.membersByRank[rankId] || 0;
                const wage = rankPay[rankId].wage;
                return total + (memberCount * wage * 20); // 20 hours max
            }, 0);
        } else { // Relative
            weeklyTotal = data.membersWithAbas
                .filter(member => includedRanks.includes(member.rank))
                .reduce((total, member) => {
                    const wage = rankPay[member.rank].wage;
                    const hours = Math.min(member.abas, 20); // Cap at 20 hours
                    return total + (hours * wage);
                }, 0);
        }
        
        const currentMemberCount = includedRanks.reduce((sum, rankId) => sum + (data.membersByRank[rankId] || 0), 0);
        const averageWeeklyPay = currentMemberCount > 0 ? weeklyTotal / currentMemberCount : 0;
        const adjustedWeeklyTotal = weeklyTotal + (memberAdjustment * averageWeeklyPay);

        const roundedWeekly = Math.ceil(adjustedWeeklyTotal);

        const projections = {
            monthly: Math.ceil(roundedWeekly * 4),
            quarterly: Math.ceil(roundedWeekly * 4 * 3),
            yearly: Math.ceil(roundedWeekly * 52),
        };

        const chartData = [
            { name: 'Weekly', value: roundedWeekly, fill: 'var(--color-weekly)' },
            { name: 'Monthly', value: projections.monthly, fill: 'var(--color-monthly)' },
            { name: 'Quarterly', value: projections.quarterly, fill: 'var(--color-quarterly)' },
            { name: 'Yearly', value: projections.yearly, fill: 'var(--color-yearly)' },
        ];
        
        return { weeklyTotal: roundedWeekly, projections, chartData };
    }, [data, rankPay, memberAdjustment, calculationMode]);
    
    const chartConfig = {
      value: { label: 'Amount ($)' },
      weekly: { label: 'Weekly', color: 'hsl(var(--chart-1))' },
      monthly: { label: 'Monthly', color: 'hsl(var(--chart-2))' },
      quarterly: { label: 'Quarterly', color: 'hsl(var(--chart-3))' },
      yearly: { label: 'Yearly', color: 'hsl(var(--chart-4))' },
    } as const;

    if (isLoading) {
        return (
            <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
                <PageHeader title="Fiscal Projections" description="Loading financial data..." />
                <Skeleton className="h-96 w-full" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
                <Alert variant="destructive">
                    <AlertTriangle />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <PageHeader title="Fiscal Projections" description="Calculate your faction's payroll expenses." />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Rank Paychecks</CardTitle>
                            <CardDescription>Set the hourly wage for each rank. Toggling 'Include' will add or remove them from calculations.</CardDescription>
                        </CardHeader>
                        <CardContent className="max-h-[500px] overflow-y-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Rank</TableHead>
                                        <TableHead>Wage/hr</TableHead>
                                        <TableHead>Include</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Object.entries(rankPay).map(([rankIdStr, payInfo]) => {
                                        const rankId = parseInt(rankIdStr, 10);
                                        return (
                                            <TableRow key={rankId}>
                                                <TableCell className="font-medium">{rankId}</TableCell>
                                                <TableCell>
                                                    <Input type="number" value={payInfo.wage} onChange={(e) => handleWageChange(rankId, e.target.value)} className="h-8" />
                                                </TableCell>
                                                <TableCell>
                                                    <Switch checked={payInfo.included} onCheckedChange={(checked) => handleIncludeToggle(rankId, checked)} />
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>Member Adjustment</CardTitle>
                            <CardDescription>Simulate changes in faction membership to see the financial impact.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center font-medium">
                                    <span>Current: {data.totalMembers}</span>
                                    <span>Adjusted: {data.totalMembers + memberAdjustment}</span>
                                </div>
                                <Slider
                                    defaultValue={[0]}
                                    min={-50}
                                    max={50}
                                    step={1}
                                    onValueChange={(value) => setMemberAdjustment(value[0])}
                                />
                                <p className="text-center text-lg font-bold">{memberAdjustment >= 0 ? '+' : ''}{memberAdjustment} Members</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2 space-y-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Calculation Mode</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <Tabs value={calculationMode} onValueChange={(v) => setCalculationMode(v as any)}>
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="absolute">Absolute</TabsTrigger>
                                    <TabsTrigger value="relative">Relative</TabsTrigger>
                                </TabsList>
                                <TabsContent value="absolute" className="pt-2">
                                    <p className="text-sm text-muted-foreground">Calculates payroll assuming every included member works the maximum of 20 hours per week.</p>
                                </TabsContent>
                                <TabsContent value="relative" className="pt-2">
                                    <p className="text-sm text-muted-foreground">Calculates payroll based on each member's actual weekly ABAS (activity), capped at 20 hours.</p>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                         <StatCard title="Weekly Payroll" value={`$${weeklyTotal.toLocaleString()}`} icon={<DollarSign className="text-muted-foreground" />} description="Total estimated weekly cost." />
                         <StatCard title="Monthly Payroll" value={`$${projections.monthly.toLocaleString()}`} icon={<Calendar className="text-muted-foreground" />} description="Based on 4 weeks." />
                         <StatCard title="Total Members" value={`${data.totalMembers + memberAdjustment}`} icon={<Users className="text-muted-foreground" />} description="Adjusted total member count." />
                         <StatCard title="Yearly Payroll" value={`$${projections.yearly.toLocaleString()}`} icon={<TrendingUp className="text-muted-foreground" />} description="Based on 52 weeks." />
                    </div>
                     <Card>
                        <CardHeader>
                            <CardTitle>Expense Projections</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <ChartContainer config={chartConfig} className="h-80 w-full">
                                <BarChart accessibilityLayer data={chartData}>
                                    <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} />
                                     <YAxis 
                                        tickFormatter={(value) => `$${(Number(value) / 1000).toLocaleString()}k`}
                                        tickLine={false}
                                        axisLine={false}
                                    />
                                    <ChartTooltip content={<ChartTooltipContent />} />
                                    <Bar dataKey="value" radius={8} />
                                </BarChart>
                             </ChartContainer>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
