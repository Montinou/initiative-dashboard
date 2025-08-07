"use client"

import { useState, useEffect, useCallback } from 'react';
import type { InitiativeWithRelations } from '@/lib/types/database';
import { useAuth } from '@/lib/auth-context';

export function useInitiatives() {
  const [initiatives, setInitiatives] = useState<InitiativeWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useAuth();

  const fetchInitiatives = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check for tenant context
      if (!profile?.tenant_id) {
        console.log('useInitiatives: No tenant ID available yet');
        setInitiatives([]);
        return;
      }

      console.log('useInitiatives: Fetching initiatives for tenant:', profile.tenant_id);

      // Build query params
      const params = new URLSearchParams();
      if (profile.role === 'Manager' && profile.area_id) {
        params.append('area_id', profile.area_id);
      }

      const response = await fetch(`/api/initiatives?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch initiatives: ${response.status}`);
      }

      const data = await response.json();
      
      // Map the response to match expected format
      const initiativesWithDetails: InitiativeWithRelations[] = (data.initiatives || []).map((initiative: any) => ({
        ...initiative,
        // Map nested objectives to a flattened format
        objectives: initiative.objectives || [],
        // Activities are now in the activities array
        activities: initiative.activities || [],
        activity_count: initiative.activity_stats?.total || 0,
        completed_activities: initiative.activity_stats?.completed || 0,
        // Use calculated progress from API
        progress: initiative.calculated_progress ?? initiative.progress
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
  }, [profile]);

  const createInitiative = async (initiative: {
    title: string;
    description?: string;
    area_id?: string;
    objective_ids?: string[];
    due_date?: string;
    start_date?: string;
    activities?: Array<{
      title: string;
      description?: string;
      assigned_to?: string;
    }>;
  }) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available');
      }

      const response = await fetch('/api/initiatives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(initiative),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create initiative');
      }

      const data = await response.json();
      await fetchInitiatives();
      return { data: data.initiative, error: null };
    } catch (err) {
      console.error('Error creating initiative:', err);
      return { data: null, error: err instanceof Error ? err : new Error('Failed to create initiative') };
    }
  };

  const updateInitiative = async (id: string, updates: {
    title?: string;
    description?: string;
    progress?: number;
    due_date?: string;
    start_date?: string;
    completion_date?: string;
    objective_ids?: string[];
  }) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available');
      }

      const response = await fetch('/api/initiatives', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update initiative');
      }

      const data = await response.json();
      await fetchInitiatives();
      return { data: data.initiative, error: null };
    } catch (err) {
      console.error('Error updating initiative:', err);
      return { data: null, error: err instanceof Error ? err : new Error('Failed to update initiative') };
    }
  };

  const deleteInitiative = async (id: string) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available');
      }

      const response = await fetch(`/api/initiatives?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete initiative');
      }

      await fetchInitiatives();
      return { error: null };
    } catch (err) {
      console.error('Error deleting initiative:', err);
      return { error: err instanceof Error ? err : new Error('Failed to delete initiative') };
    }
  };

  useEffect(() => {
    // Only fetch if we have tenant info
    if (profile?.tenant_id) {
      fetchInitiatives();
    }
  }, [profile?.tenant_id, fetchInitiatives]);

  return {
    initiatives,
    isLoading: loading,
    error,
    createInitiative,
    updateInitiative,
    deleteInitiative,
    refetch: fetchInitiatives
  };
}