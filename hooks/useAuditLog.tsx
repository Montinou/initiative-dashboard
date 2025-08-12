"use client"

import { useState, useEffect, useCallback } from 'react'
import type { AuditLog, UserProfile } from '@/lib/types/database'
import { useAuth } from '@/lib/auth-context'
import { useTenantContext } from './useTenantContext'

// Extended audit log entry with user details
export interface AuditLogEntry extends AuditLog {
  user?: {
    id: string
    full_name: string | null
    email: string
  }
  entity_name?: string
  formatted_changes?: Record<string, {
    old_value: any
    new_value: any
  }>
}

interface UseAuditLogParams {
  entity_type?: 'organization' | 'tenant' | 'area' | 'objective' | 'initiative' | 'activity' | 'user_profile'
  entity_id?: string
  user_id?: string
  action?: 'create' | 'update' | 'delete'
  date_from?: string
  date_to?: string
  limit?: number
  offset?: number
}

export function useAuditLog(params: UseAuditLogParams = {}) {
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const { profile, session } = useAuth()
  const { permissions } = useTenantContext()

  const fetchAuditLog = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Check permissions
      if (!permissions.can_view_audit_log && profile?.role !== 'Executive' && profile?.role !== 'Admin') {
        console.log('useAuditLog: User does not have permission to view audit log')
        setEntries([])
        return
      }

      if (!profile?.tenant_id || !session?.user) {
        console.log('useAuditLog: No tenant or session context')
        setEntries([])
        return
      }

      // Build query params
      const queryParams = new URLSearchParams({
        tenant_id: profile.tenant_id,
        limit: String(params.limit || 50),
        offset: String(params.offset || 0)
      })

      // Add optional filters
      if (params.entity_type) {
        queryParams.append('entity_type', params.entity_type)
      }
      if (params.entity_id) {
        queryParams.append('entity_id', params.entity_id)
      }
      if (params.user_id) {
        queryParams.append('user_id', params.user_id)
      }
      if (params.action) {
        queryParams.append('action', params.action)
      }
      if (params.date_from) {
        queryParams.append('date_from', params.date_from)
      }
      if (params.date_to) {
        queryParams.append('date_to', params.date_to)
      }

      const response = await fetch(`/api/audit-log?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch audit log: ${response.status}`)
      }

      const data = await response.json()
      
      // Format entries with additional details
      const formattedEntries: AuditLogEntry[] = (data.entries || []).map((entry: any) => ({
        ...entry,
        user: entry.user_profile || entry.user,
        entity_name: getEntityName(entry.entity_type, entry.entity_id),
        formatted_changes: formatChanges(entry.changes)
      }))

      setEntries(formattedEntries)
      setHasMore(data.has_more || false)
      console.log('useAuditLog: Fetched', formattedEntries.length, 'audit log entries')
    } catch (err) {
      console.error('Error fetching audit log:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch audit log'))
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [profile, session, permissions, params])

  // Log a new audit entry
  const logAction = async (entry: {
    entity_type: string
    entity_id: string
    action: 'create' | 'update' | 'delete'
    changes?: Record<string, any>
    metadata?: Record<string, any>
  }) => {
    try {
      if (!profile?.tenant_id || !session?.user) {
        throw new Error('No tenant or session context')
      }

      const requestBody = {
        ...entry,
        tenant_id: profile.tenant_id,
        user_id: profile.id,
        ip_address: 'unknown', // This would be set by the API
        user_agent: navigator.userAgent
      }

      const response = await fetch('/api/audit-log', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to log action')
      }

      const newEntry = await response.json()
      
      // Add to local state
      setEntries(prev => [newEntry, ...prev])
      
      return newEntry
    } catch (err) {
      console.error('Error logging action:', err)
      throw err
    }
  }

  // Export audit log to CSV
  const exportToCSV = async () => {
    try {
      if (!session?.user) {
        throw new Error('No session available')
      }

      const queryParams = new URLSearchParams({
        tenant_id: profile?.tenant_id || '',
        format: 'csv'
      })

      // Add same filters as fetch
      if (params.entity_type) queryParams.append('entity_type', params.entity_type)
      if (params.entity_id) queryParams.append('entity_id', params.entity_id)
      if (params.user_id) queryParams.append('user_id', params.user_id)
      if (params.action) queryParams.append('action', params.action)
      if (params.date_from) queryParams.append('date_from', params.date_from)
      if (params.date_to) queryParams.append('date_to', params.date_to)

      const response = await fetch(`/api/audit-log/export?${queryParams}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to export audit log')
      }

      // Download the CSV file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error exporting audit log:', err)
      throw err
    }
  }

  // Get audit trail for specific entity
  const getEntityAuditTrail = async (entityType: string, entityId: string) => {
    try {
      if (!session?.user) {
        throw new Error('No session available')
      }

      const response = await fetch(`/api/audit-log/${entityType}/${entityId}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch entity audit trail')
      }

      const data = await response.json()
      return data.entries || []
    } catch (err) {
      console.error('Error fetching entity audit trail:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchAuditLog()
  }, [fetchAuditLog])

  return {
    entries,
    loading,
    error,
    hasMore,
    refetch: fetchAuditLog,
    logAction,
    exportToCSV,
    getEntityAuditTrail
  }
}

// Helper function to get entity display name
function getEntityName(entityType: string, entityId: string): string {
  // This would ideally fetch from cache or API
  return `${entityType} (${entityId.slice(0, 8)}...)`
}

// Helper function to format changes for display
function formatChanges(changes?: Record<string, any>): Record<string, { old_value: any; new_value: any }> {
  if (!changes) return {}
  
  const formatted: Record<string, { old_value: any; new_value: any }> = {}
  
  for (const [key, value] of Object.entries(changes)) {
    if (typeof value === 'object' && value !== null && 'old' in value && 'new' in value) {
      formatted[key] = {
        old_value: value.old,
        new_value: value.new
      }
    }
  }
  
  return formatted
}

// Hook for real-time audit log monitoring
export function useAuditLogMonitor(entityType?: string, entityId?: string) {
  const [latestEntry, setLatestEntry] = useState<AuditLogEntry | null>(null)
  const { profile, session } = useAuth()

  useEffect(() => {
    if (!profile?.tenant_id || !session?.user) return

    // Set up polling for real-time updates (could be replaced with WebSocket)
    const interval = setInterval(async () => {
      try {
        const queryParams = new URLSearchParams({
          tenant_id: profile.tenant_id,
          limit: '1'
        })

        if (entityType) queryParams.append('entity_type', entityType)
        if (entityId) queryParams.append('entity_id', entityId)

        const response = await fetch(`/api/audit-log?${queryParams}`, {
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        })

        if (response.ok) {
          const data = await response.json()
          if (data.entries && data.entries.length > 0) {
            setLatestEntry(data.entries[0])
          }
        }
      } catch (err) {
        console.error('Error monitoring audit log:', err)
      }
    }, 30000) // Poll every 30 seconds

    return () => clearInterval(interval)
  }, [profile, session, entityType, entityId])

  return latestEntry
}