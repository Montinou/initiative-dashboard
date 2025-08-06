"use client";

import { useState, useEffect, useCallback } from 'react';
import { useAreaScopedData } from '@/components/manager/ManagerAreaProvider';
import { createClient } from '@/utils/supabase/client';

interface ProgressTrend {
  date: string;
  averageProgress: number;
  completedInitiatives: number;
  totalInitiatives: number;
}

interface StatusDistribution {
  status: string;
  count: number;
  percentage: number;
}

interface PriorityBreakdown {
  priority: string;
  count: number;
  averageProgress: number;
}

interface TeamMetrics {
  totalTeamMembers: number;
  activeTeamMembers: number;
  recentContributors: number;
}

interface BudgetMetrics {
  totalBudget: number;
  actualCost: number;
  budgetUtilization: number;
  overBudgetInitiatives: number;
}

interface ManagerMetrics {
  // Core metrics
  totalInitiatives: number;
  activeInitiatives: number;
  completedInitiatives: number;
  onHoldInitiatives: number;
  averageProgress: number;
  
  // Subtask metrics
  totalSubtasks: number;
  completedSubtasks: number;
  subtaskCompletionRate: number;
  
  // Time-based metrics
  overDueInitiatives: number;
  upcomingDeadlines: number;
  
  // Upload metrics
  totalUploads: number;
  successfulUploads: number;
  failedUploads: number;
  recentUploads: number;
  
  // Trend data
  progressTrend: ProgressTrend[];
  statusDistribution: StatusDistribution[];
  priorityBreakdown: PriorityBreakdown[];
  
  // Team and budget
  teamMetrics: TeamMetrics;
  budgetMetrics: BudgetMetrics;
  
  // Timestamps
  lastUpdated: Date;
  dataRange: {
    from: Date;
    to: Date;
  };
}

interface UseManagerMetricsOptions {
  refreshInterval?: number; // milliseconds
  trendDays?: number; // days for trend analysis
  includeTeamMetrics?: boolean;
  includeBudgetMetrics?: boolean;
}

/**
 * Hook for comprehensive area-specific analytics and metrics
 * 
 * Features:
 * - Real-time metrics calculation
 * - Trend analysis over configurable time periods  
 * - Status and priority distribution analysis
 * - Team performance metrics
 * - Budget tracking and utilization
 * - Automatic refresh and caching
 */
