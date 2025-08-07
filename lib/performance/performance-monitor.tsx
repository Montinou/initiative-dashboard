/**
 * Comprehensive Performance Monitoring System
 * 
 * Real-time performance monitoring for KPI dashboard:
 * - API response time tracking
 * - Page load performance
 * - Component render performance
 * - User interaction metrics
 * - Performance alerts and notifications
 * - Real-time dashboards
 * 
 * Author: Claude Code Assistant
 * Date: 2025-08-04
 * Part of: PERF-001 Performance Optimization
 */

import { kpiCache, CachePerformanceMonitor } from '@/lib/cache/kpi-cache';
import { BundleAnalyzer, MemoryLeakPrevention } from './bundle-analyzer';

// Performance monitoring configuration
const PERFORMANCE_CONFIG = {
  MONITORING: {
    ENABLED: true,
    REPORT_INTERVAL: 60000,        // 1 minute
    METRICS_RETENTION: 86400000,   // 24 hours
    ALERT_THRESHOLDS: {
      API_RESPONSE_TIME: 1000,     // 1 second
      PAGE_LOAD_TIME: 3000,        // 3 seconds
      MEMORY_USAGE: 75,            // 75%
      CACHE_HIT_RATE: 70,          // 70%
      ERROR_RATE: 5,               // 5%
    },
  },
  TARGETS: {
    DASHBOARD_LOAD: 2000,          // 2 seconds
    API_RESPONSE: 500,             // 500ms
    COMPONENT_RENDER: 16,          // 16ms (60fps)
    INTERACTION_DELAY: 50,         // 50ms
  },
  SAMPLING: {
    API_CALLS: 1.0,               // 100% sampling
    PAGE_VIEWS: 1.0,              // 100% sampling
    USER_INTERACTIONS: 0.1,       // 10% sampling
    ERROR_EVENTS: 1.0,            // 100% sampling
  },
} as const;

// Performance metric interfaces
interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

interface APIPerformanceMetric extends PerformanceMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  cacheHit?: boolean;
}

interface PagePerformanceMetric extends PerformanceMetric {
  url: string;
  loadTime: number;
  fcp?: number;
  lcp?: number;
  cls?: number;
  fid?: number;
}

interface ComponentPerformanceMetric extends PerformanceMetric {
  componentName: string;
  renderTime: number;
  propsChanged?: boolean;
  rerender?: boolean;
}

interface UserInteractionMetric extends PerformanceMetric {
  interactionType: string;
  targetElement: string;
  responseTime: number;
  successful: boolean;
}

// Performance data storage
interface PerformanceStore {
  apiMetrics: APIPerformanceMetric[];
  pageMetrics: PagePerformanceMetric[];
  componentMetrics: ComponentPerformanceMetric[];
  interactionMetrics: UserInteractionMetric[];
  errorMetrics: PerformanceMetric[];
}

