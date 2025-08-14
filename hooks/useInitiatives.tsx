"use client"

import { useState, useEffect, useCallback } from 'react';
import type { Initiative, Activity, Objective } from '@/lib/types/database';
import type { TenantContext } from '@/lib/types/multi-tenant';
import { useAuth } from '@/lib/auth-context';
import { fetchWithRetry } from '@/hooks/useNetworkRetry';

// Extended initiative type with relations
export interface InitiativeWithRelations extends Initiative {
  objectives?: Objective[];
  activities?: Activity[];
  area_name?: string;
  created_by_name?: string;
  activity_count: number;
  completed_activities: number;
  calculated_progress?: number;
}

export function useInitiatives() {
  const [initiatives, setInitiatives] = useState<InitiativeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);
  const { profile, loading: authLoading } = useAuth();

  // Extract only the values we need to avoid dependency issues
  const tenantId = profile?.tenant_id;
  const userRole = profile?.role;
  const areaId = profile?.area_id;

  const fetchInitiatives = useCallback(async () => {
    // Skip if no tenant ID is available
    if (!tenantId) {
      console.log('useInitiatives: No tenant ID available yet');
      setInitiatives([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('useInitiatives: Fetching initiatives for tenant:', tenantId);

      // Build query params
      const params = new URLSearchParams();
      
      // Add tenant filter (required for new model)
      params.append('tenant_id', tenantId);
      
      // Add area filter for managers
      if (userRole === 'Manager' && areaId) {
        params.append('area_id', areaId);
      }

      const response = await fetchWithRetry(
        `/api/initiatives?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Use cookie-based authentication
        },
        {
          maxRetries: 3,
          retryDelay: 1000,
          onRetry: (attempt, error) => {
            console.log(`useInitiatives: Retry attempt ${attempt} after error:`, error.message);
          },
          onMaxRetriesReached: (error) => {
            console.error('useInitiatives: Max retries reached:', error);
          }
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          console.error('useInitiatives: Authentication failed - token may be expired');
          throw new Error('Authentication failed. Please sign in again.');
        }
        throw new Error(`Failed to fetch initiatives: ${response.status}`);
      }

      const data = await response.json();
      
      // Map the response to match expected format with new fields
      const initiativesWithDetails: InitiativeWithRelations[] = (data.initiatives || []).map((initiative: any) => ({
        ...initiative,
        // Map title to name for backward compatibility
        name: initiative.title || initiative.name,
        title: initiative.title || initiative.name,
        // Map area name
        area: initiative.area?.name || 'Unknown Area',
        // Map owner name
        owner: initiative.created_by_user?.full_name || initiative.created_by_user?.email || 'Unassigned',
        // Map due date
        dueDate: initiative.due_date || initiative.target_date || 'No date set',
        // Map priority (if exists, otherwise default)
        priority: initiative.priority || 'medium',
        // Map nested objectives to a flattened format
        objectives: initiative.objectives?.map((obj: any) => obj.objective || obj) || [],
        // Activities now have is_completed and assigned_to fields
        activities: (initiative.activities || []).map((activity: any) => ({
          ...activity,
          is_completed: activity.is_completed ?? activity.completed,
          assigned_to: activity.assigned_to || null
        })),
        activity_count: initiative.activity_stats?.total || initiative.activities?.length || 0,
        completed_activities: initiative.activity_stats?.completed || 
          initiative.activities?.filter((a: any) => a.is_completed || a.completed).length || 0,
        // Use calculated progress from API or calculate from activities
        progress: initiative.calculated_progress ?? initiative.progress ?? 0,
        // Include new date fields
        start_date: initiative.start_date,
        due_date: initiative.due_date,
        completion_date: initiative.completion_date,
        // Include creator info
        created_by: initiative.created_by,
        created_by_name: initiative.created_by_name
      }));

      setInitiatives(initiativesWithDetails);
      console.log('useInitiatives: Successfully fetched', initiativesWithDetails.length, 'initiatives');
    } catch (err) {
      console.error('Error fetching initiatives:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch initiatives'));
      setInitiatives([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId, userRole, areaId]); // Removed authLoading from dependencies

  const createInitiative = async (initiative: {
    title: string;  // Changed from 'name' to 'title'
    description?: string;
    area_id: string;  // Now required
    objective_ids?: string[];
    due_date?: string;
    start_date?: string;
    activities?: Array<{
      title: string;
      description?: string;
      assigned_to?: string;  // User profile ID
      is_completed?: boolean;
    }>;
  }) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available');
      }

      // Prepare the request body with new model requirements
      const requestBody = {
        ...initiative,
        tenant_id: profile.tenant_id,
        created_by: profile.id,  // User profile ID
        progress: 0,  // Initial progress
        activities: initiative.activities?.map(activity => ({
          ...activity,
          is_completed: activity.is_completed || false
        }))
      };

      const response = await fetch('/api/initiatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Use cookie-based authentication
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create initiative');
      }

      const newInitiative = await response.json();
      
      // Refresh the initiatives list
      await fetchInitiatives();
      
      return newInitiative;
    } catch (err) {
      console.error('Error creating initiative:', err);
      throw err;
    }
  };

  const updateInitiative = async (id: string, updates: {
    title?: string;
    description?: string;
    progress?: number;
    due_date?: string;
    start_date?: string;
    completion_date?: string;
  }) => {
    try {
      const response = await fetch(`/api/initiatives/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update initiative');
      }

      const updatedInitiative = await response.json();
      
      // Update local state
      setInitiatives(prev => prev.map(init => 
        init.id === id ? { ...init, ...updatedInitiative } : init
      ));
      
      return updatedInitiative;
    } catch (err) {
      console.error('Error updating initiative:', err);
      throw err;
    }
  };

  const deleteInitiative = async (id: string) => {
    try {
      const response = await fetch(`/api/initiatives/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete initiative');
      }

      // Remove from local state
      setInitiatives(prev => prev.filter(init => init.id !== id));
    } catch (err) {
      console.error('Error deleting initiative:', err);
      throw err;
    }
  };

  // Add activity to initiative
  const addActivity = async (initiativeId: string, activity: {
    title: string;
    description?: string;
    assigned_to?: string;
    is_completed?: boolean;
  }) => {
    try {
      const response = await fetch(`/api/initiatives/${initiativeId}/activities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(activity),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add activity');
      }

      const newActivity = await response.json();
      
      // Update local state
      setInitiatives(prev => prev.map(init => {
        if (init.id === initiativeId) {
          return {
            ...init,
            activities: [...(init.activities || []), newActivity],
            activity_count: (init.activity_count || 0) + 1,
            completed_activities: newActivity.is_completed 
              ? (init.completed_activities || 0) + 1 
              : init.completed_activities || 0
          };
        }
        return init;
      }));
      
      return newActivity;
    } catch (err) {
      console.error('Error adding activity:', err);
      throw err;
    }
  };

  // Update activity
  const updateActivity = async (initiativeId: string, activityId: string, updates: {
    title?: string;
    description?: string;
    is_completed?: boolean;
    assigned_to?: string;
  }) => {
    try {
      const response = await fetch(`/api/activities/${activityId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update activity');
      }

      const updatedActivity = await response.json();
      
      // Update local state
      setInitiatives(prev => prev.map(init => {
        if (init.id === initiativeId) {
          const oldActivity = init.activities?.find(a => a.id === activityId);
          const wasCompleted = oldActivity?.is_completed || false;
          const isNowCompleted = updatedActivity.is_completed;
          
          return {
            ...init,
            activities: init.activities?.map(a => 
              a.id === activityId ? updatedActivity : a
            ) || [],
            completed_activities: init.completed_activities + 
              (isNowCompleted && !wasCompleted ? 1 : 
               !isNowCompleted && wasCompleted ? -1 : 0)
          };
        }
        return init;
      }));
      
      return updatedActivity;
    } catch (err) {
      console.error('Error updating activity:', err);
      throw err;
    }
  };

  useEffect(() => {
    // Only fetch when auth has finished loading and we have a tenant_id
    // Also prevent refetching if we've already loaded once
    if (!authLoading && tenantId && !hasInitiallyLoaded) {
      fetchInitiatives();
      setHasInitiallyLoaded(true);
    } else if (!authLoading && !tenantId && !hasInitiallyLoaded) {
      // No tenant ID after auth loaded, set empty state
      setInitiatives([]);
      setLoading(false);
      setHasInitiallyLoaded(true);
    }
  }, [authLoading, tenantId]); // Simplified dependencies - hasInitiallyLoaded is state we control, fetchInitiatives is stable now

  return {
    initiatives,
    loading,
    error,
    refetch: fetchInitiatives,
    createInitiative,
    updateInitiative,
    deleteInitiative,
    addActivity,
    updateActivity
  };
}