/**
 * Request Deduplication and Response Transformation
 * Prevents duplicate API calls and provides consistent response transformation
 */

import APIErrorHandler, { RequestConfig } from './error-handling'

export interface RequestMetadata {
  timestamp: number
  tenantId?: string
  userId?: string
  requestId: string
}

export interface CachedRequest<T> {
  promise: Promise<T>
  metadata: RequestMetadata
  abortController?: AbortController
}

export interface TransformationConfig {
  adaptInitiatives?: boolean
  adaptObjectives?: boolean
  adaptActivities?: boolean
  adaptUsers?: boolean
  adaptAreas?: boolean
  dateBasedFiltering?: boolean
}

export class RequestDeduplication {
  private static pendingRequests = new Map<string, CachedRequest<any>>()
  private static requestHistory = new Map<string, { count: number; lastRequest: number }>()
  private static maxCacheAge = 5000 // 5 seconds
  private static maxHistorySize = 1000

  /**
   * Deduplicate API requests based on key
   */
  static async deduplicatedFetch<T>(
    key: string,
    requestFn: () => Promise<T>,
    config: RequestConfig & {
      maxAge?: number
      forceRefresh?: boolean
      transform?: TransformationConfig
    } = {}
  ): Promise<T> {
    const { maxAge = this.maxCacheAge, forceRefresh = false, transform, ...requestConfig } = config

    // Check if we should use cached request
    if (!forceRefresh && this.pendingRequests.has(key)) {
      const cachedRequest = this.pendingRequests.get(key)!
      
      // Check if cache is still valid
      if (Date.now() - cachedRequest.metadata.timestamp <= maxAge) {
        console.debug(`Using cached request: ${key}`)
        this.updateRequestHistory(key)
        return cachedRequest.promise
      } else {
        // Clean up expired cache
        this.pendingRequests.delete(key)
      }
    }

    // Create new request with abort controller
    const abortController = new AbortController()
    const requestId = this.generateRequestId()

    const metadata: RequestMetadata = {
      timestamp: Date.now(),
      tenantId: requestConfig.tenantId,
      requestId
    }

    // Wrap request function with error handling and transformation
    const wrappedRequestFn = async (): Promise<T> => {
      try {
        console.debug(`Making new request: ${key} (ID: ${requestId})`)
        
        // Add abort signal to fetch if it's a fetch request
        const originalFetch = global.fetch
        global.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
          return originalFetch(input, {
            ...init,
            signal: abortController.signal
          })
        }

        const result = await APIErrorHandler.handleRequest(requestFn, {
          ...requestConfig,
          timeout: requestConfig.timeout || 30000
        })

        // Restore original fetch
        global.fetch = originalFetch

        // Apply transformations if configured
        return transform ? this.transformResponse(result, transform) : result
      } catch (error) {
        // Clean up failed request
        this.pendingRequests.delete(key)
        throw error
      }
    }

    // Create promise and cache it
    const promise = wrappedRequestFn()
    const cachedRequest: CachedRequest<T> = {
      promise,
      metadata,
      abortController
    }

    this.pendingRequests.set(key, cachedRequest)
    this.updateRequestHistory(key)

    // Clean up after completion
    promise.finally(() => {
      setTimeout(() => {
        this.pendingRequests.delete(key)
      }, maxAge)
    })

