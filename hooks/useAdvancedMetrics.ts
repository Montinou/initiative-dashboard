import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { FilterState } from '@/hooks/useFilters';
import { applyFiltersToData } from '@/lib/utils/filterUtils';

export interface PeriodComparison {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  isIncrease: boolean;
}

export interface AdvancedMetrics {
  successRate: PeriodComparison;
  averageTimeToComplete: PeriodComparison;
  activeAlerts: PeriodComparison;
  completionTrend: {
    monthly: PeriodComparison;
    quarterly: PeriodComparison;
  };
}

export type ComparisonPeriod = 'month' | 'quarter' | 'week';

export function useAdvancedMetrics(tenantId: string | null, period: ComparisonPeriod = 'month', filters?: FilterState) {
  const [metrics, setMetrics] = useState<AdvancedMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    async function fetchAdvancedMetrics() {
      try {
        setLoading(true);
        const supabase = createClient();

        // Calculate date ranges based on period
        const now = new Date();
        const currentPeriodStart = new Date();
        const previousPeriodStart = new Date();
        const previousPeriodEnd = new Date();

        switch (period) {
          case 'month':
            // Current month start (first day of current month)
            currentPeriodStart.setDate(1);
            currentPeriodStart.setHours(0, 0, 0, 0);
            
            // Previous month end (last day of previous month)
            previousPeriodEnd.setDate(0); // This sets to last day of previous month
            previousPeriodEnd.setHours(23, 59, 59, 999);
            
            // Previous month start (first day of previous month)
            previousPeriodStart.setMonth(now.getMonth() - 1, 1);
            previousPeriodStart.setHours(0, 0, 0, 0);
            break;
          
          case 'quarter':
            const currentQuarter = Math.floor(now.getMonth() / 3);
            // Set current quarter start - first day of current quarter
            currentPeriodStart.setFullYear(now.getFullYear());
            currentPeriodStart.setMonth(currentQuarter * 3, 1);
            currentPeriodStart.setHours(0, 0, 0, 0);
            
            // Calculate previous quarter properly
            const prevQuarter = currentQuarter - 1 < 0 ? 3 : currentQuarter - 1;
            const prevYear = currentQuarter - 1 < 0 ? now.getFullYear() - 1 : now.getFullYear();
            
            // Set previous quarter start - first day of previous quarter
            previousPeriodStart.setFullYear(prevYear);
            previousPeriodStart.setMonth(prevQuarter * 3, 1);
            previousPeriodStart.setHours(0, 0, 0, 0);
            
            // Set previous quarter end - last day of previous quarter
            previousPeriodEnd.setFullYear(prevYear);
            previousPeriodEnd.setMonth(prevQuarter * 3 + 2 + 1, 0); // +2 to get to last month of quarter, +1 and 0 to get last day
            previousPeriodEnd.setHours(23, 59, 59, 999);
            break;
          
          case 'week':
            const dayOfWeek = now.getDay();
            currentPeriodStart.setDate(now.getDate() - dayOfWeek);
            currentPeriodStart.setHours(0, 0, 0, 0);
            
            previousPeriodStart.setDate(currentPeriodStart.getDate() - 7);
            previousPeriodStart.setHours(0, 0, 0, 0);
            
            previousPeriodEnd.setDate(currentPeriodStart.getDate() - 1);
            previousPeriodEnd.setHours(23, 59, 59, 999);
            break;
        }

        // Debug log the dates
        console.log('Date calculations:', {
          period,
          now: now.toISOString(),
          currentPeriodStart: currentPeriodStart.toISOString(),
          previousPeriodStart: previousPeriodStart.toISOString(),
          previousPeriodEnd: previousPeriodEnd.toISOString()
        });

        // Build base queries for both periods with proper date filtering
        let currentQuery = supabase
          .from('initiatives')
          .select(`
            id,
            status,
            priority,
            initiative_progress,
            created_at,
            completion_date,
            target_date,
            updated_at,
            area_id
          `)
          
          .gte('created_at', currentPeriodStart.toISOString())
          .lte('created_at', now.toISOString());

        let previousQuery = supabase
          .from('initiatives')
          .select(`
            id,
            status,
            priority,
            initiative_progress,
            created_at,
            completion_date,
            target_date,
            updated_at,
            area_id
          `)
          
          .gte('created_at', previousPeriodStart.toISOString())
          .lte('created_at', previousPeriodEnd.toISOString());

        // Apply filters to both queries
        if (filters) {
          if (filters.areas.length > 0) {
            currentQuery = currentQuery.in('area_id', filters.areas);
            previousQuery = previousQuery.in('area_id', filters.areas);
          }
          if (filters.statuses.length > 0) {
            currentQuery = currentQuery.in('status', filters.statuses);
            previousQuery = previousQuery.in('status', filters.statuses);
          }
          if (filters.priorities.length > 0) {
            currentQuery = currentQuery.in('priority', filters.priorities);
            previousQuery = previousQuery.in('priority', filters.priorities);
          }
          if (filters.progressMin > 0) {
            currentQuery = currentQuery.gte('progress', filters.progressMin);
            previousQuery = previousQuery.gte('progress', filters.progressMin);
          }
          if (filters.progressMax < 100) {
            currentQuery = currentQuery.lte('progress', filters.progressMax);
            previousQuery = previousQuery.lte('progress', filters.progressMax);
          }
        }

        // Fetch initiatives for both periods
        const [currentData, previousData] = await Promise.all([currentQuery, previousQuery]);

        if (currentData.error) throw currentData.error;
        if (previousData.error) throw previousData.error;

        let currentInitiatives = currentData.data || [];
        let previousInitiatives = previousData.data || [];


        // Calculate Success Rate (completed initiatives / total initiatives)
        const currentCompleted = currentInitiatives.filter(i => i.status === 'completed').length;
        const currentTotal = currentInitiatives.length;
        const currentSuccessRate = currentTotal > 0 ? (currentCompleted / currentTotal) * 100 : 0;

        const previousCompleted = previousInitiatives.filter(i => i.status === 'completed').length;
        const previousTotal = previousInitiatives.length;
        const previousSuccessRate = previousTotal > 0 ? (previousCompleted / previousTotal) * 100 : 0;

        // Calculate Average Time to Complete
        const currentCompletedWithTime = currentInitiatives.filter(i => 
          i.status === 'completed' && i.completion_date && i.created_at
        );
        const currentAvgTime = currentCompletedWithTime.length > 0 
          ? currentCompletedWithTime.reduce((sum, initiative) => {
              const created = new Date(initiative.created_at);
              const completed = new Date(initiative.completion_date!);
              const days = Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
              return sum + days;
            }, 0) / currentCompletedWithTime.length
          : 0;

        const previousCompletedWithTime = previousInitiatives.filter(i => 
          i.status === 'completed' && i.completion_date && i.created_at
        );
        const previousAvgTime = previousCompletedWithTime.length > 0 
          ? previousCompletedWithTime.reduce((sum, initiative) => {
              const created = new Date(initiative.created_at);
              const completed = new Date(initiative.completion_date!);
              const days = Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
              return sum + days;
            }, 0) / previousCompletedWithTime.length
          : 0;

        // Calculate Active Alerts (initiatives at risk)
        const currentAtRisk = currentInitiatives.filter(i => 
          (i.status === 'in_progress' && i.initiative_progress < 50) ||
          i.status === 'on_hold' ||
          (i.target_date && new Date(i.target_date) < now && i.status !== 'completed')
        ).length;

        const previousAtRisk = previousInitiatives.filter(i => 
          (i.status === 'in_progress' && i.initiative_progress < 50) ||
          i.status === 'on_hold' ||
          (i.target_date && new Date(i.target_date) < previousPeriodEnd && i.status !== 'completed')
        ).length;

        // Helper function to calculate comparison
        const calculateComparison = (current: number, previous: number): PeriodComparison => {
          const change = current - previous;
          const changePercent = previous > 0 ? (change / previous) * 100 : (current > 0 ? 100 : 0);
          return {
            current,
            previous,
            change,
            changePercent: Math.round(changePercent * 10) / 10, // Round to 1 decimal
            isIncrease: change > 0
          };
        };

        // Calculate quarterly data for comparison
        const quarterlyCurrentStart = new Date();
        const currentQuarterForData = Math.floor(now.getMonth() / 3);
        quarterlyCurrentStart.setFullYear(now.getFullYear());
        quarterlyCurrentStart.setMonth(currentQuarterForData * 3, 1);
        quarterlyCurrentStart.setHours(0, 0, 0, 0);

        const quarterlyPrevStart = new Date();
        const prevQuarterForData = currentQuarterForData - 1 < 0 ? 3 : currentQuarterForData - 1;
        const prevYearForData = currentQuarterForData - 1 < 0 ? now.getFullYear() - 1 : now.getFullYear();
        quarterlyPrevStart.setFullYear(prevYearForData);
        quarterlyPrevStart.setMonth(prevQuarterForData * 3, 1);
        quarterlyPrevStart.setHours(0, 0, 0, 0);

        const quarterlyPrevEnd = new Date();
        quarterlyPrevEnd.setFullYear(prevYearForData);
        quarterlyPrevEnd.setMonth(prevQuarterForData * 3 + 2 + 1, 0); // Fixed calculation
        quarterlyPrevEnd.setHours(23, 59, 59, 999);

        const [quarterlyCurrentData, quarterlyPreviousData] = await Promise.all([
          supabase
            .from('initiatives')
            .select('id, status, completion_date')
            
            .gte('created_at', quarterlyCurrentStart.toISOString())
            .lte('created_at', now.toISOString()),
          
          supabase
            .from('initiatives')
            .select('id, status, completion_date')
            
            .gte('created_at', quarterlyPrevStart.toISOString())
            .lte('created_at', quarterlyPrevEnd.toISOString())
        ]);

        const quarterlyCurrentCompleted = (quarterlyCurrentData.data || []).filter(i => i.status === 'completed').length;
        const quarterlyPreviousCompleted = (quarterlyPreviousData.data || []).filter(i => i.status === 'completed').length;

        const advancedMetrics: AdvancedMetrics = {
          successRate: calculateComparison(currentSuccessRate, previousSuccessRate),
          averageTimeToComplete: calculateComparison(currentAvgTime, previousAvgTime),
          activeAlerts: calculateComparison(currentAtRisk, previousAtRisk),
          completionTrend: {
            monthly: calculateComparison(currentCompleted, previousCompleted),
            quarterly: calculateComparison(quarterlyCurrentCompleted, quarterlyPreviousCompleted)
          }
        };

        setMetrics(advancedMetrics);
        setError(null);
      } catch (err) {
        console.error('Error fetching advanced metrics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchAdvancedMetrics();
  }, [tenantId, period, filters]);

  return { metrics, loading, error };
}