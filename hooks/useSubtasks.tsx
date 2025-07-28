"use client"

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Subtask } from '@/types/database';

export function useSubtasks(initiativeId: string) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchSubtasks = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('subtasks')
        .select('*')
        .eq('initiative_id', initiativeId)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      setSubtasks(data || []);
    } catch (err) {
      console.error('Error fetching subtasks:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createSubtask = async (subtask: {
    title: string;
    description?: string;
    completed?: boolean;
  }) => {
    try {
      const { data, error } = await supabase
        .from('subtasks')
        .insert({
          ...subtask,
          initiative_id: initiativeId,
        })
        .select()
        .single();

      if (error) throw error;

      await fetchSubtasks();
      return data;
    } catch (err) {
      console.error('Error creating subtask:', err);
      throw err;
    }
  };

  const updateSubtask = async (id: string, updates: Partial<Subtask>) => {
    try {
      const { data, error } = await supabase
        .from('subtasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchSubtasks();
      return data;
    } catch (err) {
      console.error('Error updating subtask:', err);
      throw err;
    }
  };

  const deleteSubtask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchSubtasks();
    } catch (err) {
      console.error('Error deleting subtask:', err);
      throw err;
    }
  };

  const toggleSubtaskCompletion = async (id: string, completed: boolean) => {
    try {
      await updateSubtask(id, { completed });
    } catch (err) {
      console.error('Error toggling subtask completion:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (initiativeId) {
      fetchSubtasks();

      // Set up real-time subscription
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
    }
  }, [initiativeId]);

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