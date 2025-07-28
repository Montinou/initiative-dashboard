"use client"

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { CompanyArea } from '@/types/database';

export function useCompanyAreas() {
  const [areas, setAreas] = useState<CompanyArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchAreas = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('company_areas')
        .select('*')
        .order('name', { ascending: true });

      if (fetchError) throw fetchError;

      setAreas(data || []);
    } catch (err) {
      console.error('Error fetching company areas:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const createArea = async (area: {
    name: string;
    description?: string;
  }) => {
    try {
      const { data, error } = await supabase
        .from('company_areas')
        .insert(area)
        .select()
        .single();

      if (error) throw error;

      await fetchAreas();
      return data;
    } catch (err) {
      console.error('Error creating company area:', err);
      throw err;
    }
  };

  const updateArea = async (id: string, updates: Partial<CompanyArea>) => {
    try {
      const { data, error } = await supabase
        .from('company_areas')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await fetchAreas();
      return data;
    } catch (err) {
      console.error('Error updating company area:', err);
      throw err;
    }
  };

  const deleteArea = async (id: string) => {
    try {
      const { error } = await supabase
        .from('company_areas')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchAreas();
    } catch (err) {
      console.error('Error deleting company area:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchAreas();

    // Set up real-time subscription
    const channel = supabase.channel('areas-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'company_areas' }, () => {
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