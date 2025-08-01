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

      // Query initiatives table directly like useInitiatives does
      const { data, error: fetchError } = await supabase
        .from('initiatives')
        .select(`
          *,
          areas(
            id,
            name,
            description
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
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;

      // Transform the data to match InitiativeSummary interface
      const transformedData: InitiativeSummary[] = (data || []).map(initiative => {
        const subtasks = initiative.subtasks || [];
        const completedSubtasks = subtasks.filter((st: any) => st.completed);
        
        return {
          id: initiative.id,
          tenant_id: initiative.tenant_id,
          area_id: initiative.area_id,
          created_by: initiative.created_by,
          owner_id: initiative.owner_id,
          title: initiative.title,
          description: initiative.description,
          status: initiative.status,
          priority: initiative.priority,
          initiative_progress: initiative.progress || 0,
          target_date: initiative.target_date,
          completion_date: initiative.completion_date,
          budget: initiative.budget,
          actual_cost: initiative.actual_cost,
          created_at: initiative.created_at,
          updated_at: initiative.updated_at,
          subtask_count: subtasks.length,
          completed_subtask_count: completedSubtasks.length,
          subtask_completion_rate: subtasks.length > 0 ? Math.round((completedSubtasks.length / subtasks.length) * 100) : 0,
          areas: initiative.areas,
          created_by_user: initiative.created_by_user,
          owner_user: initiative.owner_user
        };
      });

      // Apply filters if provided
      const filteredData = filters ? applyFiltersToData(transformedData, filters) : transformedData;
      setInitiatives(filteredData);
    } catch (err) {
      console.error('Error fetching initiatives summary:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      
      // In development mode, provide mock data when database connection fails
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development: Using mock data for initiatives summary');
        const mockInitiatives: InitiativeSummary[] = [
          {
            id: '1',
            tenant_id: 'default',
            area_id: '1',
            title: 'Sistema de Gestión Digital',
            description: 'Implementación de sistema digital para mejorar la gestión de procesos',
            status: 'in_progress',
            priority: 'high',
            initiative_progress: 75,
            target_date: '2024-12-31',
            budget: 50000,
            actual_cost: 35000,
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-08-01T00:00:00Z',
            subtask_count: 8,
            completed_subtask_count: 6,
            subtask_completion_rate: 75,
            areas: { id: '1', name: 'Tecnología', description: 'Área de tecnología e innovación' }
          },
          {
            id: '2',
            tenant_id: 'default',
            area_id: '2',
            title: 'Campaña de Marketing Digital',
            description: 'Estrategia integral de marketing digital para aumentar la presencia online',
            status: 'completed',
            priority: 'medium',
            initiative_progress: 100,
            target_date: '2024-06-30',
            completion_date: '2024-06-25',
            budget: 30000,
            actual_cost: 28000,
            created_at: '2024-01-10T00:00:00Z',
            updated_at: '2024-06-25T00:00:00Z',
            subtask_count: 5,
            completed_subtask_count: 5,
            subtask_completion_rate: 100,
            areas: { id: '2', name: 'Marketing', description: 'Área de marketing y comunicaciones' }
          },
          {
            id: '3',
            tenant_id: 'default',
            area_id: '3',
            title: 'Optimización de Procesos',
            description: 'Análisis y mejora de procesos operativos para aumentar eficiencia',
            status: 'in_progress',
            priority: 'high',
            initiative_progress: 45,
            target_date: '2024-10-15',
            budget: 25000,
            actual_cost: 12000,
            created_at: '2024-02-01T00:00:00Z',
            updated_at: '2024-07-30T00:00:00Z',
            subtask_count: 6,
            completed_subtask_count: 3,
            subtask_completion_rate: 50,
            areas: { id: '3', name: 'Operaciones', description: 'Área de operaciones y procesos' }
          },
          {
            id: '4',
            tenant_id: 'default',
            area_id: '4',
            title: 'Capacitación de Personal',
            description: 'Programa de capacitación y desarrollo profesional',
            status: 'planning',
            priority: 'medium',
            initiative_progress: 20,
            target_date: '2024-11-30',
            budget: 15000,
            actual_cost: 3000,
            created_at: '2024-03-01T00:00:00Z',
            updated_at: '2024-07-28T00:00:00Z',
            subtask_count: 4,
            completed_subtask_count: 1,
            subtask_completion_rate: 25,
            areas: { id: '4', name: 'Recursos Humanos', description: 'Área de recursos humanos' }
          },
          {
            id: '5',
            tenant_id: 'default',
            area_id: '5',
            title: 'Dashboard Financiero',
            description: 'Desarrollo de dashboard para análisis financiero en tiempo real',
            status: 'in_progress',
            priority: 'high',
            initiative_progress: 85,
            target_date: '2024-09-15',
            budget: 40000,
            actual_cost: 32000,
            created_at: '2024-01-20T00:00:00Z',
            updated_at: '2024-08-01T00:00:00Z',
            subtask_count: 7,
            completed_subtask_count: 6,
            subtask_completion_rate: 86,
            areas: { id: '5', name: 'Finanzas', description: 'Área financiera y contable' }
          },
          {
            id: '6',
            tenant_id: 'default',
            area_id: '6',
            title: 'Expansión Comercial',
            description: 'Estrategia de expansión a nuevos mercados regionales',
            status: 'on_hold',
            priority: 'low',
            initiative_progress: 30,
            target_date: '2025-03-31',
            budget: 80000,
            actual_cost: 15000,
            created_at: '2024-02-15T00:00:00Z',
            updated_at: '2024-07-15T00:00:00Z',
            subtask_count: 10,
            completed_subtask_count: 3,
            subtask_completion_rate: 30,
            areas: { id: '6', name: 'Comercial', description: 'Área comercial y ventas' }
          }
        ];

        // Apply filters if provided
        const filteredData = filters ? applyFiltersToData(mockInitiatives, filters) : mockInitiatives;
        setInitiatives(filteredData);
        setError(null); // Clear error when using mock data
      }
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