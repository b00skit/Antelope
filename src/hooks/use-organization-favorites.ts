
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from './use-session';
import { useToast } from './use-toast';

export interface FavoriteOrganization {
  id: number;
  category_id: number;
  category_type: 'cat_2' | 'cat_3';
  category_name: string;
  category_path: string;
}

const ORG_FAVORITES_UPDATED_EVENT = 'orgFavoritesUpdated';

export function useOrganizationFavorites() {
  const { session } = useSession();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<FavoriteOrganization[]>([]);

  const fetchFavorites = useCallback(async () => {
    if (!session?.hasActiveFaction) {
      setFavorites([]);
      return;
    }
    try {
      const res = await fetch('/api/units-divisions/favorites');
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites || []);
      }
    } catch (error) {
      console.error('Failed to fetch organization favorites', error);
    }
  }, [session?.hasActiveFaction, session?.activeFaction?.id]);

  useEffect(() => {
    fetchFavorites();

    const handleUpdate = () => fetchFavorites();
    window.addEventListener(ORG_FAVORITES_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(ORG_FAVORITES_UPDATED_EVENT, handleUpdate);
  }, [fetchFavorites]);

  const toggleFavorite = async (category_type: 'cat_2' | 'cat_3', category_id: number) => {
    try {
      const res = await fetch(`/api/units-divisions/favorite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category_type, category_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      toast({ title: 'Success', description: data.message });
      window.dispatchEvent(new CustomEvent(ORG_FAVORITES_UPDATED_EVENT));
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err.message });
    }
  };

  return { favorites, toggleFavorite, refreshFavorites: fetchFavorites };
}
