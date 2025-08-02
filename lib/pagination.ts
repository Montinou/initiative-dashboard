/**
 * Pagination utilities for Mariana Project
 * Provides reusable pagination logic for large datasets
 */

import { useState, useMemo, useCallback } from 'react';

export interface PaginationConfig {
  pageSize: number;
  currentPage: number;
  totalCount?: number;
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    startIndex: number;
    endIndex: number;
  };
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

/**
 * Creates pagination parameters for Supabase queries
 */
export function createPaginationQuery(params: PaginationParams) {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize || DEFAULT_PAGE_SIZE));
  const offset = (page - 1) * pageSize;
  const limit = pageSize;

  return {
    page,
    pageSize,
    offset,
    limit,
    sortBy: params.sortBy || 'created_at',
    sortOrder: params.sortOrder || 'desc'
  };
}

/**
 * Builds pagination result object
 */
export function buildPaginationResult<T>(
  data: T[],
  totalCount: number,
  currentPage: number,
  pageSize: number
): PaginationResult<T> {
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(startIndex + data.length - 1, totalCount);

  return {
    data,
    pagination: {
      currentPage,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
      startIndex,
      endIndex
    }
  };
}

/**
 * Hook-compatible pagination state
 */
export interface UsePaginationResult {
  currentPage: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  startIndex: number;
  endIndex: number;
  goToPage: (page: number) => void;
  goToNextPage: () => void;
  goToPreviousPage: () => void;
  setPageSize: (size: number) => void;
  reset: () => void;
}

/**
 * Validates pagination parameters
 */
export function validatePaginationParams(params: PaginationParams): PaginationParams {
  const page = Math.max(1, params.page || 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize || DEFAULT_PAGE_SIZE));
  
  return {
    ...params,
    page,
    pageSize
  };
}

/**
 * Creates URL search params for pagination
 */
export function createPaginationSearchParams(params: PaginationParams): URLSearchParams {
  const searchParams = new URLSearchParams();
  
  if (params.page && params.page > 1) {
    searchParams.set('page', params.page.toString());
  }
  
  if (params.pageSize && params.pageSize !== DEFAULT_PAGE_SIZE) {
    searchParams.set('pageSize', params.pageSize.toString());
  }
  
  if (params.sortBy) {
    searchParams.set('sortBy', params.sortBy);
  }
  
  if (params.sortOrder && params.sortOrder !== 'desc') {
    searchParams.set('sortOrder', params.sortOrder);
  }
  
  return searchParams;
}

/**
 * Parses pagination parameters from URL search params
 */
export function parsePaginationFromSearchParams(searchParams: URLSearchParams): PaginationParams {
  return {
    page: parseInt(searchParams.get('page') || '1', 10),
    pageSize: parseInt(searchParams.get('pageSize') || DEFAULT_PAGE_SIZE.toString(), 10),
    sortBy: searchParams.get('sortBy') || undefined,
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || undefined
  };
}

/**
 * Calculates performance metrics for pagination
 */
export interface PaginationPerformanceMetrics {
  queryTime: number;
  dataSize: number;
  cacheHit: boolean;
  totalRows: number;
}

/**
 * Performance monitoring for paginated queries
 */
export class PaginationPerformanceMonitor {
  private static metrics: Map<string, PaginationPerformanceMetrics[]> = new Map();

  static recordMetric(key: string, metric: PaginationPerformanceMetrics) {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }
    
    const keyMetrics = this.metrics.get(key)!;
    keyMetrics.push(metric);
    
    // Keep only last 100 metrics per key
    if (keyMetrics.length > 100) {
      keyMetrics.shift();
    }
  }

  static getAverageQueryTime(key: string): number {
    const keyMetrics = this.metrics.get(key);
    if (!keyMetrics || keyMetrics.length === 0) return 0;
    
    const sum = keyMetrics.reduce((acc, m) => acc + m.queryTime, 0);
    return sum / keyMetrics.length;
  }

  static getCacheHitRate(key: string): number {
    const keyMetrics = this.metrics.get(key);
    if (!keyMetrics || keyMetrics.length === 0) return 0;
    
    const cacheHits = keyMetrics.filter(m => m.cacheHit).length;
    return cacheHits / keyMetrics.length;
  }

  static getMetrics(key: string): PaginationPerformanceMetrics[] {
    return this.metrics.get(key) || [];
  }

  static clearMetrics(key?: string) {
    if (key) {
      this.metrics.delete(key);
    } else {
      this.metrics.clear();
    }
  }
}

/**
 * Optimized pagination for large datasets
 * Uses cursor-based pagination for better performance
 */
