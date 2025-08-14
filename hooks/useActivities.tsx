"use client"

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { Activity } from '@/lib/types/database';

export function useActivities(initiativeId?: string) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { profile, loading: authLoading } = useAuth();

  const fetchActivities = useCallback(async () => {
    // Don't fetch if auth is still loading
    if (authLoading) {
      console.log('useActivities: Auth still loading, waiting...');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check for tenant context
      if (!profile?.tenant_id) {
        console.log('useActivities: No tenant ID available yet');
        setActivities([]);
        setLoading(false);
        return;
      }

      console.log('useActivities: Fetching activities');

      // Build query params
      const params = new URLSearchParams();
      if (initiativeId) {
        params.append('initiative_id', initiativeId);
      }

      const response = await fetch(`/api/activities?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch activities: ${response.status}`);
      }

      const data = await response.json();
      setActivities(data.activities || []);
      console.log('useActivities: Successfully fetched', data.activities?.length || 0, 'activities');
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id, initiativeId, authLoading]);

  const createActivity = async (activity: {
    title: string;
    description?: string;
    is_completed?: boolean;
    initiative_id?: string;
    assigned_to?: string;
  }) => {
    try {
      // Add initiative_id if it's provided
      const activityData = {
        ...activity,
        initiative_id: activity.initiative_id || initiativeId,
        is_completed: activity.is_completed ?? false
      };

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(activityData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create activity');
      }

      const data = await response.json();
      await fetchActivities();
      return { data: data.activity, error: null };
    } catch (err) {
      console.error('Error creating activity:', err);
      return { data: null, error: err instanceof Error ? err : new Error('Failed to create activity') };
    }
  };

  const updateActivity = async (id: string, updates: {
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
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update activity');
      }

      const data = await response.json();
      await fetchActivities();
      return { data: data.activity, error: null };
    } catch (err) {
      console.error('Error updating activity:', err);
      return { data: null, error: err instanceof Error ? err : new Error('Failed to update activity') };
    }
  };

  const deleteActivity = async (id: string) => {
    try {
      const response = await fetch(`/api/activities?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete activity');
      }

      await fetchActivities();
      return { error: null };
    } catch (err) {
      console.error('Error deleting activity:', err);
      return { error: err instanceof Error ? err : new Error('Failed to delete activity') };
    }
  };

  const toggleActivityCompletion = async (id: string, completed: boolean) => {
    return updateActivity(id, { is_completed: completed });
  };

  useEffect(() => {
    // Only fetch if we have tenant info
    if (profile?.tenant_id) {
      fetchActivities();
    }
  }, [profile?.tenant_id, fetchActivities]);

  return {
    activities,
    loading,
    error,
    createActivity,
    updateActivity,
    deleteActivity,
    toggleActivityCompletion,
    refetch: fetchActivities
  };
}