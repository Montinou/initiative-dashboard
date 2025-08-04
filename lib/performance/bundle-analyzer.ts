/**
 * Bundle Analysis and Memory Leak Prevention System
 * 
 * Comprehensive bundle size monitoring and memory leak prevention:
 * - Bundle size analysis and reporting
 * - Memory usage monitoring
 * - Component lifecycle tracking
 * - Memory leak detection and prevention
 * - Performance recommendations
 * 
 * Author: Claude Code Assistant
 * Date: 2025-08-04
 * Part of: PERF-001 Performance Optimization
 */

// Bundle analysis configuration
const BUNDLE_CONFIG = {
  SIZE_LIMITS: {
    TOTAL_BUNDLE: 2 * 1024 * 1024,      // 2MB total
    MAIN_CHUNK: 500 * 1024,             // 500KB main chunk
    VENDOR_CHUNK: 1 * 1024 * 1024,      // 1MB vendor chunk
    PAGE_CHUNK: 200 * 1024,             // 200KB per page
    COMPONENT_CHUNK: 50 * 1024,         // 50KB per component
  },
  MEMORY_LIMITS: {
    HEAP_SIZE_WARNING: 50 * 1024 * 1024,   // 50MB heap warning
    HEAP_SIZE_CRITICAL: 100 * 1024 * 1024,  // 100MB heap critical
    LEAK_DETECTION_INTERVAL: 30000,         // 30 seconds
    CLEANUP_THRESHOLD: 75,                   // 75% memory usage
  },
  PERFORMANCE_TARGETS: {
    FIRST_CONTENTFUL_PAINT: 1500,     // 1.5 seconds
    LARGEST_CONTENTFUL_PAINT: 2500,   // 2.5 seconds
    FIRST_INPUT_DELAY: 100,           // 100ms
    CUMULATIVE_LAYOUT_SHIFT: 0.1,     // 0.1 CLS score
  },
} as const;

// Bundle analysis interface
interface BundleAnalysisResult {
  totalSize: number;
  chunks: ChunkAnalysis[];
  recommendations: string[];
  performance: PerformanceMetrics;
  timestamp: number;
}

interface ChunkAnalysis {
  name: string;
  size: number;
  modules: ModuleInfo[];
  loadTime?: number;
  cacheHit?: boolean;
}

interface ModuleInfo {
  name: string;
  size: number;
  path: string;
  reasons: string[];
}

interface PerformanceMetrics {
  fcp?: number;
  lcp?: number;
  fid?: number;
  cls?: number;
  ttfb?: number;
  memoryUsage?: MemoryInfo;
}

interface MemoryInfo {
  used: number;
  total: number;
  limit?: number;
  percentage: number;
}

// Memory leak prevention class
class MemoryLeakPrevention {
  private static eventListeners = new WeakMap<any, Set<() => void>>();
  private static intervals = new Set<NodeJS.Timeout>();
  private static timeouts = new Set<NodeJS.Timeout>();
  private static observers = new Set<ResizeObserver | IntersectionObserver | MutationObserver>();
  private static abortControllers = new Set<AbortController>();
  private static subscriptions = new Set<() => void>();

  /**
   * Register event listener for automatic cleanup
   */
  static addEventListenerWithCleanup(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: AddEventListenerOptions
  ): () => void {
    target.addEventListener(type, listener, options);
    
    const cleanup = () => {
      target.removeEventListener(type, listener, options);
    };

    // Store cleanup function
    if (!this.eventListeners.has(target)) {
      this.eventListeners.set(target, new Set());
    }
    this.eventListeners.get(target)!.add(cleanup);

    return cleanup;
  }

  /**
   * Create interval with automatic cleanup
   */
  static setIntervalWithCleanup(callback: () => void, ms: number): NodeJS.Timeout {
    const intervalId = setInterval(callback, ms);
    this.intervals.add(intervalId);
    return intervalId;
  }

  /**
   * Create timeout with automatic cleanup
   */
  static setTimeoutWithCleanup(callback: () => void, ms: number): NodeJS.Timeout {
    const timeoutId = setTimeout(() => {
      callback();
      this.timeouts.delete(timeoutId);
    }, ms);
    this.timeouts.add(timeoutId);
    return timeoutId;
  }

