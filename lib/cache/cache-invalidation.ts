/**
 * Cache Invalidation Strategies
 * Smart cache invalidation for maintaining data consistency across the application
 */

import { mutate } from 'swr'
import { cacheInvalidationPatterns } from './swr-configurations'

export interface CacheInvalidationOptions {
  tenantId: string
  revalidate?: boolean
  rollbackOnError?: boolean
  optimisticData?: any
}

export interface CacheEntry {
  key: string
  data: any
  timestamp: number
}

export class CacheInvalidation {
  private static pendingInvalidations = new Map<string, NodeJS.Timeout>()
  private static optimisticUpdates = new Map<string, CacheEntry>()

  /**
   * Invalidate cache for initiative-related changes
   */
  static async invalidateInitiativeCache(
    initiativeId: string,
    options: CacheInvalidationOptions
  ): Promise<void> {
    const patterns = cacheInvalidationPatterns.initiativeChanged(options.tenantId, initiativeId)
    await this.invalidateMultiple(patterns, options)
  }

  /**
   * Invalidate cache for objective-related changes
   */
  static async invalidateObjectiveCache(
    objectiveId: string,
    options: CacheInvalidationOptions & { areaId?: string }
  ): Promise<void> {
    const patterns = cacheInvalidationPatterns.objectiveChanged(
      options.tenantId, 
      objectiveId, 
      options.areaId
    )
    await this.invalidateMultiple(patterns, options)
  }

  /**
   * Invalidate cache for activity-related changes
   */
  static async invalidateActivityCache(
    activityId: string,
    initiativeId: string,
    options: CacheInvalidationOptions
  ): Promise<void> {
    const patterns = cacheInvalidationPatterns.activityChanged(
      options.tenantId, 
      activityId, 
      initiativeId
    )
    await this.invalidateMultiple(patterns, options)
  }

  /**
   * Invalidate cache for area-related changes
   */
  static async invalidateAreaCache(
    areaId: string,
    options: CacheInvalidationOptions
  ): Promise<void> {
    const patterns = cacheInvalidationPatterns.areaChanged(options.tenantId, areaId)
    await this.invalidateMultiple(patterns, options)
  }

  /**
   * Invalidate entire tenant cache
   */
  static async invalidateTenantCache(options: CacheInvalidationOptions): Promise<void> {
    const patterns = cacheInvalidationPatterns.tenantDataChanged(options.tenantId)
    await this.invalidateMultiple(patterns, options)
  }

  /**
   * Smart invalidation - only invalidate if data actually changed
   */
  static async smartInvalidate(
    cacheKey: string,
    newData: any,
    options: CacheInvalidationOptions
  ): Promise<void> {
    try {
      // Get current cache data
      const currentData = this.getCachedData(cacheKey)
      
      // Compare data to see if invalidation is needed
      if (this.hasDataChanged(currentData, newData)) {
        await this.invalidate(cacheKey, options)
      } else {
        console.debug(`No changes detected for ${cacheKey}, skipping invalidation`)
      }
    } catch (error) {
      console.error('Smart invalidation error:', error)
      // Fallback to regular invalidation
      await this.invalidate(cacheKey, options)
    }
  }

  /**
   * Debounced invalidation - prevent excessive invalidations
   */
  static debouncedInvalidate(
    cacheKey: string,
    options: CacheInvalidationOptions,
    delay: number = 1000
  ): void {
    // Clear existing timeout
    const existingTimeout = this.pendingInvalidations.get(cacheKey)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    // Set new timeout
    const timeout = setTimeout(async () => {
      await this.invalidate(cacheKey, options)
      this.pendingInvalidations.delete(cacheKey)
    }, delay)

    this.pendingInvalidations.set(cacheKey, timeout)
  }

