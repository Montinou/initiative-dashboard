"use client"

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { getAreaCache, cacheManager } from '@/lib/cache';
import { useAuth } from '@/lib/auth-context';
import { useUserProfile } from '@/hooks/useUserProfile';
import type { Area } from '@/types/database';

export function useAreas() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const { session } = useAuth();
  const { userProfile } = useUserProfile();

  const fetchAreas = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check for authentication
      if (!session?.user || !userProfile?.tenant_id) {
        setError('Authentication required');
        return;
      }

      // Query with tenant filtering for security
      const { data, error: fetchError } = await supabase
        .from('areas')
        .select(`
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
        `)
        .eq('tenant_id', userProfile.tenant_id)  // Add tenant filtering
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setAreas(data || []);
    } catch (err) {
      console.error('Error fetching areas:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createArea = async (area: {
    name: string;
    description?: string;
    manager_id?: string;
  }) => {
    try {
      if (!userProfile?.tenant_id) {
        throw new Error('Tenant ID not available');
      }

      const { data, error } = await supabase
        .from('areas')
        .insert({
          ...area,
          tenant_id: userProfile.tenant_id,  // Include tenant_id
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
      return data;
    } catch (err) {
      console.error('Error creating area:', err);
      throw err;
    }
  };

  const updateArea = async (id: string, updates: Partial<Area>) => {
    try {
      if (!userProfile?.tenant_id) {
        throw new Error('Tenant ID not available');
      }

      // Ensure we only update areas within the same tenant
      const { data, error } = await supabase
        .from('areas')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', userProfile.tenant_id)  // Add tenant filtering
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
      return data;
    } catch (err) {
      console.error('Error updating area:', err);
      throw err;
    }
  };

  const deleteArea = async (id: string) => {
    try {
      if (!userProfile?.tenant_id) {
        throw new Error('Tenant ID not available');
      }

      // Soft delete by setting is_active to false
      // Ensure we only delete areas within the same tenant
      const { error } = await supabase
        .from('areas')
        .update({ is_active: false })
        .eq('id', id)
        .eq('tenant_id', userProfile.tenant_id);  // Add tenant filtering

      if (error) throw error;

      await fetchAreas();
    } catch (err) {
      console.error('Error deleting area:', err);
      throw err;
    }
  };

  useEffect(() => {
    // Only fetch if we have authentication and tenant info
    if (session?.user && userProfile?.tenant_id) {
      fetchAreas();
    }

    // Set up real-time subscription with tenant filtering
    let channel: any;
    
    if (userProfile?.tenant_id) {
      channel = supabase.channel('areas-changes')
        .on('postgres_changes', 
          { 
            event: '*', 
            schema: 'public', 
            table: 'areas',
            filter: `tenant_id=eq.${userProfile.tenant_id}`  // Filter real-time updates by tenant
          }, 
          () => {
            fetchAreas();
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [session?.user, userProfile?.tenant_id]);

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