"use client";

import useSWR from 'swr';
import { useAuth, useTenantId } from '@/lib/auth-context';

interface AreaObjective {
  objective: string;
  progress: number;
  obstacles: string;
  enablers: string;
  status: '🟢' | '🟡' | '🔴';
  area: string;
}

interface UseAreaObjectivesReturn {
  objectives: AreaObjective[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook for fetching area-specific objectives data
 */
export function useAreaObjectives(areaName: string): UseAreaObjectivesReturn {
  const { session } = useAuth();
  const tenantId = useTenantId();

  const { data, error, isLoading, mutate } = useSWR(
    session && tenantId ? [`/api/areas/${areaName}/objectives`, tenantId] : null,
    async ([url, tenant]) => {
      const response = await fetch(url, {
        headers: {
          'x-tenant-id': tenant
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch objectives: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data?.objectives || [];
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // 1 minute
      errorRetryCount: 2
    }
  );

  return {
    objectives: data || null,
    isLoading,
    error: error?.message || null,
    refetch: mutate
  };
}