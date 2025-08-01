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

// Specific hooks for each chart type using Supabase directly
export function useProgressDistribution(filters?: FilterState) {
  const [data, setData] = useState<ProgressDistributionData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch initiatives directly from Supabase
        const { data: initiatives, error: fetchError } = await supabase
          .from('initiatives')
          .select('progress');

        if (fetchError) throw fetchError;

        // Calculate progress distribution
        const ranges = [
          { min: 0, max: 25, label: '0-25%' },
          { min: 26, max: 50, label: '26-50%' },
          { min: 51, max: 75, label: '51-75%' },
          { min: 76, max: 100, label: '76-100%' }
        ];

        const distribution = ranges.map(range => {
          const count = initiatives.filter(initiative => 
            initiative.progress >= range.min && initiative.progress <= range.max
          ).length;
          
          const percentage = initiatives.length > 0 
            ? Math.round((count / initiatives.length) * 100) 
            : 0;

          return {
            range: range.label,
            count,
            percentage
          };
        });

        setData(distribution);
      } catch (err) {
        console.error('Error fetching progress distribution:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        
        // In development mode, provide mock data when database connection fails
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 Development: Using mock data for progress distribution');
          const mockData: ProgressDistributionData[] = [
            { range: '0-25%', count: 1, percentage: 17 },
            { range: '26-50%', count: 1, percentage: 17 },
            { range: '51-75%', count: 2, percentage: 33 },
            { range: '76-100%', count: 2, percentage: 33 }
          ];
          setData(mockData);
          setError(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  return { data, loading, error };
}

export function useStatusDistribution(filters?: FilterState) {
  const [data, setData] = useState<StatusDistributionData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch initiatives directly from Supabase
        const { data: initiatives, error: fetchError } = await supabase
          .from('initiatives')
          .select('status');

        if (fetchError) throw fetchError;

        // Define status colors
        const statusColors = {
          'planning': '#6366f1',
          'in_progress': '#f59e0b', 
          'completed': '#10b981',
          'on_hold': '#ef4444'
        };

        // Calculate status distribution
        const statusCounts = initiatives.reduce((acc, initiative) => {
          const status = initiative.status || 'planning';
          acc[status] = (acc[status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        const distribution = Object.entries(statusCounts).map(([status, count]) => ({
          status,
          count,
          percentage: initiatives.length > 0 ? Math.round((count / initiatives.length) * 100) : 0,
          color: statusColors[status as keyof typeof statusColors] || '#6b7280'
        }));

        setData(distribution);
      } catch (err) {
        console.error('Error fetching status distribution:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        
        // In development mode, provide mock data when database connection fails
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 Development: Using mock data for status distribution');
          const mockData: StatusDistributionData[] = [
            { status: 'completed', count: 1, percentage: 17, color: '#10b981' },
            { status: 'in_progress', count: 3, percentage: 50, color: '#f59e0b' },
            { status: 'planning', count: 1, percentage: 17, color: '#6366f1' },
            { status: 'on_hold', count: 1, percentage: 16, color: '#ef4444' }
          ];
          setData(mockData);
          setError(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  return { data, loading, error };
}

export function useAreaComparison(filters?: FilterState) {
  const [data, setData] = useState<AreaProgressData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch initiatives with area data
        const { data: initiatives, error: fetchError } = await supabase
          .from('initiatives')
          .select(`
            progress,
            areas(
              id,
              name
            )
          `);

        if (fetchError) throw fetchError;

        // Group by area and calculate averages
        const areaStats = initiatives.reduce((acc, initiative) => {
          const areaName = initiative.areas?.name || 'No Area';
          if (!acc[areaName]) {
            acc[areaName] = { totalProgress: 0, count: 0 };
          }
          acc[areaName].totalProgress += initiative.progress || 0;
          acc[areaName].count += 1;
          return acc;
        }, {} as Record<string, { totalProgress: number; count: number }>);

        const areaData = Object.entries(areaStats).map(([area, stats]) => {
          const avgProgress = stats.count > 0 ? Math.round(stats.totalProgress / stats.count) : 0;
          let status: 'excellent' | 'good' | 'warning' | 'critical' = 'critical';
          
          if (avgProgress >= 80) status = 'excellent';
          else if (avgProgress >= 60) status = 'good';
          else if (avgProgress >= 40) status = 'warning';
          
          return {
            area,
            avgProgress,
            initiativesCount: stats.count,
            status
          };
        });

        setData(areaData);
      } catch (err) {
        console.error('Error fetching area comparison:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
        
        // In development mode, provide mock data when database connection fails
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 Development: Using mock data for area comparison');
          const mockData: AreaProgressData[] = [
            { area: 'Tecnología', avgProgress: 80, initiativesCount: 2, status: 'excellent' },
            { area: 'Marketing', avgProgress: 100, initiativesCount: 1, status: 'excellent' },
            { area: 'Operaciones', avgProgress: 45, initiativesCount: 1, status: 'warning' },
            { area: 'Recursos Humanos', avgProgress: 20, initiativesCount: 1, status: 'critical' },
            { area: 'Finanzas', avgProgress: 85, initiativesCount: 1, status: 'excellent' },
            { area: 'Comercial', avgProgress: 30, initiativesCount: 1, status: 'critical' }
          ];
          setData(mockData);
          setError(null);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [filters]);

  return { data, loading, error };
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