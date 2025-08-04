/**
 * Stratix KPI Integration Layer
 * 
 * Integrates the new AI-optimized KPI data service with existing KPI APIs
 * and caching infrastructure for maximum performance and consistency.
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

import { stratixKPIDataService, AIKPIData } from './kpi-data-service'
import { kpiCache } from '@/lib/cache/kpi-cache'
import { useUserProfile } from '@/hooks/useUserProfile'

// ===================================================================================
// INTEGRATION INTERFACE
// ===================================================================================

export interface KPIIntegrationService {
  getCachedKPIForAI: (tenantId: string, userRole: string, userAreaId?: string, timeRange?: string) => Promise<AIKPIData>
  invalidateKPICache: (tenantId: string, userRole?: string) => Promise<void>
  prefetchKPIData: (tenantId: string, userRole: string, userAreaId?: string) => Promise<void>
  getKPIWithFallback: (tenantId: string, userRole: string, userAreaId?: string, timeRange?: string) => Promise<AIKPIData>
}

// ===================================================================================
// STRATIX KPI INTEGRATION SERVICE
// ===================================================================================

class StratixKPIIntegrationService implements KPIIntegrationService {
  
  /**
   * Get AI-optimized KPI data with integrated caching
   */
  async getCachedKPIForAI(
    tenantId: string, 
    userRole: string, 
    userAreaId?: string, 
    timeRange: string = 'current'
  ): Promise<AIKPIData> {
    
    // Build cache key
    const cacheKey = this.buildCacheKey(tenantId, userRole, userAreaId, timeRange)
    
    try {
      console.log('🔄 Checking KPI cache for AI data:', cacheKey)
      
      // Try to get from cache first
      const cachedData = await kpiCache.get('AI_KPI_DATA', {
        tenantId,
        userId: '', // We don't have specific user ID here
        userRole,
        areaId: userAreaId,
        filters: { time_range: timeRange }
      })
      
      if (cachedData) {
        console.log('✅ KPI AI data served from cache')
        return cachedData as AIKPIData
      }
      
    } catch (cacheError) {
      console.warn('⚠️ Cache read failed, proceeding with fresh data:', cacheError)
    }
    
    // Get fresh data
    const freshData = await stratixKPIDataService.getKPIForAI(tenantId, userRole, userAreaId, timeRange)
    
    // Cache the fresh data
    try {
      await kpiCache.set('AI_KPI_DATA', {
        tenantId,
        userId: '',
        userRole,
        areaId: userAreaId,
        filters: { time_range: timeRange }
      }, freshData)
      console.log('💾 Fresh KPI AI data cached successfully')
    } catch (cacheError) {
      console.warn('⚠️ Failed to cache fresh KPI data:', cacheError)
    }
    
    return freshData
  }
  
  /**
   * Invalidate KPI cache for a tenant/role
   */
  async invalidateKPICache(tenantId: string, userRole?: string): Promise<void> {
    try {
      console.log('🗑️ Invalidating KPI cache for tenant:', tenantId, userRole || 'all roles')
      
      // Invalidate all KPI cache entries for this tenant using pattern matching
      const patterns = [
        `AI_KPI_DATA:${tenantId}:*`, // All tenant data
        `KPI_CACHE:${tenantId}:*`,   // Cached KPI data
        `USER_KPI:${tenantId}:*`,    // User-specific KPI data
        `AREA_KPI:${tenantId}:*`     // Area-specific KPI data
      ]
      
      if (userRole) {
        patterns.push(`AI_KPI_DATA:${tenantId}:*:${userRole}:*`)
        patterns.push(`ROLE_KPI:${tenantId}:${userRole}:*`)
      }
      
      // Use pattern-based deletion for efficient cache invalidation
      for (const pattern of patterns) {
        await kpiCache.deletePattern(pattern)
      }
      
      // Also invalidate related caches
      await Promise.all([
        kpiCache.deletePattern(`ANALYTICS:${tenantId}:*`),
        kpiCache.deletePattern(`TRENDS:${tenantId}:*`),
        kpiCache.deletePattern(`INSIGHTS:${tenantId}:*`)
      ])
      
      console.log('✅ KPI cache invalidated successfully')
    } catch (error) {
      console.error('❌ Failed to invalidate KPI cache:', error)
      throw error
    }
  }
  
  /**
   * Prefetch KPI data for faster AI responses
   */
  async prefetchKPIData(tenantId: string, userRole: string, userAreaId?: string): Promise<void> {
    try {
      console.log('⏳ Prefetching KPI data for:', userRole, userAreaId || 'all areas')
      
      // Prefetch for different time ranges
      const timeRanges = ['current', 'week', 'month']
      
      const prefetchPromises = timeRanges.map(async (timeRange) => {
        try {
          await this.getCachedKPIForAI(tenantId, userRole, userAreaId, timeRange)
          console.log(`✅ Prefetched KPI data for ${timeRange}`)
        } catch (error) {
          console.warn(`⚠️ Failed to prefetch for ${timeRange}:`, error)
        }
      })
      
      await Promise.all(prefetchPromises)
      console.log('✅ KPI data prefetching completed')
      
    } catch (error) {
      console.error('❌ KPI prefetching failed:', error)
      throw error
    }
  }
  
  /**
   * Get KPI data with fallback strategies
   */
  async getKPIWithFallback(
    tenantId: string, 
    userRole: string, 
    userAreaId?: string, 
    timeRange: string = 'current'
  ): Promise<AIKPIData> {
    
    try {
      // First attempt: cached data
      return await this.getCachedKPIForAI(tenantId, userRole, userAreaId, timeRange)
      
    } catch (primaryError) {
      console.warn('⚠️ Primary KPI data fetch failed, trying fallbacks:', primaryError)
      
      try {
        // Fallback 1: Different time range
        if (timeRange !== 'current') {
          console.log('🔄 Fallback: trying current time range')
          return await this.getCachedKPIForAI(tenantId, userRole, userAreaId, 'current')
        }
        
        // Fallback 2: Broader area scope (if user has limited access)
        if (userAreaId && userRole === 'Manager') {
          console.log('🔄 Fallback: trying without area restriction')
          return await this.getCachedKPIForAI(tenantId, userRole, undefined, timeRange)
        }
        
        // Fallback 3: Basic role data
        if (userRole !== 'Analyst') {
          console.log('🔄 Fallback: trying with Analyst role permissions')
          return await this.getCachedKPIForAI(tenantId, 'Analyst', userAreaId, timeRange)
        }
        
        throw primaryError
        
      } catch (fallbackError) {
        console.error('❌ All KPI fallback strategies failed:', fallbackError)
        
        // Final fallback: minimal data structure
        return this.createMinimalKPIData(tenantId, userRole)
      }
    }
  }
  
  // ===================================================================================
  // PRIVATE HELPER METHODS
  // ===================================================================================
  
  private buildCacheKey(tenantId: string, userRole: string, userAreaId?: string, timeRange?: string): string {
    return `kpi_ai_${tenantId}_${userRole}_${userAreaId || 'all'}_${timeRange || 'current'}`
  }
  
  private createMinimalKPIData(tenantId: string, userRole: string): AIKPIData {
    return {
      summary: {
        performance_score: 50,
        risk_level: 'medium',
        efficiency_rating: 50,
        trend_direction: 'stable',
        overall_health: 'concerning'
      },
      categories: {
        performance: [],
        financial: [],
        operational: [],
        strategic: [],
        risk: []
      },
      trends: {
        initiatives_velocity: 0,
        completion_rate_trend: 0,
        budget_efficiency_trend: 0,
        risk_escalation_rate: 0
      },
      context: {
        company_stage: 'mature',
        primary_focus: ['data recovery'],
        current_challenges: ['data unavailable'],
        success_patterns: []
      },
      metadata: {
        data_freshness: new Date().toISOString(),
        user_role: userRole,
        time_range: 'fallback',
        confidence_level: 0.1
      }
    }
  }
}

