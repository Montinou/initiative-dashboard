/**
 * KPI Cache Management System with Redis Integration
 * 
 * Enhanced intelligent caching for KPI dashboard data with:
 * - Multi-level caching (Redis + memory + localStorage)
 * - Role-based cache keys for security
 * - Smart invalidation on data updates
 * - Performance monitoring with >80% hit rate target
 * - Redis clustering and failover support
 * - Graceful fallback when Redis unavailable
 * 
 * Author: Claude Code Assistant
 * Date: 2025-08-04
 * Part of: PERF-002 Caching Strategy (Enhanced from PERF-001)
 */

// Define UserRole enum here to avoid import issues during compilation
export enum UserRole {
  CEO = 'CEO',
  Manager = 'Manager',
  Analyst = 'Analyst'
}
import { RedisUtils, redisConnection, type RedisConfig } from './redis-config';

// Enhanced cache configuration with Redis integration
const CACHE_CONFIG = {
  // TTL in milliseconds (memory cache)
  TTL: {
    DASHBOARD_DATA: 5 * 60 * 1000,    // 5 minutes
    KPI_METRICS: 15 * 60 * 1000,      // 15 minutes
    INITIATIVE_LIST: 2 * 60 * 1000,   // 2 minutes
    AREA_DATA: 30 * 60 * 1000,        // 30 minutes
    USER_PROFILE: 60 * 60 * 1000,     // 1 hour
  },
  // TTL in seconds (Redis cache - longer than memory)
  REDIS_TTL: {
    DASHBOARD_DATA: 10 * 60,          // 10 minutes
    KPI_METRICS: 30 * 60,             // 30 minutes
    INITIATIVE_LIST: 5 * 60,          // 5 minutes
    AREA_DATA: 60 * 60,               // 1 hour
    USER_PROFILE: 2 * 60 * 60,        // 2 hours
  },
  // Cache layer priorities
  LAYERS: {
    REDIS_ENABLED: process.env.REDIS_ENABLED !== 'false',
    MEMORY_FIRST: true,
    REDIS_FALLBACK_TIMEOUT: 100, // ms
  },
  // Maximum cache entries per type
  MAX_ENTRIES: {
    DASHBOARD_DATA: 100,
    KPI_METRICS: 50,
    INITIATIVE_LIST: 200,
    AREA_DATA: 20,
    USER_PROFILE: 50,
  },
  // Cache storage preferences
  STORAGE: {
    MEMORY_FIRST: true,
    PERSIST_TO_LOCALSTORAGE: true,
    COMPRESS_LARGE_ENTRIES: true,
  }
} as const;

// Cache entry interface
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  compressed?: boolean;
}

// Enhanced cache statistics interface
interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  memoryUsage: number;
  lastCleanup: number;
  // Redis-specific stats
  redisHits: number;
  redisMisses: number;
  redisErrors: number;
  redisConnectionStatus: 'connected' | 'disconnected' | 'error' | 'connecting';
  layerDistribution: {
    memory: number;
    redis: number;
    localStorage: number;
    api: number;
  };
}

// Cache key generation
class CacheKeyGenerator {
  /**
   * Generate role-based cache key for security
   */
  static generateKey(
    type: keyof typeof CACHE_CONFIG.TTL,
    params: {
      tenantId: string;
      userId?: string;
      userRole?: UserRole;
      areaId?: string;
      filters?: Record<string, any>;
    }
  ): string {
    const { tenantId, userId, userRole, areaId, filters } = params;
    
    // Base key with tenant isolation
    let key = `cache:${type}:tenant:${tenantId}`;
    
    // Add role-based suffix for security
    if (userRole) {
      key += `:role:${userRole}`;
      
      // Managers only see their area data
      if (userRole === 'Manager' && areaId) {
        key += `:area:${areaId}`;
      }
    }
    
    // Add user-specific data for personalized caches
    if (userId && (type === 'DASHBOARD_DATA' || type === 'USER_PROFILE')) {
      key += `:user:${userId}`;
    }
    
    // Add filters hash for query-specific caching
    if (filters && Object.keys(filters).length > 0) {
      const filterHash = this.hashObject(filters);
      key += `:filters:${filterHash}`;
    }
    
    return key;
  }
  
  /**
   * Generate simple hash for object
   */
  private static hashObject(obj: Record<string, any>): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// Enhanced cache manager class with Redis integration
class KPICacheManager {
  private memoryCache = new Map<string, CacheEntry>();
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalEntries: 0,
    memoryUsage: 0,
    lastCleanup: Date.now(),
    // Redis-specific stats
    redisHits: 0,
    redisMisses: 0,
    redisErrors: 0,
    redisConnectionStatus: 'disconnected',
    layerDistribution: {
      memory: 0,
      redis: 0,
      localStorage: 0,
      api: 0,
    },
  };
  
  private redisEnabled = CACHE_CONFIG.LAYERS.REDIS_ENABLED && typeof window === 'undefined';
  
