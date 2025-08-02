import { stratixAPI } from './api-client'
import { stratixDataService } from './data-service'

// Types for monitoring
export interface HealthCheck {
  service: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  latency?: number
  timestamp: string
  error?: string
  details?: Record<string, any>
}

export interface PerformanceMetric {
  operation: string
  duration: number
  timestamp: string
  success: boolean
  userId?: string
  error?: string
}

export interface StratixSystemStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy'
  services: HealthCheck[]
  lastUpdated: string
  uptime: number
}

class StratixMonitoring {
  private healthChecks: HealthCheck[] = []
  private performanceMetrics: PerformanceMetric[] = []
  private maxHistorySize = 100
  private healthCheckInterval: NodeJS.Timeout | null = null
  private startTime = Date.now()

  constructor() {
    // Start periodic health checks in production
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
      this.startPeriodicHealthChecks()
    }
  }

  // Health Checks
  async performHealthCheck(): Promise<StratixSystemStatus> {
    console.log('🔍 Performing Stratix system health check...')
    
    const checks: HealthCheck[] = []
    
    // Check Google Cloud Run API availability
    const cloudRunCheck = await this.checkCloudRunHealth()
    checks.push(cloudRunCheck)
    
    // Check Supabase connectivity
    const supabaseCheck = await this.checkSupabaseHealth()
    checks.push(supabaseCheck)
    
    // Check authentication service
    const authCheck = await this.checkAuthHealth()
    checks.push(authCheck)
    
    // Check local data service
    const dataServiceCheck = await this.checkDataServiceHealth()
    checks.push(dataServiceCheck)

    // Update health checks history
    this.healthChecks = [...checks, ...this.healthChecks].slice(0, this.maxHistorySize)

    // Determine overall system status
    const overallStatus = this.calculateOverallStatus(checks)
    
    const systemStatus: StratixSystemStatus = {
      overall: overallStatus,
      services: checks,
      lastUpdated: new Date().toISOString(),
      uptime: Date.now() - this.startTime
    }

    console.log(`✅ System health check completed. Overall status: ${overallStatus}`)
    return systemStatus
  }

  private async checkCloudRunHealth(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      // Test a simple chat request to validate the service
      const testResponse = await stratixAPI.chat('test-health-check', 'health check')
      const latency = Date.now() - startTime

      if (testResponse.success) {
        return {
          service: 'Google Cloud Run API',
          status: 'healthy',
          latency,
          timestamp: new Date().toISOString(),
          details: {
            responseTime: latency,
            endpoint: process.env.NEXT_PUBLIC_STRATIX_API_URL
          }
        }
      } else {
        return {
          service: 'Google Cloud Run API',
          status: 'degraded',
          latency,
          timestamp: new Date().toISOString(),
          error: testResponse.error || 'API returned unsuccessful response',
          details: { responseTime: latency }
        }
      }
    } catch (error) {
      const latency = Date.now() - startTime
      return {
        service: 'Google Cloud Run API',
        status: 'unhealthy',
        latency,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        details: { responseTime: latency }
      }
    }
  }

  private async checkSupabaseHealth(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      // Test database connectivity with a simple query
      const testUserId = 'health-check-user'
      await stratixDataService.gatherCompanyContext(testUserId)
      
      const latency = Date.now() - startTime
      
      return {
        service: 'Supabase Database',
        status: 'healthy',
        latency,
        timestamp: new Date().toISOString(),
        details: {
          responseTime: latency,
          url: process.env.NEXT_PUBLIC_SUPABASE_URL
        }
      }
    } catch (error) {
      const latency = Date.now() - startTime
      
      // Distinguish between different types of errors
      let status: 'degraded' | 'unhealthy' = 'unhealthy'
      if (error instanceof Error && error.message.includes('User profile not found')) {
        status = 'healthy' // This is expected for a test user
      }
      
      return {
        service: 'Supabase Database',
        status,
        latency,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Database connection failed',
        details: { responseTime: latency }
      }
    }
  }

  private async checkAuthHealth(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      // Test authentication token retrieval
      const token = await stratixAPI['getAuthToken']()
      const latency = Date.now() - startTime
      
      if (token) {
        return {
          service: 'Authentication',
          status: 'healthy',
          latency,
          timestamp: new Date().toISOString(),
          details: {
            responseTime: latency,
            hasToken: true
          }
        }
      } else {
        return {
          service: 'Authentication',
          status: 'degraded',
          latency,
          timestamp: new Date().toISOString(),
          error: 'No authentication token available',
          details: { responseTime: latency }
        }
      }
    } catch (error) {
      const latency = Date.now() - startTime
      return {
        service: 'Authentication',
        status: 'unhealthy',
        latency,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Authentication check failed',
        details: { responseTime: latency }
      }
    }
  }

  private async checkDataServiceHealth(): Promise<HealthCheck> {
    const startTime = Date.now()
    
    try {
      // Test local data service functionality
      const mockContext = {
        userId: 'test-user',
        tenantId: 'test-tenant',
        profile: { fullName: 'Test User', email: 'test@example.com' },
        company: {
          totalInitiatives: 5, activeInitiatives: 3, completedInitiatives: 2,
          overdueInitiatives: 1, totalAreas: 2, activeBudget: 100000,
          totalActualCost: 80000, averageProgress: 75, totalUsers: 10
        },
        initiatives: [], areas: [], recentActivity: []
      }
      
      const kpis = stratixDataService.generateKPIsFromContext(mockContext)
      const insights = stratixDataService.generateInsightsFromContext(mockContext)
      
      const latency = Date.now() - startTime
      
      if (kpis.length > 0 && insights.length >= 0) {
        return {
          service: 'Data Service',
          status: 'healthy',
          latency,
          timestamp: new Date().toISOString(),
          details: {
            responseTime: latency,
            kpisGenerated: kpis.length,
            insightsGenerated: insights.length
          }
        }
      } else {
        return {
          service: 'Data Service',
          status: 'degraded',
          latency,
          timestamp: new Date().toISOString(),
          error: 'Data service not generating expected results',
          details: { responseTime: latency }
        }
      }
    } catch (error) {
      const latency = Date.now() - startTime
      return {
        service: 'Data Service',
        status: 'unhealthy',
        latency,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Data service check failed',
        details: { responseTime: latency }
      }
    }
  }

  private calculateOverallStatus(checks: HealthCheck[]): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyCount = checks.filter(check => check.status === 'unhealthy').length
    const degradedCount = checks.filter(check => check.status === 'degraded').length
    
    if (unhealthyCount > 0) {
      return 'unhealthy'
    } else if (degradedCount > 0) {
      return 'degraded'
    } else {
      return 'healthy'
    }
  }

  // Performance Monitoring
  trackPerformance(operation: string, duration: number, success: boolean, userId?: string, error?: string) {
    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: new Date().toISOString(),
      success,
      userId,
      error
    }

    this.performanceMetrics = [metric, ...this.performanceMetrics].slice(0, this.maxHistorySize)

    // Log performance issues
    if (duration > 5000) { // > 5 seconds
      console.warn(`⚠️ Slow operation detected: ${operation} took ${duration}ms`)
    }

    if (!success) {
      console.error(`❌ Failed operation: ${operation} - ${error}`)
    }
  }

  // Utility function to wrap operations with performance tracking
  async trackOperation<T>(
    operation: string,
    fn: () => Promise<T>,
    userId?: string
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await fn()
      const duration = Date.now() - startTime
      this.trackPerformance(operation, duration, true, userId)
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      this.trackPerformance(operation, duration, false, userId, errorMessage)
      throw error
    }
  }

  // Periodic health checks
  private startPeriodicHealthChecks() {
    // Perform health check every 5 minutes in production
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck().catch(error => {
        console.error('❌ Periodic health check failed:', error)
      })
    }, 5 * 60 * 1000)
  }

  private stopPeriodicHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval)
      this.healthCheckInterval = null
    }
  }

  // Getters for monitoring data
  getRecentHealthChecks(limit = 10): HealthCheck[] {
    return this.healthChecks.slice(0, limit)
  }

  getRecentPerformanceMetrics(limit = 20): PerformanceMetric[] {
    return this.performanceMetrics.slice(0, limit)
  }

  getAverageLatency(service?: string): number {
    const relevantChecks = service 
      ? this.healthChecks.filter(check => check.service === service && check.latency)
      : this.healthChecks.filter(check => check.latency)

    if (relevantChecks.length === 0) return 0

    const totalLatency = relevantChecks.reduce((sum, check) => sum + (check.latency || 0), 0)
    return Math.round(totalLatency / relevantChecks.length)
  }

  getSystemUptime(): number {
    return Date.now() - this.startTime
  }

  // Export monitoring data for external systems
  exportMonitoringData() {
    return {
      healthChecks: this.healthChecks,
      performanceMetrics: this.performanceMetrics,
      uptime: this.getSystemUptime(),
      timestamp: new Date().toISOString()
    }
  }

  // Cleanup
  destroy() {
    this.stopPeriodicHealthChecks()
    this.healthChecks = []
    this.performanceMetrics = []
  }
}

// Export singleton instance
export const stratixMonitoring = new StratixMonitoring()

// Export utility functions
export function withPerformanceTracking<T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    return stratixMonitoring.trackOperation(operation, () => fn(...args))
  }
}

export function logError(context: string, error: Error | string, metadata?: Record<string, any>) {
  const errorMessage = error instanceof Error ? error.message : error
  const timestamp = new Date().toISOString()
  
  console.error(`❌ [${timestamp}] ${context}: ${errorMessage}`, metadata)
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with external monitoring service (Sentry, LogRocket, etc.)
    console.error('Production error logged:', {
      context,
      error: errorMessage,
      metadata,
      timestamp,
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location.href : undefined
    })
  }
}

export function logPerformance(operation: string, duration: number, metadata?: Record<string, any>) {
  const timestamp = new Date().toISOString()
  
  if (duration > 2000) { // Log slow operations
    console.warn(`⚠️ [${timestamp}] Slow operation: ${operation} took ${duration}ms`, metadata)
  } else {
    console.log(`⚡ [${timestamp}] ${operation} completed in ${duration}ms`, metadata)
  }
}