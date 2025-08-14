/**
 * SWR Configurations for Initiative Dashboard
 * Optimized caching strategies for different data types with tenant isolation
 */

import { SWRConfiguration } from 'swr'
import { createClient } from '@/utils/supabase/client'
import { secureFetch } from '@/lib/auth/secure-fetch'

export interface TenantAwareSWRConfig extends SWRConfiguration {
  tenantId?: string
  areaId?: string
}

/**
 * Base SWR configuration with error handling and retry logic
 */
export const baseSWRConfig: SWRConfiguration = {
  // Retry configuration
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  shouldRetryOnError: (error) => {
    // Don't retry on 4xx errors (client errors)
    if (error?.status >= 400 && error?.status < 500) {
      return false
    }
    return true
  },

  // Revalidation settings
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  revalidateIfStale: true,
  dedupingInterval: 5000, // 5 seconds

  // Performance settings
  loadingTimeout: 30000, // 30 seconds
  focusThrottleInterval: 5000, // 5 seconds

  // Error handling
  onError: (error, key) => {
    console.error(`SWR Error for key ${key}:`, error)
    // Could integrate with error tracking service here
  },

  // Success handling for debugging
  onSuccess: (data, key) => {
    console.debug(`SWR Success for key ${key}`, { dataLength: Array.isArray(data) ? data.length : 'non-array' })
  }
}

/**
 * Real-time data configuration - frequent updates
 */
export const realtimeSWRConfig: SWRConfiguration = {
  ...baseSWRConfig,
  refreshInterval: 30000, // 30 seconds
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 2000, // 2 seconds
}

/**
 * Static data configuration - infrequent updates
 */
export const staticSWRConfig: SWRConfiguration = {
  ...baseSWRConfig,
  refreshInterval: 300000, // 5 minutes
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: 60000, // 1 minute
}

/**
 * Critical data configuration - immediate updates
 */
export const criticalSWRConfig: SWRConfiguration = {
  ...baseSWRConfig,
  refreshInterval: 10000, // 10 seconds
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: 1000, // 1 second
  errorRetryCount: 5,
  errorRetryInterval: 500,
}

/**
 * Background data configuration - less critical updates
 */
export const backgroundSWRConfig: SWRConfiguration = {
  ...baseSWRConfig,
  refreshInterval: 120000, // 2 minutes
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: 30000, // 30 seconds
  errorRetryCount: 2,
}

/**
 * Initiative-specific SWR configuration
 */
export const initiativesSWRConfig: TenantAwareSWRConfig = {
  ...realtimeSWRConfig,
  refreshInterval: 15000, // 15 seconds for initiatives
  compare: (a, b) => {
    // Custom comparison for initiatives to detect real changes
    if (!a || !b) return false
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((item, index) => {
        const bItem = b[index]
        return item.id === bItem.id && 
               item.progress === bItem.progress && 
               item.status === bItem.status &&
               item.updated_at === bItem.updated_at
      })
    }
    return JSON.stringify(a) === JSON.stringify(b)
  }
}

/**
 * Objectives-specific SWR configuration
 */
export const objectivesSWRConfig: TenantAwareSWRConfig = {
  ...realtimeSWRConfig,
  refreshInterval: 20000, // 20 seconds for objectives
  compare: (a, b) => {
    if (!a || !b) return false
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((item, index) => {
        const bItem = b[index]
        return item.id === bItem.id && 
               item.progress === bItem.progress && 
               item.status === bItem.status
      })
    }
    return JSON.stringify(a) === JSON.stringify(b)
  }
}

/**
 * Activities-specific SWR configuration
 */
export const activitiesSWRConfig: TenantAwareSWRConfig = {
  ...criticalSWRConfig,
  refreshInterval: 10000, // 10 seconds for activities
  compare: (a, b) => {
    if (!a || !b) return false
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((item, index) => {
        const bItem = b[index]
        return item.id === bItem.id && 
               item.is_completed === bItem.is_completed && 
               item.assigned_to === bItem.assigned_to
      })
    }
    return JSON.stringify(a) === JSON.stringify(b)
  }
}

