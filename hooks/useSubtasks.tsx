"use client"

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/lib/auth-context';
import type { Subtask } from '@/types/database';

export function useSubtasks(initiativeId: string) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();
  const { session, profile } = useAuth();

  const fetchSubtasks = useCallback(async () => {
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
        console.log('useSubtasks: No tenant ID available yet');
        setSubtasks([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('subtasks')
        .select('*')
        .eq('initiative_id', initiativeId)
        .eq('tenant_id', profile.tenant_id)  // Add tenant filtering
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setSubtasks(data || []);
    } catch (err) {
      console.error('Error fetching subtasks:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch subtasks'));
      setSubtasks([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, initiativeId, profile?.tenant_id]);

  const createSubtask = async (subtask: {
    title: string;
    description?: string;
    completed?: boolean;
  }) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available');
      }

      const { data, error } = await supabase
        .from('subtasks')
        .insert({
          ...subtask,
          initiative_id: initiativeId,
          tenant_id: profile.tenant_id,  // Include tenant_id
          completed: subtask.completed ?? false
        })
        .select()
        .single();

      if (error) throw error;

      await fetchSubtasks();
      return { data, error: null };
    } catch (err) {
      console.error('Error creating subtask:', err);
      return { data: null, error: err instanceof Error ? err : new Error('Failed to create subtask') };
    }
  };

  const updateSubtask = async (id: string, updates: Partial<Subtask>) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available');
      }

      const { data, error } = await supabase
        .from('subtasks')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id)  // Ensure tenant isolation
        .select()
        .single();

      if (error) throw error;

      await fetchSubtasks();
      return { data, error: null };
    } catch (err) {
      console.error('Error updating subtask:', err);
      return { data: null, error: err instanceof Error ? err : new Error('Failed to update subtask') };
    }
  };

  const deleteSubtask = async (id: string) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available');
      }

      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', id)
        .eq('tenant_id', profile.tenant_id);  // Ensure tenant isolation

      if (error) throw error;

      await fetchSubtasks();
      return { error: null };
    } catch (err) {
      console.error('Error deleting subtask:', err);
      return { error: err instanceof Error ? err : new Error('Failed to delete subtask') };
    }
  };

  const toggleSubtaskCompletion = async (id: string, completed: boolean) => {
    return updateSubtask(id, { completed });
  };

  useEffect(() => {
    // Only fetch if we have authentication, tenant info, and initiativeId
    if (session?.user && profile?.tenant_id && initiativeId) {
      fetchSubtasks();
    } else if (!session?.user) {
      // No user session, set loading to false
      setLoading(false);
      setError(new Error('Not authenticated'));
    }
  }, [session?.user, profile?.tenant_id, initiativeId, fetchSubtasks]);

  useEffect(() => {
    // Set up real-time subscription
    if (!profile?.tenant_id || !initiativeId) return;

    const channel = supabase.channel(`subtasks-${initiativeId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'subtasks',
        filter: `initiative_id=eq.${initiativeId}` 
      }, () => {
        fetchSubtasks();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, initiativeId, profile?.tenant_id, fetchSubtasks]);

  return {
    subtasks,
    loading,
    error,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    toggleSubtaskCompletion,
    refetch: fetchSubtasks
  };
}