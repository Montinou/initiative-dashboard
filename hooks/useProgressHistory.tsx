"use client"

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/lib/auth-context';

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
  tenant_id: string;
  user_profiles?: {
    id: string;
    full_name: string;
    email: string;
  };
  initiatives?: {
    id: string;
    title: string;
    areas?: {
      id: string;
      name: string;
    };
  };
}

export function useProgressHistory(initiativeId: string) {
  const [history, setHistory] = useState<ProgressHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();
  const { session, profile } = useAuth();

  const fetchHistory = useCallback(async () => {
    if (!initiativeId) {
      setHistory([]);
      setLoading(false);
      return;
    }

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
        console.log('useProgressHistory: No tenant ID available yet');
        setHistory([]);
        return;
      }

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
        // Add tenant filtering
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching progress history:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch progress history'));
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, initiativeId, profile?.tenant_id]);

  useEffect(() => {
    // Only fetch if we have authentication and tenant info
    if (session?.user && profile?.tenant_id && initiativeId) {
      fetchHistory();
    } else if (!session?.user) {
      // No user session, set loading to false
      setLoading(false);
      setError(new Error('Not authenticated'));
    }
  }, [session?.user, profile?.tenant_id, initiativeId, fetchHistory]);

  useEffect(() => {
    // Set up real-time subscription for progress history changes
    if (!profile?.tenant_id || !initiativeId) return;

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
  }, [supabase, initiativeId, profile?.tenant_id, fetchHistory]);

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
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();
  const { session, profile } = useAuth();

  const fetchHistory = useCallback(async () => {
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
        console.log('useAllProgressHistory: No tenant ID available yet');
        setHistory([]);
        return;
      }

      let query = supabase
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
        // Add tenant filtering
        .order('created_at', { ascending: false })
        .limit(100); // Limit to recent entries for performance

      // Apply area filter for managers
      if (profile.role === 'Manager' && profile.area_id) {
        // Managers can only see progress for their area's initiatives
        query = query.eq('initiatives.area_id', profile.area_id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setHistory(data || []);
    } catch (err) {
      console.error('Error fetching all progress history:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch progress history'));
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, profile]);

  useEffect(() => {
    // Only fetch if we have authentication and tenant info
    if (session?.user && profile?.tenant_id) {
      fetchHistory();
    } else if (!session?.user) {
      // No user session, set loading to false
      setLoading(false);
      setError(new Error('Not authenticated'));
    }
  }, [session?.user, profile?.tenant_id, fetchHistory]);

  return {
    history,
    loading,
    error,
    refetch: fetchHistory
  };
}