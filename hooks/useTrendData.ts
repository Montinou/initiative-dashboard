import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { FilterState } from '@/hooks/useFilters';
import { applyFiltersToData } from '@/lib/utils/filterUtils';

interface TrendDataPoint {
  mes: string;
  completadas: number;
  enProgreso: number;
  enRiesgo: number;
}

export function useTrendData(tenantId: string | null, filters?: FilterState) {
  const [data, setData] = useState<TrendDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      return;
    }

    async function fetchTrendData() {
      try {
        setLoading(true);
        const supabase = createClient();

        // Get trend data for the last 6 months
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

        let query = supabase
          .from('initiatives')
          .select(`
            status,
            progress,
            created_at,
            completion_date,
            updated_at,
            area_id,
            priority,
            target_date
          `)
          .eq('tenant_id', tenantId)
          .gte('created_at', sixMonthsAgo.toISOString());

        // Apply filters to the query
        if (filters) {
          if (filters.areas.length > 0) {
            query = query.in('area_id', filters.areas);
          }
          if (filters.statuses.length > 0) {
            query = query.in('status', filters.statuses);
          }
          if (filters.priorities.length > 0) {
            query = query.in('priority', filters.priorities);
          }
          if (filters.progressMin > 0) {
            query = query.gte('progress', filters.progressMin);
          }
          if (filters.progressMax < 100) {
            query = query.lte('progress', filters.progressMax);
          }
        }

        const { data: initiatives, error } = await query;

        if (error) {
          console.error('Error fetching trend data:', error);
          setError(error.message);
          return;
        }

        // Process data by month
        const monthlyData: Record<string, { completadas: number; enProgreso: number; enRiesgo: number }> = {};
        
        // Initialize last 6 months
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        for (let i = 5; i >= 0; i--) {
          const date = new Date();
          date.setMonth(date.getMonth() - i);
          const monthKey = months[date.getMonth()];
          monthlyData[monthKey] = { completadas: 0, enProgreso: 0, enRiesgo: 0 };
        }

        // Apply additional client-side filtering (for quarters)
        let filteredInitiatives = initiatives || [];
        if (filters && filters.quarters.length > 0) {
          filteredInitiatives = applyFiltersToData(filteredInitiatives, filters);
        }

        // Count initiatives by status for each month
        filteredInitiatives.forEach(initiative => {
          const createdDate = new Date(initiative.created_at);
          const monthKey = months[createdDate.getMonth()];
          
          if (monthlyData[monthKey]) {
            if (initiative.status === 'completed') {
              monthlyData[monthKey].completadas++;
            } else if (initiative.status === 'in_progress') {
              // Consider initiatives with low progress as "en riesgo"
              if (initiative.progress < 50) {
                monthlyData[monthKey].enRiesgo++;
              } else {
                monthlyData[monthKey].enProgreso++;
              }
            } else if (initiative.status === 'planning') {
              monthlyData[monthKey].enProgreso++;
            } else if (initiative.status === 'on_hold') {
              monthlyData[monthKey].enRiesgo++;
            }
          }
        });

        // Convert to array format
        const trendData: TrendDataPoint[] = Object.entries(monthlyData).map(([mes, counts]) => ({
          mes,
          ...counts
        }));

        setData(trendData);
        setError(null);
      } catch (err) {
        console.error('Error in useTrendData:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchTrendData();
  }, [tenantId, filters]);

  return { data, loading, error };
}