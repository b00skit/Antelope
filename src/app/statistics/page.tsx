
'use client';

import { useState, useEffect } from 'react';
import { useSession } from '@/hooks/use-session';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, Sector } from 'recharts';
import { AlertTriangle, Loader2, Users, Clock, Activity, Crown, AlertCircle, UserCheck } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { ChartConfig, ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import { ScrollArea } from '../ui/scroll-area';
import { cn } from '@/lib/utils';

interface StatsData {
    totalMembers: number;
    totalUniqueMembers: number;
    activeLast7Days: number;
    averageAbas: number;
    rankDistribution: { name: string, count: number, fill: string }[];
    topPerformers: any[];
    belowMinimum: any[];
    lastSync: string;
}

const StatCard = ({ title, value, icon, description }: { title: string; value: string | number; icon: React.ReactNode; description: string; }) => (
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

const StatCardSkeleton = () => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
             <Skeleton className="h-4 w-2/3" />
             <Skeleton className="h-6 w-6" />
        </CardHeader>
        <CardContent>
             <Skeleton className="h-8 w-1/3 mb-2" />
             <Skeleton className="h-3 w-full" />
        </CardContent>
    </Card>
);

const CHART_COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#0088fe", "#00c49f", "#ffbb28", "#ff8042", "#a4de6c", "#d0ed57", "#ffc658", "#fd7f6f", "#7eb0d5", "#b2e061", "#bd7ebe", "#ffb55a", "#ffee65", "#beb9db", "#fdcce5", "#8bd3c7"];


export default function StatisticsPage() {
    const { session } = useSession();
    const [stats, setStats] = useState<StatsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [inactiveRanks, setInactiveRanks] = useState<string[]>([]);

    const chartConfig = React.useMemo(() => {
        if (!stats) return {};
        const config: ChartConfig = {};
        stats.rankDistribution.forEach(rank => {
            config[rank.name] = {
                label: rank.name,
                color: rank.fill,
            };
        });
        return config;
    }, [stats]);


    useEffect(() => {
        if (session?.hasActiveFaction) {
            const fetchStats = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const res = await fetch('/api/statistics');
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed to fetch stats');
                    
                    const rankDistributionWithColors = data.rankDistribution.map((rank: any, index: number) => ({
                        ...rank,
                        fill: CHART_COLORS[index % CHART_COLORS.length]
                    }));

                    setStats({ ...data, rankDistribution: rankDistributionWithColors });
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsLoading(false);
                }
            };
            fetchStats();
        }
    }, [session]);
    
    if (isLoading) {
        return (
            <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
                 <PageHeader title="Faction Statistics" description="Loading data..." />
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                     <StatCardSkeleton />
                     <StatCardSkeleton />
                     <StatCardSkeleton />
                     <StatCardSkeleton />
                 </div>
                 <Skeleton className="h-[400px] w-full" />
                 <Skeleton className="h-[200px] w-full" />
            </div>
        )
    }
    
     if (error) {
        return (
            <div className="container mx-auto p-4 md:p-6 lg:p-8">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Could not load statistics</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!stats) return null;
    
    const filteredRankDistribution = stats.rankDistribution.filter(rank => !inactiveRanks.includes(rank.name));

    return (
        <div className="container mx-auto p-4 md:p-6 lg:p-8 space-y-6">
            <PageHeader
                title="Faction Statistics"
                description={`An overview of ${session?.activeFaction?.name}.`}
            />
            
            <p className="text-sm text-muted-foreground">
                Last synced with GTA:World: {stats.lastSync ? formatDistanceToNow(new Date(stats.lastSync)) : 'N/A'} ago.
            </p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Characters" value={stats.totalMembers} icon={<Users className="h-4 w-4 text-muted-foreground" />} description="Total count of all faction characters." />
                <StatCard title="Unique Members" value={stats.totalUniqueMembers} icon={<UserCheck className="h-4 w-4 text-muted-foreground" />} description="Total members, excluding alts." />
                <StatCard title="Active Members" value={stats.activeLast7Days} icon={<Clock className="h-4 w-4 text-muted-foreground" />} description="Members on duty in the last 7 days." />
                <StatCard title="Average ABAS" value={stats.averageAbas.toFixed(2)} icon={<Activity className="h-4 w-4 text-muted-foreground" />} description="Average weekly ABAS per character." />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Rank Distribution</CardTitle>
                    <CardDescription>Number of members per rank. Click a rank to toggle its visibility.</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <ChartContainer config={chartConfig} className="h-[350px] w-full">
                        <PieChart>
                            <Tooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
                            <Pie
                                data={filteredRankDistribution}
                                dataKey="count"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={120}
                                innerRadius={60}
                            >
                                {filteredRankDistribution.map((entry) => (
                                    <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ChartContainer>
                    <ScrollArea className="h-[300px] pr-4">
                         <div className="space-y-2">
                             {stats.rankDistribution.map(rank => (
                                <div 
                                    key={rank.name}
                                    onClick={() => {
                                        setInactiveRanks(prev => 
                                            prev.includes(rank.name)
                                                ? prev.filter(r => r !== rank.name)
                                                : [...prev, rank.name]
                                        )
                                    }}
                                    className={cn(
                                        "flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors",
                                        inactiveRanks.includes(rank.name) ? "opacity-50 bg-muted/50" : "hover:bg-muted/50"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: rank.fill }} />
                                        <span className="text-sm font-medium">{rank.name}</span>
                                    </div>
                                    <span className="text-sm text-muted-foreground font-semibold">{rank.count}</span>
                                </div>
                             ))}
                         </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><Crown className="mr-2 text-yellow-500" /> Top 10 Performers</CardTitle>
                        <CardDescription>Members with the highest weekly ABAS.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Member</TableHead>
                                    <TableHead className="text-right">ABAS</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.topPerformers.map(member => (
                                    <TableRow key={member.character_id}>
                                        <TableCell>
                                            <Link href={`/character-sheets/${member.character_name.replace(/ /g, '_')}`} className="hover:underline text-primary">
                                                {member.character_name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-right font-medium">{member.abas.toFixed(2)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center"><AlertCircle className="mr-2 text-orange-500" /> Below Minimum ABAS</CardTitle>
                        <CardDescription>Members who have not met their required weekly ABAS.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Member</TableHead>
                                    <TableHead className="text-right">ABAS / Required</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {stats.belowMinimum.length > 0 ? stats.belowMinimum.map(member => (
                                    <TableRow key={member.character_id}>
                                        <TableCell>
                                             <Link href={`/character-sheets/${member.character_name.replace(/ /g, '_')}`} className="hover:underline text-primary">
                                                {member.character_name}
                                            </Link>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="font-medium text-red-500">{member.abas.toFixed(2)}</span>
                                            <span className="text-muted-foreground"> / {member.requiredAbas.toFixed(2)}</span>
                                        </TableCell>
                                    </TableRow>
                                )) : (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center">Everyone is meeting their minimums!</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
