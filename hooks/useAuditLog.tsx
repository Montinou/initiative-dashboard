"use client"

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

export interface AuditLogEntry {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  user_profiles?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export function useAuditLog(resourceId?: string, resourceType?: string) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchAuditLog = async () => {
    try {
      setLoading(true);
      setError(null);

      let query = supabase
        .from('audit_log')
        .select(`
          *,
          user_profiles!audit_log_user_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false });

      // Filter by resource if specified
      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }
      if (resourceType) {
        query = query.eq('resource_type', resourceType);
      }

      // Limit to recent entries for performance
      query = query.limit(50);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setEntries(data || []);
    } catch (err) {
      console.error('Error fetching audit log:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLog();

    // Set up real-time subscription for audit log changes
    let channel;
    if (resourceId) {
      channel = supabase.channel(`audit-log-${resourceId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'audit_log',
            filter: `resource_id=eq.${resourceId}`
          },
          () => {
            fetchAuditLog();
          }
        )
        .subscribe();
    } else {
      channel = supabase.channel('audit-log-all')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'audit_log'
          },
          () => {
            fetchAuditLog();
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [resourceId, resourceType]);

  return {
    entries,
    loading,
    error,
    refetch: fetchAuditLog
  };
}

// Hook for recent activity across the tenant
export function useRecentActivity(limit: number = 20) {
  const [activities, setActivities] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchRecentActivity = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('audit_log')
        .select(`
          *,
          user_profiles!audit_log_user_id_fkey(
            id,
            full_name,
            email
          )
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (fetchError) throw fetchError;

      setActivities(data || []);
    } catch (err) {
      console.error('Error fetching recent activity:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentActivity();

    // Set up real-time subscription
    const channel = supabase.channel('recent-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_log'
        },
        () => {
          fetchRecentActivity();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [limit]);

  return {
    activities,
    loading,
    error,
    refetch: fetchRecentActivity
  };
}