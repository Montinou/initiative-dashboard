"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAreaScopedData } from '@/components/manager/ManagerAreaProvider';
import { 
  createPaginationQuery, 
  buildPaginationResult, 
  PaginationParams, 
  PaginationResult, 
  DEFAULT_PAGE_SIZE,
  PaginationPerformanceMonitor
} from '@/lib/pagination';
import { cacheManager } from '@/lib/cache';

interface FileUploadRecord {
  id: string;
  tenant_id: string;
  area_id: string;
  uploaded_by: string;
  file_name: string;
  file_size: number;
  file_type: string;
  upload_status: 'pending' | 'processing' | 'completed' | 'failed';
  processing_results?: any;
  error_message?: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  user_profiles?: {
    full_name: string;
    email: string;
  };
}

interface UsePaginatedFileUploadsParams extends PaginationParams {
  status?: string;
  search?: string;
  fileType?: string;
  dateRange?: {
    start: string;
    end: string;
  };
}

interface UsePaginatedFileUploadsResult {
  data: FileUploadRecord[];
  pagination: PaginationResult<FileUploadRecord>['pagination'];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  goToPage: (page: number) => void;
  setPageSize: (size: number) => void;
  setFilters: (filters: Partial<UsePaginatedFileUploadsParams>) => void;
  performanceMetrics: {
    averageQueryTime: number;
    cacheHitRate: number;
  };
}

/**
 * Hook for paginated file uploads with area-based filtering
 * 
 * Features:
 * - Server-side pagination with configurable page sizes
 * - Intelligent caching with automatic invalidation
 * - Advanced filtering by status, file type, date range
 * - Performance monitoring and optimization
 * - Real-time updates via Supabase subscriptions
 * - Area-based security isolation
 */