// Main performance monitor class
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceStore = {
    apiMetrics: [],
    pageMetrics: [],
    componentMetrics: [],
    interactionMetrics: [],
    errorMetrics: [],
  };
  
  private observers: Map<string, PerformanceObserver> = new Map();
  private reportingInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  static getInstance(): PerformanceMonitor {
    if (!this.instance) {
      this.instance = new PerformanceMonitor();
    }
    return this.instance;
  }

  /**
   * Start performance monitoring
   */
  start(): void {
    if (this.isMonitoring) return;

    console.log('[Performance Monitor] Starting monitoring...');
    
    this.isMonitoring = true;
    this.setupPerformanceObservers();
    this.startReporting();
    this.setupErrorHandling();
    
    // Start cache monitoring
    CachePerformanceMonitor.startMonitoring();
    
    console.log('[Performance Monitor] Monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (!this.isMonitoring) return;

    console.log('[Performance Monitor] Stopping monitoring...');
    
    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
    }
    
    CachePerformanceMonitor.stopMonitoring();
    
    console.log('[Performance Monitor] Monitoring stopped');
  }

  /**
   * Record API call performance
   */
  recordAPICall(
    endpoint: string,
    method: string,
    responseTime: number,
    statusCode: number,
    cacheHit = false
  ): void {
    if (!this.shouldSample('API_CALLS')) return;

    const metric: APIPerformanceMetric = {
      name: 'api_call',
      value: responseTime,
      timestamp: Date.now(),
      endpoint,
      method,
      statusCode,
      responseTime,
      cacheHit,
      tags: {
        endpoint,
        method,
        status: statusCode.toString(),
        cache: cacheHit ? 'hit' : 'miss',
      },
    };

    this.metrics.apiMetrics.push(metric);
    this.cleanupOldMetrics();

    // Check for performance issues
    if (responseTime > PERFORMANCE_CONFIG.MONITORING.ALERT_THRESHOLDS.API_RESPONSE_TIME) {
      this.triggerAlert('slow_api_response', {
        endpoint,
        responseTime,
        threshold: PERFORMANCE_CONFIG.MONITORING.ALERT_THRESHOLDS.API_RESPONSE_TIME,
      });
    }
  }

  /**
   * Record page load performance
   */
  recordPageLoad(url: string, metrics: Partial<PagePerformanceMetric>): void {
    if (!this.shouldSample('PAGE_VIEWS')) return;

    const metric: PagePerformanceMetric = {
      name: 'page_load',
      value: metrics.loadTime || 0,
      timestamp: Date.now(),
      url,
      loadTime: metrics.loadTime || 0,
      fcp: metrics.fcp,
      lcp: metrics.lcp,
      cls: metrics.cls,
      fid: metrics.fid,
      tags: {
        url,
        page: this.extractPageName(url),
      },
    };

    this.metrics.pageMetrics.push(metric);
    this.cleanupOldMetrics();

    // Check for slow page loads
    if (metric.loadTime > PERFORMANCE_CONFIG.MONITORING.ALERT_THRESHOLDS.PAGE_LOAD_TIME) {
      this.triggerAlert('slow_page_load', {
        url,
        loadTime: metric.loadTime,
        threshold: PERFORMANCE_CONFIG.MONITORING.ALERT_THRESHOLDS.PAGE_LOAD_TIME,
      });
    }
  }

  /**
   * Record component render performance
   */
  recordComponentRender(
    componentName: string,
    renderTime: number,
    propsChanged = false,
    rerender = false
  ): void {
    const metric: ComponentPerformanceMetric = {
      name: 'component_render',
      value: renderTime,
      timestamp: Date.now(),
      componentName,
      renderTime,
      propsChanged,
      rerender,
      tags: {
        component: componentName,
        rerender: rerender.toString(),
      },
    };

    this.metrics.componentMetrics.push(metric);
    this.cleanupOldMetrics();

    // Check for slow renders
    if (renderTime > PERFORMANCE_CONFIG.TARGETS.COMPONENT_RENDER) {
      console.warn(`[Performance Monitor] Slow component render: ${componentName} took ${renderTime}ms`);
    }
  }

  /**
   * Record user interaction performance
   */
  recordUserInteraction(
    interactionType: string,
    targetElement: string,
    responseTime: number,
    successful = true
  ): void {
    if (!this.shouldSample('USER_INTERACTIONS')) return;

    const metric: UserInteractionMetric = {
      name: 'user_interaction',
      value: responseTime,
      timestamp: Date.now(),
      interactionType,
      targetElement,
      responseTime,
      successful,
      tags: {
        interaction: interactionType,
        target: targetElement,
        success: successful.toString(),
      },
    };

    this.metrics.interactionMetrics.push(metric);
    this.cleanupOldMetrics();

    // Check for slow interactions
    if (responseTime > PERFORMANCE_CONFIG.TARGETS.INTERACTION_DELAY) {
      console.warn(`[Performance Monitor] Slow interaction: ${interactionType} took ${responseTime}ms`);
    }
  }

  /**
   * Record error
   */
  recordError(error: Error, context?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name: 'error',
      value: 1,
      timestamp: Date.now(),
      tags: {
        error_type: error.name,
        message: error.message,
      },
      metadata: {
        stack: error.stack,
        context,
      },
    };

    this.metrics.errorMetrics.push(metric);
    this.cleanupOldMetrics();

    console.error('[Performance Monitor] Error recorded:', error, context);
  }

  /**
   * Get current performance summary
   */
  getPerformanceSummary(): {
    api: {
      averageResponseTime: number;
      slowRequests: number;
      errorRate: number;
      cacheHitRate: number;
    };
    pages: {
      averageLoadTime: number;
      slowPages: number;
    };
    components: {
      averageRenderTime: number;
      slowRenders: number;
    };
    memory: {
      usage: number;
      alerts: number;
    };
    uptime: number;
  } {
    const now = Date.now();
    const oneHourAgo = now - 3600000; // 1 hour

    // API metrics
    const recentApiMetrics = this.metrics.apiMetrics.filter(m => m.timestamp > oneHourAgo);
    const apiSummary = {
      averageResponseTime: this.calculateAverage(recentApiMetrics.map(m => m.responseTime)),
      slowRequests: recentApiMetrics.filter(m => 
        m.responseTime > PERFORMANCE_CONFIG.MONITORING.ALERT_THRESHOLDS.API_RESPONSE_TIME
      ).length,
      errorRate: recentApiMetrics.filter(m => m.statusCode >= 400).length / Math.max(recentApiMetrics.length, 1) * 100,
      cacheHitRate: recentApiMetrics.filter(m => m.cacheHit).length / Math.max(recentApiMetrics.length, 1) * 100,
    };

    // Page metrics
    const recentPageMetrics = this.metrics.pageMetrics.filter(m => m.timestamp > oneHourAgo);
    const pagesSummary = {
      averageLoadTime: this.calculateAverage(recentPageMetrics.map(m => m.loadTime)),
      slowPages: recentPageMetrics.filter(m => 
        m.loadTime > PERFORMANCE_CONFIG.MONITORING.ALERT_THRESHOLDS.PAGE_LOAD_TIME
      ).length,
    };

    // Component metrics
    const recentComponentMetrics = this.metrics.componentMetrics.filter(m => m.timestamp > oneHourAgo);
    const componentsSummary = {
      averageRenderTime: this.calculateAverage(recentComponentMetrics.map(m => m.renderTime)),
      slowRenders: recentComponentMetrics.filter(m => 
        m.renderTime > PERFORMANCE_CONFIG.TARGETS.COMPONENT_RENDER
      ).length,
    };

    // Memory metrics
    const memoryStats = MemoryLeakPrevention.getMemoryStats();
    const memorySummary = {
      usage: memoryStats?.percentage || 0,
      alerts: memoryStats && memoryStats.percentage > PERFORMANCE_CONFIG.MONITORING.ALERT_THRESHOLDS.MEMORY_USAGE ? 1 : 0,
    };

    return {
      api: apiSummary,
      pages: pagesSummary,
      components: componentsSummary,
      memory: memorySummary,
      uptime: performance.now(),
    };
  }

  /**
   * Generate detailed performance report
   */
  async generateDetailedReport(): Promise<string> {
    const summary = this.getPerformanceSummary();
    const bundleReport = await BundleAnalyzer.generatePerformanceReport();
    const cacheStats = kpiCache.getStats();

    let report = '# Comprehensive Performance Report\n\n';
    report += `**Generated**: ${new Date().toISOString()}\n`;
    report += `**Uptime**: ${(summary.uptime / 1000 / 60).toFixed(2)} minutes\n\n`;

    // API Performance
    report += '## API Performance\n\n';
    report += `- **Average Response Time**: ${summary.api.averageResponseTime.toFixed(0)}ms\n`;
    report += `- **Slow Requests**: ${summary.api.slowRequests}\n`;
    report += `- **Error Rate**: ${summary.api.errorRate.toFixed(2)}%\n`;
    report += `- **Cache Hit Rate**: ${summary.api.cacheHitRate.toFixed(2)}%\n\n`;

    // Page Performance
    report += '## Page Performance\n\n';
    report += `- **Average Load Time**: ${summary.pages.averageLoadTime.toFixed(0)}ms\n`;
    report += `- **Slow Pages**: ${summary.pages.slowPages}\n\n`;

    // Component Performance
    report += '## Component Performance\n\n';
    report += `- **Average Render Time**: ${summary.components.averageRenderTime.toFixed(2)}ms\n`;
    report += `- **Slow Renders**: ${summary.components.slowRenders}\n\n`;

    // Memory Performance
    report += '## Memory Performance\n\n';
    report += `- **Memory Usage**: ${summary.memory.usage.toFixed(1)}%\n`;
    report += `- **Memory Alerts**: ${summary.memory.alerts}\n\n`;

    // Cache Performance
    report += '## Cache Performance\n\n';
    report += `- **Hit Rate**: ${cacheStats.hitRate.toFixed(2)}%\n`;
    report += `- **Total Requests**: ${cacheStats.hits + cacheStats.misses}\n`;
    report += `- **Memory Usage**: ${(cacheStats.memoryUsage / 1024 / 1024).toFixed(2)}MB\n\n`;

    // Bundle analysis
    report += bundleReport;

    return report;
  }

  // Private helper methods

  private setupPerformanceObservers(): void {
    // Navigation timing observer
    if ('PerformanceObserver' in window) {
      try {
        const navObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.recordPageLoad(window.location.href, {
                loadTime: navEntry.loadEventEnd - navEntry.navigationStart,
                fcp: 0, // Will be updated by paint observer
                lcp: 0, // Will be updated by largest-contentful-paint observer
              });
            }
          });
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navObserver);
      } catch (error) {
        console.warn('[Performance Monitor] Failed to setup navigation observer:', error);
      }

      // Paint timing observer
      try {
        const paintObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.name === 'first-contentful-paint') {
              // Update the most recent page load metric
              const recentPageMetric = this.metrics.pageMetrics[this.metrics.pageMetrics.length - 1];
              if (recentPageMetric) {
                recentPageMetric.fcp = entry.startTime;
              }
            }
          });
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.set('paint', paintObserver);
      } catch (error) {
        console.warn('[Performance Monitor] Failed to setup paint observer:', error);
      }
    }
  }

  private startReporting(): void {
    this.reportingInterval = setInterval(() => {
      if (PERFORMANCE_CONFIG.MONITORING.ENABLED) {
        const summary = this.getPerformanceSummary();
        console.log('[Performance Monitor] Performance Summary:', summary);
        
        // Check for alerts
        this.checkAlerts(summary);
      }
    }, PERFORMANCE_CONFIG.MONITORING.REPORT_INTERVAL);
  }

  private setupErrorHandling(): void {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.recordError(new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
        type: 'unhandled_promise_rejection',
        reason: event.reason,
      });
    });
  }

  private shouldSample(type: keyof typeof PERFORMANCE_CONFIG.SAMPLING): boolean {
    return Math.random() < PERFORMANCE_CONFIG.SAMPLING[type];
  }

  private cleanupOldMetrics(): void {
    const cutoff = Date.now() - PERFORMANCE_CONFIG.MONITORING.METRICS_RETENTION;
    
    this.metrics.apiMetrics = this.metrics.apiMetrics.filter(m => m.timestamp > cutoff);
    this.metrics.pageMetrics = this.metrics.pageMetrics.filter(m => m.timestamp > cutoff);
    this.metrics.componentMetrics = this.metrics.componentMetrics.filter(m => m.timestamp > cutoff);
    this.metrics.interactionMetrics = this.metrics.interactionMetrics.filter(m => m.timestamp > cutoff);
    this.metrics.errorMetrics = this.metrics.errorMetrics.filter(m => m.timestamp > cutoff);
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  private extractPageName(url: string): string {
    try {
      const pathname = new URL(url).pathname;
      return pathname.split('/').filter(Boolean).join('_') || 'home';
    } catch {
      return 'unknown';
    }
  }

  private triggerAlert(alertType: string, data: Record<string, any>): void {
    console.warn(`[Performance Alert] ${alertType}:`, data);
    
    // Dispatch custom event for alert handling
    window.dispatchEvent(new CustomEvent('performance-alert', {
      detail: { alertType, data, timestamp: Date.now() },
    }));
  }

  private checkAlerts(summary: ReturnType<typeof this.getPerformanceSummary>): void {
    const { ALERT_THRESHOLDS } = PERFORMANCE_CONFIG.MONITORING;

    if (summary.api.averageResponseTime > ALERT_THRESHOLDS.API_RESPONSE_TIME) {
      this.triggerAlert('high_api_response_time', {
        current: summary.api.averageResponseTime,
        threshold: ALERT_THRESHOLDS.API_RESPONSE_TIME,
      });
    }

    if (summary.api.cacheHitRate < ALERT_THRESHOLDS.CACHE_HIT_RATE) {
      this.triggerAlert('low_cache_hit_rate', {
        current: summary.api.cacheHitRate,
        threshold: ALERT_THRESHOLDS.CACHE_HIT_RATE,
      });
    }

    if (summary.memory.usage > ALERT_THRESHOLDS.MEMORY_USAGE) {
      this.triggerAlert('high_memory_usage', {
        current: summary.memory.usage,
        threshold: ALERT_THRESHOLDS.MEMORY_USAGE,
      });
    }

    if (summary.api.errorRate > ALERT_THRESHOLDS.ERROR_RATE) {
      this.triggerAlert('high_error_rate', {
        current: summary.api.errorRate,
        threshold: ALERT_THRESHOLDS.ERROR_RATE,
      });
    }
  }
}

