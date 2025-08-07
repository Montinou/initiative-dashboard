"use client"

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import type { ObjectiveWithRelations } from '@/lib/types/database';

export function useObjectives() {
  const [objectives, setObjectives] = useState<ObjectiveWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useAuth();

  const fetchObjectives = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check for tenant context
      if (!profile?.tenant_id) {
        console.log('useObjectives: No tenant ID available yet');
        setObjectives([]);
        return;
      }

      console.log('useObjectives: Fetching objectives for tenant:', profile.tenant_id);

      // Build query params
      const params = new URLSearchParams();
      if (profile.role === 'Manager' && profile.area_id) {
        params.append('area_id', profile.area_id);
      }

      const response = await fetch(`/api/dashboard/objectives?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch objectives: ${response.status}`);
      }

      const data = await response.json();
      setObjectives(data.objectives || []);
      console.log('useObjectives: Successfully fetched', data.objectives?.length || 0, 'objectives');
    } catch (err) {
      console.error('Error fetching objectives:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch objectives'));
      setObjectives([]);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  const createObjective = async (objective: {
    title: string;
    description?: string;
    area_id?: string;
    quarter_ids?: string[];
  }) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available');
      }

      const response = await fetch('/api/dashboard/objectives', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(objective),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create objective');
      }

      const data = await response.json();
      await fetchObjectives();
      return { data: data.objective, error: null };
    } catch (err) {
      console.error('Error creating objective:', err);
      return { data: null, error: err instanceof Error ? err : new Error('Failed to create objective') };
    }
  };

  const updateObjective = async (id: string, updates: {
    title?: string;
    description?: string;
    area_id?: string;
    quarter_ids?: string[];
  }) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available');
      }

      const response = await fetch('/api/dashboard/objectives', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id, ...updates }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update objective');
      }

      const data = await response.json();
      await fetchObjectives();
      return { data: data.objective, error: null };
    } catch (err) {
      console.error('Error updating objective:', err);
      return { data: null, error: err instanceof Error ? err : new Error('Failed to update objective') };
    }
  };

  const deleteObjective = async (id: string) => {
    try {
      if (!profile?.tenant_id) {
        throw new Error('No tenant context available');
      }

      const response = await fetch(`/api/dashboard/objectives?id=${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete objective');
      }

      await fetchObjectives();
      return { error: null };
    } catch (err) {
      console.error('Error deleting objective:', err);
      return { error: err instanceof Error ? err : new Error('Failed to delete objective') };
    }
  };

  useEffect(() => {
    // Only fetch if we have tenant info
    if (profile?.tenant_id) {
      fetchObjectives();
    }
  }, [profile?.tenant_id, fetchObjectives]);

  return {
    objectives,
    isLoading: loading,
    error,
    createObjective,
    updateObjective,
    deleteObjective,
    refetch: fetchObjectives
  };
}