  private compressionThreshold = 50 * 1024; // 50KB
  
  /**
   * Get cached data with intelligent multi-layer fallback
   * Order: Memory -> Redis -> localStorage -> null
   */
  async get<T>(
    type: keyof typeof CACHE_CONFIG.TTL,
    params: Parameters<typeof CacheKeyGenerator.generateKey>[1]
  ): Promise<T | null> {
    const key = CacheKeyGenerator.generateKey(type, params);
    
    // Layer 1: Try memory cache first (fastest)
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && this.isValid(memoryEntry)) {
      this.updateAccessStats(memoryEntry);
      this.stats.hits++;
      this.stats.layerDistribution.memory++;
      this.updateHitRate();
      
      return this.deserializeData<T>(memoryEntry);
    }
    
    // Layer 2: Try Redis cache (distributed)
    if (this.redisEnabled) {
      try {
        const redisValue = await this.getFromRedis<T>(key);
        if (redisValue !== null) {
          // Promote to memory cache for faster subsequent access
          await this.promoteToMemoryCache(key, redisValue, type);
          
          this.stats.hits++;
          this.stats.redisHits++;
          this.stats.layerDistribution.redis++;
          this.updateHitRate();
          
          return redisValue;
        }
        this.stats.redisMisses++;
      } catch (error) {
        console.warn(`[KPI Cache] Redis get failed for key "${key}":`, error);
        this.stats.redisErrors++;
        // Continue to localStorage fallback
      }
    }
    
    // Layer 3: Try localStorage cache (persistent)
    if (CACHE_CONFIG.STORAGE.PERSIST_TO_LOCALSTORAGE) {
      const localEntry = await this.getFromLocalStorage<T>(key);
      if (localEntry && this.isValid(localEntry)) {
        // Promote to memory and Redis cache
        this.memoryCache.set(key, localEntry);
        if (this.redisEnabled) {
          await this.setToRedis(key, localEntry.data, type);
        }
        
        this.updateAccessStats(localEntry);
        this.stats.hits++;
        this.stats.layerDistribution.localStorage++;
        this.updateHitRate();
        
        return this.deserializeData<T>(localEntry);
      }
    }
    
    // Cache miss across all layers
    this.stats.misses++;
    this.stats.layerDistribution.api++;
    this.updateHitRate();
    
