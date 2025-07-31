import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/utils/supabase/client';
import type { FilterState } from '@/hooks/useFilters';
import { buildSupabaseFilters } from '@/lib/utils/filterUtils';

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

// Base hook for API calls with optional filters
function useApiData<T>(endpoint: string, filters?: FilterState) {
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

        console.log('📊 useApiData: Fetching data from:', endpoint);
        setLoading(true);
        setError(null);
        
        // Add timeout to API calls
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log('⏰ useApiData: Timeout reached for:', endpoint);
          controller.abort();
        }, 10000);

        try {
          // Build URL with filter parameters if provided
          const url = new URL(endpoint, window.location.origin);
          if (filters) {
            if (filters.quarters.length > 0) {
              url.searchParams.set('quarters', filters.quarters.join(','));
            }
            if (filters.areas.length > 0) {
              url.searchParams.set('areas', filters.areas.join(','));
            }
            if (filters.progressMin > 0) {
              url.searchParams.set('progressMin', filters.progressMin.toString());
            }
            if (filters.progressMax < 100) {
              url.searchParams.set('progressMax', filters.progressMax.toString());
            }
            if (filters.statuses.length > 0) {
              url.searchParams.set('statuses', filters.statuses.join(','));
            }
            if (filters.priorities.length > 0) {
              url.searchParams.set('priorities', filters.priorities.join(','));
            }
          }
          
          const response = await fetch(url.toString(), {
            headers: {
              'Authorization': `Bearer ${session.access_token}`
            },
            signal: controller.signal
          });

          clearTimeout(timeoutId);
          
          console.log('📡 useApiData: Response received for:', endpoint, 'Status:', response.status);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ useApiData: HTTP error for:', endpoint, 'Status:', response.status, 'Body:', errorText);
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
          }
          
          const result = await response.json();
          setData(result.data);
          console.log('✅ useApiData: Successfully fetched data from:', endpoint, result.data);
          
          // CRITICAL: Set loading to false on success
          setLoading(false);
          console.log('🎯 useApiData: Set loading=false for:', endpoint);
          
        } catch (error) {
          clearTimeout(timeoutId);
          if (error.name === 'AbortError') {
            console.error('⏰ useApiData: Request timeout for:', endpoint);
            setError('Request timeout - API call took too long');
          } else {
            throw error;
          }
          // Set loading to false on any fetch error
          setLoading(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error(`❌ useApiData: Final error for ${endpoint}:`, err);
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, session, authLoading, filters]);

  return { data, loading, error, refetch: () => setLoading(true) };
}

// Specific hooks for each chart type with optional filtering
export function useProgressDistribution(filters?: FilterState) {
  return useApiData<ProgressDistributionData[]>('/api/dashboard/progress-distribution', filters);
}

export function useStatusDistribution(filters?: FilterState) {
  return useApiData<StatusDistributionData[]>('/api/dashboard/status-distribution', filters);
}

export function useAreaComparison(filters?: FilterState) {
  return useApiData<AreaProgressData[]>('/api/dashboard/area-comparison', filters);
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