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
    function getCookie(name: string) {
      if (typeof document === 'undefined') return null;
      const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
      return match ? decodeURIComponent(match[1]) : null;
    }
    async function fetchSession() {
      setIsLoading(true);
      try {
        const csrf = getCookie('csrf-token') || '';
        const response = await fetch('/api/auth/session', {
          headers: {
            'x-csrf-token': csrf,
          },
          credentials: 'include',
        });
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
