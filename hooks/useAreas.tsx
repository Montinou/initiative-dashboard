"use client"

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { logger } from '@/lib/logger';
import type { Area } from '@/lib/types/database';

export function useAreas(options?: { includeStats?: boolean }) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();
  const { profile, session } = useAuth();
  const hasFetched = useRef(false);

  const fetchAreas = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('useAreas: Fetching areas');

      // Build query params
      const params = new URLSearchParams();
      if (options?.includeStats) {
        params.append('includeStats', 'true');
      }

      // Use the API endpoint like objectives does
      const response = await fetch(`/api/areas?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch areas: ${response.status}`);
      }

      const data = await response.json();

      setAreas(data.areas || []);
      console.log('useAreas: Successfully fetched', data.areas?.length || 0, 'areas');
    } catch (err) {
      logger.error('Error fetching areas', err as Error, { service: 'useAreas' });
      setError(err instanceof Error ? err : new Error('Failed to fetch areas'));
      setAreas([]);
    } finally {
      setLoading(false);
    }
  }, [options?.includeStats]); // API handles tenant filtering via cookies

  const createArea = async (area: {
    name: string;
    description?: string;
    manager_id?: string;
  }) => {
    try {
      // Use API endpoint for consistency - RLS handles tenant filtering
      const response = await fetch('/api/areas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(area),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to create area: ${response.status}`);
      }

      const data = await response.json();
      await fetchAreas();
      return { data, error: null };
    } catch (err) {
      logger.error('Error creating area', err as Error, { service: 'useAreas', action: 'createArea' });
      return { data: null, error: err instanceof Error ? err : new Error('Failed to create area') };
    }
  };

  const updateArea = async (id: string, updates: Partial<Area>) => {
    try {
      // Use API endpoint for consistency - RLS handles tenant filtering
      const response = await fetch(`/api/areas/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update area: ${response.status}`);
      }

      const data = await response.json();
      await fetchAreas();
      return { data, error: null };
    } catch (err) {
      logger.error('Error updating area', err as Error, { service: 'useAreas', action: 'updateArea', areaId: id });
      return { data: null, error: err instanceof Error ? err : new Error('Failed to update area') };
    }
  };

  const deleteArea = async (id: string) => {
    try {
      // Use API endpoint for consistency - RLS handles tenant filtering
      const response = await fetch(`/api/areas/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to delete area: ${response.status}`);
      }

      await fetchAreas();
      return { error: null };
    } catch (err) {
      logger.error('Error deleting area', err as Error, { service: 'useAreas', action: 'deleteArea', areaId: id });
      return { error: err instanceof Error ? err : new Error('Failed to delete area') };
    }
  };

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchAreas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Set up real-time subscription
    // RLS automatically filters real-time updates by tenant
    const channel = supabase.channel('areas-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'areas'
          // RLS handles tenant filtering automatically
        }, 
        () => {
          fetchAreas();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  return {
    areas,
    isLoading: loading,
    error,
    createArea,
    updateArea,
    deleteArea,
    refetch: fetchAreas
  };
}