    return null;
  }
  
  /**
   * Set cached data across all cache layers with intelligent distribution
   */
  async set<T>(
    type: keyof typeof CACHE_CONFIG.TTL,
    params: Parameters<typeof CacheKeyGenerator.generateKey>[1],
    data: T
  ): Promise<void> {
    const key = CacheKeyGenerator.generateKey(type, params);
    const memoryTtl = CACHE_CONFIG.TTL[type];
    const redisTtl = CACHE_CONFIG.REDIS_TTL[type];
    
    // Serialize and optionally compress data
    const serializedData = await this.serializeData(data);
    const shouldCompress = serializedData.length > this.compressionThreshold;
    
    const entry: CacheEntry<T> = {
      data: shouldCompress ? await this.compressData(serializedData) : data,
      timestamp: Date.now(),
      ttl: memoryTtl,
      accessCount: 0,
      lastAccessed: Date.now(),
      size: serializedData.length,
      compressed: shouldCompress,
    };
    
    // Set in memory cache (fastest access)
    this.memoryCache.set(key, entry);
    
    // Set in Redis cache (distributed, longer TTL)
    if (this.redisEnabled) {
      await this.setToRedis(key, data, type);
    }
    
    // Enforce memory limits
    await this.enforceMemoryLimits(type);
    
    // Persist to localStorage if configured (smallest entries only)
    if (CACHE_CONFIG.STORAGE.PERSIST_TO_LOCALSTORAGE && entry.size < 50 * 1024) {
      await this.setToLocalStorage(key, entry);
    }
    
    this.updateStats();
  }
  
  /**
   * Invalidate cache entries across all layers based on patterns
   */
  async invalidate(patterns: {
    tenantId?: string;
    areaId?: string;
    userId?: string;
    type?: keyof typeof CACHE_CONFIG.TTL;
    forceAll?: boolean;
  }): Promise<number> {
    let invalidatedCount = 0;
    const keysToDelete: string[] = [];
    
    // Find keys to invalidate in memory cache
    const entries = Array.from(this.memoryCache.entries());
    for (const [key, entry] of entries) {
      let shouldInvalidate = false;
      
      if (patterns.forceAll) {
        shouldInvalidate = true;
      } else {
        if (patterns.tenantId && key.includes(`tenant:${patterns.tenantId}`)) {
          shouldInvalidate = true;
        }
        if (patterns.areaId && key.includes(`area:${patterns.areaId}`)) {
          shouldInvalidate = true;
        }
        if (patterns.userId && key.includes(`user:${patterns.userId}`)) {
          shouldInvalidate = true;
        }
        if (patterns.type && key.includes(`cache:${patterns.type}:`)) {
          shouldInvalidate = true;
        }
      }
      
      if (shouldInvalidate) {
        keysToDelete.push(key);
      }
    }
    
    // Remove from memory cache
    keysToDelete.forEach(key => {
      this.memoryCache.delete(key);
      invalidatedCount++;
    });
    
    // Remove from Redis cache
    if (this.redisEnabled) {
      try {
        const redisPattern = this.buildRedisInvalidationPattern(patterns);
        const redisDeleted = await RedisUtils.delPattern(redisPattern);
        console.log(`[KPI Cache] Invalidated ${redisDeleted} Redis cache entries`);
      } catch (error) {
        console.warn('[KPI Cache] Redis invalidation failed:', error);
        this.stats.redisErrors++;
      }
    }
    
    // Remove from localStorage
    if (CACHE_CONFIG.STORAGE.PERSIST_TO_LOCALSTORAGE) {
      await this.removeFromLocalStorage(keysToDelete);
    }
    
    this.updateStats();
    
    console.log(`[KPI Cache] Invalidated ${invalidatedCount} memory cache entries`);
    return invalidatedCount;
  }
  
  /**
   * Smart cache cleanup based on LRU and expiration
   */
  async cleanup(force: boolean = false): Promise<void> {
    const now = Date.now();
    const cleanupInterval = 10 * 60 * 1000; // 10 minutes
    
    if (!force && (now - this.stats.lastCleanup) < cleanupInterval) {
      return;
    }
    
    let cleanedCount = 0;
    const keysToDelete: string[] = [];
    
    // Remove expired entries
    for (const [key, entry] of this.memoryCache.entries()) {
      if (!this.isValid(entry)) {
        keysToDelete.push(key);
        cleanedCount++;
      }
    }
    
    // Remove based on LRU if still over limits
    if (this.memoryCache.size > 500) { // Global limit
      const sortedEntries = Array.from(this.memoryCache.entries())
        .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
      
      const toRemove = sortedEntries.slice(0, Math.floor(sortedEntries.length * 0.1));
      toRemove.forEach(([key]) => {
        keysToDelete.push(key);
        cleanedCount++;
      });
    }
    
    // Execute cleanup
    keysToDelete.forEach(key => this.memoryCache.delete(key));
    
    if (CACHE_CONFIG.STORAGE.PERSIST_TO_LOCALSTORAGE) {
      await this.removeFromLocalStorage(keysToDelete);
    }
    
    this.stats.lastCleanup = now;
    this.updateStats();
    
    if (cleanedCount > 0) {
      console.log(`[KPI Cache] Cleaned up ${cleanedCount} cache entries`);
    }
  }
  
  /**
   * Get comprehensive cache statistics including Redis metrics
   */
  getStats(): CacheStats & {
    memoryEntries: number;
    avgEntrySize: number;
    typeDistribution: Record<string, number>;
    redisEnabled: boolean;
    totalHitRate: number;
    layerHitRates: {
      memory: number;
      redis: number;
      localStorage: number;
    };
  } {
    const typeDistribution: Record<string, number> = {};
    let totalSize = 0;
    
    const keyEntries = Array.from(this.memoryCache.entries());
    for (const [key] of keyEntries) {
      const type = key.split(':')[1];
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    }
    
    const valueEntries = Array.from(this.memoryCache.values());
    for (const entry of valueEntries) {
      totalSize += entry.size;
    }
    
    // Calculate layer-specific hit rates
    const totalRequests = this.stats.hits + this.stats.misses;
    const layerTotal = this.stats.layerDistribution.memory + 
                      this.stats.layerDistribution.redis + 
                      this.stats.layerDistribution.localStorage + 
                      this.stats.layerDistribution.api;
    
    return {
      ...this.stats,
      memoryEntries: this.memoryCache.size,
      avgEntrySize: this.memoryCache.size > 0 ? totalSize / this.memoryCache.size : 0,
      typeDistribution,
      redisEnabled: this.redisEnabled,
      totalHitRate: totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0,
      layerHitRates: {
        memory: layerTotal > 0 ? (this.stats.layerDistribution.memory / layerTotal) * 100 : 0,
        redis: layerTotal > 0 ? (this.stats.layerDistribution.redis / layerTotal) * 100 : 0,
        localStorage: layerTotal > 0 ? (this.stats.layerDistribution.localStorage / layerTotal) * 100 : 0,
      },
    };
  }
  
  // Private helper methods
  
  private isValid(entry: CacheEntry): boolean {
    return (Date.now() - entry.timestamp) < entry.ttl;
  }
  
  private updateAccessStats(entry: CacheEntry): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();
  }
  
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }
  
  private updateStats(): void {
    this.stats.totalEntries = this.memoryCache.size;
    this.stats.memoryUsage = Array.from(this.memoryCache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
  }
  
  private async enforceMemoryLimits(type: keyof typeof CACHE_CONFIG.TTL): Promise<void> {
    const maxEntries = CACHE_CONFIG.MAX_ENTRIES[type];
    const typePrefix = `cache:${type}:`;
    
    const allEntries = Array.from(this.memoryCache.entries());
    const typeEntries = allEntries
      .filter(([key]) => key.startsWith(typePrefix))
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);
    
    if (typeEntries.length > maxEntries) {
      const toRemove = typeEntries.slice(0, typeEntries.length - maxEntries);
      toRemove.forEach(([key]) => this.memoryCache.delete(key));
    }
  }
  
  private async serializeData<T>(data: T): Promise<string> {
    return JSON.stringify(data);
  }
  
  private async deserializeData<T>(entry: CacheEntry): Promise<T> {
    if (entry.compressed) {
      const decompressed = await this.decompressData(entry.data);
      return JSON.parse(decompressed);
    }
    return entry.data;
  }
  
  private async compressData(data: string): Promise<string> {
    // Simple compression using built-in browser APIs
    if (typeof CompressionStream !== 'undefined') {
      const compressed = new CompressionStream('gzip');
      const writer = compressed.writable.getWriter();
      const reader = compressed.readable.getReader();
      
      writer.write(new TextEncoder().encode(data));
      writer.close();
      
      const chunks: Uint8Array[] = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }
      
      const compressed_data = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      chunks.forEach(chunk => {
        compressed_data.set(chunk, offset);
        offset += chunk.length;
      });
      
      return btoa(String.fromCharCode.apply(null, Array.from(compressed_data)));
    }
    
    // Fallback: no compression
    return data;
  }
  
  private async decompressData(compressedData: string): Promise<string> {
    if (typeof DecompressionStream !== 'undefined') {
      const binaryData = Uint8Array.from(atob(compressedData), c => c.charCodeAt(0));
      const decompressed = new DecompressionStream('gzip');
      const writer = decompressed.writable.getWriter();
      const reader = decompressed.readable.getReader();
      
      writer.write(binaryData);
      writer.close();
      
      const chunks: Uint8Array[] = [];
      let done = false;
      
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) chunks.push(value);
      }
      
      const decompressed_data = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
      let offset = 0;
      chunks.forEach(chunk => {
        decompressed_data.set(chunk, offset);
        offset += chunk.length;
      });
      
      return new TextDecoder().decode(decompressed_data);
    }
    
    // Fallback: no decompression
    return compressedData;
  }
  
  private async getFromLocalStorage<T>(key: string): Promise<CacheEntry<T> | null> {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      
      return JSON.parse(stored) as CacheEntry<T>;
    } catch (error) {
      console.warn(`[KPI Cache] Failed to read from localStorage:`, error);
      return null;
    }
  }
  
  private async setToLocalStorage<T>(key: string, entry: CacheEntry<T>): Promise<void> {
    try {
      // Only store smaller entries in localStorage to avoid quota issues
      if (entry.size < 100 * 1024) { // 100KB limit
        localStorage.setItem(key, JSON.stringify(entry));
      }
    } catch (error) {
      console.warn(`[KPI Cache] Failed to write to localStorage:`, error);
    }
  }
  
  private async removeFromLocalStorage(keys: string[]): Promise<void> {
    keys.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`[KPI Cache] Failed to remove from localStorage:`, error);
      }
    });
  }

  // ============================================================================
  // REDIS-SPECIFIC CACHE METHODS
  // ============================================================================

  /**
   * Get data from Redis cache with timeout
   */
  private async getFromRedis<T>(key: string): Promise<T | null> {
    // Only work on server-side
    if (typeof window !== 'undefined') {
      return null;
    }

    try {
      const timeoutPromise = new Promise<null>((_, reject) => {
        setTimeout(() => reject(new Error('Redis timeout')), CACHE_CONFIG.LAYERS.REDIS_FALLBACK_TIMEOUT);
      });
      
      const result = await Promise.race([
        RedisUtils.get<T>(key),
        timeoutPromise
      ]);
      
      this.updateRedisConnectionStatus('connected');
      return result;
    } catch (error) {
      if (error.message === 'Redis timeout') {
        console.warn(`[KPI Cache] Redis get timeout for key "${key}"`);
      } else {
        console.warn(`[KPI Cache] Redis get failed for key "${key}":`, error);
      }
      this.updateRedisConnectionStatus('error');
      throw error;
    }
  }

  /**
   * Set data to Redis cache with TTL
   */
  private async setToRedis<T>(key: string, data: T, type: keyof typeof CACHE_CONFIG.TTL): Promise<void> {
    if (!this.redisEnabled || typeof window !== 'undefined') return;
    
    try {
      const ttlSeconds = CACHE_CONFIG.REDIS_TTL[type];
      const success = await RedisUtils.set(key, data, ttlSeconds);
      
      if (success) {
        this.updateRedisConnectionStatus('connected');
      } else {
        throw new Error('Redis set returned false');
      }
    } catch (error) {
      console.warn(`[KPI Cache] Redis set failed for key "${key}":`, error);
      this.stats.redisErrors++;
      this.updateRedisConnectionStatus('error');
      // Don't throw - graceful degradation
    }
  }

  /**
   * Promote data from Redis to memory cache
   */
  private async promoteToMemoryCache<T>(key: string, data: T, type: keyof typeof CACHE_CONFIG.TTL): Promise<void> {
    try {
      const serializedData = await this.serializeData(data);
      const shouldCompress = serializedData.length > this.compressionThreshold;
      
      const entry: CacheEntry<T> = {
        data: shouldCompress ? await this.compressData(serializedData) : data,
        timestamp: Date.now(),
        ttl: CACHE_CONFIG.TTL[type],
        accessCount: 1,
        lastAccessed: Date.now(),
        size: serializedData.length,
        compressed: shouldCompress,
      };
      
      this.memoryCache.set(key, entry);
      await this.enforceMemoryLimits(type);
    } catch (error) {
      console.warn(`[KPI Cache] Failed to promote to memory cache:`, error);
    }
  }

  /**
   * Build Redis invalidation pattern from filter criteria
   */
  private buildRedisInvalidationPattern(patterns: {
    tenantId?: string;
    areaId?: string;
    userId?: string;
    type?: keyof typeof CACHE_CONFIG.TTL;
    forceAll?: boolean;
  }): string {
    if (patterns.forceAll) {
      return 'cache:*';
    }
    
    let pattern = 'cache:';
    
    if (patterns.type) {
      pattern += `${patterns.type}:`;
    } else {
      pattern += '*:';
    }
    
    if (patterns.tenantId) {
      pattern += `tenant:${patterns.tenantId}:`;
      
      if (patterns.areaId) {
        pattern += `*area:${patterns.areaId}*`;
      } else if (patterns.userId) {
        pattern += `*user:${patterns.userId}*`;
      } else {
        pattern += '*';
      }
    } else {
      pattern += '*';
    }
    
    return pattern;
  }

  /**
   * Update Redis connection status in stats
   */
  private updateRedisConnectionStatus(status: CacheStats['redisConnectionStatus']): void {
    this.stats.redisConnectionStatus = status;
  }

  /**
   * Warm up cache by pre-loading frequently accessed data
   */
  async warmCache(warmupData: {
    type: keyof typeof CACHE_CONFIG.TTL;
    params: Parameters<typeof CacheKeyGenerator.generateKey>[1];
    data: any;
  }[]): Promise<void> {
    console.log(`[KPI Cache] Warming up cache with ${warmupData.length} entries`);
    
    const promises = warmupData.map(async ({ type, params, data }) => {
      try {
        await this.set(type, params, data);
      } catch (error) {
        console.warn(`[KPI Cache] Failed to warm cache entry:`, error);
      }
    });
    
    await Promise.allSettled(promises);
    console.log(`[KPI Cache] Cache warmup completed`);
  }

  /**
   * Test Redis connection and update stats
   */
  async testRedisConnection(): Promise<boolean> {
    if (!this.redisEnabled) {
      this.updateRedisConnectionStatus('disconnected');
      return false;
    }
    
    try {
      const isConnected = await RedisUtils.ping();
      this.updateRedisConnectionStatus(isConnected ? 'connected' : 'error');
      return isConnected;
    } catch (error) {
      console.error('[KPI Cache] Redis connection test failed:', error);
      this.updateRedisConnectionStatus('error');
      return false;
    }
  }

  /**
   * Get Redis info and statistics
   */
  async getRedisInfo(): Promise<{
    connected: boolean;
    info: string | null;
    connectionDetails: any;
  }> {
    const connected = await this.testRedisConnection();
    let info = null;
    
    if (connected) {
      try {
        info = await RedisUtils.info();
      } catch (error) {
        console.warn('[KPI Cache] Failed to get Redis info:', error);
      }
    }
    
    return {
      connected,
      info,
      connectionDetails: RedisUtils.getConnectionInfo(),
    };
  }

}