  /**
   * Optimistic update with rollback capability
   */
  static async optimisticUpdate(
    cacheKey: string,
    optimisticData: any,
    updateFunction: () => Promise<any>,
    options: CacheInvalidationOptions
  ): Promise<any> {
    // Store original data for potential rollback
    const originalData = this.getCachedData(cacheKey)
    this.optimisticUpdates.set(cacheKey, {
      key: cacheKey,
      data: originalData,
      timestamp: Date.now()
    })

    try {
      // Apply optimistic update
      await mutate(cacheKey, optimisticData, { revalidate: false })

      // Perform actual update
      const result = await updateFunction()

      // Update cache with real data
      await mutate(cacheKey, result, { revalidate: options.revalidate !== false })

      // Clean up optimistic update record
      this.optimisticUpdates.delete(cacheKey)

      return result
    } catch (error) {
      console.error('Optimistic update failed:', error)

      // Rollback if enabled
      if (options.rollbackOnError !== false) {
        await this.rollbackOptimisticUpdate(cacheKey)
      }

      throw error
    }
  }

  /**
   * Batch invalidation for multiple related cache keys
   */
  static async batchInvalidate(
    invalidationGroups: Array<{
      keys: string[]
      options: CacheInvalidationOptions
    }>
  ): Promise<void> {
    const promises = invalidationGroups.map(group =>
      this.invalidateMultiple(group.keys, group.options)
    )

    await Promise.allSettled(promises)
  }

  /**
   * Time-based cache invalidation
   */
  static scheduleInvalidation(
    cacheKey: string,
    options: CacheInvalidationOptions,
    delay: number
  ): string {
    const timeoutId = setTimeout(async () => {
      await this.invalidate(cacheKey, options)
    }, delay)

    return timeoutId.toString()
  }

  /**
   * Cancel scheduled invalidation
   */
  static cancelScheduledInvalidation(timeoutId: string): void {
    clearTimeout(parseInt(timeoutId))
  }

  /**
   * Pattern-based cache clearing
   */
  static async clearCacheByPattern(
    pattern: RegExp,
    tenantId: string
  ): Promise<string[]> {
    const clearedKeys: string[] = []

    // This is a simplified implementation
    // In a real app, you'd need to track all cache keys
    const commonPatterns = [
      `initiatives?tenant_id=${tenantId}`,
      `objectives?tenant_id=${tenantId}`,
      `activities?tenant_id=${tenantId}`,
      `areas?tenant_id=${tenantId}`,
      `progress-tracking?tenant_id=${tenantId}`,
      `dashboard-metrics?tenant_id=${tenantId}`,
      `analytics?tenant_id=${tenantId}`
    ]

    for (const key of commonPatterns) {
      if (pattern.test(key)) {
        await mutate(key, undefined, { revalidate: false })
        clearedKeys.push(key)
      }
    }

    return clearedKeys
  }

  /**
   * Conditional invalidation based on business rules
   */
  static async conditionalInvalidate(
    cacheKey: string,
    options: CacheInvalidationOptions,
    condition: (currentData: any) => boolean
  ): Promise<boolean> {
    const currentData = this.getCachedData(cacheKey)
    
    if (condition(currentData)) {
      await this.invalidate(cacheKey, options)
      return true
    }
    
    return false
  }

  /**
   * Cascade invalidation - invalidate dependent caches
   */
  static async cascadeInvalidate(
    rootKey: string,
    options: CacheInvalidationOptions,
    dependencyMap: Record<string, string[]>
  ): Promise<void> {
    // Invalidate root key
    await this.invalidate(rootKey, options)

    // Find and invalidate dependencies
    const dependencies = dependencyMap[rootKey] || []
    for (const depKey of dependencies) {
      await this.invalidate(depKey, options)
      
      // Recursively invalidate dependencies of dependencies
      await this.cascadeInvalidate(depKey, options, dependencyMap)
    }
  }

  /**
   * Get cache invalidation statistics
   */
  static getInvalidationStats(): {
    pendingCount: number
    optimisticUpdatesCount: number
    oldestOptimisticUpdate: number | null
  } {
    const now = Date.now()
    const optimisticEntries = Array.from(this.optimisticUpdates.values())
    
    return {
      pendingCount: this.pendingInvalidations.size,
      optimisticUpdatesCount: this.optimisticUpdates.size,
      oldestOptimisticUpdate: optimisticEntries.length > 0
        ? Math.min(...optimisticEntries.map(entry => now - entry.timestamp))
        : null
    }
  }