export function usePaginatedFileUploads(
  initialParams: UsePaginatedFileUploadsParams = {}
): UsePaginatedFileUploadsResult {
  const { managedAreaId } = useAreaScopedData();
  
  const [params, setParams] = useState<UsePaginatedFileUploadsParams>({
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    sortBy: 'created_at',
    sortOrder: 'desc',
    ...initialParams
  });
  
  const [result, setResult] = useState<PaginationResult<FileUploadRecord>>({
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

  // Create cache key based on parameters
  const cacheKey = useMemo(() => {
    // RLS automatically filters by tenant
    const keyParts = [
      'uploaded_files',
      managedAreaId,
      params.page,
      params.pageSize,
      params.sortBy,
      params.sortOrder,
      params.status,
      params.search,
      params.fileType,
      params.dateRange?.start,
      params.dateRange?.end
    ].filter(Boolean);
    
    return keyParts.join(':');
  }, [managedAreaId, params]);

  /**
   * Fetch file uploads with pagination and caching
   */
  const fetchFileUploads = useCallback(async () => {
    if (!managedAreaId) {
      console.log('usePaginatedFileUploads: No managed area available');
      setLoading(false);
      return;
    }

    const startTime = Date.now();
    
    // Check cache first
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      setResult(cached);
      
      // Record cache hit
      PaginationPerformanceMonitor.recordMetric('uploaded_files', {
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

      // RLS automatically filters by tenant
      const { page, pageSize, offset, limit, sortBy, sortOrder } = createPaginationQuery(params);

      // Build query
      let query = supabase
        .from('uploaded_files')
        .select(`
          *,
          user_profiles!uploaded_files_uploaded_by_fkey(
            full_name,
            email
          )
        `, { count: 'exact' })
        .eq('area_id', managedAreaId)
        .neq('upload_status', 'deleted');

      // Apply filters
      if (params.status) {
        query = query.eq('upload_status', params.status);
      }

      if (params.search) {
        query = query.ilike('file_name', `%${params.search}%`);
      }

      if (params.fileType) {
        query = query.ilike('file_type', `%${params.fileType}%`);
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
      const fileUploads: FileUploadRecord[] = (data || []).map(upload => ({
        ...upload,
        user_profiles: upload.user_profiles || null
      }));

      // Build pagination result
      const paginationResult = buildPaginationResult(
        fileUploads,
        count || 0,
        page,
        pageSize
      );

      setResult(paginationResult);

      // Cache the result
      cacheManager.set(cacheKey, paginationResult, 3 * 60 * 1000); // 3 minutes TTL

      // Record performance metrics
      PaginationPerformanceMonitor.recordMetric('uploaded_files', {
        queryTime: Date.now() - startTime,
        dataSize: fileUploads.length,
        cacheHit: false,
        totalRows: count || 0
      });

      console.log(`Fetched ${fileUploads.length} file uploads (page ${page}/${paginationResult.pagination.totalPages})`);
      
    } catch (err) {
      console.error('Error fetching paginated file uploads:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      
      // Record error metric
      PaginationPerformanceMonitor.recordMetric('uploaded_files', {
        queryTime: Date.now() - startTime,
        dataSize: 0,
        cacheHit: false,
        totalRows: 0
      });
    } finally {
      setLoading(false);
    }
  }, [managedAreaId, cacheKey, params, supabase]);

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
  const setFilters = useCallback((filters: Partial<UsePaginatedFileUploadsParams>) => {
    setParams(prev => ({ ...prev, ...filters, page: 1 })); // Reset to first page
  }, []);

  /**
   * Performance metrics
   */
  const performanceMetrics = useMemo(() => ({
    averageQueryTime: PaginationPerformanceMonitor.getAverageQueryTime('uploaded_files'),
    cacheHitRate: PaginationPerformanceMonitor.getCacheHitRate('uploaded_files')
  }), [result]);

  // Fetch data when parameters change
  useEffect(() => {
    fetchFileUploads();
  }, [fetchFileUploads]);

  // Real-time subscriptions
  useEffect(() => {
    if (!managedAreaId) return;

    // RLS automatically filters by tenant
    
    const channel = supabase.channel('paginated-uploaded-files-changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'uploaded_files',
        filter: `area_id=eq.${managedAreaId}` 
      }, (payload) => {
        console.log('File upload changed, invalidating cache:', payload);
        
        // Invalidate related cache entries
        cacheManager.invalidateRelated('file_upload', payload.eventType as any);
        
        // Refetch current page
        fetchFileUploads();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [managedAreaId, fetchFileUploads, supabase]);

  return {
    data: result.data,
    pagination: result.pagination,
    loading,
    error,
    refetch: fetchFileUploads,
    goToPage,
    setPageSize,
    setFilters,
    performanceMetrics
  };
}

/**
 * Hook for paginated audit log with area filtering
 */
export function usePaginatedAuditLog(
  initialParams: PaginationParams = {}
): UsePaginatedFileUploadsResult {
  const { managedAreaId } = useAreaScopedData();
  
  const [params, setParams] = useState<PaginationParams>({
    page: 1,
    pageSize: 25, // Smaller page size for audit logs
    sortBy: 'created_at',
    sortOrder: 'desc',
    ...initialParams
  });
  
  const [result, setResult] = useState<PaginationResult<any>>({
    data: [],
    pagination: {
      currentPage: 1,
      pageSize: 25,
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

  // Create cache key based on parameters
  const cacheKey = useMemo(() => {
    // RLS automatically filters by tenant
    const keyParts = [
      'audit_log',
      managedAreaId,
      params.page,
      params.pageSize,
      params.sortBy,
      params.sortOrder
    ].filter(Boolean);
    
    return keyParts.join(':');
  }, [managedAreaId, params]);

  /**
   * Fetch audit log with pagination
   */
  const fetchAuditLog = useCallback(async () => {
    if (!managedAreaId) {
      console.log('usePaginatedAuditLog: No managed area available');
      setLoading(false);
      return;
    }

    const startTime = Date.now();
    
    // Check cache first
    const cached = cacheManager.get(cacheKey);
    if (cached) {
      setResult(cached);
      
      // Record cache hit
      PaginationPerformanceMonitor.recordMetric('audit_log', {
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

      // RLS automatically filters by tenant
      const { page, pageSize, offset, limit, sortBy, sortOrder } = createPaginationQuery(params);

      // Build query for audit log
      let query = supabase
        .from('audit_log')
        .select(`
          *,
          user_profiles!audit_log_user_id_fkey(
            full_name,
            email
          )
        `, { count: 'exact' })
        ;

      // Apply pagination and sorting
      query = query
        .order(sortBy, { ascending: sortOrder === 'asc' })
        .range(offset, offset + limit - 1);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // Build pagination result
      const paginationResult = buildPaginationResult(
        data || [],
        count || 0,
        page,
        pageSize
      );

      setResult(paginationResult);

      // Cache the result
      cacheManager.set(cacheKey, paginationResult, 2 * 60 * 1000); // 2 minutes TTL

      // Record performance metrics
      PaginationPerformanceMonitor.recordMetric('audit_log', {
        queryTime: Date.now() - startTime,
        dataSize: (data || []).length,
        cacheHit: false,
        totalRows: count || 0
      });

      console.log(`Fetched ${(data || []).length} audit log entries (page ${page}/${paginationResult.pagination.totalPages})`);
      
    } catch (err) {
      console.error('Error fetching paginated audit log:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      
      // Record error metric
      PaginationPerformanceMonitor.recordMetric('audit_log', {
        queryTime: Date.now() - startTime,
        dataSize: 0,
        cacheHit: false,
        totalRows: 0
      });
    } finally {
      setLoading(false);
    }
  }, [managedAreaId, cacheKey, params, supabase]);

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
  const setFilters = useCallback((filters: Partial<PaginationParams>) => {
    setParams(prev => ({ ...prev, ...filters, page: 1 })); // Reset to first page
  }, []);

  /**
   * Performance metrics
   */
  const performanceMetrics = useMemo(() => ({
    averageQueryTime: PaginationPerformanceMonitor.getAverageQueryTime('audit_log'),
    cacheHitRate: PaginationPerformanceMonitor.getCacheHitRate('audit_log')
  }), [result]);

  // Fetch data when parameters change
  useEffect(() => {
    fetchAuditLog();
  }, [fetchAuditLog]);

  // Real-time subscriptions
  useEffect(() => {
    if (!managedAreaId) return;

    // RLS automatically filters by tenant
    
    const channel = supabase.channel('paginated-audit-log-changes')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'audit_log'
      }, (payload) => {
        console.log('New audit log entry, invalidating cache:', payload);
        
        // Invalidate related cache entries
        cacheManager.invalidateRelated('audit_log', 'INSERT');
        
        // Refetch current page
        fetchAuditLog();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [managedAreaId, fetchAuditLog, supabase]);

  return {
    data: result.data,
    pagination: result.pagination,
    loading,
    error,
    refetch: fetchAuditLog,
    goToPage,
    setPageSize,
    setFilters,
    performanceMetrics
  };
}