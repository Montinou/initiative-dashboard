"use client";

import { useEffect, useCallback } from 'react';
import { useAreaScopedData } from '@/components/manager/ManagerAreaProvider';
import { areaDataCache } from '@/lib/cache';
import { createClient } from '@/utils/supabase/client';

/**
 * Hook for warming up cache with frequently accessed manager dashboard data
 * 
 * Features:
 * - Preloads area summary data in background
 * - Intelligent cache warming based on user activity patterns
 * - Minimal performance impact through background processing
 * - Automatic cache warming on route changes
 */
export function useCacheWarming() {
  const { managedAreaId } = useAreaScopedData();
  const supabase = createClient();

  /**
   * Get all areas user has access to for cache warming
   */
  const getUserAccessibleAreas = useCallback(async (tenantId: string) => {
    try {
      // RLS automatically filters by tenant_id
      const { data: areas, error } = await supabase
        .from('areas')
        .select('id, name, description')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Failed to fetch user accessible areas:', error);
        return [];
      }

      return areas || [];
    } catch (error) {
      console.error('Error fetching user accessible areas:', error);
      return [];
    }
  }, [supabase]);

  /**
   * Warm up area-specific data in background
   */
  const warmUpAreaData = useCallback(async (tenantId: string, areaId: string) => {
    try {
      await areaDataCache.warmUpAreaCache(tenantId, areaId, {
        summary: async () => {
          // Fetch area summary data
          // RLS automatically filters by tenant_id
          const { data: initiatives } = await supabase
            .from('initiatives_with_subtasks_summary')
            .select('*')
            .eq('area_id', areaId);

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

          const { data: recentUploads } = await supabase
            .from('uploaded_files')
            .select('id')
            .eq('area_id', areaId)
            .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false });

          return {
            metrics: {
              totalInitiatives,
              activeInitiatives,
              completedInitiatives,
              averageProgress,
              totalSubtasks: initiatives?.reduce((sum, i) => sum + (i.subtask_count || 0), 0) || 0,
              completedSubtasks: initiatives?.reduce((sum, i) => sum + (i.completed_subtask_count || 0), 0) || 0,
              recentUploads: recentUploads?.length || 0
            },
            recentActivity: [],
            upcomingDeadlines: [],
            lastUpdated: new Date()
          };
        },

        metrics: async () => {
          // Fetch area metrics separately for faster access
          const { data: initiatives } = await supabase
            .from('initiatives_with_subtasks_summary')
            .select('initiative_progress, status, subtask_count, completed_subtask_count')
            .eq('area_id', areaId);

          const totalInitiatives = initiatives?.length || 0;
          const activeInitiatives = initiatives?.filter(i => 
            i.status === 'in_progress' || i.status === 'planning'
          ).length || 0;
          const completedInitiatives = initiatives?.filter(i => 
            i.status === 'completed'
          ).length || 0;

          return {
            totalInitiatives,
            activeInitiatives,
            completedInitiatives,
            averageProgress: totalInitiatives > 0 
              ? Math.round(initiatives.reduce((sum, i) => sum + (i.initiative_progress || 0), 0) / totalInitiatives)
              : 0,
            totalSubtasks: initiatives?.reduce((sum, i) => sum + (i.subtask_count || 0), 0) || 0,
            completedSubtasks: initiatives?.reduce((sum, i) => sum + (i.completed_subtask_count || 0), 0) || 0
          };
        },

        activity: async () => {
          // Fetch recent activity for the area
          const { data: activity } = await supabase
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
            .limit(20);

          return activity || [];
        },

        files: async () => {
          // Fetch recent file uploads
          const { data: files } = await supabase
            .from('uploaded_files')
            .select(`
              *,
              user_profiles!uploaded_files_uploaded_by_fkey (
                full_name,
                email
              )
            `)
            .eq('area_id', areaId)
            .order('created_at', { ascending: false })
            .limit(25);

          return files || [];
        }
      });

      console.log('Cache warmed up for area:', areaId);
    } catch (error) {
      console.warn('Cache warming failed for area:', areaId, error);
    }
  }, [supabase]);

  /**
   * Warm up cache for related areas (if user has access to multiple)
   */
  const warmUpRelatedData = useCallback(async () => {
    if (!managedAreaId) return;

    // RLS automatically filters by tenant
    // For now, just warm up the current managed area
    // We don't have tenant_id anymore since RLS handles it
    
    // Note: warmUpAreaData expects tenantId but we'll need to refactor 
    // the cache system to not require tenant_id since RLS handles it
    console.log('Cache warming temporarily disabled - needs refactoring for RLS');
    
    // TODO: Refactor cache system to work without explicit tenant_id
  }, [managedAreaId, warmUpAreaData, getUserAccessibleAreas]);

  /**
   * Intelligent cache warming based on time of day and user patterns
   */
  const intelligentCacheWarming = useCallback(async () => {
    if (!managedAreaId) return;

    const currentHour = new Date().getHours();
    
    // Warm cache during business hours when users are most active
    if (currentHour >= 8 && currentHour <= 18) {
      await warmUpRelatedData();
    }
  }, [managedAreaId, warmUpRelatedData]);

  // Warm up cache when component mounts
  useEffect(() => {
    if (managedAreaId) {
      // Delay cache warming slightly to not interfere with initial page load
      const timer = setTimeout(() => {
        warmUpRelatedData();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [managedAreaId, warmUpRelatedData]);

  // Set up intelligent cache warming interval
  useEffect(() => {
    // Warm cache every 10 minutes during active hours
    const interval = setInterval(() => {
      intelligentCacheWarming();
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [intelligentCacheWarming]);

  return {
    warmUpAreaData,
    warmUpRelatedData,
    intelligentCacheWarming
  };
}

/**
 * Hook for monitoring cache performance and providing insights
 */
export function useCachePerformance() {
  const getCacheStats = useCallback(() => {
    return areaDataCache.getAreaCacheStats();
  }, []);

  const getCacheHealth = useCallback(() => {
    const stats = getCacheStats();
    
    // Calculate overall cache health
    const hitRates = Object.values(stats).map(stat => stat.hitRate);
    const averageHitRate = hitRates.reduce((sum, rate) => sum + rate, 0) / hitRates.length;
    
    const totalSize = Object.values(stats).reduce((sum, stat) => sum + stat.size, 0);
    
    return {
      overallHitRate: averageHitRate,
      totalCachedItems: totalSize,
      health: averageHitRate > 0.6 ? 'good' : averageHitRate > 0.3 ? 'fair' : 'poor',
      recommendations: averageHitRate < 0.3 ? [
        'Consider increasing cache TTL for stable data',
        'Enable cache warming for frequently accessed data',
        'Review cache invalidation patterns'
      ] : []
    };
  }, [getCacheStats]);

  return {
    getCacheStats,
    getCacheHealth
  };
}

/**
 * Cache warming for specific manager dashboard pages
 */
export function usePageSpecificCacheWarming(page: 'dashboard' | 'initiatives' | 'files' | 'analytics') {
  const { managedAreaId } = useAreaScopedData();
  const supabase = createClient();

  const warmPageCache = useCallback(async () => {
    if (!managedAreaId) return;

    // RLS automatically filters by tenant

    try {
      switch (page) {
        case 'initiatives':
          // Pre-cache paginated initiatives for first few pages
          for (let page = 1; page <= 3; page++) {
            const { data } = await supabase
              .from('initiatives')
              .select(`
                *,
                areas!initiatives_area_id_fkey(id, name, description),
                subtasks(*)
              `)
              .eq('area_id', managedAreaId)
              .order('created_at', { ascending: false })
              .range((page - 1) * 20, page * 20 - 1);

            if (data && data.length > 0) {
              // Cache individual initiatives
              // TODO: Refactor cache to not require tenant_id
              console.log('Initiative caching disabled - needs refactoring for RLS');
            }
          }
          break;

        case 'files':
          // Pre-cache file uploads
          const { data: files } = await supabase
            .from('uploaded_files')
            .select('*')
            .eq('area_id', managedAreaId)
            .order('created_at', { ascending: false })
            .limit(50);

          if (files) {
            // TODO: Refactor cache to not require tenant_id
            console.log('File caching disabled - needs refactoring for RLS');
          }
          break;

        case 'analytics':
          // Pre-cache analytics data
          // TODO: Refactor cache to not require tenant_id
          console.log('Analytics caching disabled - needs refactoring for RLS');
          break;

        default:
          // Dashboard - warm general data
          // TODO: Refactor cache to not require tenant_id
          console.log('Dashboard caching disabled - needs refactoring for RLS');
      }
    } catch (error) {
      console.warn(`Cache warming failed for ${page} page:`, error);
    }
  }, [page, managedAreaId, supabase]);

  useEffect(() => {
    const timer = setTimeout(warmPageCache, 500);
    return () => clearTimeout(timer);
  }, [warmPageCache]);

  return { warmPageCache };
}