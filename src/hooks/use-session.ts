'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSessionStore } from '@/stores/session-store';

export function useSession() {
  const pathname = usePathname();
  const { session, isLoading, fetchSession } = useSessionStore();

  useEffect(() => {
    fetchSession();
  }, [pathname, fetchSession]);

  return { session, isLoading, refreshSession: fetchSession };
}