// React hook for performance monitoring
export function usePerformanceMonitor() {
  const monitor = React.useRef(PerformanceMonitor.getInstance());

  React.useEffect(() => {
    monitor.current.start();
    
    return () => {
      monitor.current.stop();
    };
  }, []);

  return {
    recordAPICall: monitor.current.recordAPICall.bind(monitor.current),
    recordPageLoad: monitor.current.recordPageLoad.bind(monitor.current),
    recordComponentRender: monitor.current.recordComponentRender.bind(monitor.current),
    recordUserInteraction: monitor.current.recordUserInteraction.bind(monitor.current),
    recordError: monitor.current.recordError.bind(monitor.current),
    getPerformanceSummary: monitor.current.getPerformanceSummary.bind(monitor.current),
    generateDetailedReport: monitor.current.generateDetailedReport.bind(monitor.current),
  };
}

// Performance monitoring component
export const PerformanceMonitorProvider: React.FC<{
  children: React.ReactNode;
  onAlert?: (alertType: string, data: any) => void;
}> = ({ children, onAlert }) => {
  React.useEffect(() => {
    const monitor = PerformanceMonitor.getInstance();
    monitor.start();

    // Setup alert handler
    const handleAlert = (event: CustomEvent) => {
      onAlert?.(event.detail.alertType, event.detail.data);
    };

    window.addEventListener('performance-alert', handleAlert as EventListener);

    return () => {
      window.removeEventListener('performance-alert', handleAlert as EventListener);
      monitor.stop();
    };
  }, [onAlert]);

  return <>{children}</>;
};

// Export singleton instance and utilities
export const performanceMonitor = PerformanceMonitor.getInstance();

export {
  PerformanceMonitor,
  PERFORMANCE_CONFIG,
  type PerformanceMetric,
  type APIPerformanceMetric,
  type PagePerformanceMetric,
  type ComponentPerformanceMetric,
  type UserInteractionMetric,
};