// Singleton cache manager instance
export const kpiCache = new KPICacheManager();

// Enhanced cache-aware data fetching utilities with Redis integration
export class CachedDataFetcher {
  /**
   * Fetch dashboard data with intelligent multi-layer caching
   */
  static async getDashboardData(params: {
    tenantId: string;
    userId: string;
    userRole: UserRole;
    areaId?: string;
    filters?: Record<string, any>;
    forceRefresh?: boolean;
    useWarmCache?: boolean;
  }) {
    const { tenantId, userId, userRole, areaId, filters, forceRefresh, useWarmCache } = params;
    
    // Try cache first (unless forced refresh)
    if (!forceRefresh) {
      const cached = await kpiCache.get('DASHBOARD_DATA', {
        tenantId,
        userId,
        userRole,
        areaId,
        filters,
      });
      
      if (cached) {
        console.log(`[KPI Cache] Cache hit for dashboard data`);
        
        // If using warm cache, trigger background refresh for next request
        if (useWarmCache) {
          this.backgroundRefreshDashboardData(params);
        }
        
        return cached as any;
      }
    }
    
    console.log(`[KPI Cache] Cache miss for dashboard data - fetching from API`);
    
    // Fetch from API with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch('/api/dashboard/kpi-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, userRole, areaId, filters }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch dashboard data: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the result across all layers
      await kpiCache.set('DASHBOARD_DATA', {
        tenantId,
        userId,
        userRole,
        areaId,
        filters,
      }, data);
      
      return data;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Dashboard data request timed out');
      }
      
