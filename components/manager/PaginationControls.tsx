"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { PaginationResult } from '@/lib/pagination';

interface PaginationControlsProps {
  pagination: PaginationResult<any>['pagination'];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  loading?: boolean;
  showPageSizeSelector?: boolean;
  showSummary?: boolean;
  className?: string;
}

/**
 * Reusable pagination controls component for manager dashboard
 * 
 * Features:
 * - Page navigation (first, previous, next, last)
 * - Page size selection
 * - Results summary display
 * - Loading state support
 * - Glassmorphism design consistency
 */
export function PaginationControls({
  pagination,
  onPageChange,
  onPageSizeChange,
  loading = false,
  showPageSizeSelector = true,
  showSummary = true,
  className = ""
}: PaginationControlsProps) {
  const {
    currentPage,
    totalPages,
    totalCount,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    startIndex,
    endIndex
  } = pagination;

  const handleFirstPage = () => {
    if (currentPage > 1 && !loading) {
      onPageChange(1);
    }
  };

  const handlePreviousPage = () => {
    if (hasPreviousPage && !loading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage && !loading) {
      onPageChange(currentPage + 1);
    }
  };

  const handleLastPage = () => {
    if (currentPage < totalPages && !loading) {
      onPageChange(totalPages);
    }
  };

  const pageSizeOptions = [10, 20, 25, 50, 100];

  return (
    <div className={`flex items-center justify-between gap-4 p-4 ${className}`}>
      {/* Results summary */}
      {showSummary && (
        <div className="hidden sm:block text-sm text-slate-600 dark:text-slate-400">
          {totalCount > 0 ? (
            <>
              Showing {startIndex.toLocaleString()} to {endIndex.toLocaleString()} of{' '}
              {totalCount.toLocaleString()} results
            </>
          ) : (
            'No results found'
          )}
        </div>
      )}

      {/* Mobile summary */}
      {showSummary && (
        <div className="sm:hidden text-sm text-slate-600 dark:text-slate-400">
          {totalCount > 0 ? (
            <>
              {currentPage} of {totalPages}
            </>
          ) : (
            'No results'
          )}
        </div>
      )}

      <div className="flex items-center gap-4">
        {/* Page size selector */}
        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600 dark:text-slate-400 hidden sm:inline">
              Show
            </span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value) => onPageSizeChange(parseInt(value, 10))}
              disabled={loading}
            >
              <SelectTrigger className="w-20 h-8 glass-card border-white/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card border-white/20">
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-slate-600 dark:text-slate-400 hidden sm:inline">
              per page
            </span>
          </div>
        )}

        {/* Navigation controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleFirstPage}
            disabled={!hasPreviousPage || loading}
            className="h-8 w-8 p-0 glass-card border-white/20 hover:bg-white/10"
          >
            <ChevronsLeft className="h-4 w-4" />
            <span className="sr-only">First page</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousPage}
            disabled={!hasPreviousPage || loading}
            className="h-8 w-8 p-0 glass-card border-white/20 hover:bg-white/10"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="sr-only">Previous page</span>
          </Button>

          {/* Page indicator */}
          <div className="flex items-center justify-center min-w-[100px] text-sm text-slate-600 dark:text-slate-400">
            {totalPages > 0 ? (
              <>
                Page {currentPage.toLocaleString()} of {totalPages.toLocaleString()}
              </>
            ) : (
              'Page 0 of 0'
            )}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={!hasNextPage || loading}
            className="h-8 w-8 p-0 glass-card border-white/20 hover:bg-white/10"
          >
            <ChevronRight className="h-4 w-4" />
            <span className="sr-only">Next page</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleLastPage}
            disabled={!hasNextPage || loading}
            className="h-8 w-8 p-0 glass-card border-white/20 hover:bg-white/10"
          >
            <ChevronsRight className="h-4 w-4" />
            <span className="sr-only">Last page</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Simplified pagination controls for mobile/compact views
 */
export function CompactPaginationControls({
  pagination,
  onPageChange,
  loading = false,
  className = ""
}: Pick<PaginationControlsProps, 'pagination' | 'onPageChange' | 'loading' | 'className'>) {
  const {
    currentPage,
    totalPages,
    hasNextPage,
    hasPreviousPage
  } = pagination;

  const handlePreviousPage = () => {
    if (hasPreviousPage && !loading) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasNextPage && !loading) {
      onPageChange(currentPage + 1);
    }
  };

  return (
    <div className={`flex items-center justify-between gap-2 p-2 ${className}`}>
      <Button
        variant="outline"
        size="sm"
        onClick={handlePreviousPage}
        disabled={!hasPreviousPage || loading}
        className="glass-card border-white/20 hover:bg-white/10"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Previous
      </Button>

      <span className="text-sm text-slate-600 dark:text-slate-400">
        {currentPage} of {totalPages}
      </span>

      <Button
        variant="outline"
        size="sm"
        onClick={handleNextPage}
        disabled={!hasNextPage || loading}
        className="glass-card border-white/20 hover:bg-white/10"
      >
        Next
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}

/**
 * Performance metrics display for pagination
 */
interface PerformanceMetricsProps {
  metrics: {
    averageQueryTime: number;
    cacheHitRate: number;
  };
  className?: string;
}

export function PaginationPerformanceMetrics({ 
  metrics, 
  className = "" 
}: PerformanceMetricsProps) {
  const { averageQueryTime, cacheHitRate } = metrics;

  if (averageQueryTime === 0 && cacheHitRate === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 ${className}`}>
      <div className="flex items-center gap-1">
        <span>Query time:</span>
        <span className="font-mono">
          {averageQueryTime.toFixed(0)}ms
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        <span>Cache hit rate:</span>
        <span className="font-mono">
          {(cacheHitRate * 100).toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

/**
 * Loading skeleton for pagination controls
 */
export function PaginationSkeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-between gap-4 p-4 ${className}`}>
      <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
      
      <div className="flex items-center gap-4">
        <div className="h-4 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        
        <div className="flex items-center gap-1">
          {[...Array(4)].map((_, i) => (
            <div 
              key={i} 
              className="h-8 w-8 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" 
            />
          ))}
        </div>
      </div>
    </div>
  );
}