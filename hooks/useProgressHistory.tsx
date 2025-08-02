"use client"

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface ProgressHistoryEntry {
  id: number;
  initiative_id: string;
  previous_progress: number;
  new_progress: number;
  progress_notes?: string;
  obstacles?: string;
  enhancers?: string;
  updated_by: string;
  created_at: string;
  user_profiles?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export function useProgressHistory(initiativeId: string) {
  const [history, setHistory] = useState<ProgressHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchHistory = async () => {
    if (!initiativeId) {
      setHistory([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('progress_history')
        .select(`
          *,
          user_profiles!progress_history_updated_by_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('initiative_id', initiativeId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching progress history:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    // Set up real-time subscription for progress history changes
    const channel = supabase.channel(`progress-history-${initiativeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'progress_history',
          filter: `initiative_id=eq.${initiativeId}`
        },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initiativeId]);

  return {
    history,
    loading,
    error,
    refetch: fetchHistory
  };
}

// Hook to get progress history for all initiatives (for analytics)
export function useAllProgressHistory() {
  const [history, setHistory] = useState<ProgressHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('progress_history')
        .select(`
          *,
          user_profiles!progress_history_updated_by_fkey(
            id,
            full_name,
            email
          ),
          initiatives(
            id,
            title,
            areas!initiatives_area_id_fkey(
              id,
              name
            )
          )
        `)
        .order('created_at', { ascending: false })
        .limit(100); // Limit to recent entries for performance

      if (fetchError) throw fetchError;

      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching all progress history:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  return {
    history,
    loading,
    error,
    refetch: fetchHistory
  };
}