      throw error;
    }
  }
  
  /**
   * Background refresh for warm cache strategy
   */
  private static async backgroundRefreshDashboardData(params: {
    tenantId: string;
    userId: string;
    userRole: UserRole;
    areaId?: string;
    filters?: Record<string, any>;
  }) {
    try {
      console.log(`[KPI Cache] Background refresh triggered for dashboard data`);
      await this.getDashboardData({ ...params, forceRefresh: true });
    } catch (error) {
      console.warn(`[KPI Cache] Background refresh failed:`, error);
    }
  }
  
  /**
   * Fetch KPI metrics with enhanced caching and batch optimization
   */
  static async getKPIMetrics(params: {
    tenantId: string;
    userRole: UserRole;
    areaId?: string;
    forceRefresh?: boolean;
    batchWithRelated?: boolean;
  }) {
    const { tenantId, userRole, areaId, forceRefresh, batchWithRelated } = params;
    
    if (!forceRefresh) {
      const cached = await kpiCache.get('KPI_METRICS', {
        tenantId,
        userRole,
        areaId,
      });
      
      if (cached) {
        console.log(`[KPI Cache] Cache hit for KPI metrics`);
        return cached;
      }
    }
    
    console.log(`[KPI Cache] Cache miss for KPI metrics - fetching from API`);
    
    try {
      const response = await fetch('/api/analytics/kpi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, userRole, areaId }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch KPI metrics: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Cache the result
      await kpiCache.set('KPI_METRICS', {
        tenantId,
        userRole,
        areaId,
      }, data);
      
      // If batch mode, also fetch and cache related data
      if (batchWithRelated) {
        this.batchCacheRelatedData(tenantId, userRole, areaId);
      }
      
      return data;
    } catch (error) {
      console.error(`[KPI Cache] Failed to fetch KPI metrics:`, error);
      throw error;
    }
  }
  
  /**
   * Batch cache related data for improved performance
   */
  private static async batchCacheRelatedData(
    tenantId: string, 
    userRole: UserRole, 
    areaId?: string
  ) {
    try {
      const promises = [];
      
      // Cache initiative list
      promises.push(
        this.getInitiativeList({ tenantId, userRole, areaId })
      );
      
      // Cache area data if not area-specific request
      if (!areaId && userRole !== 'Manager') {
        promises.push(
          this.getAreaData({ tenantId })
        );
      }
      
      await Promise.allSettled(promises);
      console.log(`[KPI Cache] Batch cached related data`);
    } catch (error) {
      console.warn(`[KPI Cache] Batch caching failed:`, error);
    }
  }
  
  /**
   * Fetch initiative list with caching
   */
  static async getInitiativeList(params: {
    tenantId: string;
    userRole: UserRole;
    areaId?: string;
    forceRefresh?: boolean;
  }) {
    const { tenantId, userRole, areaId, forceRefresh } = params;
    
    if (!forceRefresh) {
      const cached = await kpiCache.get('INITIATIVE_LIST', {
        tenantId,
        userRole,
        areaId,
      });
      
      if (cached) {
        return cached;
      }
    }
    
    // Fetch from API (implementation depends on your API structure)
    const response = await fetch('/api/initiatives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId, userRole, areaId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch initiatives: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    await kpiCache.set('INITIATIVE_LIST', {
      tenantId,
      userRole,
      areaId,
    }, data);
    
    return data;
  }
  
  /**
   * Fetch area data with caching
   */
  static async getAreaData(params: {
    tenantId: string;
    forceRefresh?: boolean;
  }) {
    const { tenantId, forceRefresh } = params;
    
    if (!forceRefresh) {
      const cached = await kpiCache.get('AREA_DATA', {
        tenantId,
      });
      
      if (cached) {
        return cached;
      }
    }
    
    const response = await fetch('/api/areas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId }),
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch areas: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    await kpiCache.set('AREA_DATA', {
      tenantId,
    }, data);
    
    return data;
  }
}

