"use client"

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import type { 
  TenantContext, 
  TenantStatistics, 
  TenantConfiguration,
  UserPermissions 
} from '@/lib/types/multi-tenant'
import type { Organization, Tenant, UserProfile } from '@/lib/types/database'
import { getUserPermissions } from '@/lib/types/multi-tenant'
import { useAuth } from '@/lib/auth-context'

interface TenantContextState extends TenantContext {
  statistics?: TenantStatistics
  configuration?: TenantConfiguration
  permissions: UserPermissions
  loading: boolean
  error: Error | null
  refreshContext: () => Promise<void>
}

const TenantContextContext = createContext<TenantContextState | null>(null)

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const { profile, session } = useAuth()
  const [context, setContext] = useState<TenantContextState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTenantContext = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      if (!profile?.tenant_id || !session?.user) {
        console.log('useTenantContext: No profile or session available')
        setContext(null)
        return
      }

      // Fetch tenant details
      const tenantResponse = await fetch(`/api/tenants/${profile.tenant_id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!tenantResponse.ok) {
        throw new Error('Failed to fetch tenant details')
      }

      const tenantData = await tenantResponse.json()

      // Fetch organization details
      const orgResponse = await fetch(`/api/organizations/${tenantData.organization_id}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      let organizationData = null
      if (orgResponse.ok) {
        organizationData = await orgResponse.json()
      }

      // Fetch tenant statistics
      const statsResponse = await fetch(`/api/tenants/${profile.tenant_id}/statistics`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      let statistics = null
      if (statsResponse.ok) {
        statistics = await statsResponse.json()
      }

      // Determine user permissions
      const isAreaManager = profile.role === 'Manager' && !!profile.area_id
      const managedAreaIds = isAreaManager && profile.area_id ? [profile.area_id] : []
      const permissions = getUserPermissions(profile.role as any, isAreaManager, managedAreaIds)

      // Build complete context
      const tenantContext: TenantContextState = {
        tenant_id: profile.tenant_id,
        organization_id: tenantData.organization_id,
        subdomain: tenantData.subdomain,
        user_profile: profile,
        organization: organizationData,
        tenant: tenantData,
        statistics,
        configuration: {
          tenant_id: profile.tenant_id,
          features: {
            objectives_enabled: true,
            quarters_enabled: true,
            audit_log_enabled: true,
            file_upload_enabled: true,
            ai_assistant_enabled: true
          },
          limits: {
            max_users: 100,
            max_areas: 50,
            max_initiatives: 500,
            max_file_size_mb: 10
          }
        },
        permissions,
        loading: false,
        error: null,
        refreshContext: fetchTenantContext
      }

      setContext(tenantContext)
      console.log('useTenantContext: Context loaded successfully', tenantContext)
    } catch (err) {
      console.error('Error fetching tenant context:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch tenant context'))
      setContext(null)
    } finally {
      setLoading(false)
    }
  }, [profile, session])

  useEffect(() => {
    fetchTenantContext()
  }, [fetchTenantContext])

  if (loading) {
    return <div>Loading tenant context...</div>
  }

  if (error) {
    return <div>Error loading tenant context: {error.message}</div>
  }

  if (!context) {
    return <div>No tenant context available</div>
  }

  return (
    <TenantContextContext.Provider value={context}>
      {children}
    </TenantContextContext.Provider>
  )
}

export function useTenantContext() {
  const context = useContext(TenantContextContext)
  
  if (!context) {
    // Return a default context for components that don't require it
    return {
      tenant_id: '',
      organization_id: '',
      subdomain: '',
      user_profile: null as any,
      permissions: {
        can_view_all_areas: false,
        can_edit_all_areas: false,
        can_manage_users: false,
        can_view_all_initiatives: false,
        can_edit_all_initiatives: false,
        can_manage_objectives: false,
        can_view_audit_log: false,
        can_manage_organization: false,
        can_manage_quarters: false,
        is_area_manager: false,
        managed_area_ids: []
      },
      loading: true,
      error: null,
      refreshContext: async () => {}
    }
  }
  
  return context
}

// Hook for checking specific permissions
export function usePermission(permission: keyof UserPermissions): boolean {
  const { permissions } = useTenantContext()
  return permissions[permission] || false
}

// Hook for checking if user can access a specific area
export function useCanAccessArea(areaId: string): boolean {
  const { user_profile, permissions } = useTenantContext()
  
  if (permissions.can_view_all_areas) {
    return true
  }
  
  if (user_profile?.area_id === areaId) {
    return true
  }
  
  return permissions.managed_area_ids.includes(areaId)
}

// Hook for checking if user can edit a specific initiative
export function useCanEditInitiative(initiativeAreaId: string): boolean {
  const { user_profile, permissions } = useTenantContext()
  
  if (permissions.can_edit_all_initiatives) {
    return true
  }
  
  if (permissions.is_area_manager && user_profile?.area_id === initiativeAreaId) {
    return true
  }
  
  return false
}