export function useManagerMetrics(options: UseManagerMetricsOptions = {}) {
  const {
    refreshInterval = 300000, // 5 minutes default
    trendDays = 30,
    includeTeamMetrics = true,
    includeBudgetMetrics = true
  } = options;

  const { getQueryFilters, managedAreaId } = useAreaScopedData();
  const [metrics, setMetrics] = useState<ManagerMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const calculateMetrics = useCallback(async (): Promise<ManagerMetrics> => {
    const filters = getQueryFilters();
    const today = new Date();
    const trendStartDate = new Date(today.getTime() - (trendDays * 24 * 60 * 60 * 1000));

    // Fetch initiatives with subtasks
    const { data: initiatives, error: initiativesError } = await supabase
      .from('initiatives_with_subtasks_summary')
      .select('*')
      .eq('tenant_id', filters.tenant_id)
      .eq('area_id', filters.area_id);

    if (initiativesError) throw initiativesError;

    // Core metrics calculation
    const totalInitiatives = initiatives?.length || 0;
    const activeInitiatives = initiatives?.filter(i => 
      i.status === 'in_progress' || i.status === 'planning'
    ).length || 0;
    const completedInitiatives = initiatives?.filter(i => 
      i.status === 'completed'
    ).length || 0;
    const onHoldInitiatives = initiatives?.filter(i => 
      i.status === 'on_hold'
    ).length || 0;

    const averageProgress = totalInitiatives > 0 
      ? Math.round(initiatives.reduce((sum, i) => sum + (i.initiative_progress || 0), 0) / totalInitiatives)
      : 0;

    // Subtask metrics
    const totalSubtasks = initiatives?.reduce((sum, i) => sum + (i.subtask_count || 0), 0) || 0;
    const completedSubtasks = initiatives?.reduce((sum, i) => sum + (i.completed_subtask_count || 0), 0) || 0;
    const subtaskCompletionRate = totalSubtasks > 0 
      ? Math.round((completedSubtasks / totalSubtasks) * 100)
      : 0;

    // Time-based metrics
    const overDueInitiatives = initiatives?.filter(i => 
      i.target_date && new Date(i.target_date) < today && i.status !== 'completed'
    ).length || 0;

    const upcomingDeadlines = initiatives?.filter(i => {
      if (!i.target_date || i.status === 'completed') return false;
      const targetDate = new Date(i.target_date);
      const nextWeek = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
      return targetDate >= today && targetDate <= nextWeek;
    }).length || 0;

    // Status distribution
    const statusDistribution: StatusDistribution[] = [
      'planning', 'in_progress', 'completed', 'on_hold'
    ].map(status => {
      const count = initiatives?.filter(i => i.status === status).length || 0;
      return {
        status,
        count,
        percentage: totalInitiatives > 0 ? Math.round((count / totalInitiatives) * 100) : 0
      };
    });

    // Priority breakdown
    const priorityGroups = initiatives?.reduce((acc, i) => {
      const priority = i.priority || 'medium';
      if (!acc[priority]) {
        acc[priority] = { count: 0, totalProgress: 0 };
      }
      acc[priority].count++;
      acc[priority].totalProgress += i.initiative_progress || 0;
      return acc;
    }, {} as Record<string, { count: number; totalProgress: number }>);

    const priorityBreakdown: PriorityBreakdown[] = Object.entries(priorityGroups || {})
      .map(([priority, data]) => ({
        priority,
        count: data.count,
        averageProgress: data.count > 0 ? Math.round(data.totalProgress / data.count) : 0
      }));

    // Fetch file upload metrics
    const { data: uploads, error: uploadsError } = await supabase
      .from('uploaded_files')
      .select('upload_status, created_at')
      .eq('tenant_id', filters.tenant_id)
      .eq('area_id', filters.area_id);

    const totalUploads = uploads?.length || 0;
    const successfulUploads = uploads?.filter(u => u.upload_status === 'completed').length || 0;
    const failedUploads = uploads?.filter(u => u.upload_status === 'failed').length || 0;
    const recentUploads = uploads?.filter(u => 
      new Date(u.created_at) > new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000))
    ).length || 0;

    // Progress trend calculation (simplified for now)
    const progressTrend: ProgressTrend[] = [];
    for (let i = trendDays - 1; i >= 0; i--) {
      const date = new Date(today.getTime() - (i * 24 * 60 * 60 * 1000));
      progressTrend.push({
        date: date.toISOString().split('T')[0],
        averageProgress: averageProgress, // Simplified - could be more sophisticated
        completedInitiatives: completedInitiatives,
        totalInitiatives: totalInitiatives
      });
    }

    // Team metrics (if enabled)
    let teamMetrics: TeamMetrics = {
      totalTeamMembers: 0,
      activeTeamMembers: 0,
      recentContributors: 0
    };

    if (includeTeamMetrics) {
      const { data: teamMembers } = await supabase
        .from('user_profiles')
        .select('id, last_login, is_active')
        .eq('tenant_id', filters.tenant_id)
        .eq('area_id', filters.area_id);

      teamMetrics = {
        totalTeamMembers: teamMembers?.length || 0,
        activeTeamMembers: teamMembers?.filter(m => m.is_active).length || 0,
        recentContributors: teamMembers?.filter(m => {
          if (!m.last_login) return false;
          return new Date(m.last_login) > new Date(today.getTime() - (7 * 24 * 60 * 60 * 1000));
        }).length || 0
      };
    }

    // Budget metrics (if enabled)
    let budgetMetrics: BudgetMetrics = {
      totalBudget: 0,
      actualCost: 0,
      budgetUtilization: 0,
      overBudgetInitiatives: 0
    };

    if (includeBudgetMetrics) {
      const totalBudget = initiatives?.reduce((sum, i) => sum + (i.budget || 0), 0) || 0;
      const actualCost = initiatives?.reduce((sum, i) => sum + (i.actual_cost || 0), 0) || 0;
      const overBudgetInitiatives = initiatives?.filter(i => 
        i.budget && i.actual_cost && i.actual_cost > i.budget
      ).length || 0;

      budgetMetrics = {
        totalBudget,
        actualCost,
        budgetUtilization: totalBudget > 0 ? Math.round((actualCost / totalBudget) * 100) : 0,
        overBudgetInitiatives
      };
    }

    return {
      // Core metrics
      totalInitiatives,
      activeInitiatives,
      completedInitiatives,
      onHoldInitiatives,
      averageProgress,
      
      // Subtask metrics
      totalSubtasks,
      completedSubtasks,
      subtaskCompletionRate,
      
      // Time-based metrics
      overDueInitiatives,
      upcomingDeadlines,
      
      // Upload metrics
      totalUploads,
      successfulUploads,
      failedUploads,
      recentUploads,
      
      // Analysis data
      progressTrend,
      statusDistribution,
      priorityBreakdown,
      
      // Team and budget
      teamMetrics,
      budgetMetrics,
      
      // Metadata
      lastUpdated: new Date(),
      dataRange: {
        from: trendStartDate,
        to: today
      }
    };
  }, [
    getQueryFilters,
    managedAreaId,
    trendDays,
    includeTeamMetrics,
    includeBudgetMetrics,
    supabase
  ]);

  const fetchMetrics = useCallback(async () => {
    if (!managedAreaId) {
      setError('No managed area available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const calculatedMetrics = await calculateMetrics();
      setMetrics(calculatedMetrics);
      console.log('Manager metrics updated:', {
        areaId: managedAreaId,
        totalInitiatives: calculatedMetrics.totalInitiatives,
        averageProgress: calculatedMetrics.averageProgress
      });
    } catch (err) {
      console.error('Error calculating metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to calculate metrics');
    } finally {
      setLoading(false);
    }
  }, [managedAreaId, calculateMetrics]);

  const refresh = useCallback(async () => {
    await fetchMetrics();
  }, [fetchMetrics]);

  // Initial fetch
  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  // Set up automatic refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;

    const interval = setInterval(refresh, refreshInterval);
    return () => clearInterval(interval);
  }, [refresh, refreshInterval]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!managedAreaId) return;

    const subscription = supabase
      .channel(`manager-metrics-${managedAreaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'initiatives',
          filter: `area_id=eq.${managedAreaId}`
        },
        () => {
          console.log('Initiative data changed, refreshing metrics');
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
          console.log('Subtask data changed, refreshing metrics');
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
          console.log('File upload data changed, refreshing metrics');
          refresh();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [managedAreaId, refresh, supabase]);

  return {
    metrics,
    loading,
    error,
    refresh
  };
}

/**
 * Hook for getting specific metric values
 */
export function useSpecificManagerMetric<K extends keyof ManagerMetrics>(
  metricKey: K
): {
  value: ManagerMetrics[K] | null;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
} {
  const { metrics, loading, error } = useManagerMetrics();

  return {
    value: metrics ? metrics[metricKey] : null,
    loading,
    error,
    lastUpdated: metrics?.lastUpdated || null
  };
}

/**
 * Hook for metric comparisons and alerts
 */
export function useManagerMetricAlerts() {
  const { metrics } = useManagerMetrics();

  const getAlerts = useCallback(() => {
    if (!metrics) return [];

    const alerts = [];

    // Overdue initiatives alert
    if (metrics.overDueInitiatives > 0) {
      alerts.push({
        type: 'warning',
        message: `${metrics.overDueInitiatives} initiative(s) are overdue`,
        action: 'Review target dates and update progress'
      });
    }

    // Low progress alert
    if (metrics.averageProgress < 25 && metrics.totalInitiatives > 0) {
      alerts.push({
        type: 'info',
        message: 'Average progress is below 25%',
        action: 'Consider reviewing initiative priorities and resource allocation'
      });
    }

    // Budget overrun alert
    if (metrics.budgetMetrics.overBudgetInitiatives > 0) {
      alerts.push({
        type: 'error',
        message: `${metrics.budgetMetrics.overBudgetInitiatives} initiative(s) are over budget`,
        action: 'Review costs and budget allocations'
      });
    }

    // Failed uploads alert
    if (metrics.failedUploads > 0) {
      alerts.push({
        type: 'warning',
        message: `${metrics.failedUploads} file upload(s) failed`,
        action: 'Check file formats and retry uploads'
      });
    }

    return alerts;
  }, [metrics]);

  return {
    alerts: getAlerts(),
    hasAlerts: getAlerts().length > 0,
    criticalAlerts: getAlerts().filter(a => a.type === 'error').length,
    warningAlerts: getAlerts().filter(a => a.type === 'warning').length
  };
}