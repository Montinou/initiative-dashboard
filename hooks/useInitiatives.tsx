"use client"

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Initiative, InitiativeWithDetails, CompanyArea } from '@/types/database';

export function useInitiatives() {
  const [initiatives, setInitiatives] = useState<InitiativeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchInitiatives = async () => {
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
            manager_id,
            user_profiles!areas_manager_id_fkey(
              id,
              full_name,
              email
            )
          ),
          subtasks(*)
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const initiativesWithDetails: InitiativeWithDetails[] = (data || []).map(initiative => ({
        ...initiative,
        area: initiative.areas || null,
        subtasks: initiative.subtasks || [],
        subtask_count: initiative.subtasks?.length || 0,
        completed_subtasks: initiative.subtasks?.filter((st: any) => st.completed).length || 0
      }));

      setInitiatives(initiativesWithDetails);
    } catch (err) {
      console.error('Error fetching initiatives:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      
      // In development mode, provide mock data when database connection fails
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development: Using mock data for initiatives');
        const mockInitiatives: InitiativeWithDetails[] = [
          {
            id: '1',
            tenant_id: 'default',
            area_id: '1',
            title: 'Sistema de Gestión Digital',
            description: 'Implementación de sistema digital para mejorar la gestión de procesos',
            status: 'in_progress',
            priority: 'high',
            progress: 75,
            target_date: '2024-12-31',
            budget: 50000,
            actual_cost: 35000,
            created_at: '2024-01-15T00:00:00Z',
            updated_at: '2024-08-01T00:00:00Z',
            created_by: '1',
            owner_id: '1',
            area: { 
              id: '1', 
              name: 'Tecnología', 
              description: 'Área de tecnología e innovación',
              manager_id: '1',
              tenant_id: 'default',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            subtasks: [
              { id: '1', title: 'Análisis de requisitos', completed: true, initiative_id: '1' },
              { id: '2', title: 'Diseño del sistema', completed: true, initiative_id: '1' },
              { id: '3', title: 'Desarrollo backend', completed: true, initiative_id: '1' },
              { id: '4', title: 'Desarrollo frontend', completed: true, initiative_id: '1' },
              { id: '5', title: 'Testing', completed: true, initiative_id: '1' },
              { id: '6', title: 'Implementación', completed: true, initiative_id: '1' },
              { id: '7', title: 'Capacitación', completed: false, initiative_id: '1' },
              { id: '8', title: 'Go-live', completed: false, initiative_id: '1' }
            ],
            subtask_count: 8,
            completed_subtasks: 6
          },
          {
            id: '2',
            tenant_id: 'default',
            area_id: '2',
            title: 'Campaña de Marketing Digital',
            description: 'Estrategia integral de marketing digital para aumentar la presencia online',
            status: 'completed',
            priority: 'medium',
            progress: 100,
            target_date: '2024-06-30',
            completion_date: '2024-06-25',
            budget: 30000,
            actual_cost: 28000,
            created_at: '2024-01-10T00:00:00Z',
            updated_at: '2024-06-25T00:00:00Z',
            created_by: '2',
            owner_id: '2',
            area: { 
              id: '2', 
              name: 'Marketing', 
              description: 'Área de marketing y comunicaciones',
              manager_id: '2',
              tenant_id: 'default',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            subtasks: [
              { id: '9', title: 'Estrategia de contenido', completed: true, initiative_id: '2' },
              { id: '10', title: 'Diseño gráfico', completed: true, initiative_id: '2' },
              { id: '11', title: 'Configuración redes sociales', completed: true, initiative_id: '2' },
              { id: '12', title: 'Lanzamiento campaña', completed: true, initiative_id: '2' },
              { id: '13', title: 'Análisis de resultados', completed: true, initiative_id: '2' }
            ],
            subtask_count: 5,
            completed_subtasks: 5
          },
          {
            id: '3',
            tenant_id: 'default',
            area_id: '3',
            title: 'Optimización de Procesos',
            description: 'Análisis y mejora de procesos operativos para aumentar eficiencia',
            status: 'in_progress',
            priority: 'high',
            progress: 45,
            target_date: '2024-10-15',
            budget: 25000,
            actual_cost: 12000,
            created_at: '2024-02-01T00:00:00Z',
            updated_at: '2024-07-30T00:00:00Z',
            created_by: '3',
            owner_id: '3',
            area: { 
              id: '3', 
              name: 'Operaciones', 
              description: 'Área de operaciones y procesos',
              manager_id: '3',
              tenant_id: 'default',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            subtasks: [
              { id: '14', title: 'Mapeo de procesos actuales', completed: true, initiative_id: '3' },
              { id: '15', title: 'Identificación de cuellos de botella', completed: true, initiative_id: '3' },
              { id: '16', title: 'Diseño de mejoras', completed: true, initiative_id: '3' },
              { id: '17', title: 'Implementación piloto', completed: false, initiative_id: '3' },
              { id: '18', title: 'Evaluación de resultados', completed: false, initiative_id: '3' },
              { id: '19', title: 'Rollout completo', completed: false, initiative_id: '3' }
            ],
            subtask_count: 6,
            completed_subtasks: 3
          },
          {
            id: '4',
            tenant_id: 'default',
            area_id: '4',
            title: 'Capacitación de Personal',
            description: 'Programa de capacitación y desarrollo profesional',
            status: 'planning',
            priority: 'medium',
            progress: 20,
            target_date: '2024-11-30',
            budget: 15000,
            actual_cost: 3000,
            created_at: '2024-03-01T00:00:00Z',
            updated_at: '2024-07-28T00:00:00Z',
            created_by: '4',
            owner_id: '4',
            area: { 
              id: '4', 
              name: 'Recursos Humanos', 
              description: 'Área de recursos humanos',
              manager_id: '4',
              tenant_id: 'default',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            subtasks: [
              { id: '20', title: 'Evaluación de necesidades', completed: true, initiative_id: '4' },
              { id: '21', title: 'Diseño del programa', completed: false, initiative_id: '4' },
              { id: '22', title: 'Desarrollo de contenidos', completed: false, initiative_id: '4' },
              { id: '23', title: 'Ejecución del programa', completed: false, initiative_id: '4' }
            ],
            subtask_count: 4,
            completed_subtasks: 1
          },
          {
            id: '5',
            tenant_id: 'default',
            area_id: '5',
            title: 'Dashboard Financiero',
            description: 'Desarrollo de dashboard para análisis financiero en tiempo real',
            status: 'in_progress',
            priority: 'high',
            progress: 85,
            target_date: '2024-09-15',
            budget: 40000,
            actual_cost: 32000,
            created_at: '2024-01-20T00:00:00Z',
            updated_at: '2024-08-01T00:00:00Z',
            created_by: '5',
            owner_id: '5',
            area: { 
              id: '5', 
              name: 'Finanzas', 
              description: 'Área financiera y contable',
              manager_id: '5',
              tenant_id: 'default',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            subtasks: [
              { id: '24', title: 'Definición de KPIs', completed: true, initiative_id: '5' },
              { id: '25', title: 'Integración con ERP', completed: true, initiative_id: '5' },
              { id: '26', title: 'Desarrollo de visualizaciones', completed: true, initiative_id: '5' },
              { id: '27', title: 'Testing de performance', completed: true, initiative_id: '5' },
              { id: '28', title: 'Capacitación usuarios', completed: true, initiative_id: '5' },
              { id: '29', title: 'Despliegue producción', completed: true, initiative_id: '5' },
              { id: '30', title: 'Documentación', completed: false, initiative_id: '5' }
            ],
            subtask_count: 7,
            completed_subtasks: 6
          },
          {
            id: '6',
            tenant_id: 'default',
            area_id: '6',
            title: 'Expansión Comercial',
            description: 'Estrategia de expansión a nuevos mercados regionales',
            status: 'on_hold',
            priority: 'low',
            progress: 30,
            target_date: '2025-03-31',
            budget: 80000,
            actual_cost: 15000,
            created_at: '2024-02-15T00:00:00Z',
            updated_at: '2024-07-15T00:00:00Z',
            created_by: '6',
            owner_id: '6',
            area: { 
              id: '6', 
              name: 'Comercial', 
              description: 'Área comercial y ventas',
              manager_id: '6',
              tenant_id: 'default',
              created_at: '2024-01-01T00:00:00Z',
              updated_at: '2024-01-01T00:00:00Z'
            },
            subtasks: [
              { id: '31', title: 'Investigación de mercado', completed: true, initiative_id: '6' },
              { id: '32', title: 'Análisis de competencia', completed: true, initiative_id: '6' },
              { id: '33', title: 'Plan de negocio', completed: true, initiative_id: '6' },
              { id: '34', title: 'Estrategia de pricing', completed: false, initiative_id: '6' },
              { id: '35', title: 'Plan de marketing', completed: false, initiative_id: '6' },
              { id: '36', title: 'Contratación equipo', completed: false, initiative_id: '6' },
              { id: '37', title: 'Lanzamiento piloto', completed: false, initiative_id: '6' },
              { id: '38', title: 'Escalamiento', completed: false, initiative_id: '6' },
              { id: '39', title: 'Evaluación ROI', completed: false, initiative_id: '6' },
              { id: '40', title: 'Expansión completa', completed: false, initiative_id: '6' }
            ],
            subtask_count: 10,
            completed_subtasks: 3
          }
        ];

        setInitiatives(mockInitiatives);
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const createInitiative = async (initiative: {
    title: string;
    description?: string;
    area_id?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('initiatives')
        .insert(initiative)
        .select()
        .single();

      if (error) throw error;

      await fetchInitiatives();
      return data;
    } catch (err) {
      console.error('Error creating initiative:', err);
      throw err;
    }
  };

  const updateInitiative = async (id: string, updates: Partial<Initiative>) => {
    try {
      const { data, error } = await supabase
        .from('initiatives')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Note: Database triggers will automatically:
      // 1. Log this change to audit_log table
      // 2. Create progress_history entry if progress changed
      // 3. Update the updated_at timestamp

      await fetchInitiatives();
      return data;
    } catch (err) {
      console.error('Error updating initiative:', err);
      throw err;
    }
  };

  const deleteInitiative = async (id: string) => {
    try {
      const { error } = await supabase
        .from('initiatives')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchInitiatives();
    } catch (err) {
      console.error('Error deleting initiative:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchInitiatives();

    // Set up real-time subscription
    const channel = supabase.channel('initiatives-changes')
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
  }, []);

  return {
    initiatives,
    loading,
    error,
    createInitiative,
    updateInitiative,
    deleteInitiative,
    refetch: fetchInitiatives
  };
}