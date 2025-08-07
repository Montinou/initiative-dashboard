'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth, useTenantId } from '@/lib/auth-context'
import { getThemeForTenant, type TenantTheme } from '@/lib/theme-config'
import { createClient } from '@/utils/supabase/client'

// Tenant information interface
interface TenantInfo {
  id: string
  name: string
  domain?: string
  theme: TenantTheme
  settings?: Record<string, any>
}

// Default tenant info when not available
const DEFAULT_TENANT: TenantInfo = {
  id: 'default',
  name: 'Sistema',
  theme: getThemeForTenant('default')
}

// Tenant context value interface
interface TenantContextValue {
  tenant: TenantInfo
  tenantId: string | null
  isLoading: boolean
  error: string | null
  refreshTenant: () => Promise<void>
  validateTenantAccess: (resourceTenantId: string) => boolean
  getTenantTheme: () => TenantTheme
}

/**
 * Hook for comprehensive tenant management
 * Provides tenant information, validation, and theme integration
 */
export function useTenant(): TenantContextValue {
  const { user, profile } = useAuth()
  const tenantIdFromAuth = useTenantId()
  const [tenant, setTenant] = useState<TenantInfo>(DEFAULT_TENANT)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch tenant information from database
  const fetchTenantInfo = useCallback(async (tenantId: string) => {
    try {
      setIsLoading(true)
      setError(null)

      // For now, we'll use the tenant_id to determine the tenant name and theme
      // In a real implementation, this would fetch from a tenants table
      let tenantInfo: TenantInfo

      switch (tenantId) {
        case 'siga-turismo':
          tenantInfo = {
            id: tenantId,
            name: 'SIGA Turismo',
            domain: 'siga.com',
            theme: getThemeForTenant(tenantId),
            settings: {
              industry: 'tourism',
              locale: 'es-ES',
              timezone: 'America/Mexico_City'
            }
          }
          break
        
        case 'fema-electricidad':
          tenantInfo = {
            id: tenantId,
            name: 'FEMA Electricidad',
            domain: 'fema.com',
            theme: getThemeForTenant(tenantId),
            settings: {
              industry: 'electrical',
              locale: 'es-ES',
              timezone: 'America/Mexico_City'
            }
          }
          break
        
        default:
          // For unknown tenants, try to fetch from database
          // This would be a real database query in production
          console.log(`🔍 useTenant: Fetching tenant info for: ${tenantId}`)
          
          tenantInfo = {
            id: tenantId,
            name: tenantId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            theme: getThemeForTenant(tenantId),
            settings: {}
          }
      }

      setTenant(tenantInfo)
      console.log(`✅ useTenant: Tenant loaded:`, tenantInfo.name)
    } catch (err) {
      console.error('❌ useTenant: Error fetching tenant info:', err)
      setError('Error al cargar información del tenant')
      setTenant(DEFAULT_TENANT)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initialize tenant when auth changes
  useEffect(() => {
    if (tenantIdFromAuth) {
      fetchTenantInfo(tenantIdFromAuth)
    } else {
      // No tenant ID available, use default
      setTenant(DEFAULT_TENANT)
      setIsLoading(false)
    }
  }, [tenantIdFromAuth, fetchTenantInfo])

  // Refresh tenant information
  const refreshTenant = useCallback(async () => {
    if (tenantIdFromAuth) {
      await fetchTenantInfo(tenantIdFromAuth)
    }
  }, [tenantIdFromAuth, fetchTenantInfo])

  // Validate if user has access to a resource based on tenant
  const validateTenantAccess = useCallback((resourceTenantId: string): boolean => {
    if (!tenantIdFromAuth) {
      console.warn('⚠️ useTenant: No tenant ID available for validation')
      return false
    }

    // System admins can access all tenants
    if (profile?.is_system_admin) {
      return true
    }

    // Regular users can only access their own tenant's resources
    const hasAccess = tenantIdFromAuth === resourceTenantId
    
    if (!hasAccess) {
      console.warn(`🚫 useTenant: Access denied. User tenant: ${tenantIdFromAuth}, Resource tenant: ${resourceTenantId}`)
    }

    return hasAccess
  }, [tenantIdFromAuth, profile])

  // Get the current tenant's theme
  const getTenantTheme = useCallback((): TenantTheme => {
    return tenant.theme
  }, [tenant])

  // Log tenant changes in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🏢 useTenant: Current tenant:', {
        id: tenant.id,
        name: tenant.name,
        theme: tenant.theme.name
      })
    }
  }, [tenant])

  return {
    tenant,
    tenantId: tenantIdFromAuth,
    isLoading,
    error,
    refreshTenant,
    validateTenantAccess,
    getTenantTheme
  }
}

