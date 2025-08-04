/**
 * Cache Initialization and Setup for PERF-002 Caching Strategy
 * 
 * Centralized cache initialization with:
 * - Redis connection setup
 * - Performance monitoring startup
 * - Cache warming (optional)
 * - Health checks and diagnostics
 * 
 * Author: Claude Code Assistant
 * Date: 2025-08-04
 * Part of: PERF-002 Caching Strategy
 */

import { kpiCache, CachePerformanceMonitor } from './kpi-cache';
import { redisConnection } from './redis-config';

// Cache initialization configuration
interface CacheInitConfig {
  enableMonitoring: boolean;
  enableWarming: boolean;
  monitoringInterval: number;
  warmupTenants: string[];
  warmupInterval: number;
  healthCheckInterval: number;
}

const DEFAULT_INIT_CONFIG: CacheInitConfig = {
  enableMonitoring: process.env.CACHE_PERFORMANCE_MONITORING === 'true',
  enableWarming: process.env.CACHE_ENABLE_WARMUP === 'true',
  monitoringInterval: 5 * 60 * 1000, // 5 minutes
  warmupTenants: [], // To be populated from environment or config
  warmupInterval: 10 * 60 * 1000, // 10 minutes
  healthCheckInterval: 30 * 1000, // 30 seconds
};

// Cache system status
interface CacheSystemStatus {
  initialized: boolean;
  redisConnected: boolean;
  monitoringActive: boolean;
  warmupActive: boolean;
  lastHealthCheck: Date;
  errors: string[];
}

class CacheSystem {
  private static instance: CacheSystem;
  private config: CacheInitConfig;
  private status: CacheSystemStatus;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor(config?: Partial<CacheInitConfig>) {
    this.config = { ...DEFAULT_INIT_CONFIG, ...config };
    this.status = {
      initialized: false,
      redisConnected: false,
      monitoringActive: false,
      warmupActive: false,
      lastHealthCheck: new Date(),
      errors: [],
    };
  }

  static getInstance(config?: Partial<CacheInitConfig>): CacheSystem {
    if (!CacheSystem.instance) {
      CacheSystem.instance = new CacheSystem(config);
    }
    return CacheSystem.instance;
  }

  /**
   * Initialize the complete cache system
   */
  async initialize(): Promise<void> {
    if (this.status.initialized) {
      console.log('[Cache System] Already initialized');
      return;
    }

    console.log('[Cache System] Initializing caching system...');

    try {
      // Step 1: Test Redis connection
      await this.initializeRedis();

      // Step 2: Start performance monitoring
      if (this.config.enableMonitoring) {
        await this.startMonitoring();
      }

      // Step 3: Start cache warming (if enabled)
      if (this.config.enableWarming && this.config.warmupTenants.length > 0) {
        await this.startCacheWarming();
      }

      // Step 4: Start health monitoring
      this.startHealthCheck();

      // Mark as initialized
      this.status.initialized = true;

      console.log('[Cache System] ✅ Cache system initialized successfully');
      await this.logSystemStatus();

    } catch (error) {
      const errorMsg = `Cache system initialization failed: ${error.message}`;
      this.status.errors.push(errorMsg);
      console.error(`[Cache System] ❌ ${errorMsg}`);
      throw error;
    }
  }

  /**
   * Initialize Redis connection
   */
  private async initializeRedis(): Promise<void> {
    try {
      console.log('[Cache System] Testing Redis connection...');
      
      const isConnected = await kpiCache.testRedisConnection();
      this.status.redisConnected = isConnected;

      if (isConnected) {
        const redisInfo = await kpiCache.getRedisInfo();
        console.log('[Cache System] ✅ Redis connected successfully');
        console.log('[Cache System] Redis details:', {
          connected: redisInfo.connected,
          connectionType: redisInfo.connectionDetails.isCluster ? 'Cluster' : 'Single',
        });
      } else {
        console.warn('[Cache System] ⚠️ Redis not available - operating in degraded mode');
      }
    } catch (error) {
      console.warn('[Cache System] ⚠️ Redis connection failed - continuing without Redis:', error.message);
      this.status.redisConnected = false;
    }
  }

  /**
   * Start performance monitoring
   */
  private async startMonitoring(): Promise<void> {
    try {
      CachePerformanceMonitor.startMonitoring(this.config.monitoringInterval);
      this.status.monitoringActive = true;
      console.log('[Cache System] ✅ Performance monitoring started');
    } catch (error) {
      const errorMsg = `Failed to start monitoring: ${error.message}`;
      this.status.errors.push(errorMsg);
      console.error(`[Cache System] ❌ ${errorMsg}`);
    }
  }