// ===================================================================================
// INTEGRATION HOOKS FOR REACT COMPONENTS
// ===================================================================================

/**
 * React hook for accessing integrated KPI data in components
 */
export function useKPIIntegration() {
  const { userProfile } = useUserProfile()
  
  const getAIKPIData = async (timeRange: string = 'current') => {
    if (!userProfile?.tenant_id || !userProfile?.role) {
      throw new Error('User profile not available')
    }
    
    return await kpiIntegrationService.getCachedKPIForAI(
      userProfile.tenant_id,
      userProfile.role,
      userProfile.area_id,
      timeRange
    )
  }
  
  const prefetchData = async () => {
    if (!userProfile?.tenant_id || !userProfile?.role) {
      return
    }
    
    await kpiIntegrationService.prefetchKPIData(
      userProfile.tenant_id,
      userProfile.role,
      userProfile.area_id
    )
  }
  
  const invalidateCache = async () => {
    if (!userProfile?.tenant_id) {
      return
    }
    
    await kpiIntegrationService.invalidateKPICache(
      userProfile.tenant_id,
      userProfile.role
    )
  }
  
  return {
    getAIKPIData,
    prefetchData,
    invalidateCache,
    isReady: !!(userProfile?.tenant_id && userProfile?.role)
  }
}

