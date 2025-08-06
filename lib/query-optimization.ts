/**
 * Query optimization utilities for Mariana Manager Dashboard
 * Provides optimized query patterns and performance monitoring
 */

import { createClient } from '@/utils/supabase/client';

export interface QueryPerformanceMetrics {
  queryTime: number;
  rowsReturned: number;
  indexesUsed: string[];
  cacheHit: boolean;
  suggestions: string[];
}

export interface OptimizedQueryOptions {
  useIndexHints?: boolean;
  enableProfiling?: boolean;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Query optimization patterns for common manager dashboard queries
 */
export class QueryOptimizer {
  private static instance: QueryOptimizer;
  private supabase = createClient();
  private performanceLog: Map<string, QueryPerformanceMetrics[]> = new Map();

  static getInstance(): QueryOptimizer {
    if (!QueryOptimizer.instance) {
      QueryOptimizer.instance = new QueryOptimizer();
    }
    return QueryOptimizer.instance;
  }

  /**
   * Optimized initiative query with proper index usage
   */
  async getOptimizedInitiatives(
    tenantId: string,
    areaId: string,
    options: {
      status?: string;
      priority?: string;
      search?: string;
      limit?: number;
      offset?: number;
      orderBy?: string;
      orderDirection?: 'asc' | 'desc';
    } = {}
  ): Promise<{ data: any[], performance: QueryPerformanceMetrics }> {
    const startTime = Date.now();
    const queryKey = `initiatives-${tenantId}-${areaId}-${JSON.stringify(options)}`;

    try {
      // Use the optimized query pattern that leverages our indexes
      let query = this.supabase
        .from('initiatives')
        .select(`
          id,
          title,
          description,
          status,
          priority,
          progress,
          target_date,
          completion_date,
          budget,
          actual_cost,
          created_at,
          updated_at,
          areas!initiatives_area_id_fkey(
            id,
            name,
            description
          )
        `)
        // Use the idx_initiatives_tenant_area_status index
        .eq('tenant_id', tenantId)
        .eq('area_id', areaId);

      // Apply filters in order of index selectivity
      if (options.status) {
        query = query.eq('status', options.status);
      }

      if (options.priority) {
        query = query.eq('priority', options.priority);
      }

      // Full-text search uses the GIN index
      if (options.search) {
        query = query.textSearch('title,description', options.search);
      }

      // Use the created_at index for ordering
      const orderBy = options.orderBy || 'created_at';
      const orderDirection = options.orderDirection || 'desc';
      query = query.order(orderBy, { ascending: orderDirection === 'asc' });

      // Apply pagination
      if (options.limit) {
        const offset = options.offset || 0;
        query = query.range(offset, offset + options.limit - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      const queryTime = Date.now() - startTime;
      const performance: QueryPerformanceMetrics = {
        queryTime,
        rowsReturned: data?.length || 0,
        indexesUsed: this.inferIndexesUsed('initiatives', options),
        cacheHit: false,
        suggestions: this.generateOptimizationSuggestions(queryTime, data?.length || 0)
      };

      this.recordPerformance(queryKey, performance);

      return { data: data || [], performance };
    } catch (error) {
      const queryTime = Date.now() - startTime;
      const performance: QueryPerformanceMetrics = {
        queryTime,
        rowsReturned: 0,
        indexesUsed: [],
        cacheHit: false,
        suggestions: ['Query failed - check error logs']
      };

      this.recordPerformance(queryKey, performance);
      throw error;
    }
  }

  /**
   * Optimized subtask query for initiative details
   */
  async getOptimizedSubtasks(
    tenantId: string,
    initiativeId: string
  ): Promise<{ data: any[], performance: QueryPerformanceMetrics }> {
    const startTime = Date.now();
    const queryKey = `subtasks-${tenantId}-${initiativeId}`;

    try {
      // Use the idx_subtasks_tenant_initiative index
      const { data, error } = await this.supabase
        .from('subtasks')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('initiative_id', initiativeId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const queryTime = Date.now() - startTime;
      const performance: QueryPerformanceMetrics = {
        queryTime,
        rowsReturned: data?.length || 0,
        indexesUsed: ['idx_subtasks_tenant_initiative'],
        cacheHit: false,
        suggestions: this.generateOptimizationSuggestions(queryTime, data?.length || 0)
      };

      this.recordPerformance(queryKey, performance);

      return { data: data || [], performance };
    } catch (error) {
      const queryTime = Date.now() - startTime;
      const performance: QueryPerformanceMetrics = {
        queryTime,
        rowsReturned: 0,
        indexesUsed: [],
        cacheHit: false,
        suggestions: ['Query failed - check error logs']
      };

      this.recordPerformance(queryKey, performance);
      throw error;
    }
  }

  /**
   * Optimized area summary query with metrics calculation
   */
  async getOptimizedAreaSummary(
    tenantId: string,
    areaId: string
  ): Promise<{ data: any, performance: QueryPerformanceMetrics }> {
    const startTime = Date.now();
    const queryKey = `area-summary-${tenantId}-${areaId}`;

    try {
      // Use the initiatives_with_subtasks_summary view for optimal performance
      const { data: initiatives, error } = await this.supabase
        .from('initiatives_with_subtasks_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('area_id', areaId);

      if (error) throw error;

      // Calculate metrics efficiently
      const metrics = this.calculateAreaMetrics(initiatives || []);

      const queryTime = Date.now() - startTime;
      const performance: QueryPerformanceMetrics = {
        queryTime,
        rowsReturned: initiatives?.length || 0,
        indexesUsed: ['initiatives_with_subtasks_summary_view_indexes'],
        cacheHit: false,
        suggestions: this.generateOptimizationSuggestions(queryTime, initiatives?.length || 0)
      };

      this.recordPerformance(queryKey, performance);

      return { data: metrics, performance };
    } catch (error) {
      const queryTime = Date.now() - startTime;
      const performance: QueryPerformanceMetrics = {
        queryTime,
        rowsReturned: 0,
        indexesUsed: [],
        cacheHit: false,
        suggestions: ['Query failed - check error logs']
      };

      this.recordPerformance(queryKey, performance);
      throw error;
    }
  }

  /**
   * Optimized audit log query for activity feeds
   */
  async getOptimizedAuditLog(
    tenantId: string,
    options: {
      resourceType?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: any[], performance: QueryPerformanceMetrics }> {
    const startTime = Date.now();
    const queryKey = `audit-log-${tenantId}-${JSON.stringify(options)}`;

    try {
      // Use the idx_audit_log_tenant_resource_type index
      let query = this.supabase
        .from('audit_log')
        .select(`
          id,
          action,
          resource_type,
          resource_id,
          created_at,
          user_profiles!audit_log_user_id_fkey(
            full_name,
            email
          )
        `)
        .eq('tenant_id', tenantId);

      if (options.resourceType) {
        query = query.eq('resource_type', options.resourceType);
      }

      // Use the created_at index for ordering
      query = query.order('created_at', { ascending: false });

      // Apply pagination
      if (options.limit) {
        const offset = options.offset || 0;
        query = query.range(offset, offset + options.limit - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      const queryTime = Date.now() - startTime;
      const performance: QueryPerformanceMetrics = {
        queryTime,
        rowsReturned: data?.length || 0,
        indexesUsed: ['idx_audit_log_tenant_resource_type', 'idx_audit_log_tenant_created_at'],
        cacheHit: false,
        suggestions: this.generateOptimizationSuggestions(queryTime, data?.length || 0)
      };

      this.recordPerformance(queryKey, performance);

      return { data: data || [], performance };
    } catch (error) {
      const queryTime = Date.now() - startTime;
      const performance: QueryPerformanceMetrics = {
        queryTime,
        rowsReturned: 0,
        indexesUsed: [],
        cacheHit: false,
        suggestions: ['Query failed - check error logs']
      };

      this.recordPerformance(queryKey, performance);
      throw error;
    }
  }

  /**
   * Optimized file uploads query
   */
  async getOptimizedFileUploads(
    tenantId: string,
    areaId: string,
    options: {
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ data: any[], performance: QueryPerformanceMetrics }> {
    const startTime = Date.now();
    const queryKey = `file-uploads-${tenantId}-${areaId}-${JSON.stringify(options)}`;

    try {
      // Use the idx_file_uploads_tenant_area_status_date index
      let query = this.supabase
        .from('uploaded_files')
        .select(`
          *,
          user_profiles!uploaded_files_uploaded_by_fkey(
            full_name,
            email
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('area_id', areaId);

      if (options.status) {
        query = query.eq('upload_status', options.status);
      }

      // Use the created_at index for ordering
      query = query.order('created_at', { ascending: false });

      // Apply pagination
      if (options.limit) {
        const offset = options.offset || 0;
        query = query.range(offset, offset + options.limit - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      const queryTime = Date.now() - startTime;
      const performance: QueryPerformanceMetrics = {
        queryTime,
        rowsReturned: data?.length || 0,
        indexesUsed: ['idx_file_uploads_tenant_area_status_date'],
        cacheHit: false,
        suggestions: this.generateOptimizationSuggestions(queryTime, data?.length || 0)
      };

      this.recordPerformance(queryKey, performance);

      return { data: data || [], performance };
    } catch (error) {
      const queryTime = Date.now() - startTime;
      const performance: QueryPerformanceMetrics = {
        queryTime,
        rowsReturned: 0,
        indexesUsed: [],
        cacheHit: false,
        suggestions: ['Query failed - check error logs']
      };

      this.recordPerformance(queryKey, performance);
      throw error;
    }
  }

  /**
   * Calculate area metrics efficiently
   */
  private calculateAreaMetrics(initiatives: any[]): any {
    const total = initiatives.length;
    const active = initiatives.filter(i => i.status === 'in_progress' || i.status === 'planning').length;
    const completed = initiatives.filter(i => i.status === 'completed').length;
    const onHold = initiatives.filter(i => i.status === 'on_hold').length;

    const avgProgress = total > 0 
      ? Math.round(initiatives.reduce((sum, i) => sum + (i.initiative_progress || 0), 0) / total)
      : 0;

    const totalSubtasks = initiatives.reduce((sum, i) => sum + (i.subtask_count || 0), 0);
    const completedSubtasks = initiatives.reduce((sum, i) => sum + (i.completed_subtask_count || 0), 0);

    return {
      totalInitiatives: total,
      activeInitiatives: active,
      completedInitiatives: completed,
      onHoldInitiatives: onHold,
      averageProgress: avgProgress,
      totalSubtasks,
      completedSubtasks,
      subtaskCompletionRate: totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0
    };
  }

  /**
   * Infer which indexes were likely used based on query pattern
   */
  private inferIndexesUsed(table: string, options: any): string[] {
    const indexes: string[] = [];

    switch (table) {
      case 'initiatives':
        indexes.push('idx_initiatives_tenant_area_status');
        if (options.search) indexes.push('idx_initiatives_text_search');
        if (options.priority) indexes.push('idx_initiatives_tenant_area_priority');
        if (options.orderBy === 'created_at') indexes.push('idx_initiatives_tenant_area_created_at');
        break;
      
      case 'subtasks':
        indexes.push('idx_subtasks_tenant_initiative');
        break;
      
      case 'audit_log':
        indexes.push('idx_audit_log_tenant_created_at');
        if (options.resourceType) indexes.push('idx_audit_log_tenant_resource_type');
        break;
    }

    return indexes;
  }

  /**
   * Generate optimization suggestions based on performance
   */
  private generateOptimizationSuggestions(queryTime: number, rowsReturned: number): string[] {
    const suggestions: string[] = [];

    if (queryTime > 1000) {
      suggestions.push('Query time >1s - consider adding caching');
    }

    if (queryTime > 500 && rowsReturned > 100) {
      suggestions.push('Large result set with slow query - consider pagination');
    }

    if (rowsReturned > 1000) {
      suggestions.push('Large result set - implement virtual scrolling');
    }

    if (queryTime > 200 && rowsReturned < 10) {
      suggestions.push('Slow query for small result set - check index usage');
    }

    return suggestions;
  }

  /**
   * Record performance metrics for analysis
   */
  private recordPerformance(queryKey: string, metrics: QueryPerformanceMetrics): void {
    if (!this.performanceLog.has(queryKey)) {
      this.performanceLog.set(queryKey, []);
    }

    const queryMetrics = this.performanceLog.get(queryKey)!;
    queryMetrics.push(metrics);

    // Keep only last 100 entries per query
    if (queryMetrics.length > 100) {
      queryMetrics.shift();
    }
  }

  /**
   * Get performance analytics for queries
   */
  getPerformanceAnalytics(): {
    queries: Array<{
      queryKey: string;
      averageTime: number;
      totalExecutions: number;
      slowestExecution: number;
      commonSuggestions: string[];
    }>;
    overallStats: {
      totalQueries: number;
      averageQueryTime: number;
      slowQueries: number;
    };
  } {
    const queries = Array.from(this.performanceLog.entries()).map(([queryKey, metrics]) => {
      const times = metrics.map(m => m.queryTime);
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const slowestExecution = Math.max(...times);
      
      // Get most common suggestions
      const allSuggestions = metrics.flatMap(m => m.suggestions);
      const suggestionCounts = allSuggestions.reduce((acc, suggestion) => {
        acc[suggestion] = (acc[suggestion] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const commonSuggestions = Object.entries(suggestionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([suggestion]) => suggestion);

      return {
        queryKey,
        averageTime,
        totalExecutions: metrics.length,
        slowestExecution,
        commonSuggestions
      };
    });

    const allTimes = Array.from(this.performanceLog.values())
      .flatMap(metrics => metrics.map(m => m.queryTime));
    
    const overallStats = {
      totalQueries: allTimes.length,
      averageQueryTime: allTimes.length > 0 ? allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length : 0,
      slowQueries: allTimes.filter(time => time > 1000).length
    };

    return { queries, overallStats };
  }

  /**
   * Clear performance logs
   */
  clearPerformanceLogs(): void {
    this.performanceLog.clear();
  }
}

/**
 * Singleton instance for query optimizer
 */
export const queryOptimizer = QueryOptimizer.getInstance();

/**
 * React hook for query performance monitoring
 */
export function useQueryPerformance() {
  const getPerformanceAnalytics = () => queryOptimizer.getPerformanceAnalytics();
  const clearLogs = () => queryOptimizer.clearPerformanceLogs();

  return {
    getPerformanceAnalytics,
    clearLogs
  };
}