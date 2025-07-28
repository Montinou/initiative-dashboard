import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

// Types for chart data
export interface ProgressDistributionData {
  range: string;
  count: number;
  percentage: number;
}

export interface StatusDistributionData {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export interface AreaProgressData {
  area: string;
  avgProgress: number;
  initiativesCount: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
}

export interface ObjectiveData {
  objective: string;
  progress: number;
  obstacles: string;
  enablers: string;
  status: '🟢' | '🟡' | '🔴';
  area: string;
}

// Base hook for API calls
function useApiData<T>(endpoint: string) {
  const { session, loading: authLoading } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to finish loading
    if (authLoading) {
      console.log(`useApiData(${endpoint}): Waiting for auth to complete...`);
      return;
    }

    const fetchData = async () => {
      try {
        if (!session?.access_token) {
          console.log(`useApiData(${endpoint}): No session or access token, skipping fetch`);
          setLoading(false);
          return;
        }

        console.log('Fetching data from:', endpoint);
        setLoading(true);
        setError(null);
        
        const response = await fetch(endpoint, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result.data);
        console.log('Successfully fetched data from:', endpoint, result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error(`Error fetching ${endpoint}:`, err);
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, session, authLoading]);

  return { data, loading, error, refetch: () => setLoading(true) };
}

// Specific hooks for each chart type
export function useProgressDistribution() {
  return useApiData<ProgressDistributionData[]>('/api/dashboard/progress-distribution');
}

export function useStatusDistribution() {
  return useApiData<StatusDistributionData[]>('/api/dashboard/status-distribution');
}

export function useAreaComparison() {
  return useApiData<AreaProgressData[]>('/api/dashboard/area-comparison');
}

export function useAreaObjectives(area: string) {
  const supabase = createClient();
  const [data, setData] = useState<ObjectiveData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session?.access_token) {
          setLoading(false);
          return;
        }

        setLoading(true);
        setError(null);
        
        const url = new URL('/api/dashboard/objectives', window.location.origin);
        url.searchParams.set('area', area);
        
        const response = await fetch(url.toString(), {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error(`Error fetching objectives for ${area}:`, err);
      } finally {
        setLoading(false);
      }
    };

    if (area) {
      fetchData();
    }
  }, [area, supabase]);

  return { data, loading, error, refetch: () => setLoading(true) };
}

export function useAllObjectives() {
  return useApiData<{ [key: string]: ObjectiveData[] }>('/api/dashboard/objectives');
}

// Hook for real-time data refresh
export function useDataRefresh() {
  const [refreshKey, setRefreshKey] = useState(0);
  
  const refreshData = () => {
    setRefreshKey(prev => prev + 1);
  };

  return { refreshKey, refreshData };
}

// Hook for loading states across multiple data sources
export function useChartLoadingStates() {
  const progressDist = useProgressDistribution();
  const statusDist = useStatusDistribution();
  const areaComp = useAreaComparison();

  const isLoading = progressDist.loading || statusDist.loading || areaComp.loading;
  const hasError = progressDist.error || statusDist.error || areaComp.error;
  const allLoaded = progressDist.data && statusDist.data && areaComp.data;

  return {
    isLoading,
    hasError,
    allLoaded,
    errors: {
      progressDistribution: progressDist.error,
      statusDistribution: statusDist.error,
      areaComparison: areaComp.error
    }
  };
}