/**
 * Hook for tenant-aware data fetching
 * Automatically adds tenant filters to queries
 */
export function useTenantData() {
  const { tenantId, validateTenantAccess } = useTenant()
  const supabase = createClient()

  // Create a tenant-filtered query
  const createTenantQuery = useCallback((table: string) => {
    if (!tenantId) {
      throw new Error('No tenant ID available for query')
    }

    return supabase.from(table).eq('tenant_id', tenantId)
  }, [tenantId, supabase])

  // Fetch data with automatic tenant filtering
  const fetchWithTenant = useCallback(async <T = any>(
    table: string,
    select: string = '*',
    additionalFilters?: Record<string, any>
  ): Promise<{ data: T[] | null; error: any }> => {
    try {
      let query = createTenantQuery(table).select(select)

      // Apply additional filters if provided
      if (additionalFilters) {
        Object.entries(additionalFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            query = query.eq(key, value)
          }
        })
      }

      const result = await query
      return result
    } catch (error) {
      console.error(`❌ useTenantData: Error fetching from ${table}:`, error)
      return { data: null, error }
    }
  }, [createTenantQuery])

  // Insert data with automatic tenant ID
  const insertWithTenant = useCallback(async <T = any>(
    table: string,
    data: Partial<T> | Partial<T>[]
  ): Promise<{ data: T[] | null; error: any }> => {
    if (!tenantId) {
      return { data: null, error: new Error('No tenant ID available') }
    }

    try {
      // Add tenant_id to data
      const dataWithTenant = Array.isArray(data)
        ? data.map(item => ({ ...item, tenant_id: tenantId }))
        : { ...data, tenant_id: tenantId }

      const result = await supabase
        .from(table)
        .insert(dataWithTenant)
        .select()

      return result
    } catch (error) {
      console.error(`❌ useTenantData: Error inserting into ${table}:`, error)
      return { data: null, error }
    }
  }, [tenantId, supabase])

  // Update data with tenant validation
  const updateWithTenant = useCallback(async <T = any>(
    table: string,
    id: string | number,
    updates: Partial<T>
  ): Promise<{ data: T | null; error: any }> => {
    if (!tenantId) {
      return { data: null, error: new Error('No tenant ID available') }
    }

    try {
      const result = await supabase
        .from(table)
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId) // Ensure we only update within our tenant
        .select()
        .single()

      return result
    } catch (error) {
      console.error(`❌ useTenantData: Error updating ${table}:`, error)
      return { data: null, error }
    }
  }, [tenantId, supabase])

  // Delete data with tenant validation
  const deleteWithTenant = useCallback(async (
    table: string,
    id: string | number
  ): Promise<{ error: any }> => {
    if (!tenantId) {
      return { error: new Error('No tenant ID available') }
    }

    try {
      const result = await supabase
        .from(table)
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId) // Ensure we only delete within our tenant

      return result
    } catch (error) {
      console.error(`❌ useTenantData: Error deleting from ${table}:`, error)
      return { error }
    }
  }, [tenantId, supabase])

  return {
    tenantId,
    validateTenantAccess,
    fetchWithTenant,
    insertWithTenant,
    updateWithTenant,
    deleteWithTenant,
    createTenantQuery
  }
}

/**
 * Hook for tenant-specific settings and configuration
 */
export function useTenantSettings() {
  const { tenant } = useTenant()

  // Get a specific setting value
  const getSetting = useCallback((key: string, defaultValue?: any) => {
    return tenant.settings?.[key] ?? defaultValue
  }, [tenant])

  // Check if a feature is enabled for the tenant
  const isFeatureEnabled = useCallback((feature: string): boolean => {
    const features = tenant.settings?.features as string[] | undefined
    return features?.includes(feature) ?? false
  }, [tenant])

  // Get tenant's locale
  const getLocale = useCallback((): string => {
    return getSetting('locale', 'es-ES')
  }, [getSetting])

  // Get tenant's timezone
  const getTimezone = useCallback((): string => {
    return getSetting('timezone', 'UTC')
  }, [getSetting])

  return {
    settings: tenant.settings || {},
    getSetting,
    isFeatureEnabled,
    getLocale,
    getTimezone
  }
}