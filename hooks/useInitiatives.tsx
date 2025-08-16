"use client"

import { useState, useEffect, useCallback } from 'react';
import type { Initiative, Activity, Objective } from '@/lib/types/database';

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

/**
 * Simplified useInitiatives hook
 * - No complex dependencies that cause re-renders
 * - Simple fetch with cookies
 * - Manual refresh when needed
 */
export function useInitiatives() {
  const [initiatives, setInitiatives] = useState<InitiativeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchInitiatives = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Simple fetch with cookies - RLS handles tenant filtering
      const response = await fetch('/api/initiatives', {
        method: 'GET',
        credentials: 'include', // Use cookie-based authentication
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please sign in again.');
        }
        throw new Error(`Failed to fetch initiatives: ${response.status}`);
      }

      const data = await response.json();
      
      // Map the response to match expected format
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
    } catch (err) {
      console.error('Error fetching initiatives:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch initiatives'));
      setInitiatives([]);
    } finally {
      setLoading(false);
    }
  }, []); // No dependencies to avoid re-renders

  const createInitiative = async (initiative: {
    title: string;
    description?: string;
    area_id: string;
    objective_ids?: string[];
    due_date?: string;
    start_date?: string;
    activities?: Array<{
      title: string;
      description?: string;
      assigned_to?: string;
      is_completed?: boolean;
    }>;
  }) => {
    try {
      const response = await fetch('/api/initiatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(initiative),
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
      // Use PUT method with id in body for consistency
      const response = await fetch('/api/initiatives', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update initiative');
      }

      const result = await response.json();
      
      // Update local state optimistically
      setInitiatives(prev => prev.map(init => 
        init.id === id ? { ...init, ...updates } : init
      ));
      
      return result.initiative;
    } catch (err) {
      console.error('Error updating initiative:', err);
      // Refresh on error to ensure consistency
      fetchInitiatives();
      throw err;
    }
  };

  const deleteInitiative = async (id: string) => {
    try {
      const response = await fetch(`/api/initiatives?id=${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete initiative');
      }

      // Remove from local state optimistically
      setInitiatives(prev => prev.filter(init => init.id !== id));
    } catch (err) {
      console.error('Error deleting initiative:', err);
      // Refresh on error to ensure consistency
      fetchInitiatives();
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
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          initiative_id: initiativeId,
          ...activity
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add activity');
      }

      const result = await response.json();
      
      // Update local state optimistically
      setInitiatives(prev => prev.map(init => {
        if (init.id === initiativeId) {
          return {
            ...init,
            activities: [...(init.activities || []), result.activity],
            activity_count: (init.activity_count || 0) + 1,
            completed_activities: result.activity.is_completed 
              ? (init.completed_activities || 0) + 1 
              : init.completed_activities || 0
          };
        }
        return init;
      }));
      
      return result.activity;
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
      const response = await fetch('/api/activities', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          id: activityId,
          ...updates
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update activity');
      }

      const result = await response.json();
      
      // Update local state optimistically
      setInitiatives(prev => prev.map(init => {
        if (init.id === initiativeId) {
          const oldActivity = init.activities?.find(a => a.id === activityId);
          const wasCompleted = oldActivity?.is_completed || false;
          const isNowCompleted = result.activity.is_completed;
          
          return {
            ...init,
            activities: init.activities?.map(a => 
              a.id === activityId ? result.activity : a
            ) || [],
            completed_activities: init.completed_activities + 
              (isNowCompleted && !wasCompleted ? 1 : 
               !isNowCompleted && wasCompleted ? -1 : 0)
          };
        }
        return init;
      }));
      
      return result.activity;
    } catch (err) {
      console.error('Error updating activity:', err);
      throw err;
    }
  };

  // Simple useEffect - only runs once on mount
  useEffect(() => {
    fetchInitiatives();
  }, []); // Empty dependency array - no re-renders

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