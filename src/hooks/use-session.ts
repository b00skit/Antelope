'use client';

import { useState, useEffect, useCallback } from 'react';
import { usePathname } from 'next/navigation';

interface Faction {
    id: number;
    name: string;
    color: string | null;
    access_rank: number | null;
    moderation_rank: number | null;
    feature_flags: {
        activity_rosters_enabled?: boolean;
        character_sheets_enabled?: boolean;
    } | null;
}
interface Session {
  isLoggedIn: boolean;
  username?: string;
  role?: string;
  hasActiveFaction?: boolean;
  activeFaction?: Faction | null;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  const fetchSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      setSession(data);
    } catch (error) {
      console.error('Failed to fetch session', error);
      setSession({ isLoggedIn: false, hasActiveFaction: false });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [pathname, fetchSession]);

  return { session, isLoading, refreshSession: fetchSession };
}
