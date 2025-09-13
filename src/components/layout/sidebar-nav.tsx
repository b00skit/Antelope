
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  Settings,
  LifeBuoy,
  Gavel,
  FileText,
  BookOpen,
  Landmark,
  Archive,
  ExternalLink,
  Github,
  Bell,
  MessageSquare,
  Map,
  History,
  LogOut,
  User,
  Users,
  ClipboardList,
  Search
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useEffect } from 'react';

import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
  SidebarMenuBadge,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import announcementsData from '../../../data/announcements.json';
import { FeedbackDialog } from '../dashboard/feedback-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu"
import { useSession } from '@/hooks/use-session';
import { Input } from '../ui/input';
  

type SiteConfig = {
  SITE_NAME: string;
  SITE_FAVICON: string;
  URL_GITHUB: string;
};

export function SidebarNav() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [config, setConfig] = useState<SiteConfig | null>(null);
  const { state } = useSidebar();
  const [unreadCount, setUnreadCount] = useState(0);
  const [isFeedbackDialogOpen, setIsFeedbackDialogOpen] = useState(false);
  const { session, isLoading } = useSession();
  const router = useRouter();
  const [characterSearch, setCharacterSearch] = useState('');


  useEffect(() => {
    setMounted(true);
    setConfig({
      SITE_NAME: 'Faction Panel+',
      SITE_FAVICON: '/img/logos/MDC-Panel-Favicon.svg',
      URL_GITHUB: 'https://github.com/b00skit/MDC-Panel-plus',
    });
  }, []);

  useEffect(() => {
    const handleStorageChange = () => {
      if (typeof window !== 'undefined') {
        const lastReadId = parseInt(localStorage.getItem('last_read_announcement') || '0', 10);
        const newUnreadCount = announcementsData.announcements.filter(ann => ann.id > lastReadId).length;
        setUnreadCount(newUnreadCount);
      }
    };
    
    handleStorageChange(); // Initial check
    
    window.addEventListener('storage', handleStorageChange);

    return () => {
        window.removeEventListener('storage', handleStorageChange);
    };
  }, [pathname]);


  const isActive = (path: string, exact: boolean = false) => {
    if (exact) return pathname === path;
    if (path === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(path);
  };

  const siteName = config?.SITE_NAME.replace('+', '') || 'MDC Panel';

  const handleLogout = () => {
    router.push('/api/auth/logout');
  }

  const handleCharacterSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (characterSearch.trim()) {
        const formattedName = characterSearch.trim().replace(/\s+/g, '_');
        router.push(`/character-sheets/${formattedName}`);
    }
  }

  const UserButton = () => {
    if (isLoading) {
        return <SidebarMenuButton tooltip="Loading...">...</SidebarMenuButton>;
    }

    if (session?.isLoggedIn) {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <SidebarMenuButton tooltip={session.username}>
                        <User />
                        <span>{session.username}</span>
                    </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="right" align="start">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }
    
    return (
        <SidebarMenuButton asChild tooltip="Login">
            <Link href="/login">
                <User />
                <span>Login</span>
            </Link>
        </SidebarMenuButton>
    )
  }

  const showActivityRosters = session?.hasActiveFaction && session.activeFaction?.feature_flags?.activity_rosters_enabled;
  const showCharacterSheets = session?.hasActiveFaction && session.activeFaction?.feature_flags?.character_sheets_enabled;
  const canManageFaction = session?.hasActiveFaction && session?.factionRank && session?.activeFaction && session.factionRank >= (session.activeFaction.moderation_rank || 15);


  return (
    <>
      <FeedbackDialog open={isFeedbackDialogOpen} onOpenChange={setIsFeedbackDialogOpen} />
      <SidebarHeader>
        <div className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Link href="/dashboard" className="flex items-center gap-2">
              <Image
                src={
                  config?.SITE_FAVICON || '/img/logos/MDC-Panel-Favicon.svg'
                }
                width={40}
                height={40}
                alt="MDC Panel Logo"
              />
            </Link>
            {state === 'expanded' && (
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-semibold font-headline">
                  {siteName}
                </span>
                <span className="text-2xl font-bold text-primary drop-shadow-[0_0_3px_hsl(var(--primary)/0.5)]">
                  +
                </span>
              </div>
            )}
          </div>
          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        {showCharacterSheets && (
            <div className={cn("p-2", state === 'collapsed' && 'hidden')}>
                 <form onSubmit={handleCharacterSearch}>
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Find Character..."
                            className="pl-8 h-9"
                            value={characterSearch}
                            onChange={(e) => setCharacterSearch(e.target.value)}
                        />
                    </div>
                </form>
            </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/dashboard')}
              tooltip="Dashboard"
            >
              <Link href="/dashboard">
                <LayoutGrid />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {showActivityRosters && (
            <SidebarMenuItem>
                <SidebarMenuButton
                asChild
                isActive={isActive('/activity-rosters')}
                tooltip="Activity Rosters"
                >
                <Link href="/activity-rosters">
                    <ClipboardList />
                    <span>Activity Rosters</span>
                </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-2">
        <Separator className="my-2" />
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                asChild
                isActive={isActive('/factions', true)}
                tooltip="Factions"
                >
                <Link href="/factions">
                    <Users />
                    <span>Factions</span>
                </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
            {canManageFaction && (
                 <SidebarMenuItem>
                    <SidebarMenuButton
                        asChild
                        isActive={isActive('/factions/manage')}
                        tooltip="Faction Administration"
                    >
                        <Link href={`/factions/manage/${session.activeFaction?.id}`}>
                            <Settings />
                            <span>Faction Administration</span>
                        </Link>
                    </SidebarMenuButton>
                 </SidebarMenuItem>
            )}
        </SidebarMenu>
        <Separator className="my-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            <UserButton />
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setIsFeedbackDialogOpen(true)}
              tooltip="Help &amp; Feedback"
            >
              <LifeBuoy />
              <span>Help &amp; Feedback</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive('/announcements')}
              tooltip="Announcements"
            >
              <Link href="/announcements">
                <Bell />
                <span>Announcements</span>
                {unreadCount > 0 && (
                    <SidebarMenuBadge className="bg-destructive text-destructive-foreground">{unreadCount}</SidebarMenuBadge>
                )}
                 {state === 'collapsed' && unreadCount > 0 && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
                )}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
             <SidebarMenuButton
                asChild
                tooltip="Github"
             >
                <Link href={config?.URL_GITHUB || '#'} target="_blank">
                    <Github />
                    <span>Github</span>
                </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  );
}
