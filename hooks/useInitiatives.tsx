"use client"

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Initiative, InitiativeWithDetails, CompanyArea } from '@/types/database';

export function useInitiatives() {
  const [initiatives, setInitiatives] = useState<InitiativeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchInitiatives = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('initiatives')
        .select(`
          *,
          areas(
            id,
            name,
            description,
            manager_id,
            user_profiles!areas_manager_id_fkey(
              id,
              full_name,
              email
            )
          ),
          subtasks(*)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const initiativesWithDetails: InitiativeWithDetails[] = (data || []).map(initiative => ({
        ...initiative,
        area: initiative.areas || null,
        subtasks: initiative.subtasks || [],
        subtask_count: initiative.subtasks?.length || 0,
        completed_subtasks: initiative.subtasks?.filter((st: any) => st.completed).length || 0
      }));

      setInitiatives(initiativesWithDetails);
    } catch (err) {
      console.error('Error fetching initiatives:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createInitiative = async (initiative: {
    title: string;
    description?: string;
    area_id?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('initiatives')
        .insert(initiative)
        .select()
        .single();

      if (error) throw error;

      await fetchInitiatives();
      return data;
    } catch (err) {
      console.error('Error creating initiative:', err);
      throw err;
    }
  };

  const updateInitiative = async (id: string, updates: Partial<Initiative>) => {
    try {
      const { data, error } = await supabase
        .from('initiatives')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Note: Database triggers will automatically:
      // 1. Log this change to audit_log table
      // 2. Create progress_history entry if progress changed
      // 3. Update the updated_at timestamp

      await fetchInitiatives();
      return data;
    } catch (err) {
      console.error('Error updating initiative:', err);
      throw err;
    }
  };

  const deleteInitiative = async (id: string) => {
    try {
      const { error } = await supabase
        .from('initiatives')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchInitiatives();
    } catch (err) {
      console.error('Error deleting initiative:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchInitiatives();

    // Set up real-time subscription
    const channel = supabase.channel('initiatives-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'initiatives' }, () => {
        fetchInitiatives();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, () => {
        fetchInitiatives();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    initiatives,
    loading,
    error,
    createInitiative,
    updateInitiative,
    deleteInitiative,
    refetch: fetchInitiatives
  };
}