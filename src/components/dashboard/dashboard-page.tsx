
"use client";

import * as React from 'react';
import { PageHeader } from './page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { X, Info, AlertTriangle, CheckCircle, ArrowRight, Users, User, BarChart, FileText, Star, Trophy } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '../ui/button';
import Link from 'next/link';
import { FeedbackDialog } from './feedback-dialog';
import { useSession } from '@/hooks/use-session';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Progress } from '../ui/progress';
import { formatDistanceToNow } from 'date-fns';

const ICONS: { [key: string]: React.ReactNode } = {
    Info: <Info className="h-4 w-4" />,
    AlertTriangle: <AlertTriangle className="h-4 w-4" />,
    CheckCircle: <CheckCircle className="h-4 w-4" />,
};

type Notice = {
    enabled: boolean;
    dismissible: boolean;
    variant: 'default' | 'destructive' | 'warning';
    icon: string;
    title: string;
    content: string;
    button?: {
        text: string;
        href?: string;
        type: 'href' | 'function';
        action?: 'open_feedback_dialog';
    }
} | null;

interface DashboardPageProps {
    notice: Notice;
}

interface DashboardData {
    userCharacters: {
        character_id: number;
        character_name: string;
        abas: number | null;
    }[];
    userTotalAbas: number;
    requiredAbas: number;
    factionAverageAbas: number;
    topPerformers: {
        character_name: string;
        abas: number | null;
    }[];
    recentRosters: {
        id: number;
        name: string;
        created_at: string;
    }[];
}

const WelcomeCard = () => (
    <Card>
        <CardHeader>
            <CardTitle>Welcome to the Panel!</CardTitle>
            <CardDescription>To get started, you need to select or enroll a faction.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
                This panel is designed to work with your GTA:World factions. Once you've joined a faction's panel, you'll get access to all the tools and features it has to offer.
            </p>
             <Alert>
                <Users className="h-4 w-4" />
                <AlertTitle>For Members</AlertTitle>
                <AlertDescription>
                    If your faction is already using this panel, head over to the factions page to join it.
                </AlertDescription>
            </Alert>
             <Alert variant="secondary">
                <Star className="h-4 w-4" />
                <AlertTitle>For Faction Leaders</AlertTitle>
                <AlertDescription>
                    If you hold a high rank (typically rank 15) in a GTA:World faction, you can enroll it here to make it available for all your members.
                </AlertDescription>
            </Alert>
        </CardContent>
        <CardFooter className="gap-4">
            <Button asChild>
                <Link href="/factions">View Factions</Link>
            </Button>
            <Button asChild variant="outline">
                <Link href="/factions/enroll">Enroll New Faction</Link>
            </Button>
        </CardFooter>
    </Card>
);


const DashboardSkeleton = () => (
     <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card className="lg:col-span-1">
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                </CardContent>
            </Card>
             <Card className="lg:col-span-2">
                <CardHeader><Skeleton className="h-6 w-3/4" /></CardHeader>
                <CardContent><Skeleton className="h-24 w-full" /></CardContent>
            </Card>
        </div>
        <Card>
            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
            <CardContent><Skeleton className="h-32 w-full" /></CardContent>
        </Card>
     </div>
);

