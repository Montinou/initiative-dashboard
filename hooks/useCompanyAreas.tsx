"use client"

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { CompanyArea } from '@/lib/types/database';

export function useCompanyAreas() {
  const [areas, setAreas] = useState<CompanyArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const { profile } = useAuth();

  const fetchAreas = async () => {
    try {
      setLoading(true);
      setError(null);

      // Validate authentication and tenant context
      if (!profile?.tenant_id) {
        throw new Error('Authentication required');
      }

      // RLS automatically filters by tenant_id
      const { data, error: fetchError } = await supabase
        .from('areas')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setAreas(data || []);
    } catch (err) {
      console.error('Error fetching company areas:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createArea = async (area: {
    name: string;
    description?: string;
  }) => {
    try {
      // Validate authentication and tenant context
      if (!profile?.tenant_id) {
        throw new Error('Authentication required');
      }

      // tenant_id is still needed for INSERT operations
      const { data, error } = await supabase
        .from('areas')
        .insert({
          ...area,
          tenant_id: profile.tenant_id
        })
        .select()
        .single();

      if (error) throw error;

      await fetchAreas();
      return data;
    } catch (err) {
      console.error('Error creating company area:', err);
      throw err;
    }
  };

  const updateArea = async (id: string, updates: Partial<CompanyArea>) => {
    try {
      // Validate authentication and tenant context
      if (!profile?.tenant_id) {
        throw new Error('Authentication required');
      }

      // RLS automatically filters by tenant_id
      const { data, error } = await supabase
        .from('areas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchAreas();
      return data;
    } catch (err) {
      console.error('Error updating company area:', err);
      throw err;
    }
  };

  const deleteArea = async (id: string) => {
    try {
      // Validate authentication and tenant context
      if (!profile?.tenant_id) {
        throw new Error('Authentication required');
      }

      // RLS automatically filters by tenant_id
      const { error } = await supabase
        .from('areas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchAreas();
    } catch (err) {
      console.error('Error deleting company area:', err);
      throw err;
    }
  };

  useEffect(() => {
    // Only fetch if we have authentication
    if (profile?.tenant_id) {
      fetchAreas();

      // Set up real-time subscription with tenant filtering
      const channel = supabase.channel('areas-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'areas',
          filter: `tenant_id=eq.${profile.tenant_id}` // ✅ SECURITY FIX: Added tenant filtering to subscription
        }, () => {
          fetchAreas();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.tenant_id]); // ✅ SECURITY FIX: Added dependency on tenant_id

  return {
    areas,
    loading,
    error,
    createArea,
    updateArea,
    deleteArea,
    refetch: fetchAreas
  };
}