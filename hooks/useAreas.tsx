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
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available');
      }

      const { data, error } = await supabase
        .from('areas')
        .insert({
          ...area,
          tenant_id: profile.tenant_id,
          is_active: true
        })
        .select(`
          *,
          user_profiles!areas_manager_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) throw error;

      await fetchAreas();
      return { data, error: null };
    } catch (err) {
      logger.error('Error creating area', err as Error, { service: 'useAreas', action: 'createArea' });
      return { data: null, error: err instanceof Error ? err : new Error('Failed to create area') };
    }
  };

  const updateArea = async (id: string, updates: Partial<Area>) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available');
      }

      // Ensure we only update areas within the same tenant
      const { data, error } = await supabase
        .from('areas')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)  // Tenant filtering
        .select(`
          *,
          user_profiles!areas_manager_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) throw error;

      await fetchAreas();
      return { data, error: null };
    } catch (err) {
      logger.error('Error updating area', err as Error, { service: 'useAreas', action: 'updateArea', areaId: id });
      return { data: null, error: err instanceof Error ? err : new Error('Failed to update area') };
    }
  };

  const deleteArea = async (id: string) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available');
      }

      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('areas')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id);  // Tenant filtering

      if (error) throw error;

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
    // Set up real-time subscription with tenant filtering
    if (!profile?.tenant_id) return;

    const channel = supabase.channel('areas-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'areas',
          filter: `tenant_id=eq.${profile.tenant_id}`  // Filter real-time updates by tenant
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
  }, [supabase, profile?.tenant_id]);

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