  /**
   * Create observer with automatic cleanup
   */
  static createObserverWithCleanup<T extends ResizeObserver | IntersectionObserver | MutationObserver>(
    ObserverClass: new (...args: any[]) => T,
    ...args: any[]
  ): T {
    const observer = new ObserverClass(...args);
    this.observers.add(observer);
    return observer;
  }

  /**
   * Create AbortController with tracking
   */
  static createAbortController(): AbortController {
    const controller = new AbortController();
    this.abortControllers.add(controller);
    return controller;
  }

  /**
   * Register subscription for cleanup
   */
  static addSubscription(unsubscribe: () => void): void {
    this.subscriptions.add(unsubscribe);
  }

  /**
   * Cleanup all registered resources
   */
  static cleanupAll(): void {
    // Clear intervals
    this.intervals.forEach(id => clearInterval(id));
    this.intervals.clear();

    // Clear timeouts
    this.timeouts.forEach(id => clearTimeout(id));
    this.timeouts.clear();

    // Disconnect observers
    this.observers.forEach(observer => {
      if ('disconnect' in observer) {
        observer.disconnect();
      }
    });
    this.observers.clear();

    // Abort controllers
    this.abortControllers.forEach(controller => {
      if (!controller.signal.aborted) {
        controller.abort();
      }
    });
    this.abortControllers.clear();

    // Unsubscribe from subscriptions
    this.subscriptions.forEach(unsubscribe => {
      try {
        unsubscribe();
      } catch (error) {
        console.warn('[Memory Leak Prevention] Error during unsubscribe:', error);
      }
    });
    this.subscriptions.clear();

    console.log('[Memory Leak Prevention] All resources cleaned up');
  }

  /**
   * Get memory usage statistics
   */
  static getMemoryStats(): MemoryInfo | null {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
      };
    }
    return null;
  }

  /**
   * Monitor memory usage and trigger cleanup if needed
   */
  static startMemoryMonitoring(): () => void {
    const intervalId = this.setIntervalWithCleanup(() => {
      const memoryStats = this.getMemoryStats();
      
      if (memoryStats) {
        const { used, percentage } = memoryStats;
        
        if (used > BUNDLE_CONFIG.MEMORY_LIMITS.HEAP_SIZE_CRITICAL) {
          console.error(`[Memory Monitor] Critical memory usage: ${(used / 1024 / 1024).toFixed(2)}MB (${percentage.toFixed(1)}%)`);
          this.forceGarbageCollect();
        } else if (used > BUNDLE_CONFIG.MEMORY_LIMITS.HEAP_SIZE_WARNING) {
          console.warn(`[Memory Monitor] High memory usage: ${(used / 1024 / 1024).toFixed(2)}MB (${percentage.toFixed(1)}%)`);
        }

        if (percentage > BUNDLE_CONFIG.MEMORY_LIMITS.CLEANUP_THRESHOLD) {
          this.performCleanup();
        }
      }
    }, BUNDLE_CONFIG.MEMORY_LIMITS.LEAK_DETECTION_INTERVAL);

    return () => {
      this.intervals.delete(intervalId);
      clearInterval(intervalId);
    };
  }

  /**
   * Force garbage collection if available
   */
  private static forceGarbageCollect(): void {
    if ('gc' in window && typeof (window as any).gc === 'function') {
      try {
        (window as any).gc();
        console.log('[Memory Monitor] Forced garbage collection');
      } catch (error) {
        console.warn('[Memory Monitor] Failed to force garbage collection:', error);
      }
    }
  }

  /**
   * Perform memory cleanup
   */
  private static performCleanup(): void {
    // Clear unused cached data
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        const oldCaches = cacheNames.filter(name => 
          name.includes('old') || name.includes('temp')
        );
        oldCaches.forEach(cacheName => caches.delete(cacheName));
      });
    }

    // Clear large objects from memory
    this.cleanupLargeObjects();

    console.log('[Memory Monitor] Performed cleanup due to high memory usage');
  }

  /**
   * Cleanup large objects that might be causing memory leaks
   */
  private static cleanupLargeObjects(): void {
    // This would be customized based on specific application needs
    // For now, we'll trigger a general cleanup event
    window.dispatchEvent(new CustomEvent('memory-cleanup'));
  }
}

// Bundle analyzer class
class BundleAnalyzer {
  private static analysisCache = new Map<string, BundleAnalysisResult>();

