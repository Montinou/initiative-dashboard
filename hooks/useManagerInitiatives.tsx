"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAreaScopedData } from '@/components/manager/ManagerAreaProvider';
import { useAuditLog } from '@/lib/auth-context';
import { createClient } from '@/utils/supabase/client';

interface InitiativeWithSubtasks {
  id: string;
  tenant_id: string;
  area_id: string;
  created_by: string;
  owner_id: string;
  title: string;
  description: string | null;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  priority: string;
  initiative_progress: number;
  target_date: string | null;
  completion_date: string | null;
  budget: number | null;
  actual_cost: number | null;
  created_at: string;
  updated_at: string;
  subtask_count: number;
  completed_subtask_count: number;
  subtask_completion_rate: number;
}

interface CreateInitiativeData {
  title: string;
  description?: string;
  target_date?: string;
  priority?: string;
  budget?: number;
  subtasks?: { title: string; description?: string }[];
}

interface UpdateInitiativeData {
  title?: string;
  description?: string;
  status?: string;
  target_date?: string;
  priority?: string;
  budget?: number;
  actual_cost?: number;
  progress?: number;
}

/**
 * Hook for managing initiatives in manager's area
 * 
 * Features:
 * - Area-scoped initiative CRUD operations
 * - Real-time updates via subscriptions
 * - Automatic progress calculation from subtasks
 * - Audit logging for all operations
 */
