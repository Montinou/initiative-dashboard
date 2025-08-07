"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useTenantId } from '@/lib/auth-context';
import { 
  createPaginationQuery, 
  buildPaginationResult, 
  PaginationParams, 
  PaginationResult, 
  DEFAULT_PAGE_SIZE,
  PaginationPerformanceMonitor
} from '@/lib/pagination';
import { getInitiativeCache, cacheManager } from '@/lib/cache';
import { queryOptimizer } from '@/lib/query-optimization';
import type { InitiativeWithRelations } from '@/lib/types/database';

interface UsePaginatedInitiativesParams extends PaginationParams {
  areaId?: string;
  status?: string;
  priority?: string;
  search?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface UsePaginatedInitiativesResult {
  data: InitiativeWithRelations[];
  pagination: PaginationResult<InitiativeWithRelations>['pagination'];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setFilters: (filters: Partial<UsePaginatedInitiativesParams>) => void;
  performanceMetrics: {
    averageQueryTime: number;
    cacheHitRate: number;
  };
}

/**
 * Enhanced hook for paginated initiatives with caching and performance monitoring
 * 
 * Features:
 * - Server-side pagination with configurable page sizes
 * - Intelligent caching with automatic invalidation
 * - Advanced filtering and search capabilities
 * - Performance monitoring and optimization
 * - Real-time updates via Supabase subscriptions
 */
export function usePaginatedInitiatives(
  initialParams: UsePaginatedInitiativesParams = {}
): UsePaginatedInitiativesResult {
  const [params, setParams] = useState<UsePaginatedInitiativesParams>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: 'created_at',
    sortOrder: 'desc',
    ...initialParams
  });
  
  const [result, setResult] = useState<PaginationResult<InitiativeWithRelations>>({
    data: [],
    pagination: {
      currentPage: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      totalCount: 0,
      totalPages: 0,
      hasNextPage: false,
      hasPreviousPage: false,
      startIndex: 1,
      endIndex: 0
    }
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();
  const tenantId = useTenantId();

  // Create cache key based on parameters
  const cacheKey = useMemo(() => {
    const keyParts = [
      tenantId,
      params.page,
      params.pageSize,
      params.sortBy,
      params.sortOrder,
      params.areaId,
      params.status,
      params.priority,
      params.search,
      params.dateRange?.start,
      params.dateRange?.end
    ].filter(Boolean);
    
    return keyParts.join(':');
  }, [tenantId, params]);

  /**
   * Fetch initiatives with pagination and caching
   */
  const fetchInitiatives = useCallback(async () => {
    if (!tenantId) {
      console.log('usePaginatedInitiatives: No tenant ID available');
      setLoading(false);
      return;
    }

    const startTime = Date.now();
    
    // Check cache first
    const cached = getInitiativeCache().get(cacheKey);
    if (cached) {
      setResult(cached);
      
      // Record cache hit
      PaginationPerformanceMonitor.recordMetric('initiatives', {
        queryTime: Date.now() - startTime,
        dataSize: cached.data.length,
        cacheHit: true,
        totalRows: cached.pagination.totalCount
      });
      
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { page, pageSize, offset, limit, sortBy, sortOrder } = createPaginationQuery(params);

      // Build query
      let query = supabase
        .from('initiatives')
        .select(`
          *,
          areas!initiatives_area_id_fkey(
            id,
            name,
            description
          ),
          activities(*)
        `, { count: 'exact' })
        .eq('tenant_id', tenantId);

      // Apply filters
      if (params.areaId) {
        query = query.eq('area_id', params.areaId);
      }

      if (params.status) {
        query = query.eq('status', params.status);
      }

      if (params.priority) {
        query = query.eq('priority', params.priority);
      }

      if (params.search) {
        query = query.or(`title.ilike.%${params.search}%,description.ilike.%${params.search}%`);
      }

      if (params.dateRange) {
        query = query
          .gte('created_at', params.dateRange.start)
          .lte('created_at', params.dateRange.end);
      }

      // Apply pagination and sorting
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // Transform data
      const initiativesWithDetails: InitiativeWithRelations[] = (data || []).map(initiative => ({
        ...initiative,
        area: initiative.areas || null,
        activities: initiative.activities || [],
        activity_count: initiative.activities?.length || 0,
        completed_activities: initiative.activities?.filter((act: any) => act.completed).length || 0
      }));

      // Build pagination result
      const paginationResult = buildPaginationResult(
        initiativesWithDetails,
        count || 0,
        page,
        pageSize
      );

      setResult(paginationResult);

      // Cache the result
      getInitiativeCache().set(cacheKey, paginationResult, 5 * 60 * 1000); // 5 minutes TTL

      // Record performance metrics
      PaginationPerformanceMonitor.recordMetric('initiatives', {
        queryTime: Date.now() - startTime,
        dataSize: initiativesWithDetails.length,
        cacheHit: false,
        totalRows: count || 0
      });

      console.log(`Fetched ${initiativesWithDetails.length} initiatives (page ${page}/${paginationResult.pagination.totalPages})`);
      
    } catch (err) {
      console.error('Error fetching paginated initiatives:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      
      // Record error metric
      PaginationPerformanceMonitor.recordMetric('initiatives', {
        queryTime: Date.now() - startTime,
        dataSize: 0,
        cacheHit: false,
        totalRows: 0
      });
    } finally {
      setLoading(false);
    }
  }, [tenantId, cacheKey, params, supabase]);

  /**
   * Navigate to specific page
   */
  const goToPage = useCallback((page: number) => {
    setParams(prev => ({ ...prev, page }));
  }, []);

  /**
   * Change page size
   */
  const setPageSize = useCallback((pageSize: number) => {
    setParams(prev => ({ ...prev, pageSize, page: 1 })); // Reset to first page
  }, []);

  /**
   * Update filters
   */
  const setFilters = useCallback((filters: Partial<UsePaginatedInitiativesParams>) => {
    setParams(prev => ({ ...prev, ...filters, page: 1 })); // Reset to first page
  }, []);

  /**
   * Performance metrics
   */
  const performanceMetrics = useMemo(() => ({
    averageQueryTime: PaginationPerformanceMonitor.getAverageQueryTime('initiatives'),
    cacheHitRate: PaginationPerformanceMonitor.getCacheHitRate('initiatives')
  }), [result]);

  // Fetch data when parameters change
  useEffect(() => {
    fetchInitiatives();
  }, [fetchInitiatives]);

  // Real-time subscriptions
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase.channel('paginated-initiatives-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'initiatives',
        filter: `tenant_id=eq.${tenantId}` 
      }, (payload) => {
        console.log('Initiative changed, invalidating cache:', payload);
        
        // Invalidate related cache entries
        cacheManager.invalidateRelated('initiative', payload.eventType as any);
        
        // Refetch current page
        fetchInitiatives();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'activities',
        filter: `tenant_id=eq.${tenantId}` 
      }, (payload) => {
        console.log('Activity changed, invalidating cache:', payload);
        
        // Invalidate related cache entries
        cacheManager.invalidateRelated('activity', payload.eventType as any);
        
        // Refetch current page
        fetchInitiatives();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, fetchInitiatives, supabase]);

  return {
    data: result.data,
    pagination: result.pagination,
    loading,
    error,
    refetch: fetchInitiatives,
    goToPage,
    setPageSize,
    setFilters,
    performanceMetrics
  };
}

/**
 * Hook for paginated initiatives with infinite scroll support
 */
export function useInfiniteInitiatives(
  params: UsePaginatedInitiativesParams = {}
) {
  const [allData, setAllData] = useState<InitiativeWithRelations[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  
  const { 
    data, 
    pagination, 
    loading, 
    error, 
    setFilters 
  } = usePaginatedInitiatives({
    ...params,
    page: currentPage,
    pageSize: params.pageSize || 20
  });

  // Append new data for infinite scroll
  useEffect(() => {
    if (currentPage === 1) {
      // Reset for new search/filters
      setAllData(data);
    } else {
      // Append new page data
      setAllData(prev => [...prev, ...data]);
    }
    
    setHasMore(pagination.hasNextPage);
  }, [data, pagination.hasNextPage, currentPage]);

  // Load next page
  const loadMore = useCallback(() => {
    if (hasMore && !loading) {
      setCurrentPage(prev => prev + 1);
    }
  }, [hasMore, loading]);

  // Reset for new filters
  const resetAndFilter = useCallback((filters: Partial<UsePaginatedInitiativesParams>) => {
    setCurrentPage(1);
    setFilters(filters);
  }, [setFilters]);

  return {
    data: allData,
    loading,
    error,
    hasMore,
    loadMore,
    setFilters: resetAndFilter,
    totalCount: pagination.totalCount
  };
}