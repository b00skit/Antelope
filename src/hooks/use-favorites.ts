
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from './use-session';
import { useToast } from './use-toast';

export interface FavoriteRoster {
  id: number;
  activity_roster_id: number;
  activity_roster_name: string;
}

const FAVORITES_UPDATED_EVENT = 'favoritesUpdated';

export function useFavorites() {
  const { session } = useSession();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<FavoriteRoster[]>([]);

  const fetchFavorites = useCallback(async () => {
    if (!session?.hasActiveFaction) {
      setFavorites([]);
      return;
    }
    try {
      const res = await fetch('/api/rosters/favorites');
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
      }
    } catch (error) {
      console.error('Failed to fetch favorites', error);
    }
  }, [session?.hasActiveFaction, session?.activeFaction?.id]);

  useEffect(() => {
    fetchFavorites();

    const handleUpdate = () => fetchFavorites();
    window.addEventListener(FAVORITES_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(FAVORITES_UPDATED_EVENT, handleUpdate);
  }, [fetchFavorites]);

  const toggleFavorite = async (rosterId: number) => {
    try {
      const res = await fetch(`/api/rosters/${rosterId}/favorite`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast({ title: 'Success', description: data.message });
      // Dispatch event to notify other components (like the sidebar)
      window.dispatchEvent(new CustomEvent(FAVORITES_UPDATED_EVENT));
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  return { favorites, toggleFavorite, refreshFavorites: fetchFavorites };
}