export function useManagerInitiatives() {
  const { managedAreaId } = useAreaScopedData();
  const { logEvent } = useAuditLog();
  const [initiatives, setInitiatives] = useState<InitiativeWithSubtasks[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchInitiatives = useCallback(async () => {
    if (!managedAreaId) {
      setError('No managed area available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // RLS automatically filters by tenant and area
      
      const { data, error: fetchError } = await supabase
        .from('initiatives_with_subtasks_summary')
        .select('*')
        
        .eq('area_id', managedAreaId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setInitiatives(data || []);
      console.log(`Fetched ${data?.length || 0} initiatives for area ${managedAreaId}`);
    } catch (err) {
      console.error('Error fetching initiatives:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch initiatives');
    } finally {
      setLoading(false);
    }
  }, [managedAreaId, supabase]);

  const createInitiative = useCallback(async (
    initiativeData: CreateInitiativeData
  ): Promise<{ success: boolean; initiative?: any; error?: string }> => {
    if (!managedAreaId) {
      return { success: false, error: 'No managed area available' };
    }

    try {
      // RLS automatically filters by tenant and area
      
      // Create the initiative
      const { data: initiative, error: createError } = await supabase
        .from('initiatives')
        .insert({
          ...initiativeData,
          tenant_id: managedAreaId && "tenant",
          area_id: managedAreaId,
          status: 'planning',
          progress: 0
        })
        .select()
        .single();

      if (createError) throw createError;

      // Create subtasks if provided
      if (initiativeData.subtasks && initiativeData.subtasks.length > 0) {
        const subtasksToCreate = initiativeData.subtasks.map(subtask => ({
          ...subtask,
          initiative_id: initiative.id,
          tenant_id: managedAreaId && "tenant"
        }));

        const { error: subtasksError } = await supabase
          .from('subtasks')
          .insert(subtasksToCreate);

        if (subtasksError) {
          console.error('Error creating subtasks:', subtasksError);
          // Don't fail the entire operation, just log the error
        }
      }

      // Log the creation
      await logEvent('CREATE', 'initiative', initiative.id, null, initiative);

      // Refresh the list
      await fetchInitiatives();

      return { success: true, initiative };
    } catch (err) {
      console.error('Error creating initiative:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to create initiative' 
      };
    }
  }, [managedAreaId, supabase, logEvent, fetchInitiatives]);

  const updateInitiative = useCallback(async (
    initiativeId: string,
    updates: UpdateInitiativeData
  ): Promise<{ success: boolean; error?: string }> => {
    if (!managedAreaId) {
      return { success: false, error: 'No managed area available' };
    }

    try {
      // Get current data for audit log
      const { data: currentData } = await supabase
        .from('initiatives')
        .select('*')
        .eq('id', initiativeId)
        .single();

      // Update the initiative
      const { data: updatedInitiative, error: updateError } = await supabase
        .from('initiatives')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', initiativeId)
        .eq('area_id', managedAreaId) // Ensure manager can only update their area's initiatives
        .select()
        .single();

      if (updateError) throw updateError;

      // Log the update
      await logEvent('UPDATE', 'initiative', initiativeId, currentData, updatedInitiative);

      // Refresh the list
      await fetchInitiatives();

      return { success: true };
    } catch (err) {
      console.error('Error updating initiative:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update initiative' 
      };
    }
  }, [managedAreaId, supabase, logEvent, fetchInitiatives]);

  const deleteInitiative = useCallback(async (
    initiativeId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!managedAreaId) {
      return { success: false, error: 'No managed area available' };
    }

    try {
      // Get current data for audit log
      const { data: currentData } = await supabase
        .from('initiatives')
        .select('*')
        .eq('id', initiativeId)
        .single();

      // Delete the initiative (subtasks will be cascade deleted)
      const { error: deleteError } = await supabase
        .from('initiatives')
        .delete()
        .eq('id', initiativeId)
        .eq('area_id', managedAreaId); // Ensure manager can only delete their area's initiatives

      if (deleteError) throw deleteError;

      // Log the deletion
      await logEvent('DELETE', 'initiative', initiativeId, currentData, null);

      // Refresh the list
      await fetchInitiatives();

      return { success: true };
    } catch (err) {
      console.error('Error deleting initiative:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to delete initiative' 
      };
    }
  }, [managedAreaId, supabase, logEvent, fetchInitiatives]);

  // Get initiative by ID (area-scoped)
  const getInitiative = useCallback(async (
    initiativeId: string
  ): Promise<{ initiative?: InitiativeWithSubtasks; error?: string }> => {
    if (!managedAreaId) {
      return { error: 'No managed area available' };
    }

    try {
      // RLS automatically filters by tenant and area
      
      const { data, error: fetchError } = await supabase
        .from('initiatives_with_subtasks_summary')
        .select('*')
        .eq('id', initiativeId)
        
        .eq('area_id', managedAreaId)
        .single();

      if (fetchError) throw fetchError;

      return { initiative: data };
    } catch (err) {
      console.error('Error fetching initiative:', err);
      return { 
        error: err instanceof Error ? err.message : 'Failed to fetch initiative' 
      };
    }
  }, [managedAreaId, supabase]);

  const refresh = useCallback(async () => {
    await fetchInitiatives();
  }, [fetchInitiatives]);

  useEffect(() => {
    fetchInitiatives();
  }, [fetchInitiatives]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!managedAreaId) return;

    const subscription = supabase
      .channel(`manager-initiatives-${managedAreaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'initiatives',
          filter: `area_id=eq.${managedAreaId}`
        },
        (payload) => {
          console.log('Initiative changed:', payload);
          refresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subtasks'
        },
        (payload) => {
          console.log('Subtask changed:', payload);
          refresh();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [managedAreaId, refresh, supabase]);

  return {
    initiatives,
    loading,
    error,
    refresh,
    createInitiative,
    updateInitiative,
    deleteInitiative,
    getInitiative
  };
}

/**
 * Hook for managing subtasks within manager's initiatives
 */
export function useManagerSubtasks(initiativeId?: string) {
  const { managedAreaId } = useAreaScopedData();
  const { logEvent } = useAuditLog();
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchSubtasks = useCallback(async () => {
    if (!managedAreaId || !initiativeId) {
      setSubtasks([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // RLS automatically filters by tenant and area
      
      // First verify the initiative belongs to this manager's area
      const { data: initiative, error: initiativeError } = await supabase
        .from('initiatives')
        .select('area_id')
        .eq('id', initiativeId)
        
        .eq('area_id', managedAreaId)
        .single();

      if (initiativeError || !initiative) {
        throw new Error('Initiative not found or access denied');
      }

      const { data, error: fetchError } = await supabase
        .from('subtasks')
        .select('*')
        .eq('initiative_id', initiativeId)
        
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setSubtasks(data || []);
    } catch (err) {
      console.error('Error fetching subtasks:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch subtasks');
    } finally {
      setLoading(false);
    }
  }, [managedAreaId, initiativeId, supabase]);

  const toggleSubtask = useCallback(async (
    subtaskId: string,
    completed: boolean
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const { error: updateError } = await supabase
        .from('subtasks')
        .update({ 
          completed,
          updated_at: new Date().toISOString()
        })
        .eq('id', subtaskId);

      if (updateError) throw updateError;

      // Log the action
      await logEvent(
        completed ? 'COMPLETE' : 'REOPEN', 
        'subtask', 
        subtaskId
      );

      // Refresh subtasks
      await fetchSubtasks();

      return { success: true };
    } catch (err) {
      console.error('Error toggling subtask:', err);
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Failed to update subtask' 
      };
    }
  }, [supabase, logEvent, fetchSubtasks]);

  useEffect(() => {
    fetchSubtasks();
  }, [fetchSubtasks]);

  return {
    subtasks,
    loading,
    error,
    refresh: fetchSubtasks,
    toggleSubtask
  };
}