"use client"

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from '@/lib/auth-context';

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
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();
  const { session, profile } = useAuth();

  const fetchAuditLog = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check for authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      // Check for tenant context
      if (!profile?.tenant_id) {
        console.log('useAuditLog: No tenant ID available yet');
        setEntries([]);
        return;
      }

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
        .eq('tenant_id', profile.tenant_id)  // Add tenant filtering
        .order('created_at', { ascending: false });

      // Filter by resource if specified
      if (resourceId) {
        query = query.eq('resource_id', resourceId);
      }
      if (resourceType) {
        query = query.eq('resource_type', resourceType);
      }

      // Apply role-based filtering for managers
      if (profile.role === 'Manager' && profile.area_id) {
        // Managers can only see audit logs for their area's resources
        query = query.or(`resource_type.eq.areas,resource_type.eq.initiatives`);
      }

      // Limit to recent entries for performance
      query = query.limit(50);

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setEntries(data || []);
    } catch (err) {
      console.error('Error fetching audit log:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch audit log'));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, profile, resourceId, resourceType]);

  useEffect(() => {
    // Only fetch if we have authentication and tenant info
    if (session?.user && profile?.tenant_id) {
      fetchAuditLog();
    } else if (!session?.user) {
      // No user session, set loading to false
      setLoading(false);
      setError(new Error('Not authenticated'));
    }
  }, [session?.user, profile?.tenant_id, fetchAuditLog]);

  useEffect(() => {
    // Set up real-time subscription for audit log changes
    if (!profile?.tenant_id) return;

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
            table: 'audit_log',
            filter: `tenant_id=eq.${profile.tenant_id}`  // Filter by tenant
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
  }, [supabase, profile?.tenant_id, resourceId, fetchAuditLog]);

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
  const [error, setError] = useState<Error | null>(null);
  const supabase = createClient();
  const { session, profile } = useAuth();

  const fetchRecentActivity = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check for authentication first
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        throw new Error('Not authenticated');
      }

      // Check for tenant context
      if (!profile?.tenant_id) {
        console.log('useRecentActivity: No tenant ID available yet');
        setActivities([]);
        return;
      }

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
        .eq('tenant_id', profile.tenant_id)  // Add tenant filtering
        .order('created_at', { ascending: false })
        .limit(limit);

      // Apply role-based filtering for managers
      if (profile.role === 'Manager' && profile.area_id) {
        // Managers see limited activity
        query = query.or(`resource_type.eq.areas,resource_type.eq.initiatives,resource_type.eq.users`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setActivities(data || []);
    } catch (err) {
      console.error('Error fetching recent activity:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch recent activity'));
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }, [supabase, profile, limit]);

  useEffect(() => {
    // Only fetch if we have authentication and tenant info
    if (session?.user && profile?.tenant_id) {
      fetchRecentActivity();
    } else if (!session?.user) {
      // No user session, set loading to false
      setLoading(false);
      setError(new Error('Not authenticated'));
    }
  }, [session?.user, profile?.tenant_id, fetchRecentActivity]);

  useEffect(() => {
    // Set up real-time subscription
    if (!profile?.tenant_id) return;

    const channel = supabase.channel('recent-activity')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_log',
          filter: `tenant_id=eq.${profile.tenant_id}`  // Filter by tenant
        },
        () => {
          fetchRecentActivity();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, profile?.tenant_id, fetchRecentActivity]);

  return {
    activities,
    loading,
    error,
    refetch: fetchRecentActivity
  };
}