// ===================================================================================
// PERFORMANCE OPTIMIZATION UTILITIES
// ===================================================================================

/**
 * Background service for automatic KPI data prefetching
 */
export class KPIBackgroundService {
  private prefetchInterval: NodeJS.Timeout | null = null
  private isRunning = false
  
  start(intervalMs: number = 300000) { // Default: 5 minutes
    if (this.isRunning) {
      console.warn('⚠️ KPI background service already running')
      return
    }
    
    console.log('🚀 Starting KPI background prefetch service')
    this.isRunning = true
    
    this.prefetchInterval = setInterval(async () => {
      try {
        console.log('🔄 Background KPI prefetch cycle...')
        
        // Get active tenants with recent activity
        const activeTenants = await this.getActiveTenantsWithUsers()
        
        for (const { tenantId, users } of activeTenants) {
          console.log(`📊 Prefetching KPI data for tenant: ${tenantId} (${users.length} users)`)
          
          // Prefetch data for each active user
          for (const user of users) {
            try {
              await kpiIntegrationService.getAIKPIData(
                user.id,
                tenantId,
                user.role,
                user.areaId,
                { skipCache: false, prefetch: true }
              )
              
              // Small delay to prevent overwhelming the system
              await new Promise(resolve => setTimeout(resolve, 100))
            } catch (userError) {
              console.warn(`⚠️ Failed to prefetch for user ${user.id}:`, userError)
            }
          }
        }
        
        console.log('✅ Background KPI prefetch completed')
      } catch (error) {
        console.error('❌ Background prefetch failed:', error)
      }
    }, intervalMs)
  }
  
  stop() {
    if (this.prefetchInterval) {
      clearInterval(this.prefetchInterval)
      this.prefetchInterval = null
    }
    this.isRunning = false
    console.log('⏹️ KPI background service stopped')
  }
  
  isActive(): boolean {
    return this.isRunning
  }
  
  /**
   * Get active tenants with their users for prefetching
   */
  private async getActiveTenantsWithUsers(): Promise<Array<{
    tenantId: string;
    users: Array<{
      id: string;
      role: string;
      areaId?: string;
    }>;
  }>> {
    try {
      // Get recently active tenants (users who logged in within last 24 hours)
      const response = await fetch('/api/analytics/active-tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          timeWindow: '24h',
          includeUsers: true,
          limit: 10 // Limit to top 10 most active tenants
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to fetch active tenants: ${response.statusText}`)
      }
      
      const { data } = await response.json()
      return data.tenants || []
    } catch (error) {
      console.error('❌ Failed to get active tenants:', error)
      return []
    }
  }
}

// ===================================================================================
// EXPORTS
// ===================================================================================

// Export singleton instance
export const kpiIntegrationService = new StratixKPIIntegrationService()

// Export background service instance
export const kpiBackgroundService = new KPIBackgroundService()

// Auto-start background service in production
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  // Only start in browser and production
  setTimeout(() => {
    kpiBackgroundService.start()
  }, 10000) // Start after 10 seconds
}