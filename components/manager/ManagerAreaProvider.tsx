"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { createClient } from '@/utils/supabase/client';

interface AreaInfo {
  id: string;
  name: string;
  description: string | null;
  tenant_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  tenant?: {
    subdomain: string;
  };
}

interface ManagerAreaContextType {
  area: AreaInfo | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  // Data filtering utilities (deprecated - RLS handles filtering)
  isAreaRestricted: boolean;
}

const ManagerAreaContext = createContext<ManagerAreaContextType | undefined>(undefined);

interface ManagerAreaProviderProps {
  children: React.ReactNode;
}

/**
 * ManagerAreaProvider - Provides area context for manager dashboard
 * 
 * Features:
 * - Fetches detailed area information for the manager
 * - Provides data filtering utilities for area-scoped queries
 * - Real-time updates when area data changes
 * - Error handling and loading states
 * - Multi-tenant data isolation
 * - Permission-based data access control
 */
export function ManagerAreaProvider({ children }: ManagerAreaProviderProps) {
  const { profile } = useAuth();
  
  // Manager context logic inline
  const isManager = profile?.role === 'Manager';
  const managedAreaId = isManager ? profile?.area_id : null;
  const isAreaRestricted = isManager;
  
  // Data filters no longer needed - RLS handles all filtering automatically
  const [area, setArea] = useState<AreaInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchAreaInfo = async () => {
    if (!isManager || !managedAreaId) {
      setArea(null);
      setError('No managed area available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('areas')
        .select(`
          *,
          tenant:tenants(subdomain)
        `)
        .eq('id', managedAreaId)
        .single();

      if (fetchError) {
        console.error('Error fetching area info:', fetchError);
        setError('Failed to load area information');
        setArea(null);
      } else {
        setArea(data);
        console.log('Area info loaded:', data);
      }
    } catch (err) {
      console.error('Error in fetchAreaInfo:', err);
      setError('Unexpected error loading area information');
      setArea(null);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    await fetchAreaInfo();
  };

  useEffect(() => {
    fetchAreaInfo();
  }, [isManager, managedAreaId]);

  // Set up real-time subscription for area updates
  useEffect(() => {
    if (!managedAreaId) return;

    const subscription = supabase
      .channel(`area-${managedAreaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'areas',
          filter: `id=eq.${managedAreaId}`
        },
        (payload) => {
          console.log('Area data changed:', payload);
          if (payload.eventType === 'UPDATE') {
            setArea(payload.new as AreaInfo);
          } else if (payload.eventType === 'DELETE') {
            setArea(null);
            setError('Area has been deleted');
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [managedAreaId, supabase]);

  const contextValue: ManagerAreaContextType = {
    area,
    loading,
    error,
    refresh,
    isAreaRestricted
  };

  return (
    <ManagerAreaContext.Provider value={contextValue}>
      {children}
    </ManagerAreaContext.Provider>
  );
}

/**
 * Hook to access manager area context
 */
export function useManagerArea() {
  const context = useContext(ManagerAreaContext);
  if (context === undefined) {
    throw new Error('useManagerArea must be used within a ManagerAreaProvider');
  }
  return context;
}

/**
 * Hook for area-scoped data queries
 */
export function useAreaScopedData() {
  const { isAreaRestricted } = useManagerArea();
  const { profile } = useAuth();
  const managedAreaId = profile?.role === 'Manager' ? profile?.area_id : null;

  // Check if data belongs to manager's area
  const isDataInArea = (dataAreaId: string | null) => {
    if (!isAreaRestricted) return true; // Non-managers can access all
    return dataAreaId === managedAreaId;
  };

  return {
    isDataInArea,
    managedAreaId,
    isAreaRestricted
  };
}

/**
 * Hook for displaying area information in UI
 */
export function useAreaDisplay() {
  const { area, loading, error } = useManagerArea();
  const { profile } = useAuth();
  const managedAreaName = profile?.role === 'Manager' ? area?.name : null;

  const getAreaDisplayName = () => {
    return area?.name || managedAreaName || 'Unknown Area';
  };

  const getAreaDescription = () => {
    return area?.description || 'No description available';
  };

  const isAreaActive = () => {
    return area?.is_active ?? false;
  };

  return {
    area,
    loading,
    error,
    displayName: getAreaDisplayName(),
    description: getAreaDescription(),
    isActive: isAreaActive()
  };
}

/**
 * Hook for manager context (compatibility function)
 * @deprecated Use useAuth() directly instead
 */
export function useManagerContext() {
  const { profile } = useAuth();
  const { area, loading } = useManagerArea();
  
  return {
    user: profile,
    area,
    tenant: { subdomain: profile?.tenant_id },
    loading,
    userProfile: profile,
    isManager: profile?.role === 'Manager',
    managedAreaId: profile?.area_id,
    managedAreaName: area?.name
  };
}