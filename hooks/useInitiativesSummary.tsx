"use client"

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { FilterState } from '@/hooks/useFilters';
import { applyFiltersToData } from '@/lib/utils/filterUtils';

export interface InitiativeSummary {
  id: string;
  tenant_id: string;
  area_id?: string;
  created_by?: string;
  owner_id?: string;
  title: string;
  description?: string;
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  priority: string;
  initiative_progress: number;
  target_date?: string;
  completion_date?: string;
  budget?: number;
  actual_cost?: number;
  created_at: string;
  updated_at: string;
  subtask_count: number;
  completed_subtask_count: number;
  subtask_completion_rate: number;
  // Joined data
  areas?: {
    id: string;
    name: string;
    description?: string;
  };
  created_by_user?: {
    id: string;
    full_name: string;
    email: string;
  };
  owner_user?: {
    id: string;
    email: string;
  };
}

export function useInitiativesSummary(filters?: FilterState) {
  const [initiatives, setInitiatives] = useState<InitiativeSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchInitiatives = async () => {
    try {
      setLoading(true);
      setError(null);

      // Query initiatives table directly with simple schema
      const { data, error: fetchError } = await supabase
        .from('initiatives')
        .select(`
          *,
          company_areas(
            id,
            name,
            description
          ),
          subtasks(*)
        `)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform the data to match InitiativeSummary interface
      const transformedData: InitiativeSummary[] = (data || []).map(initiative => {
        const subtasks = initiative.subtasks || [];
        const completedSubtasks = subtasks.filter((st: any) => st.completed);
        
        return {
          id: initiative.id,
          tenant_id: 'default', // Not in simplified schema
          area_id: initiative.area_id,
          created_by: null, // Not in simplified schema
          owner_id: null, // Not in simplified schema
          title: initiative.title,
          description: initiative.description,
          status: initiative.progress === 100 ? 'completed' : (initiative.progress > 0 ? 'in_progress' : 'planning') as any,
          priority: 'medium', // Not in simplified schema
          initiative_progress: initiative.progress || 0,
          target_date: null, // Not in simplified schema
          completion_date: null, // Not in simplified schema
          budget: null, // Not in simplified schema
          actual_cost: null, // Not in simplified schema
          created_at: initiative.created_at,
          updated_at: initiative.updated_at,
          subtask_count: subtasks.length,
          completed_subtask_count: completedSubtasks.length,
          subtask_completion_rate: subtasks.length > 0 ? Math.round((completedSubtasks.length / subtasks.length) * 100) : 0,
          areas: initiative.company_areas,
          created_by_user: null, // Not in simplified schema
          owner_user: null // Not in simplified schema
        };
      });

      // Apply filters if provided
      const filteredData = filters ? applyFiltersToData(transformedData, filters) : transformedData;
      setInitiatives(filteredData);
    } catch (err) {
      console.error('Error fetching initiatives summary:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitiatives();

    // Set up real-time subscription
    const channel = supabase.channel('initiatives-summary-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'initiatives' }, () => {
        fetchInitiatives();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, () => {
        fetchInitiatives();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters]);

  // Calculate aggregate metrics
  const metrics = {
    total: initiatives.length,
    completed: initiatives.filter(i => i.status === 'completed').length,
    inProgress: initiatives.filter(i => i.status === 'in_progress').length,
    planning: initiatives.filter(i => i.status === 'planning').length,
    onHold: initiatives.filter(i => i.status === 'on_hold').length,
    averageProgress: initiatives.length > 0 
      ? Math.round(initiatives.reduce((sum, i) => sum + i.initiative_progress, 0) / initiatives.length)
      : 0,
    totalSubtasks: initiatives.reduce((sum, i) => sum + i.subtask_count, 0),
    completedSubtasks: initiatives.reduce((sum, i) => sum + i.completed_subtask_count, 0),
    averageSubtaskCompletion: initiatives.length > 0
      ? Math.round(initiatives.reduce((sum, i) => sum + i.subtask_completion_rate, 0) / initiatives.length)
      : 0,
    withBudget: initiatives.filter(i => i.budget && i.budget > 0).length,
    totalBudget: initiatives.reduce((sum, i) => sum + (i.budget || 0), 0),
    totalCost: initiatives.reduce((sum, i) => sum + (i.actual_cost || 0), 0),
    overdue: initiatives.filter(i => 
      i.target_date && 
      new Date(i.target_date) < new Date() && 
      i.status !== 'completed'
    ).length
  };

  return {
    initiatives,
    loading,
    error,
    metrics,
    refetch: fetchInitiatives
  };
}

// Hook for a single initiative summary
export function useInitiativeSummary(initiativeId: string) {
  const [initiative, setInitiative] = useState<InitiativeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchInitiative = async () => {
    if (!initiativeId) {
      setInitiative(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('initiatives')
        .select(`
          *,
          areas(
            id,
            name,
            description,
            user_profiles!areas_manager_id_fkey(
              id,
              full_name,
              email
            )
          ),
          created_by_user:user_profiles!initiatives_created_by_fkey(
            id,
            full_name,
            email
          ),
          owner_user:user_profiles!initiatives_owner_id_fkey(
            id,
            email
          ),
          subtasks(*)
        `)
        .eq('id', initiativeId)
        .single();

      if (fetchError) throw fetchError;

      // Transform the data to match InitiativeSummary interface
      const subtasks = data.subtasks || [];
      const completedSubtasks = subtasks.filter((st: any) => st.completed);
      
      const transformedInitiative: InitiativeSummary = {
        id: data.id,
        tenant_id: data.tenant_id,
        area_id: data.area_id,
        created_by: data.created_by,
        owner_id: data.owner_id,
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        initiative_progress: data.progress || 0,
        target_date: data.target_date,
        completion_date: data.completion_date,
        budget: data.budget,
        actual_cost: data.actual_cost,
        created_at: data.created_at,
        updated_at: data.updated_at,
        subtask_count: subtasks.length,
        completed_subtask_count: completedSubtasks.length,
        subtask_completion_rate: subtasks.length > 0 ? Math.round((completedSubtasks.length / subtasks.length) * 100) : 0,
        areas: data.areas,
        created_by_user: data.created_by_user,
        owner_user: data.owner_user
      };

      setInitiative(transformedInitiative);
    } catch (err) {
      console.error('Error fetching initiative summary:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitiative();

    // Set up real-time subscription for this specific initiative
    const channel = supabase.channel(`initiative-summary-${initiativeId}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'initiatives',
        filter: `id=eq.${initiativeId}` 
      }, () => {
        fetchInitiative();
      })
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'subtasks',
        filter: `initiative_id=eq.${initiativeId}` 
      }, () => {
        fetchInitiative();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [initiativeId]);

  return {
    initiative,
    loading,
    error,
    refetch: fetchInitiative
  };
}

// Hook for initiatives filtered by area
export function useInitiativesSummaryByArea(areaId?: string, filters?: FilterState) {
  const { initiatives, loading, error, metrics, refetch } = useInitiativesSummary(filters);
  
  const filteredInitiatives = areaId 
    ? initiatives.filter(i => i.area_id === areaId)
    : initiatives;

  // Recalculate metrics for filtered data
  const filteredMetrics = {
    total: filteredInitiatives.length,
    completed: filteredInitiatives.filter(i => i.status === 'completed').length,
    inProgress: filteredInitiatives.filter(i => i.status === 'in_progress').length,
    planning: filteredInitiatives.filter(i => i.status === 'planning').length,
    onHold: filteredInitiatives.filter(i => i.status === 'on_hold').length,
    averageProgress: filteredInitiatives.length > 0 
      ? Math.round(filteredInitiatives.reduce((sum, i) => sum + i.initiative_progress, 0) / filteredInitiatives.length)
      : 0,
    totalSubtasks: filteredInitiatives.reduce((sum, i) => sum + i.subtask_count, 0),
    completedSubtasks: filteredInitiatives.reduce((sum, i) => sum + i.completed_subtask_count, 0),
    averageSubtaskCompletion: filteredInitiatives.length > 0
      ? Math.round(filteredInitiatives.reduce((sum, i) => sum + i.subtask_completion_rate, 0) / filteredInitiatives.length)
      : 0
  };

  return {
    initiatives: filteredInitiatives,
    loading,
    error,
    metrics: filteredMetrics,
    refetch
  };
}