  /**
   * Start cache warming
   */
  private async startCacheWarming(): Promise<void> {
    try {
      CachePerformanceMonitor.startCacheWarming({
        tenants: this.config.warmupTenants,
        intervalMs: this.config.warmupInterval,
        maxConcurrent: 3,
      });
      this.status.warmupActive = true;
      console.log(`[Cache System] ✅ Cache warming started for ${this.config.warmupTenants.length} tenants`);
    } catch (error) {
      const errorMsg = `Failed to start cache warming: ${error.message}`;
      this.status.errors.push(errorMsg);
      console.error(`[Cache System] ❌ ${errorMsg}`);
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, this.config.healthCheckInterval);

    console.log('[Cache System] ✅ Health monitoring started');
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      this.status.lastHealthCheck = new Date();

      // Test Redis connection
      if (this.config.enableMonitoring) {
        const wasConnected = this.status.redisConnected;
        this.status.redisConnected = await kpiCache.testRedisConnection();

        // Log connection status changes
        if (wasConnected !== this.status.redisConnected) {
          if (this.status.redisConnected) {
            console.log('[Cache System] ✅ Redis connection restored');
          } else {
            console.warn('[Cache System] ⚠️ Redis connection lost');
          }
        }
      }

      // Check cache performance
      const stats = kpiCache.getStats();
      if (stats.totalHitRate < 70 && (stats.hits + stats.misses) > 100) {
        console.warn(`[Cache System] ⚠️ Low cache hit rate: ${stats.totalHitRate.toFixed(2)}%`);
      }

    } catch (error) {
      console.error('[Cache System] Health check failed:', error);
    }
  }

  /**
   * Log system status
   */
  private async logSystemStatus(): Promise<void> {
    const stats = kpiCache.getStats();
    const redisInfo = await kpiCache.getRedisInfo();

    console.log('[Cache System] System Status:', {
      initialized: this.status.initialized,
      redis: {
        enabled: stats.redisEnabled,
        connected: this.status.redisConnected,
        status: stats.redisConnectionStatus,
      },
      monitoring: {
        active: this.status.monitoringActive,
        interval: `${this.config.monitoringInterval / 1000}s`,
      },
      warming: {
        active: this.status.warmupActive,
        tenants: this.config.warmupTenants.length,
      },
      performance: {
        hitRate: `${stats.totalHitRate.toFixed(2)}%`,
        memoryEntries: stats.memoryEntries,
        redisHits: stats.redisHits,
        redisErrors: stats.redisErrors,
      },
      errors: this.status.errors.length,
    });
  }

  /**
   * Get system status
   */
  getStatus(): CacheSystemStatus & {
    config: CacheInitConfig;
    stats: ReturnType<typeof kpiCache.getStats>;
  } {
    return {
      ...this.status,
      config: this.config,
      stats: kpiCache.getStats(),
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('[Cache System] Shutting down cache system...');

    // Stop health check
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Stop monitoring
    if (this.status.monitoringActive) {
      CachePerformanceMonitor.stopMonitoring();
      this.status.monitoringActive = false;
    }

    // Disconnect from Redis
    try {
      await redisConnection.disconnect();
      this.status.redisConnected = false;
    } catch (error) {
      console.warn('[Cache System] Error during Redis disconnect:', error);
    }

    this.status.initialized = false;
    console.log('[Cache System] ✅ Shutdown complete');
  }

  /**
   * Diagnostic information for troubleshooting
   */
  async getDiagnostics(): Promise<{
    system: CacheSystemStatus;
    redis: any;
    performance: any;
    recommendations: string[];
  }> {
    const redisInfo = await kpiCache.getRedisInfo();
    const stats = kpiCache.getStats();
    const recommendations: string[] = [];

    // Generate recommendations
    if (!this.status.redisConnected && stats.redisEnabled) {
      recommendations.push('Redis is enabled but not connected - check Redis server and configuration');
    }

    if (stats.totalHitRate < 80 && (stats.hits + stats.misses) > 50) {
      recommendations.push(`Hit rate is ${stats.totalHitRate.toFixed(2)}% (target: 80%) - consider enabling cache warming`);
    }

    if (stats.redisErrors > stats.redisHits * 0.1) {
      recommendations.push('High Redis error rate - check network connectivity and Redis server health');
    }

    if (!this.status.monitoringActive) {
      recommendations.push('Performance monitoring is disabled - enable for better observability');
    }

    return {
      system: this.status,
      redis: redisInfo,
      performance: stats,
      recommendations,
    };
  }
}

// Export singleton instance
export const cacheSystem = CacheSystem.getInstance();

// Convenience functions
export async function initializeCache(config?: Partial<CacheInitConfig>): Promise<void> {
  const system = CacheSystem.getInstance(config);
  await system.initialize();
}

export async function shutdownCache(): Promise<void> {
  await cacheSystem.shutdown();
}

export function getCacheSystemStatus() {
  return cacheSystem.getStatus();
}

export async function getCacheDiagnostics() {
  return await cacheSystem.getDiagnostics();
}

// React hooks for status monitoring
export function useCacheSystemStatus() {
  return cacheSystem.getStatus();
}

// Next.js integration - call this in your app startup
export async function setupCacheForNextJS(): Promise<void> {
  if (typeof window === 'undefined') {
    // Server-side initialization
    const warmupTenants = process.env.CACHE_WARMUP_TENANTS 
      ? process.env.CACHE_WARMUP_TENANTS.split(',') 
      : [];

    await initializeCache({
      enableMonitoring: process.env.CACHE_PERFORMANCE_MONITORING === 'true',
      enableWarming: process.env.CACHE_ENABLE_WARMUP === 'true' && warmupTenants.length > 0,
      warmupTenants,
    });

    // Set up graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down cache system...');
      await shutdownCache();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      console.log('SIGINT received, shutting down cache system...');
      await shutdownCache();
      process.exit(0);
    });
  }
}

// Export types
export type { CacheInitConfig, CacheSystemStatus };