// Enhanced cache invalidation manager with Redis support
export class CacheInvalidationManager {
  /**
   * Invalidate cache when initiatives are modified with smart patterns
   */
  static async onInitiativeChange(params: {
    tenantId: string;
    areaId?: string;
    initiativeId?: string;
    changeType?: 'create' | 'update' | 'delete' | 'status_change';
  }) {
    const { tenantId, areaId, initiativeId, changeType } = params;
    
    console.log(`[Cache Invalidation] Initiative ${changeType || 'change'} - invalidating caches`);
    
    // Smart invalidation based on change type
    const invalidationPromises = [];
    
    // Always invalidate dashboard and metrics for initiative changes
    invalidationPromises.push(
      kpiCache.invalidate({ tenantId, areaId, type: 'DASHBOARD_DATA' }),
      kpiCache.invalidate({ tenantId, areaId, type: 'KPI_METRICS' }),
      kpiCache.invalidate({ tenantId, areaId, type: 'INITIATIVE_LIST' })
    );
    
    // For status changes or deletions, also invalidate area data
    if (changeType === 'status_change' || changeType === 'delete') {
      invalidationPromises.push(
        kpiCache.invalidate({ tenantId, type: 'AREA_DATA' })
      );
    }
    
    // For new initiatives, invalidate broader scope to update counters
    if (changeType === 'create') {
      invalidationPromises.push(
        kpiCache.invalidate({ tenantId }) // Invalidate all tenant data
      );
    }
    
    await Promise.allSettled(invalidationPromises);
    
    console.log(`[Cache Invalidation] Completed invalidation for initiative change`);
  }
  