const ActiveDashboard = ({ data, session }: { data: DashboardData, session: any }) => {
    const abasProgress = data.requiredAbas > 0 ? (data.userTotalAbas / data.requiredAbas) * 100 : 100;

    return (
         <div className="space-y-6">
            {/* User & Faction Stats */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                 <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><User /> Your Weekly Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <div className="flex justify-between items-baseline mb-1">
                                <span className="text-sm font-medium">Your Total ABAS</span>
                                <span className="text-sm text-muted-foreground">Required: {data.requiredAbas.toFixed(2)}</span>
                            </div>
                            <Progress value={abasProgress} />
                            <p className="text-right text-lg font-bold mt-1">{data.userTotalAbas.toFixed(2)}</p>
                        </div>
                         <div>
                            <h4 className="text-sm font-medium mb-2">Your Characters</h4>
                            <div className="space-y-2">
                                {data.userCharacters.map(char => (
                                    <div key={char.character_id} className="flex justify-between items-center text-sm p-2 rounded-md bg-muted/50">
                                        <span>{char.character_name}</span>
                                        <span className="font-mono">{char.abas?.toFixed(2) ?? '0.00'}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                 <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Trophy /> Faction Top Performers</CardTitle>
                        <CardDescription>Top 5 members by weekly ABAS.</CardDescription>
                    </CardHeader>
                    <CardContent>
                         <Table>
                             <TableHeader>
                                 <TableRow>
                                     <TableHead>#</TableHead>
                                     <TableHead>Member</TableHead>
                                     <TableHead className="text-right">ABAS</TableHead>
                                 </TableRow>
                             </TableHeader>
                             <TableBody>
                                 {data.topPerformers.map((p, i) => (
                                     <TableRow key={i}>
                                         <TableCell className="font-medium">{i + 1}</TableCell>
                                         <TableCell>{p.character_name}</TableCell>
                                         <TableCell className="text-right font-mono">{p.abas?.toFixed(2) ?? '0.00'}</TableCell>
                                     </TableRow>
                                 ))}
                             </TableBody>
                         </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Rosters */}
            {data.recentRosters.length > 0 && (
                 <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><FileText /> Your Recent Rosters</CardTitle>
                        <CardDescription>Quick access to the last 5 rosters you created.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                            {data.recentRosters.map(roster => (
                                <Link key={roster.id} href={`/activity-rosters/${roster.id}`}>
                                    <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors h-full flex flex-col justify-between">
                                        <h4 className="font-semibold truncate">{roster.name}</h4>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            Created {formatDistanceToNow(new Date(roster.created_at))} ago
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}

         </div>
    );
};


export function DashboardPage({ notice }: DashboardPageProps) {
  const { session, isLoading: isSessionLoading } = useSession();
  const [isNoticeVisible, setIsNoticeVisible] = React.useState(false);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = React.useState(false);
  const [dashboardData, setDashboardData] = React.useState<DashboardData | null>(null);
  const [isDataLoading, setIsDataLoading] = React.useState(true);

  React.useEffect(() => {
    if (notice?.enabled) {
        if(notice.dismissible) {
            const noticeDismissed = sessionStorage.getItem('notice_dismissed');
            if (noticeDismissed !== 'true') {
                setIsNoticeVisible(true);
            }
        } else {
            setIsNoticeVisible(true);
        }
    }
  }, [notice]);
  
  React.useEffect(() => {
    const fetchDashboardData = async () => {
        if (session?.hasActiveFaction) {
            setIsDataLoading(true);
            try {
                const res = await fetch('/api/dashboard');
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                setDashboardData(data);
            } catch (error) {
                console.error("Failed to fetch dashboard data:", error);
            } finally {
                setIsDataLoading(false);
            }
        } else if (!isSessionLoading) {
            setIsDataLoading(false);
        }
    };
    
    fetchDashboardData();
  }, [session, isSessionLoading]);

  const handleDismissNotice = () => {
    setIsNoticeVisible(false);
    sessionStorage.setItem('notice_dismissed', 'true');
  }

  const handleButtonClick = () => {
    if (notice?.button?.type === 'function' && notice.button.action === 'open_feedback_dialog') {
        setIsFeedbackDialogOpen(true);
    }
  };

  const NoticeIcon = notice?.icon ? ICONS[notice.icon] : null;

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
        <FeedbackDialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen} />
       {isNoticeVisible && notice && (
            <Alert variant={notice.variant || 'default'} className="mb-6">
                {notice.dismissible && (
                    <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={handleDismissNotice}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
                <div className="flex items-start gap-4">
                     {NoticeIcon}
                    <div className="flex-1">
                        <AlertTitle>{notice.title}</AlertTitle>
                        <AlertDescription>
                            {notice.content}
                        </AlertDescription>
                        {notice.button && (
                            <div className="mt-4">
                                {notice.button.type === 'href' && notice.button.href ? (
                                    <Button asChild>
                                        <Link href={notice.button.href}>
                                            {notice.button.text}
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Link>
                                    </Button>
                                ) : (
                                    <Button onClick={handleButtonClick}>
                                         {notice.button.text}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Alert>
       )}

      <PageHeader
        title={session?.hasActiveFaction ? `Welcome, ${session.username}` : "Dashboard"}
        description={session?.hasActiveFaction ? `Viewing dashboard for ${session.activeFaction?.name}` : "Welcome to Faction Panel+."}
      />
      
      {isSessionLoading || isDataLoading ? (
         <DashboardSkeleton />
      ) : session?.hasActiveFaction && dashboardData ? (
        <ActiveDashboard data={dashboardData} session={session} />
      ) : (
        <WelcomeCard />
      )}

    </div>
  );
}
