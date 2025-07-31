"use client"

import { useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { FilterState } from '@/hooks/useFilters';
import { applyFiltersToData } from '@/lib/utils/filterUtils';
import { useProgressiveLoad } from '@/hooks/useProgressiveLoad';
import { dataFetcher } from '@/lib/data-fetcher';
import type { InitiativeSummary } from './useInitiativesSummary';

export function useInitiativesSummaryV2(filters?: FilterState) {
  const supabase = createClient();
  
  const loadInitiatives = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('Not authenticated');
    }
    
    // Fetch initiatives with joins
    const result = await dataFetcher.fetch(
      () => supabase
        .from('initiatives')
        .select(`
          *,
          areas:area_id (
            id,
            name,
            description
          ),
          created_by_user:created_by (
            id,
            full_name,
            email
          ),
          owner_user:owner_id (
            id,
            email
          )
        `)
        .order('created_at', { ascending: false }),
      {
        cacheKey: 'initiatives_summary',
        cacheTime: 2 * 60 * 1000, // 2 minutes
        maxRetries: 3,
        transform: (data) => {
          // Apply filters if provided
          if (filters) {
            return applyFiltersToData(data, filters);
          }
          return data;
        }
      }
    );
    
    return result as InitiativeSummary[];
  };
  
  const {
    data: initiatives = [],
    isLoading,
    error,
    isInitialLoad,
    refetch,
    shouldShowSkeleton,
    shouldShowOverlay
  } = useProgressiveLoad({
    key: 'initiatives_summary',
    loadFn: loadInitiatives,
    deps: [filters],
    initialData: [],
    loadingDelay: 300, // Show loading after 300ms
    minLoadingTime: 500, // Minimum loading time to prevent flashing
    onError: (error) => {
      console.error('Failed to load initiatives:', error);
    }
  });
  
  // Set up real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('initiatives_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'initiatives'
        },
        (payload) => {
          console.log('Initiative change:', payload);
          // Refetch data on any change
          refetch();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refetch]);
  
  // Calculate summary statistics
  const summary = {
    total: initiatives.length,
    byStatus: {
      planning: initiatives.filter(i => i.status === 'planning').length,
      in_progress: initiatives.filter(i => i.status === 'in_progress').length,
      completed: initiatives.filter(i => i.status === 'completed').length,
      on_hold: initiatives.filter(i => i.status === 'on_hold').length
    },
    byPriority: {
      high: initiatives.filter(i => i.priority === 'high').length,
      medium: initiatives.filter(i => i.priority === 'medium').length,
      low: initiatives.filter(i => i.priority === 'low').length
    },
    averageProgress: initiatives.length > 0
      ? initiatives.reduce((sum, i) => sum + (i.initiative_progress || 0), 0) / initiatives.length
      : 0,
    totalBudget: initiatives.reduce((sum, i) => sum + (i.budget || 0), 0),
    totalActualCost: initiatives.reduce((sum, i) => sum + (i.actual_cost || 0), 0)
  };
  
  return {
    initiatives,
    loading: isLoading,
    error,
    refetch,
    summary,
    shouldShowSkeleton,
    shouldShowOverlay,
    isInitialLoad
  };
}