  /**
   * Invalidate cache when areas are modified with cascading invalidation
   */
  static async onAreaChange(params: {
    tenantId: string;
    areaId: string;
    changeType?: 'create' | 'update' | 'delete' | 'manager_change';
  }) {
    const { tenantId, areaId, changeType } = params;
    
    console.log(`[Cache Invalidation] Area ${changeType || 'change'} - invalidating caches`);
    
    // Invalidate all area-related data
    await kpiCache.invalidate({ tenantId, areaId });
    
    // Also invalidate tenant-wide area data
    await kpiCache.invalidate({ tenantId, type: 'AREA_DATA' });
    
    // For structural changes, invalidate all tenant data
    if (changeType === 'create' || changeType === 'delete') {
      await kpiCache.invalidate({ tenantId });
    }
    
    console.log(`[Cache Invalidation] Completed invalidation for area change`);
  }
  
  /**
   * Global cache invalidation for tenant with specific patterns
   */
  static async onTenantDataChange(
    tenantId: string, 
    reason?: 'bulk_import' | 'configuration_change' | 'user_role_change' | 'data_migration'
  ) {
    console.log(`[Cache Invalidation] Tenant data change (${reason || 'general'}) - full invalidation`);
    
    await kpiCache.invalidate({ tenantId });
    
    // Log performance impact
    const stats = kpiCache.getStats();
    console.log(`[Cache Invalidation] Cache cleared - will affect hit rate. Current hit rate: ${stats.hitRate.toFixed(2)}%`);
  }
  
  /**
   * Smart invalidation for user-specific data
   */
  static async onUserChange(params: {
    tenantId: string;
    userId: string;
    changeType?: 'role_change' | 'area_assignment' | 'permissions_change';
  }) {
    const { tenantId, userId, changeType } = params;
    
    console.log(`[Cache Invalidation] User ${changeType || 'change'} - invalidating user-specific caches`);
    
    // Invalidate user-specific data
    await kpiCache.invalidate({ tenantId, userId });
    
    // For role changes, might need broader invalidation
    if (changeType === 'role_change' || changeType === 'area_assignment') {
      await kpiCache.invalidate({ tenantId, type: 'DASHBOARD_DATA' });
    }
  }
  
  /**
   * Batch invalidation for multiple entities
   */
  static async batchInvalidate(operations: Array<{
    type: 'initiative' | 'area' | 'user' | 'tenant';
    params: any;
  }>) {
    console.log(`[Cache Invalidation] Batch invalidation of ${operations.length} operations`);
    
    const promises = operations.map(async (op) => {
      switch (op.type) {
        case 'initiative':
          return this.onInitiativeChange(op.params);
        case 'area':
          return this.onAreaChange(op.params);
        case 'user':
          return this.onUserChange(op.params);
        case 'tenant':
          return this.onTenantDataChange(op.params.tenantId, op.params.reason);
        default:
          console.warn(`[Cache Invalidation] Unknown operation type: ${op.type}`);
      }
    });
    
    await Promise.allSettled(promises);
    console.log(`[Cache Invalidation] Batch invalidation completed`);
  }
}

// Enhanced performance monitoring with Redis metrics
export class CachePerformanceMonitor {
  private static reportingInterval: NodeJS.Timeout | null = null;
  private static warmupInterval: NodeJS.Timeout | null = null;
  
  /**
   * Start comprehensive performance monitoring
   */
  static startMonitoring(intervalMs: number = 5 * 60 * 1000) {
    if (this.reportingInterval) return;
    
    this.reportingInterval = setInterval(() => {
      this.reportPerformance();
    }, intervalMs);
    
    // Test Redis connection periodically
    kpiCache.testRedisConnection();
    
    console.log(`[KPI Cache] Enhanced performance monitoring started (${intervalMs}ms interval)`);
  }
  
  /**
   * Stop performance monitoring and cleanup
   */
  static stopMonitoring() {
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
      this.reportingInterval = null;
      console.log(`[KPI Cache] Performance monitoring stopped`);
    }
    
