
'use client';

import { create } from 'zustand';

interface Faction {
  id: number;
  name: string;
  color: string | null;
  access_rank: number | null;
  administration_rank: number | null;
  supervisor_rank: number | null;
  minimum_abas: number | null;
  minimum_supervisor_abas: number | null;
  feature_flags: {
    activity_rosters_enabled?: boolean;
    character_sheets_enabled?: boolean;
    statistics_enabled?: boolean;
  } | null;
}

interface Session {
  isLoggedIn: boolean;
  username?: string;
  role?: string;
  hasActiveFaction?: boolean;
  activeFaction?: Faction | null;
  factionRank?: number | null;
}

interface SessionState {
  session: Session | null;
  isLoading: boolean;
  fetchSession: () => Promise<void>;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  isLoading: true,
  fetchSession: async () => {
    set({ isLoading: true });
    try {
      const response = await fetch('/api/auth/session', { cache: 'no-store' });
      const data = await response.json();
      set({ session: data });
    } catch (error) {
      console.error('Failed to fetch session', error);
      set({ session: { isLoggedIn: false, hasActiveFaction: false } });
    } finally {
      set({ isLoading: false });
    }
  },
}));
