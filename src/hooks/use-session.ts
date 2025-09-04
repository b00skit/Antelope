'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface Session {
  isLoggedIn: boolean;
  username?: string;
}

export function useSession() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    async function fetchSession() {
      setIsLoading(true);
      try {
        const response = await fetch('/api/auth/session');
        const data = await response.json();
        setSession(data);
      } catch (error) {
        console.error('Failed to fetch session', error);
        setSession({ isLoggedIn: false });
      } finally {
        setIsLoading(false);
      }
    }
    fetchSession();
  }, [pathname]);

  return { session, isLoading };
}