  /**
   * Analyze current bundle performance
   */
  static async analyzeBundlePerformance(): Promise<BundleAnalysisResult> {
    const cacheKey = 'current-bundle-analysis';
    const cached = this.analysisCache.get(cacheKey);
    
    // Return cached result if less than 5 minutes old
    if (cached && (Date.now() - cached.timestamp) < 300000) {
      return cached;
    }

    const result: BundleAnalysisResult = {
      totalSize: 0,
      chunks: [],
      recommendations: [],
      performance: await this.getPerformanceMetrics(),
      timestamp: Date.now(),
    };

    // Analyze loaded scripts
    const scripts = document.querySelectorAll('script[src]');
    for (const script of scripts) {
      const src = (script as HTMLScriptElement).src;
      if (src && !src.startsWith('chrome-extension://')) {
        try {
          const size = await this.getResourceSize(src);
          result.totalSize += size;
          
          // Extract chunk name from URL
          const chunkName = this.extractChunkName(src);
          result.chunks.push({
            name: chunkName || 'unknown',
            size,
            modules: [], // Would be populated with detailed webpack stats
          });
        } catch (error) {
          console.warn(`[Bundle Analyzer] Failed to analyze script: ${src}`, error);
        }
      }
    }

    // Generate recommendations
    result.recommendations = this.generateRecommendations(result);

    // Cache result
    this.analysisCache.set(cacheKey, result);

    return result;
  }

  /**
   * Get performance metrics
   */
  private static async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const metrics: PerformanceMetrics = {};

    // Use Performance Observer if available
    if ('PerformanceObserver' in window) {
      try {
        const paintEntries = performance.getEntriesByType('paint');
        const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
        const lcp = paintEntries.find(entry => entry.name === 'largest-contentful-paint');

        if (fcp) metrics.fcp = fcp.startTime;
        if (lcp) metrics.lcp = lcp.startTime;

        // Navigation timing
        const navEntries = performance.getEntriesByType('navigation');
        if (navEntries.length > 0) {
          const nav = navEntries[0] as PerformanceNavigationTiming;
          metrics.ttfb = nav.responseStart - nav.requestStart;
        }
      } catch (error) {
        console.warn('[Bundle Analyzer] Failed to get performance metrics:', error);
      }
    }

    // Memory metrics
    metrics.memoryUsage = MemoryLeakPrevention.getMemoryStats();

