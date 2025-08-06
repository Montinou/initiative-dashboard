"use client"

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Initiative, InitiativeWithDetails } from '@/types/database';
import { useAuth } from '@/lib/auth-context';

export function useInitiatives() {
  const [initiatives, setInitiatives] = useState<InitiativeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();
  const { session, profile } = useAuth();

  const fetchInitiatives = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check for authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      // Check for tenant context
      if (!profile?.tenant_id) {
        console.log('useInitiatives: No tenant ID available yet');
        setInitiatives([]);
        return;
      }

      console.log('useInitiatives: Fetching initiatives for tenant:', profile.tenant_id);

      // Build query with proper filters
      let query = supabase
        .from('initiatives')
        .select(`
          *,
          areas!initiatives_area_id_fkey(
            id,
            name,
            description
          ),
          subtasks(*)
        `)
        .eq('tenant_id', profile.tenant_id);

      // Apply area filter for managers
      if (profile.role === 'Manager' && profile.area_id) {
        query = query.eq('area_id', profile.area_id);
      }

      const { data, error: fetchError } = await query.order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const initiativesWithDetails: InitiativeWithDetails[] = (data || []).map(initiative => ({
        ...initiative,
        area: initiative.areas || null,
        subtasks: initiative.subtasks || [],
        subtask_count: initiative.subtasks?.length || 0,
        completed_subtasks: initiative.subtasks?.filter((st: any) => st.completed).length || 0
      }));

      setInitiatives(initiativesWithDetails);
      console.log('useInitiatives: Successfully fetched', initiativesWithDetails.length, 'initiatives');
    } catch (err) {
      console.error('Error fetching initiatives:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch initiatives'));
      setInitiatives([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, profile]);

  const createInitiative = async (initiative: {
    title: string;
    description?: string;
    area_id?: string;
    owner_id?: string;
    status?: string;
    priority?: string;
    target_date?: string;
  }) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available');
      }

      // Validate area access for managers
      if (profile.role === 'Manager' && initiative.area_id && initiative.area_id !== profile.area_id) {
        throw new Error('Managers can only create initiatives in their own area');
      }

      const { data, error } = await supabase
        .from('initiatives')
        .insert({
          ...initiative,
          tenant_id: profile.tenant_id,
          created_by: profile.id,
          owner_id: initiative.owner_id || profile.id
        })
        .select()
        .single();

      if (error) throw error;

      await fetchInitiatives();
      return { data, error: null };
    } catch (err) {
      console.error('Error creating initiative:', err);
      return { data: null, error: err instanceof Error ? err : new Error('Failed to create initiative') };
    }
  };

  const updateInitiative = async (id: string, updates: Partial<Initiative>) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available');
      }

      // Build update query with tenant filter
      let query = supabase
        .from('initiatives')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id);

      // Apply area filter for managers
      if (profile.role === 'Manager' && profile.area_id) {
        query = query.eq('area_id', profile.area_id);
      }

      const { data, error } = await query.select().single();

      if (error) throw error;

      // Note: Database triggers will automatically:
      // 1. Log this change to audit_log table
      // 2. Create progress_history entry if progress changed
      // 3. Update the updated_at timestamp

      await fetchInitiatives();
      return { data, error: null };
    } catch (err) {
      console.error('Error updating initiative:', err);
      return { data: null, error: err instanceof Error ? err : new Error('Failed to update initiative') };
    }
  };

  const deleteInitiative = async (id: string) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available');
      }

      // Build delete query with tenant filter
      let query = supabase
        .from('initiatives')
        .delete()
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id);

      // Apply area filter for managers
      if (profile.role === 'Manager' && profile.area_id) {
        query = query.eq('area_id', profile.area_id);
      }

      const { error } = await query;

      if (error) throw error;

      await fetchInitiatives();
      return { error: null };
    } catch (err) {
      console.error('Error deleting initiative:', err);
      return { error: err instanceof Error ? err : new Error('Failed to delete initiative') };
    }
  };

  useEffect(() => {
    // Only fetch if we have authentication and tenant info
    if (session?.user && profile?.tenant_id) {
      fetchInitiatives();
    } else if (!session?.user) {
      // No user session, set loading to false
      setLoading(false);
      setError(new Error('Not authenticated'));
    }
  }, [session?.user, profile?.tenant_id, fetchInitiatives]);

  useEffect(() => {
    // Set up real-time subscription with proper filtering
    if (!profile?.tenant_id) return;

    const channel = supabase.channel('initiatives-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'initiatives',
        filter: `tenant_id=eq.${profile.tenant_id}` 
      }, () => {
        fetchInitiatives();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'subtasks',
        filter: `tenant_id=eq.${profile.tenant_id}` 
      }, () => {
        fetchInitiatives();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, profile?.tenant_id, fetchInitiatives]);

  return {
    initiatives,
    isLoading: loading,
    error,
    createInitiative,
    updateInitiative,
    deleteInitiative,
    refetch: fetchInitiatives
  };
}