    if (this.warmupInterval) {
      clearInterval(this.warmupInterval);
      this.warmupInterval = null;
    }
  }
  
  /**
   * Start cache warming strategy
   */
  static startCacheWarming(params: {
    tenants: string[];
    intervalMs?: number;
    maxConcurrent?: number;
  }) {
    const { tenants, intervalMs = 10 * 60 * 1000, maxConcurrent = 3 } = params;
    
    if (this.warmupInterval) return;
    
    console.log(`[KPI Cache] Starting cache warming for ${tenants.length} tenants`);
    
    let tenantIndex = 0;
    
    this.warmupInterval = setInterval(async () => {
      const currentTenants = tenants.slice(tenantIndex, tenantIndex + maxConcurrent);
      
      if (currentTenants.length === 0) {
        tenantIndex = 0; // Reset to beginning
        return;
      }
      
      const warmupPromises = currentTenants.map(tenantId => 
        this.warmTenantCache(tenantId)
      );
      
      await Promise.allSettled(warmupPromises);
      
      tenantIndex += maxConcurrent;
      if (tenantIndex >= tenants.length) {
        tenantIndex = 0;
      }
    }, intervalMs);
  }
  
  /**
   * Warm cache for a specific tenant
   */
  private static async warmTenantCache(tenantId: string): Promise<void> {
    try {
      // Warm most frequently accessed data
      const warmupData = [
        {
          type: 'AREA_DATA' as const,
          params: { tenantId },
          data: await CachedDataFetcher.getAreaData({ tenantId, forceRefresh: true }),
        },
      ];
      
      await kpiCache.warmCache(warmupData);
      console.log(`[KPI Cache] Warmed cache for tenant ${tenantId}`);
    } catch (error) {
      console.warn(`[KPI Cache] Failed to warm cache for tenant ${tenantId}:`, error);
    }
  }
  
  /**
   * Generate comprehensive performance report including Redis metrics
   */
  static async reportPerformance(): Promise<void> {
    const stats = kpiCache.getStats();
    const redisInfo = await kpiCache.getRedisInfo();
    
    const report = {
      overall: {
        totalHitRate: `${stats.totalHitRate.toFixed(2)}%`,
        totalRequests: stats.hits + stats.misses,
        target: '80%',
        status: stats.totalHitRate >= 80 ? '✅ Target Met' : '⚠️ Below Target',
      },
      layers: {
        memory: {
          entries: stats.memoryEntries,
          usage: `${(stats.memoryUsage / 1024 / 1024).toFixed(2)}MB`,
          hitRate: `${stats.layerHitRates.memory.toFixed(2)}%`,
        },
        redis: {
          enabled: stats.redisEnabled,
          connected: redisInfo.connected,
          status: stats.redisConnectionStatus,
          hitRate: `${stats.layerHitRates.redis.toFixed(2)}%`,
          hits: stats.redisHits,
          misses: stats.redisMisses,
          errors: stats.redisErrors,
        },
        localStorage: {
          hitRate: `${stats.layerHitRates.localStorage.toFixed(2)}%`,
        },
      },
      distribution: {
        byType: stats.typeDistribution,
        byLayer: stats.layerDistribution,
      },
      performance: {
        avgEntrySize: `${(stats.avgEntrySize / 1024).toFixed(2)}KB`,
        lastCleanup: new Date(stats.lastCleanup).toISOString(),
      },
    };
    
    console.log(`[KPI Cache] Performance Report:`, report);
    
    // Performance alerts
    if (stats.totalHitRate < 80 && (stats.hits + stats.misses) > 10) {
      console.warn(`🚨 [KPI Cache] Hit rate below target: ${stats.totalHitRate.toFixed(2)}% (target: 80%)`);
      
      // Suggest cache warming if Redis is available
      if (stats.redisEnabled && redisInfo.connected) {
        console.log(`💡 [KPI Cache] Consider implementing cache warming strategy`);
      }
    }
    
    // Redis connection alerts
    if (stats.redisEnabled && !redisInfo.connected) {
      console.error(`🔴 [KPI Cache] Redis connection lost - operating in degraded mode`);
    }
    
    // Memory usage alerts
    if (stats.memoryEntries > 400) {
      console.warn(`⚠️ [KPI Cache] High memory usage - triggering cleanup`);
      await kpiCache.cleanup(false);
    }
    
    // Error rate alerts
    const totalRedisRequests = stats.redisHits + stats.redisMisses + stats.redisErrors;
    if (totalRedisRequests > 0 && (stats.redisErrors / totalRedisRequests) > 0.1) {
      console.warn(`⚠️ [KPI Cache] High Redis error rate: ${((stats.redisErrors / totalRedisRequests) * 100).toFixed(2)}%`);
    }
  }
}

// Export cache utilities
export {
  CACHE_CONFIG,
  CacheKeyGenerator,
  type CacheEntry,
  type CacheStats,
};