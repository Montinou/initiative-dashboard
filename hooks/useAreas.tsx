"use client"

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { Area } from '@/types/database';

export function useAreas() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchAreas = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('areas')
        .select(`
          *,
          user_profiles!areas_manager_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setAreas(data || []);
    } catch (err) {
      console.error('Error fetching areas:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      
      // In development mode, provide mock data when database connection fails
      if (process.env.NODE_ENV === 'development') {
        console.log('🔧 Development: Using mock data for areas');
        const mockAreas: Area[] = [
          {
            id: '1',
            name: 'Tecnología',
            description: 'Área de tecnología e innovación',
            manager_id: '1',
            tenant_id: 'default',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: '2',
            name: 'Marketing',
            description: 'Área de marketing y comunicaciones',
            manager_id: '2',
            tenant_id: 'default',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: '3',
            name: 'Operaciones',
            description: 'Área de operaciones y procesos',
            manager_id: '3',
            tenant_id: 'default',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: '4',
            name: 'Recursos Humanos',
            description: 'Área de recursos humanos',
            manager_id: '4',
            tenant_id: 'default',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: '5',
            name: 'Finanzas',
            description: 'Área financiera y contable',
            manager_id: '5',
            tenant_id: 'default',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          },
          {
            id: '6',
            name: 'Comercial',
            description: 'Área comercial y ventas',
            manager_id: '6',
            tenant_id: 'default',
            is_active: true,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          }
        ];

        setAreas(mockAreas);
        setError(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const createArea = async (area: {
    name: string;
    description?: string;
    manager_id?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('areas')
        .insert({
          ...area,
          is_active: true
        })
        .select(`
          *,
          user_profiles!areas_manager_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) throw error;

      await fetchAreas();
      return data;
    } catch (err) {
      console.error('Error creating area:', err);
      throw err;
    }
  };

  const updateArea = async (id: string, updates: Partial<Area>) => {
    try {
      const { data, error } = await supabase
        .from('areas')
        .update(updates)
        .eq('id', id)
        .select(`
          *,
          user_profiles!areas_manager_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .single();

      if (error) throw error;

      await fetchAreas();
      return data;
    } catch (err) {
      console.error('Error updating area:', err);
      throw err;
    }
  };

  const deleteArea = async (id: string) => {
    try {
      // Soft delete by setting is_active to false
      const { error } = await supabase
        .from('areas')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      await fetchAreas();
    } catch (err) {
      console.error('Error deleting area:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchAreas();

    // Set up real-time subscription
    const channel = supabase.channel('areas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'areas' }, () => {
        fetchAreas();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    areas,
    loading,
    error,
    createArea,
    updateArea,
    deleteArea,
    refetch: fetchAreas
  };
}