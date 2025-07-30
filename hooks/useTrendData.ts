import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

interface TrendDataPoint {
  mes: string;
  completadas: number;
  enProgreso: number;
  enRiesgo: number;
}

export function useTrendData(tenantId: string | null) {
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

        const { data: initiatives, error } = await supabase
          .from('initiatives')
          .select(`
            status,
            progress,
            created_at,
            completion_date,
            updated_at
          `)
          .eq('tenant_id', tenantId)
          .gte('created_at', sixMonthsAgo.toISOString());

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

        // Count initiatives by status for each month
        initiatives?.forEach(initiative => {
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
  }, [tenantId]);

  return { data, loading, error };
}