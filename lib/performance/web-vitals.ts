import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals'

export interface WebVitalsMetric {
  id: string
  name: string
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
  delta: number
  navigationType: string
}

interface PerformanceData {
  url: string
  userAgent: string
  timestamp: number
  sessionId: string
  userId?: string
  tenant?: string
  metrics: WebVitalsMetric[]
}

class PerformanceMonitor {
  private sessionId: string
  private metrics: WebVitalsMetric[] = []
  private userId?: string
  private tenant?: string

  constructor() {
    this.sessionId = this.generateSessionId()
    this.initializeWebVitals()
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(7)}`
  }

  setUserContext(userId: string, tenant: string) {
    this.userId = userId
    this.tenant = tenant
  }

  private initializeWebVitals() {
    // Core Web Vitals
    getCLS(this.handleMetric.bind(this))
    getFID(this.handleMetric.bind(this))
    getFCP(this.handleMetric.bind(this))
    getLCP(this.handleMetric.bind(this))
    getTTFB(this.handleMetric.bind(this))
  }

  private handleMetric(metric: any) {
    const vitalsMetric: WebVitalsMetric = {
      id: metric.id,
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      navigationType: metric.navigationType
    }

    this.metrics.push(vitalsMetric)
    this.sendMetric(vitalsMetric)
  }

  private async sendMetric(metric: WebVitalsMetric) {
    const data: PerformanceData = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      tenant: this.tenant,
      metrics: [metric]
    }

    try {
      // Send to analytics endpoint
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
    } catch (error) {
      console.error('Failed to send performance metric:', error)
      // Store in localStorage as fallback
      this.storeMetricLocally(data)
    }
  }

  private storeMetricLocally(data: PerformanceData) {
    try {
      const stored = localStorage.getItem('performance-metrics') || '[]'
      const metrics = JSON.parse(stored)
      metrics.push(data)
      
      // Keep only last 50 metrics to avoid storage bloat
      if (metrics.length > 50) {
        metrics.splice(0, metrics.length - 50)
      }
      
      localStorage.setItem('performance-metrics', JSON.stringify(metrics))
    } catch (error) {
      console.error('Failed to store metric locally:', error)
    }
  }

  // Method to send batched metrics on page unload
  sendBatchedMetrics() {
    if (this.metrics.length === 0) return

    const data: PerformanceData = {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userId: this.userId,
      tenant: this.tenant,
      metrics: this.metrics
    }

    // Use sendBeacon for reliable transmission on page unload
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/performance', JSON.stringify(data))
    }
  }

  // Performance monitoring for custom events
  markCustomMetric(name: string, value: number, additionalData?: any) {
    const metric: WebVitalsMetric = {
      id: `custom-${Date.now()}`,
      name,
      value,
      rating: 'good', // Custom metrics don't have automatic rating
      delta: 0,
      navigationType: 'navigate'
    }

    this.metrics.push(metric)
    this.sendMetric(metric)
  }

  // Resource timing analysis
  analyzeResourceTiming() {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
    const analysis = {
      totalResources: resources.length,
      totalSize: 0,
      slowResources: [] as any[],
      largeResources: [] as any[],
      cacheHitRate: 0
    }

    let cacheHits = 0

    resources.forEach(resource => {
      const size = resource.transferSize || 0
      analysis.totalSize += size

      // Flag slow resources (> 2 seconds)
      if (resource.duration > 2000) {
        analysis.slowResources.push({
          name: resource.name,
          duration: resource.duration,
          size
        })
      }

      // Flag large resources (> 1MB)
      if (size > 1024 * 1024) {
        analysis.largeResources.push({
          name: resource.name,
          size,
          duration: resource.duration
        })
      }

      // Check cache hit (transferSize === 0 means cached)
      if (resource.transferSize === 0 && resource.decodedBodySize > 0) {
        cacheHits++
      }
    })

    analysis.cacheHitRate = resources.length > 0 ? cacheHits / resources.length : 0

    this.markCustomMetric('resource-analysis', analysis.totalSize, analysis)
    return analysis
  }
}

// Global instance
let performanceMonitor: PerformanceMonitor | null = null

export function initializePerformanceMonitoring() {
  if (typeof window === 'undefined') return null

  if (!performanceMonitor) {
    performanceMonitor = new PerformanceMonitor()

    // Send batched metrics on page unload
    window.addEventListener('beforeunload', () => {
      performanceMonitor?.sendBatchedMetrics()
    })

    // Send metrics on visibility change (for SPA navigation)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        performanceMonitor?.sendBatchedMetrics()
      }
    })
  }

  return performanceMonitor
}

export function setPerformanceUserContext(userId: string, tenant: string) {
  performanceMonitor?.setUserContext(userId, tenant)
}

export function markCustomPerformanceMetric(name: string, value: number, additionalData?: any) {
  performanceMonitor?.markCustomMetric(name, value, additionalData)
}

export function analyzeResourcePerformance() {
  return performanceMonitor?.analyzeResourceTiming()
}