/**
 * Progress tracking SWR configuration
 */
export const progressSWRConfig: TenantAwareSWRConfig = {
  ...criticalSWRConfig,
  refreshInterval: 5000, // 5 seconds for progress
  dedupingInterval: 500, // 500ms
  compare: (a, b) => {
    if (!a || !b) return false
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((item, index) => {
        const bItem = b[index]
        return item.id === bItem.id && 
               item.completed_activities_count === bItem.completed_activities_count &&
               item.total_activities_count === bItem.total_activities_count
      })
    }
    return JSON.stringify(a) === JSON.stringify(b)
  }
}

/**
 * User profiles SWR configuration
 */
export const userProfilesSWRConfig: TenantAwareSWRConfig = {
  ...staticSWRConfig,
  refreshInterval: 600000, // 10 minutes for user profiles
  revalidateOnFocus: false
}

/**
 * Areas SWR configuration
 */
export const areasSWRConfig: TenantAwareSWRConfig = {
  ...staticSWRConfig,
  refreshInterval: 180000, // 3 minutes for areas
}

/**
 * Analytics SWR configuration
 */
export const analyticsSWRConfig: TenantAwareSWRConfig = {
  ...backgroundSWRConfig,
  refreshInterval: 60000, // 1 minute for analytics
  dedupingInterval: 15000, // 15 seconds
}

/**
 * Dashboard metrics SWR configuration
 */
export const dashboardMetricsSWRConfig: TenantAwareSWRConfig = {
  ...realtimeSWRConfig,
  refreshInterval: 30000, // 30 seconds for dashboard
  compare: (a, b) => {
    // Only rerender if key metrics actually changed
    if (!a || !b) return false
    const threshold = 0.1 // 0.1% threshold for numeric changes
    
    const keysToCompare = [
      'totalInitiatives', 'completedInitiatives', 'avgProgress',
      'totalObjectives', 'completedObjectives', 'totalActivities'
    ]
    
    return keysToCompare.every(key => {
      const aVal = a[key]
      const bVal = b[key]
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return Math.abs(aVal - bVal) <= threshold
      }
      return aVal === bVal
    })
  }
}

/**
 * Create tenant-aware cache key
 */
export function createTenantCacheKey(
  baseKey: string, 
  tenantId: string, 
  additionalParams: Record<string, any> = {}
): string {
  const params = new URLSearchParams({
    tenant_id: tenantId,
    ...Object.entries(additionalParams).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = String(value)
      }
      return acc
    }, {} as Record<string, string>)
  })
  
  return `${baseKey}?${params.toString()}`
}

/**
 * Create date-range aware cache key
 */
export function createDateRangeCacheKey(
  baseKey: string,
  tenantId: string,
  startDate?: Date,
  endDate?: Date,
  additionalParams: Record<string, any> = {}
): string {
  const params: Record<string, any> = {
    tenant_id: tenantId,
    ...additionalParams
  }

  if (startDate) {
    params.start_date = startDate.toISOString().split('T')[0]
  }
  if (endDate) {
    params.end_date = endDate.toISOString().split('T')[0]
  }

  return createTenantCacheKey(baseKey, tenantId, params)
}

/**
 * Fetcher function with tenant isolation and error handling
 */