  /**
   * Clean up old optimistic updates
   */
  static cleanupOptimisticUpdates(maxAge: number = 300000): number { // 5 minutes default
    const now = Date.now()
    let cleanedCount = 0

    for (const [key, entry] of this.optimisticUpdates.entries()) {
      if (now - entry.timestamp > maxAge) {
        this.optimisticUpdates.delete(key)
        cleanedCount++
      }
    }

    return cleanedCount
  }

  // Private helper methods
  private static async invalidate(
    cacheKey: string,
    options: CacheInvalidationOptions
  ): Promise<void> {
    try {
      await mutate(
        cacheKey,
        options.optimisticData,
        { revalidate: options.revalidate !== false }
      )
      console.debug(`Cache invalidated: ${cacheKey}`)
    } catch (error) {
      console.error(`Failed to invalidate cache for ${cacheKey}:`, error)
      throw error
    }
  }

  private static async invalidateMultiple(
    keys: string[],
    options: CacheInvalidationOptions
  ): Promise<void> {
    const promises = keys.map(key => this.invalidate(key, options))
    await Promise.allSettled(promises)
  }

  private static getCachedData(cacheKey: string): any {
    // In a real implementation, you'd use SWR's cache
    // This is a simplified version
    try {
      return (window as any).__SWR_CACHE__?.[cacheKey]?.data
    } catch {
      return null
    }
  }

  private static hasDataChanged(currentData: any, newData: any): boolean {
    // Simple comparison - could be enhanced with deep comparison
    if (currentData === newData) return false
    if (!currentData || !newData) return true
    
    // For arrays, compare lengths and key properties
    if (Array.isArray(currentData) && Array.isArray(newData)) {
      if (currentData.length !== newData.length) return true
      
      return currentData.some((item, index) => {
        const newItem = newData[index]
        return item.id !== newItem.id || 
               item.updated_at !== newItem.updated_at ||
               item.progress !== newItem.progress
      })
    }

    // For objects, compare stringified versions (basic)
    return JSON.stringify(currentData) !== JSON.stringify(newData)
  }

  private static async rollbackOptimisticUpdate(cacheKey: string): Promise<void> {
    const optimisticEntry = this.optimisticUpdates.get(cacheKey)
    if (optimisticEntry) {
      await mutate(cacheKey, optimisticEntry.data, { revalidate: false })
      this.optimisticUpdates.delete(cacheKey)
      console.debug(`Rolled back optimistic update for: ${cacheKey}`)
    }
  }
}

/**
 * React hook for cache invalidation in components
 */
export function useCacheInvalidation(tenantId: string) {
  const invalidateInitiative = (initiativeId: string, revalidate = true) =>
    CacheInvalidation.invalidateInitiativeCache(initiativeId, { tenantId, revalidate })

  const invalidateObjective = (objectiveId: string, areaId?: string, revalidate = true) =>
    CacheInvalidation.invalidateObjectiveCache(objectiveId, { tenantId, areaId, revalidate })

  const invalidateActivity = (activityId: string, initiativeId: string, revalidate = true) =>
    CacheInvalidation.invalidateActivityCache(activityId, initiativeId, { tenantId, revalidate })

  const invalidateArea = (areaId: string, revalidate = true) =>
    CacheInvalidation.invalidateAreaCache(areaId, { tenantId, revalidate })

  const invalidateTenant = (revalidate = true) =>
    CacheInvalidation.invalidateTenantCache({ tenantId, revalidate })

  const optimisticUpdate = (
    cacheKey: string,
    optimisticData: any,
    updateFunction: () => Promise<any>
  ) =>
    CacheInvalidation.optimisticUpdate(
      cacheKey,
      optimisticData,
      updateFunction,
      { tenantId, rollbackOnError: true }
    )

  return {
    invalidateInitiative,
    invalidateObjective,
    invalidateActivity,
    invalidateArea,
    invalidateTenant,
    optimisticUpdate,
    smartInvalidate: (cacheKey: string, newData: any) =>
      CacheInvalidation.smartInvalidate(cacheKey, newData, { tenantId }),
    debouncedInvalidate: (cacheKey: string, delay?: number) =>
      CacheInvalidation.debouncedInvalidate(cacheKey, { tenantId }, delay)
  }
}

export default CacheInvalidation