import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

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

export function useAdvancedMetrics(tenantId: string | null, period: ComparisonPeriod = 'month') {
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
            currentPeriodStart.setMonth(now.getMonth(), 1);
            currentPeriodStart.setHours(0, 0, 0, 0);
            
            previousPeriodEnd.setMonth(now.getMonth(), 0);
            previousPeriodEnd.setHours(23, 59, 59, 999);
            
            previousPeriodStart.setMonth(now.getMonth() - 1, 1);
            previousPeriodStart.setHours(0, 0, 0, 0);
            break;
          
          case 'quarter':
            const currentQuarter = Math.floor(now.getMonth() / 3);
            currentPeriodStart.setMonth(currentQuarter * 3, 1);
            currentPeriodStart.setHours(0, 0, 0, 0);
            
            const prevQuarter = currentQuarter - 1 < 0 ? 3 : currentQuarter - 1;
            const prevYear = currentQuarter - 1 < 0 ? now.getFullYear() - 1 : now.getFullYear();
            
            previousPeriodStart.setFullYear(prevYear);
            previousPeriodStart.setMonth(prevQuarter * 3, 1);
            previousPeriodStart.setHours(0, 0, 0, 0);
            
            previousPeriodEnd.setFullYear(prevYear);
            previousPeriodEnd.setMonth(prevQuarter * 3 + 3, 0);
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

        // Fetch initiatives for both periods
        const [currentData, previousData] = await Promise.all([
          supabase
            .from('initiatives')
            .select(`
              id,
              status,
              priority,
              initiative_progress,
              created_at,
              completion_date,
              target_date,
              updated_at
            `)
            .eq('tenant_id', tenantId)
            .gte('created_at', currentPeriodStart.toISOString())
            .lte('created_at', now.toISOString()),
          
          supabase
            .from('initiatives')
            .select(`
              id,
              status,
              priority,
              initiative_progress,
              created_at,
              completion_date,
              target_date,
              updated_at
            `)
            .eq('tenant_id', tenantId)
            .gte('created_at', previousPeriodStart.toISOString())
            .lte('created_at', previousPeriodEnd.toISOString())
        ]);

        if (currentData.error) throw currentData.error;
        if (previousData.error) throw previousData.error;

        const currentInitiatives = currentData.data || [];
        const previousInitiatives = previousData.data || [];

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
        const currentQuarter = Math.floor(now.getMonth() / 3);
        quarterlyCurrentStart.setMonth(currentQuarter * 3, 1);
        quarterlyCurrentStart.setHours(0, 0, 0, 0);

        const quarterlyPrevStart = new Date();
        const prevQuarter = currentQuarter - 1 < 0 ? 3 : currentQuarter - 1;
        const prevYear = currentQuarter - 1 < 0 ? now.getFullYear() - 1 : now.getFullYear();
        quarterlyPrevStart.setFullYear(prevYear);
        quarterlyPrevStart.setMonth(prevQuarter * 3, 1);
        quarterlyPrevStart.setHours(0, 0, 0, 0);

        const quarterlyPrevEnd = new Date();
        quarterlyPrevEnd.setFullYear(prevYear);
        quarterlyPrevEnd.setMonth(prevQuarter * 3 + 3, 0);
        quarterlyPrevEnd.setHours(23, 59, 59, 999);

        const [quarterlyCurrentData, quarterlyPreviousData] = await Promise.all([
          supabase
            .from('initiatives')
            .select('id, status, completion_date')
            .eq('tenant_id', tenantId)
            .gte('created_at', quarterlyCurrentStart.toISOString())
            .lte('created_at', now.toISOString()),
          
          supabase
            .from('initiatives')
            .select('id, status, completion_date')
            .eq('tenant_id', tenantId)
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
  }, [tenantId, period]);

  return { metrics, loading, error };
}