    return metrics;
  }

  /**
   * Get resource size via fetch
   */
  private static async getResourceSize(url: string): Promise<number> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      return contentLength ? parseInt(contentLength, 10) : 0;
    } catch (error) {
      // Fallback: estimate based on URL or return default
      return 50000; // 50KB default estimate
    }
  }

  /**
   * Extract chunk name from script URL
   */
  private static extractChunkName(url: string): string | null {
    const matches = url.match(/\/([^\/]+)\.js$/);
    return matches ? matches[1] : null;
  }

  /**
   * Generate optimization recommendations
   */
  private static generateRecommendations(analysis: BundleAnalysisResult): string[] {
    const recommendations: string[] = [];

    // Bundle size recommendations
    if (analysis.totalSize > BUNDLE_CONFIG.SIZE_LIMITS.TOTAL_BUNDLE) {
      recommendations.push(
        `Total bundle size (${(analysis.totalSize / 1024 / 1024).toFixed(2)}MB) exceeds recommended limit. Consider code splitting.`
      );
    }

    // Large chunks
    const largeChunks = analysis.chunks.filter(
      chunk => chunk.size > BUNDLE_CONFIG.SIZE_LIMITS.VENDOR_CHUNK
    );
    if (largeChunks.length > 0) {
      recommendations.push(
        `Large chunks detected: ${largeChunks.map(c => c.name).join(', ')}. Consider splitting these chunks.`
      );
    }

    // Performance recommendations
    const { performance } = analysis;
    if (performance.fcp && performance.fcp > BUNDLE_CONFIG.PERFORMANCE_TARGETS.FIRST_CONTENTFUL_PAINT) {
      recommendations.push(
        `First Contentful Paint (${performance.fcp.toFixed(0)}ms) is slow. Optimize critical rendering path.`
      );
    }

    if (performance.lcp && performance.lcp > BUNDLE_CONFIG.PERFORMANCE_TARGETS.LARGEST_CONTENTFUL_PAINT) {
      recommendations.push(
        `Largest Contentful Paint (${performance.lcp.toFixed(0)}ms) is slow. Optimize main content loading.`
      );
    }

    // Memory recommendations
    if (performance.memoryUsage && performance.memoryUsage.percentage > 80) {
      recommendations.push(
        `High memory usage (${performance.memoryUsage.percentage.toFixed(1)}%). Consider memory optimization.`
      );
    }

    return recommendations;
  }

  /**
   * Generate performance report
   */
  static async generatePerformanceReport(): Promise<string> {
    const analysis = await this.analyzeBundlePerformance();
    const memoryStats = MemoryLeakPrevention.getMemoryStats();

    let report = '# Bundle Performance Report\n\n';
    
    report += `**Generated**: ${new Date(analysis.timestamp).toISOString()}\n\n`;
    
    report += '## Bundle Analysis\n\n';
    report += `- **Total Size**: ${(analysis.totalSize / 1024 / 1024).toFixed(2)}MB\n`;
    report += `- **Chunks**: ${analysis.chunks.length}\n`;
    report += `- **Largest Chunk**: ${Math.max(...analysis.chunks.map(c => c.size)) / 1024}KB\n\n`;

    if (analysis.performance.fcp) {
      report += '## Performance Metrics\n\n';
      report += `- **First Contentful Paint**: ${analysis.performance.fcp.toFixed(0)}ms\n`;
      if (analysis.performance.lcp) {
        report += `- **Largest Contentful Paint**: ${analysis.performance.lcp.toFixed(0)}ms\n`;
      }
      if (analysis.performance.ttfb) {
        report += `- **Time to First Byte**: ${analysis.performance.ttfb.toFixed(0)}ms\n`;
      }
      report += '\n';
    }

    if (memoryStats) {
      report += '## Memory Usage\n\n';
      report += `- **Used**: ${(memoryStats.used / 1024 / 1024).toFixed(2)}MB\n`;
      report += `- **Total**: ${(memoryStats.total / 1024 / 1024).toFixed(2)}MB\n`;
      if (memoryStats.limit) {
        report += `- **Limit**: ${(memoryStats.limit / 1024 / 1024).toFixed(2)}MB\n`;
      }
      report += `- **Usage**: ${memoryStats.percentage.toFixed(1)}%\n\n`;
    }

    if (analysis.recommendations.length > 0) {
      report += '## Recommendations\n\n';
      analysis.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
      report += '\n';
    }

    return report;
  }
}

// React hook for memory leak prevention
export function useMemoryLeakPrevention() {
  React.useEffect(() => {
    const cleanup = MemoryLeakPrevention.startMemoryMonitoring();
    
    return () => {
      cleanup();
    };
  }, []);

  React.useEffect(() => {
    return () => {
      MemoryLeakPrevention.cleanupAll();
    };
  }, []);

  return {
    addEventListener: MemoryLeakPrevention.addEventListenerWithCleanup,
    setInterval: MemoryLeakPrevention.setIntervalWithCleanup,
    setTimeout: MemoryLeakPrevention.setTimeoutWithCleanup,
    createObserver: MemoryLeakPrevention.createObserverWithCleanup,
    createAbortController: MemoryLeakPrevention.createAbortController,
    addSubscription: MemoryLeakPrevention.addSubscription,
    getMemoryStats: MemoryLeakPrevention.getMemoryStats,
  };
}

// Bundle size monitoring component
export const BundleSizeMonitor: React.FC<{ 
  onReport?: (report: string) => void;
  interval?: number;
}> = ({ onReport, interval = 300000 }) => {
  React.useEffect(() => {
    const generateReport = async () => {
      try {
        const report = await BundleAnalyzer.generatePerformanceReport();
        onReport?.(report);
        console.log('[Bundle Monitor] Performance report generated');
      } catch (error) {
        console.error('[Bundle Monitor] Failed to generate report:', error);
      }
    };

    // Generate initial report
    generateReport();

    // Set up periodic reporting
    const intervalId = setInterval(generateReport, interval);

    return () => clearInterval(intervalId);
  }, [onReport, interval]);

  return null;
};

// Export main classes and utilities
export {
  BundleAnalyzer,
  MemoryLeakPrevention,
  BUNDLE_CONFIG,
  type BundleAnalysisResult,
  type ChunkAnalysis,
  type PerformanceMetrics,
  type MemoryInfo,
};