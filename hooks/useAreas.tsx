"use client"

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { logger } from '@/lib/logger';
import type { Area } from '@/lib/types/database';

export function useAreas(options?: { includeStats?: boolean }) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();
  const { profile, loading: authLoading, session } = useAuth();

  const fetchAreas = useCallback(async () => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      logger.debug('useAreas: Auth still loading, waiting...', { service: 'useAreas' });
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check for tenant context first
      if (!profile?.tenant_id) {
        logger.debug('useAreas: No tenant ID available yet', { service: 'useAreas' });
        setAreas([]);
        setLoading(false);
        return;
      }

      // Build the select query based on options
      let selectQuery = `
        id,
        name,
        description,
        manager_id,
        is_active,
        created_at,
        updated_at,
        user_profiles!areas_manager_id_fkey(
          id,
          full_name,
          email
        )
      `;

      // Add stats if requested
      if (options?.includeStats) {
        // Stats will be calculated from the initiatives table
        selectQuery += `,
        initiatives:initiatives!areas_area_id_fkey(count)`;
      }

      // Query with tenant filtering for security
      const { data, error: fetchError } = await supabase
        .from('areas')
        .select(selectQuery)
        .eq('tenant_id', profile.tenant_id)  // Tenant filtering
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setAreas(data || []);
    } catch (err) {
      logger.error('Error fetching areas', err as Error, { service: 'useAreas' });
      setError(err instanceof Error ? err : new Error('Failed to fetch areas'));
      setAreas([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, profile?.tenant_id, options?.includeStats, authLoading]);

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
    // Only fetch if we have both authentication and tenant info
    if (session?.user && profile?.tenant_id) {
      logger.debug('useAreas: Fetching areas with authenticated session and profile', { service: 'useAreas' });
      fetchAreas();
    } else if (session?.user && !profile?.tenant_id) {
      // User is authenticated but profile not loaded yet - wait
      logger.debug('useAreas: Waiting for profile to load...', { service: 'useAreas' });
      setLoading(true);
      setError(null); // Clear any previous errors while waiting
    } else if (!session?.user) {
      // No user session, set loading to false only if auth is not loading
      logger.debug('useAreas: No authenticated user session', { service: 'useAreas' });
      setLoading(false);
      setError(new Error('Not authenticated'));
    }
  }, [session?.user, profile?.tenant_id, fetchAreas]);

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
  }, [supabase, profile?.tenant_id, fetchAreas]);

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