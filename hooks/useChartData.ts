import { useState, useEffect } from 'react';

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
function useApiData<T>(endpoint: string, tenantId: string = 'fema-electricidad') {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const url = new URL(endpoint, window.location.origin);
        url.searchParams.set('tenant_id', tenantId);
        
        const response = await fetch(url.toString());
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        console.error(`Error fetching ${endpoint}:`, err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint, tenantId]);

  return { data, loading, error, refetch: () => setLoading(true) };
}

// Specific hooks for each chart type
export function useProgressDistribution(tenantId?: string) {
  return useApiData<ProgressDistributionData[]>('/api/dashboard/progress-distribution', tenantId);
}

export function useStatusDistribution(tenantId?: string) {
  return useApiData<StatusDistributionData[]>('/api/dashboard/status-distribution', tenantId);
}

export function useAreaComparison(tenantId?: string) {
  return useApiData<AreaProgressData[]>('/api/dashboard/area-comparison', tenantId);
}

export function useAreaObjectives(area: string, tenantId?: string) {
  const [data, setData] = useState<ObjectiveData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const url = new URL('/api/dashboard/objectives', window.location.origin);
        url.searchParams.set('tenant_id', tenantId || 'fema-electricidad');
        url.searchParams.set('area', area);
        
        const response = await fetch(url.toString());
        
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
  }, [area, tenantId]);

  return { data, loading, error, refetch: () => setLoading(true) };
}

export function useAllObjectives(tenantId?: string) {
  return useApiData<{ [key: string]: ObjectiveData[] }>('/api/dashboard/objectives', tenantId);
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