export const createTenantAwareFetcher = (tenantId: string) => {
  const supabase = createClient()
  
  return async (key: string) => {
    try {
      // Parse the key to extract endpoint and params
      const [endpoint, queryString] = key.split('?')
      const params = new URLSearchParams(queryString)
      
      // Ensure tenant isolation
      if (!params.get('tenant_id')) {
        params.set('tenant_id', tenantId)
      }
      
      // Verify user has access to this tenant
      const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('tenant_id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single()
      
      if (userProfile?.tenant_id !== tenantId) {
        throw new Error('Unauthorized: Tenant access denied')
      }
      
      // Make the API request using secure fetch
      const url = `${endpoint}?${params.toString()}`
      const response = await secureFetch(url, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as Error & { status: number }
        error.status = response.status
        throw error
      }
      
      const data = await response.json()
      
      // Add metadata for debugging
      data._cacheMetadata = {
        cachedAt: new Date().toISOString(),
        tenantId,
        endpoint,
        params: Object.fromEntries(params.entries())
      }
      
      return data
    } catch (error) {
      console.error('Tenant-aware fetcher error:', error)
      throw error
    }
  }
}

/**
 * Optimistic update helper for mutations
 */
export function createOptimisticUpdate<T>(
  currentData: T[] | undefined,
  newItem: Partial<T> & { id: string },
  operation: 'create' | 'update' | 'delete'
): T[] | undefined {
  if (!currentData) return undefined
  
  switch (operation) {
    case 'create':
      return [...currentData, newItem as T]
      
    case 'update':
      return currentData.map(item => 
        (item as any).id === newItem.id 
          ? { ...item, ...newItem } 
          : item
      )
      
    case 'delete':
      return currentData.filter(item => (item as any).id !== newItem.id)
      
    default:
      return currentData
  }
}

/**
 * Cache invalidation patterns
 */
export const cacheInvalidationPatterns = {
  // Invalidate all initiative-related cache when an initiative changes
  initiativeChanged: (tenantId: string, initiativeId: string) => [
    `initiatives?tenant_id=${tenantId}`,
    `initiatives/${initiativeId}?tenant_id=${tenantId}`,
    `progress-tracking?tenant_id=${tenantId}&initiative_id=${initiativeId}`,
    `activities?tenant_id=${tenantId}&initiative_id=${initiativeId}`,
    `dashboard-metrics?tenant_id=${tenantId}`
  ],

  // Invalidate objective-related cache
  objectiveChanged: (tenantId: string, objectiveId: string, areaId?: string) => [
    `objectives?tenant_id=${tenantId}`,
    `objectives/${objectiveId}?tenant_id=${tenantId}`,
    areaId ? `objectives?tenant_id=${tenantId}&area_id=${areaId}` : null,
    `dashboard-metrics?tenant_id=${tenantId}`
  ].filter(Boolean),

  // Invalidate activity-related cache
  activityChanged: (tenantId: string, activityId: string, initiativeId: string) => [
    `activities?tenant_id=${tenantId}`,
    `activities?tenant_id=${tenantId}&initiative_id=${initiativeId}`,
    `progress-tracking?tenant_id=${tenantId}&initiative_id=${initiativeId}`,
    `initiatives?tenant_id=${tenantId}`,
    `dashboard-metrics?tenant_id=${tenantId}`
  ],

  // Invalidate area-related cache
  areaChanged: (tenantId: string, areaId: string) => [
    `areas?tenant_id=${tenantId}`,
    `areas/${areaId}?tenant_id=${tenantId}`,
    `initiatives?tenant_id=${tenantId}&area_id=${areaId}`,
    `objectives?tenant_id=${tenantId}&area_id=${areaId}`,
    `dashboard-metrics?tenant_id=${tenantId}`
  ],

  // Invalidate all tenant data
  tenantDataChanged: (tenantId: string) => [
    `initiatives?tenant_id=${tenantId}`,
    `objectives?tenant_id=${tenantId}`,
    `activities?tenant_id=${tenantId}`,
    `areas?tenant_id=${tenantId}`,
    `progress-tracking?tenant_id=${tenantId}`,
    `dashboard-metrics?tenant_id=${tenantId}`,
    `analytics?tenant_id=${tenantId}`
  ]
}

export default {
  baseSWRConfig,
  realtimeSWRConfig,
  staticSWRConfig,
  criticalSWRConfig,
  backgroundSWRConfig,
  initiativesSWRConfig,
  objectivesSWRConfig,
  activitiesSWRConfig,
  progressSWRConfig,
  userProfilesSWRConfig,
  areasSWRConfig,
  analyticsSWRConfig,
  dashboardMetricsSWRConfig,
  createTenantCacheKey,
  createDateRangeCacheKey,
  createTenantAwareFetcher,
  createOptimisticUpdate,
  cacheInvalidationPatterns
}