export interface CursorPaginationParams {
  pageSize?: number;
  cursor?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CursorPaginationResult<T> {
  data: T[];
  nextCursor?: string;
  previousCursor?: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  pageSize: number;
}

/**
 * Creates cursor-based pagination for very large datasets
 */
export function createCursorPaginationQuery(params: CursorPaginationParams) {
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize || DEFAULT_PAGE_SIZE));
  const sortBy = params.sortBy || 'created_at';
  const sortOrder = params.sortOrder || 'desc';

  return {
    pageSize,
    cursor: params.cursor,
    sortBy,
    sortOrder,
    limit: pageSize + 1 // Fetch one extra to determine if there's a next page
  };
}

/**
 * Builds cursor pagination result
 */
export function buildCursorPaginationResult<T extends Record<string, any>>(
  data: T[],
  pageSize: number,
  sortBy: string,
  hasPreviousCursor?: string
): CursorPaginationResult<T> {
  const hasNextPage = data.length > pageSize;
  const actualData = hasNextPage ? data.slice(0, pageSize) : data;
  
  const nextCursor = hasNextPage && actualData.length > 0 
    ? actualData[actualData.length - 1][sortBy] 
    : undefined;
    
  const previousCursor = hasPreviousCursor;

  return {
    data: actualData,
    nextCursor,
    previousCursor,
    hasNextPage,
    hasPreviousPage: !!previousCursor,
    pageSize
  };
}

/**
 * Virtual scrolling configuration for large datasets
 */
export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside visible area
  threshold?: number; // Scroll threshold for loading more data
}

/**
 * Virtual scrolling state management
 */
export interface VirtualScrollState {
  scrollTop: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
  totalItems: number;
  renderStartIndex: number;
  renderEndIndex: number;
  offsetY: number;
}

/**
 * Calculate virtual scroll parameters
 */
export function calculateVirtualScroll(
  config: VirtualScrollConfig,
  scrollTop: number,
  totalItems: number
): VirtualScrollState {
  const { itemHeight, containerHeight, overscan = 5, threshold = 3 } = config;
  
  const visibleStartIndex = Math.floor(scrollTop / itemHeight);
  const visibleEndIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight)
  );
  
  const renderStartIndex = Math.max(0, visibleStartIndex - overscan);
  const renderEndIndex = Math.min(totalItems - 1, visibleEndIndex + overscan);
  
  const offsetY = renderStartIndex * itemHeight;
  
  return {
    scrollTop,
    visibleStartIndex,
    visibleEndIndex,
    totalItems,
    renderStartIndex,
    renderEndIndex,
    offsetY
  };
}

/**
 * Hook for managing virtual scroll state
 */
export function useVirtualScroll(
  config: VirtualScrollConfig,
  totalItems: number
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const virtualState = useMemo(() => 
    calculateVirtualScroll(config, scrollTop, totalItems),
    [config, scrollTop, totalItems]
  );
  
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);
  
  const scrollToIndex = useCallback((index: number) => {
    const scrollTop = index * config.itemHeight;
    setScrollTop(scrollTop);
    return scrollTop;
  }, [config.itemHeight]);
  
  const shouldLoadMore = useMemo(() => {
    const { visibleEndIndex, totalItems } = virtualState;
    const threshold = config.threshold || 3;
    return visibleEndIndex >= totalItems - threshold;
  }, [virtualState, config.threshold]);
  
  return {
    ...virtualState,
    handleScroll,
    scrollToIndex,
    shouldLoadMore
  };
}

/**
 * Optimized data fetching strategy for large datasets
 */
export interface DataFetchingStrategy {
  strategy: 'pagination' | 'cursor' | 'virtual' | 'infinite';
  pageSize: number;
  prefetchPages?: number; // Number of pages to prefetch
  maxCacheSize?: number; // Maximum items to keep in cache
}

/**
 * Determines optimal data fetching strategy based on dataset characteristics
 */
export function getOptimalFetchingStrategy(
  estimatedTotalItems: number,
  averageItemSize: number = 1000, // bytes
  availableMemory: number = 50 * 1024 * 1024 // 50MB default
): DataFetchingStrategy {
  const estimatedDataSize = estimatedTotalItems * averageItemSize;
  
  // For small datasets that fit in memory
  if (estimatedDataSize < availableMemory * 0.1) {
    return {
      strategy: 'pagination',
      pageSize: 50,
      prefetchPages: 2,
      maxCacheSize: estimatedTotalItems
    };
  }
  
  // For medium datasets
  if (estimatedDataSize < availableMemory * 0.5) {
    return {
      strategy: 'infinite',
      pageSize: 25,
      prefetchPages: 1,
      maxCacheSize: Math.floor(availableMemory * 0.3 / averageItemSize)
    };
  }
  
  // For large datasets
  if (estimatedTotalItems > 10000) {
    return {
      strategy: 'virtual',
      pageSize: 100,
      prefetchPages: 0,
      maxCacheSize: 500
    };
  }
  
  // Default to cursor-based pagination
  return {
    strategy: 'cursor',
    pageSize: 50,
    prefetchPages: 1,
    maxCacheSize: 1000
  };
}