    return promise
  }

  /**
   * Batch deduplicated requests
   */
  static async batchDeduplicatedRequests<T>(
    requests: Array<{
      key: string
      requestFn: () => Promise<T>
      config?: RequestConfig & { transform?: TransformationConfig }
    }>,
    batchConfig: {
      concurrency?: number
      failFast?: boolean
      maxAge?: number
    } = {}
  ): Promise<Array<{ key: string; success: boolean; data?: T; error?: Error }>> {
    const { concurrency = 5, failFast = false, maxAge } = batchConfig
    const results: Array<{ key: string; success: boolean; data?: T; error?: Error }> = []

    // Process in batches to control concurrency
    for (let i = 0; i < requests.length; i += concurrency) {
      const batch = requests.slice(i, i + concurrency)
      
      const batchPromises = batch.map(async ({ key, requestFn, config }) => {
        try {
          const data = await this.deduplicatedFetch(
            key,
            requestFn,
            { ...config, maxAge }
          )
          return { key, success: true, data }
        } catch (error) {
          if (failFast) {
            throw error
          }
          return { key, success: false, error: error as Error }
        }
      })

      const batchResults = await Promise.all(batchPromises)
      results.push(...batchResults)
    }

    return results
  }

  /**
   * Cancel pending request
   */
  static cancelRequest(key: string): boolean {
    const cachedRequest = this.pendingRequests.get(key)
    if (cachedRequest) {
      cachedRequest.abortController?.abort()
      this.pendingRequests.delete(key)
      console.debug(`Cancelled request: ${key}`)
      return true
    }
    return false
  }

  /**
   * Cancel all pending requests for a tenant
   */
  static cancelTenantRequests(tenantId: string): number {
    let cancelledCount = 0
    
    for (const [key, cachedRequest] of this.pendingRequests.entries()) {
      if (cachedRequest.metadata.tenantId === tenantId) {
        cachedRequest.abortController?.abort()
        this.pendingRequests.delete(key)
        cancelledCount++
      }
    }

    console.debug(`Cancelled ${cancelledCount} requests for tenant: ${tenantId}`)
    return cancelledCount
  }

  /**
   * Get request statistics
   */
  static getRequestStats(): {
    pending: number
    totalRequests: number
    mostRequestedKeys: Array<{ key: string; count: number }>
  } {
    const totalRequests = Array.from(this.requestHistory.values())
      .reduce((sum, hist) => sum + hist.count, 0)

    const mostRequested = Array.from(this.requestHistory.entries())
      .map(([key, hist]) => ({ key, count: hist.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    return {
      pending: this.pendingRequests.size,
      totalRequests,
      mostRequestedKeys: mostRequested
    }
  }

  /**
   * Clean up old request history
   */
  static cleanupRequestHistory(): number {
    const now = Date.now()
    const maxAge = 3600000 // 1 hour
    let cleanedCount = 0

    for (const [key, history] of this.requestHistory.entries()) {
      if (now - history.lastRequest > maxAge) {
        this.requestHistory.delete(key)
        cleanedCount++
      }
    }

    // Trim history if it's too large
    if (this.requestHistory.size > this.maxHistorySize) {
      const entries = Array.from(this.requestHistory.entries())
        .sort((a, b) => b[1].lastRequest - a[1].lastRequest)
        .slice(0, this.maxHistorySize)
      
      this.requestHistory.clear()
      entries.forEach(([key, history]) => {
        this.requestHistory.set(key, history)
      })
    }

    return cleanedCount
  }

  /**
   * Transform response based on configuration
   */
  static transformResponse<T>(data: T, config: TransformationConfig): T {
    if (!data || typeof data !== 'object') {
      return data
    }

    let transformed = data

    // Apply date-based filtering transformations
    if (config.dateBasedFiltering) {
      transformed = this.applyDateBasedFiltering(transformed)
    }

    // Apply entity-specific transformations
    if (config.adaptInitiatives && Array.isArray(transformed)) {
      transformed = this.transformInitiatives(transformed)
    }

    if (config.adaptObjectives && Array.isArray(transformed)) {
      transformed = this.transformObjectives(transformed)
    }

    if (config.adaptActivities && Array.isArray(transformed)) {
      transformed = this.transformActivities(transformed)
    }

    if (config.adaptUsers && Array.isArray(transformed)) {
      transformed = this.transformUsers(transformed)
    }

    if (config.adaptAreas && Array.isArray(transformed)) {
      transformed = this.transformAreas(transformed)
    }

    return transformed
  }

  /**
   * Create standardized request key
   */
  static createRequestKey(
    endpoint: string,
    params: Record<string, any> = {},
    tenantId?: string
  ): string {
    // Ensure tenant isolation in key
    const keyParams = {
      ...params,
      ...(tenantId && { tenant_id: tenantId })
    }

    // Sort params for consistent keys
    const sortedParams = Object.keys(keyParams)
      .sort()
      .reduce((acc, key) => {
        if (keyParams[key] !== undefined && keyParams[key] !== null) {
          acc[key] = keyParams[key]
        }
        return acc
      }, {} as Record<string, any>)

    const queryString = new URLSearchParams(
      Object.entries(sortedParams).map(([k, v]) => [k, String(v)])
    ).toString()

    return queryString ? `${endpoint}?${queryString}` : endpoint
  }

  /**
   * Create date-range aware request key
   */
  static createDateRangeKey(
    endpoint: string,
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

    return this.createRequestKey(endpoint, params, tenantId)
  }

  // Private helper methods
  private static generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private static updateRequestHistory(key: string): void {
    const existing = this.requestHistory.get(key)
    if (existing) {
      existing.count++
      existing.lastRequest = Date.now()
    } else {
      this.requestHistory.set(key, {
        count: 1,
        lastRequest: Date.now()
      })
    }
  }

  private static applyDateBasedFiltering<T>(data: T): T {
    // Remove quarter-related fields and ensure date fields are properly formatted
    if (Array.isArray(data)) {
      return data.map(item => {
        if (typeof item === 'object' && item !== null) {
          const { quarter, quarter_id, quarter_name, ...rest } = item as any
          return {
            ...rest,
            // Ensure date fields are in ISO format
            start_date: rest.start_date ? new Date(rest.start_date).toISOString().split('T')[0] : null,
            end_date: rest.end_date ? new Date(rest.end_date).toISOString().split('T')[0] : null,
            due_date: rest.due_date ? new Date(rest.due_date).toISOString().split('T')[0] : null,
            target_date: rest.target_date ? new Date(rest.target_date).toISOString().split('T')[0] : null
          }
        }
        return item
      }) as T
    }

    if (typeof data === 'object' && data !== null) {
      const { quarter, quarter_id, quarter_name, ...rest } = data as any
      return {
        ...rest,
        start_date: rest.start_date ? new Date(rest.start_date).toISOString().split('T')[0] : null,
        end_date: rest.end_date ? new Date(rest.end_date).toISOString().split('T')[0] : null,
        due_date: rest.due_date ? new Date(rest.due_date).toISOString().split('T')[0] : null,
        target_date: rest.target_date ? new Date(rest.target_date).toISOString().split('T')[0] : null
      } as T
    }

    return data
  }

  private static transformInitiatives<T>(data: T): T {
    if (!Array.isArray(data)) return data

    return data.map(initiative => ({
      ...initiative,
      // Ensure consistent field naming
      title: initiative.title || initiative.name,
      // Add computed fields
      isOverdue: initiative.due_date ? new Date(initiative.due_date) < new Date() && initiative.status !== 'completed' : false,
      daysRemaining: initiative.due_date ? Math.ceil((new Date(initiative.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null
    })) as T
  }

  private static transformObjectives<T>(data: T): T {
    if (!Array.isArray(data)) return data

    return data.map(objective => ({
      ...objective,
      // Add computed progress tracking
      isOnTrack: this.calculateOnTrackStatus(objective),
      timePeriod: this.calculateTimePeriod(objective.start_date, objective.end_date)
    })) as T
  }

  private static transformActivities<T>(data: T): T {
    if (!Array.isArray(data)) return data

    return data.map(activity => ({
      ...activity,
      // Standardize completion field
      completed: activity.is_completed,
      // Add priority calculation
      priority: this.calculateActivityPriority(activity)
    })) as T
  }

  private static transformUsers<T>(data: T): T {
    if (!Array.isArray(data)) return data

    return data.map(user => ({
      ...user,
      // Add display name
      displayName: user.full_name || user.email?.split('@')[0] || 'Unknown User',
      // Add initials
      initials: this.generateInitials(user.full_name || user.email || 'U')
    })) as T
  }

  private static transformAreas<T>(data: T): T {
    if (!Array.isArray(data)) return data

    return data.map(area => ({
      ...area,
      // Add health metrics
      healthStatus: this.calculateAreaHealth(area),
      // Add team size
      teamSize: area.user_profiles?.length || 0
    })) as T
  }

  private static calculateOnTrackStatus(objective: any): boolean {
    if (!objective.start_date || !objective.end_date) return true
    
    const now = new Date()
    const start = new Date(objective.start_date)
    const end = new Date(objective.end_date)
    
    const totalDuration = end.getTime() - start.getTime()
    const elapsed = now.getTime() - start.getTime()
    const expectedProgress = (elapsed / totalDuration) * 100
    
    return objective.progress >= (expectedProgress - 10) // 10% tolerance
  }

  private static calculateTimePeriod(startDate?: string, endDate?: string) {
    if (!startDate || !endDate) return null
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    const now = new Date()
    
    const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const elapsed = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
    const remaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    
    return {
      duration,
      elapsed,
      remaining,
      percentElapsed: duration > 0 ? Math.min(100, (elapsed / duration) * 100) : 0
    }
  }

  private static calculateActivityPriority(activity: any): 'low' | 'medium' | 'high' {
    if (activity.is_completed) return 'low'
    
    // Simple priority calculation based on keywords
    const text = `${activity.title} ${activity.description || ''}`.toLowerCase()
    if (text.includes('urgent') || text.includes('critical') || text.includes('asap')) {
      return 'high'
    }
    if (text.includes('important') || text.includes('priority')) {
      return 'medium'
    }
    return 'low'
  }

  private static generateInitials(name: string): string {
    const parts = name.trim().split(' ')
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase()
    }
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  private static calculateAreaHealth(area: any): 'excellent' | 'good' | 'needs-attention' | 'critical' {
    // Simple health calculation based on available data
    const hasManager = !!area.manager_id
    const hasActiveInitiatives = area.initiatives && area.initiatives.length > 0
    const avgProgress = area.initiatives?.reduce((sum: number, init: any) => sum + (init.progress || 0), 0) / (area.initiatives?.length || 1) || 0
    
    if (hasManager && hasActiveInitiatives && avgProgress >= 80) return 'excellent'
    if (hasManager && hasActiveInitiatives && avgProgress >= 60) return 'good'
    if (!hasManager || !hasActiveInitiatives) return 'needs-attention'
    return 'critical'
  }
}

export default RequestDeduplication