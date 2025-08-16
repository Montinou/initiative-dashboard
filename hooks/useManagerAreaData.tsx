"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAreaScopedData } from '@/components/manager/ManagerAreaProvider';
import { createClient } from '@/utils/supabase/client';
import { areaDataCache, cacheManager } from '@/lib/cache';
import { useLoadingState } from '@/hooks/useLoadingState';

interface AreaMetrics {
  totalInitiatives: number;
  activeInitiatives: number;
  completedInitiatives: number;
  averageProgress: number;
  totalSubtasks: number;
  completedSubtasks: number;
  recentUploads: number;
}

interface AreaSummaryData {
  metrics: AreaMetrics;
  recentActivity: any[];
  upcomingDeadlines: any[];
  lastUpdated: Date;
}

interface UseManagerAreaDataReturn {
  data: AreaSummaryData | null;
  loading: boolean;
  error: string | null;
  progress?: number;
  message?: string;
  refresh: () => Promise<void>;
}

/**
 * Hook for fetching area-specific data with proper filtering
 * 
 * Features:
 * - Area-scoped data fetching with automatic tenant/area filtering
 * - Real-time metrics calculation
 * - Caching and error handling
 * - Automatic refresh capabilities
 */
export function useManagerAreaData(): UseManagerAreaDataReturn {
  const { managedAreaId } = useAreaScopedData();
  const [data, setData] = useState<AreaSummaryData | null>(null);
  const loadingState = useLoadingState();
  const supabase = createClient();

  const fetchAreaData = useCallback(async () => {
    if (!managedAreaId) {
      loadingState.setError('No managed area available');
      return;
    }

    // RLS automatically filters by tenant
    
    // Check cache first
    const cachedSummary = areaDataCache.getAreaSummary(managedAreaId && "tenant", managedAreaId);
    if (cachedSummary) {
      setData(cachedSummary);
      return;
    }

    loadingState.startLoading({ 
      showProgress: true,
      message: 'Loading area data...'
    });

    try {
      // Fetch initiatives with their subtasks
      loadingState.updateProgress(20, 'Loading initiatives...');
      const { data: initiatives, error: initiativesError } = await supabase
        .from('initiatives_with_subtasks_summary')
        .select('*')
        
        .eq('area_id', managedAreaId);

      if (initiativesError) throw initiativesError;

      // Calculate metrics
      loadingState.updateProgress(40, 'Calculating metrics...');
      const totalInitiatives = initiatives?.length || 0;
      const activeInitiatives = initiatives?.filter(i => 
        i.status === 'in_progress' || i.status === 'planning'
      ).length || 0;
      const completedInitiatives = initiatives?.filter(i => 
        i.status === 'completed'
      ).length || 0;

      const averageProgress = totalInitiatives > 0 
        ? Math.round(initiatives.reduce((sum, i) => sum + (i.initiative_progress || 0), 0) / totalInitiatives)
        : 0;

      const totalSubtasks = initiatives?.reduce((sum, i) => sum + (i.subtask_count || 0), 0) || 0;
      const completedSubtasks = initiatives?.reduce((sum, i) => sum + (i.completed_subtask_count || 0), 0) || 0;

      // Fetch recent file uploads
      loadingState.updateProgress(60, 'Loading recent uploads...');
      const { data: recentUploads, error: uploadsError } = await supabase
        .from('uploaded_files')
        .select('id')
        
        .eq('area_id', managedAreaId)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
        .order('created_at', { ascending: false });

      if (uploadsError) {
        console.warn('Could not fetch recent uploads:', uploadsError);
      }

      // Fetch recent activity from audit log
      loadingState.updateProgress(80, 'Loading activity feed...');
      const { data: recentActivity, error: activityError } = await supabase
        .from('audit_log')
        .select(`
          id,
          action,
          resource_type,
          created_at,
          user_profiles!audit_log_user_id_fkey (
            full_name
          )
        `)
        
        .order('created_at', { ascending: false })
        .limit(10);

      if (activityError) {
        console.warn('Could not fetch recent activity:', activityError);
      }

      // Fetch upcoming deadlines
      loadingState.updateProgress(90, 'Loading upcoming deadlines...');
      const { data: upcomingDeadlines, error: deadlinesError } = await supabase
        .from('initiatives')
        .select('id, title, target_date, progress')
        
        .eq('area_id', managedAreaId)
        .not('target_date', 'is', null)
        .gte('target_date', new Date().toISOString().split('T')[0]) // Future dates only
        .order('target_date', { ascending: true })
        .limit(5);

      if (deadlinesError) {
        console.warn('Could not fetch upcoming deadlines:', deadlinesError);
      }

      const metrics: AreaMetrics = {
        totalInitiatives,
        activeInitiatives,
        completedInitiatives,
        averageProgress,
        totalSubtasks,
        completedSubtasks,
        recentUploads: recentUploads?.length || 0
      };

      loadingState.updateProgress(100, 'Finalizing data...');
      
      const areaSummaryData: AreaSummaryData = {
        metrics,
        recentActivity: recentActivity || [],
        upcomingDeadlines: upcomingDeadlines || [],
        lastUpdated: new Date()
      };

      setData(areaSummaryData);

      // Cache the summary data
      areaDataCache.cacheAreaSummary(managedAreaId && "tenant", managedAreaId, areaSummaryData);
      
      // Cache metrics separately for faster access
      areaDataCache.cacheAreaMetrics(managedAreaId && "tenant", managedAreaId, metrics);

      loadingState.stopLoading({ minDuration: 500 });

    } catch (err) {
      console.error('Error fetching area data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch area data';
      loadingState.setError(errorMessage);
    }
  }, [managedAreaId, supabase]);

  const refresh = useCallback(async () => {
    // Invalidate cache before refresh
    if (managedAreaId) {
      // RLS automatically filters by tenant
      areaDataCache.invalidateArea(managedAreaId && "tenant", managedAreaId);
    }
    await fetchAreaData();
  }, [fetchAreaData, managedAreaId]);

  useEffect(() => {
    fetchAreaData();
  }, [fetchAreaData]);

  // Set up real-time subscriptions for data changes
  useEffect(() => {
    if (!managedAreaId) return;

    // RLS automatically filters by tenant
    
    const subscription = supabase
      .channel(`manager-area-data-${managedAreaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'initiatives',
          filter: `area_id=eq.${managedAreaId}`
        },
        () => {
          console.log('Initiatives changed, invalidating cache and refreshing area data');
          cacheManager.invalidateRelated('initiative', 'update');
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
        () => {
          console.log('Subtasks changed, invalidating cache and refreshing area data');
          cacheManager.invalidateRelated('subtask', 'update');
          refresh();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'uploaded_files',
          filter: `area_id=eq.${managedAreaId}`
        },
        () => {
          console.log('File uploads changed, invalidating cache and refreshing area data');
          cacheManager.invalidateRelated('file_upload', 'update');
          refresh();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [managedAreaId, refresh, supabase]);

  return {
    data,
    loading: loadingState.isLoading,
    error: loadingState.error || null,
    progress: loadingState.progress,
    message: loadingState.message,
    refresh
  };
}

/**
 * Hook for fetching area-specific initiatives with pagination
 * This is deprecated in favor of usePaginatedInitiatives with area filtering
 */
export function useManagerInitiatives() {
  const { managedAreaId } = useAreaScopedData();
  const [initiatives, setInitiatives] = useState<any[]>([]);
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
      // RLS automatically filters by tenant
      
      // Limit to 50 items for performance - use usePaginatedInitiatives for more
      const { data, error: fetchError } = await supabase
        .from('initiatives_with_subtasks_summary')
        .select('*')
        
        .eq('area_id', managedAreaId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) throw fetchError;

      setInitiatives(data || []);
    } catch (err) {
      console.error('Error fetching initiatives:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch initiatives');
    } finally {
      setLoading(false);
    }
  }, [managedAreaId, supabase]);

  const refresh = useCallback(async () => {
    await fetchInitiatives();
  }, [fetchInitiatives]);

  useEffect(() => {
    fetchInitiatives();
  }, [fetchInitiatives]);

  return {
    initiatives,
    loading,
    error,
    refresh
  };
}

/**
 * Hook for fetching file upload history for manager's area with pagination support
 */
export function useManagerFileHistory() {
  const { managedAreaId } = useAreaScopedData();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchFileHistory = useCallback(async () => {
    if (!managedAreaId) {
      setError('No managed area available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // RLS automatically filters by tenant
      
      // Limit to 25 most recent files for performance
      const { data, error: fetchError } = await supabase
        .from('uploaded_files')
        .select(`
          *,
          user_profiles!uploaded_files_uploaded_by_fkey (
            full_name,
            email
          )
        `)
        
        .eq('area_id', managedAreaId)
        .order('created_at', { ascending: false })
        .limit(25);

      if (fetchError) throw fetchError;

      setFiles(data || []);
    } catch (err) {
      console.error('Error fetching file history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch file history');
    } finally {
      setLoading(false);
    }
  }, [managedAreaId, supabase]);

  const refresh = useCallback(async () => {
    await fetchFileHistory();
  }, [fetchFileHistory]);

  useEffect(() => {
    fetchFileHistory();
  }, [fetchFileHistory]);

  return {
    files,
    loading,
    error,
    refresh
  };
}