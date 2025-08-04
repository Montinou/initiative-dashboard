/**
 * Advanced caching system for Mariana Project
 * Implements multi-level caching with TTL, LRU eviction, and intelligent invalidation
 */

export interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of items in cache
  storage?: 'memory' | 'localStorage' | 'sessionStorage';
  prefix?: string; // Key prefix for namespacing
}

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccess: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
  evictions: number;
}

/**
 * Advanced cache implementation with LRU eviction and TTL
 */
export class AdvancedCache<T> {
  private cache = new Map<string, CacheItem<T>>();
  private accessOrder = new Map<string, number>(); // For LRU tracking
  private config: Required<CacheConfig>;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRate: 0,
    evictions: 0
  };
  private accessCounter = 0;

  constructor(config: CacheConfig = {}) {
    this.config = {
      ttl: config.ttl || 5 * 60 * 1000, // 5 minutes default
      maxSize: config.maxSize || 100,
      storage: config.storage || 'memory',
      prefix: config.prefix || 'mariana-cache'
    };
  }

  /**
   * Get item from cache
   */
  get(key: string): T | null {
    const fullKey = `${this.config.prefix}:${key}`;
    
    // Check memory cache first
    const item = this.cache.get(fullKey);
    if (item) {
      // Check TTL
      if (Date.now() - item.timestamp > item.ttl) {
        this.delete(key);
        this.stats.misses++;
        return null;
      }

      // Update access tracking
      item.accessCount++;
      item.lastAccess = Date.now();
      this.accessOrder.set(fullKey, ++this.accessCounter);
      
      this.stats.hits++;
      this.updateHitRate();
      return item.data;
    }

    // Check persistent storage if configured
    if (this.config.storage !== 'memory') {
      const stored = this.getFromStorage(fullKey);
      if (stored) {
        // Restore to memory cache
        this.cache.set(fullKey, stored);
        this.accessOrder.set(fullKey, ++this.accessCounter);
        this.stats.hits++;
        this.updateHitRate();
        return stored.data;
      }
    }

    this.stats.misses++;
    this.updateHitRate();
    return null;
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T, ttl?: number): void {
    const fullKey = `${this.config.prefix}:${key}`;
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.ttl,
      accessCount: 1,
      lastAccess: Date.now()
    };

    // Ensure cache size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    this.cache.set(fullKey, item);
    this.accessOrder.set(fullKey, ++this.accessCounter);
    
    // Store in persistent storage if configured
    if (this.config.storage !== 'memory') {
      this.setInStorage(fullKey, item);
    }

    this.stats.size = this.cache.size;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): void {
    const fullKey = `${this.config.prefix}:${key}`;
    this.cache.delete(fullKey);
    this.accessOrder.delete(fullKey);
    
    if (this.config.storage !== 'memory') {
      this.deleteFromStorage(fullKey);
    }

    this.stats.size = this.cache.size;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    
    if (this.config.storage !== 'memory') {
      this.clearStorage();
    }

    this.stats.size = 0;
  }

  /**
   * Get or set pattern - fetch if not in cache
   */
  async getOrSet<K>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetchFn();
    this.set(key, data, ttl);
    return data;
  }

  /**
   * Invalidate cache entries by pattern
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    const keysToDelete: string[] = [];

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key.replace(`${this.config.prefix}:`, ''));
      }
    }

    keysToDelete.forEach(key => this.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        expiredKeys.push(key.replace(`${this.config.prefix}:`, ''));
      }
    }

    expiredKeys.forEach(key => this.delete(key));
  }

  /**
   * Evict least recently used item
   */
  private evictLRU(): void {
    let oldestKey = '';
    let oldestAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Update hit rate calculation
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * Get item from persistent storage
   */
  private getFromStorage(key: string): CacheItem<T> | null {
    try {
      const storage = this.getStorage();
      if (!storage) return null;

      const item = storage.getItem(key);
      if (!item) return null;

      const parsed = JSON.parse(item) as CacheItem<T>;
      
      // Check TTL
      if (Date.now() - parsed.timestamp > parsed.ttl) {
        storage.removeItem(key);
        return null;
      }

      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Set item in persistent storage
   */
  private setInStorage(key: string, item: CacheItem<T>): void {
    try {
      const storage = this.getStorage();
      if (!storage) return;

      storage.setItem(key, JSON.stringify(item));
    } catch {
      // Storage might be full or unavailable
    }
  }

  /**
   * Delete item from persistent storage
   */
  private deleteFromStorage(key: string): void {
    try {
      const storage = this.getStorage();
      if (!storage) return;

      storage.removeItem(key);
    } catch {
      // Ignore errors
    }
  }

  /**
   * Clear all items from persistent storage with prefix
   */
  private clearStorage(): void {
    try {
      const storage = this.getStorage();
      if (!storage) return;

      const keysToRemove: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (key && key.startsWith(this.config.prefix)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => storage.removeItem(key));
    } catch {
      // Ignore errors
    }
  }

  /**
   * Get storage implementation
   */
  private getStorage(): Storage | null {
    if (typeof window === 'undefined') return null;

    switch (this.config.storage) {
      case 'localStorage':
        return window.localStorage;
      case 'sessionStorage':
        return window.sessionStorage;
      default:
        return null;
    }
  }
}

/**
 * Cache instances for different data types (lazy initialized for SSR compatibility)
 */
let _areaCache: AdvancedCache<any> | null = null;
let _initiativeCache: AdvancedCache<any> | null = null;
let _userCache: AdvancedCache<any> | null = null;
let _metricsCache: AdvancedCache<any> | null = null;
let _fileUploadCache: AdvancedCache<any> | null = null;
let _auditLogCache: AdvancedCache<any> | null = null;
let _areaSummaryCache: AdvancedCache<any> | null = null;

export const getAreaCache = () => {
  if (!_areaCache) {
    _areaCache = new AdvancedCache({
      ttl: 10 * 60 * 1000, // 10 minutes - areas change infrequently
      maxSize: 50,
      storage: typeof window !== 'undefined' ? 'sessionStorage' : 'memory',
      prefix: 'mariana-areas'
    });
  }
  return _areaCache;
};

export const getInitiativeCache = () => {
  if (!_initiativeCache) {
    _initiativeCache = new AdvancedCache({
      ttl: 5 * 60 * 1000, // 5 minutes - initiatives change more frequently
      maxSize: 200,
      storage: typeof window !== 'undefined' ? 'sessionStorage' : 'memory',
      prefix: 'mariana-initiatives'
    });
  }
  return _initiativeCache;
};

export const getUserCache = () => {
  if (!_userCache) {
    _userCache = new AdvancedCache({
      ttl: 15 * 60 * 1000, // 15 minutes - user data changes rarely
      maxSize: 100,
      storage: typeof window !== 'undefined' ? 'sessionStorage' : 'memory',
      prefix: 'mariana-users'
    });
  }
  return _userCache;
};

export const getMetricsCache = () => {
  if (!_metricsCache) {
    _metricsCache = new AdvancedCache({
      ttl: 2 * 60 * 1000, // 2 minutes - metrics need to be fresh
      maxSize: 100,
      storage: 'memory', // Memory only for metrics
      prefix: 'mariana-metrics'
    });
  }
  return _metricsCache;
};

export const getFileUploadCache = () => {
  if (!_fileUploadCache) {
    _fileUploadCache = new AdvancedCache({
      ttl: 3 * 60 * 1000, // 3 minutes - file uploads change moderately
      maxSize: 150,
      storage: typeof window !== 'undefined' ? 'sessionStorage' : 'memory',
      prefix: 'mariana-files'
    });
  }
  return _fileUploadCache;
};

export const getAuditLogCache = () => {
  if (!_auditLogCache) {
    _auditLogCache = new AdvancedCache({
      ttl: 1 * 60 * 1000, // 1 minute - audit logs are append-only but should be fresh
      maxSize: 200,
      storage: 'memory', // Memory only for audit logs
      prefix: 'mariana-audit'
    });
  }
  return _auditLogCache;
};

export const getAreaSummaryCache = () => {
  if (!_areaSummaryCache) {
    _areaSummaryCache = new AdvancedCache({
      ttl: 5 * 60 * 1000, // 5 minutes - area summaries are expensive to compute
      maxSize: 50,
      storage: typeof window !== 'undefined' ? 'sessionStorage' : 'memory',
      prefix: 'mariana-area-summary'
    });
  }
  return _areaSummaryCache;
};

// Legacy exports removed - use getter functions instead
// export const areaCache = getAreaCache();
// export const initiativeCache = getInitiativeCache();
// export const userCache = getUserCache();
// export const metricsCache = getMetricsCache();
// export const fileUploadCache = getFileUploadCache();
// export const auditLogCache = getAuditLogCache();
// export const areaSummaryCache = getAreaSummaryCache();

/**
 * Global cache manager
 */
export class CacheManager {
  private caches = new Map<string, AdvancedCache<any>>();

  constructor() {
    // Register default caches using lazy getters
    this.caches.set('areas', getAreaCache());
    this.caches.set('initiatives', getInitiativeCache());
    this.caches.set('users', getUserCache());
    this.caches.set('metrics', getMetricsCache());
    this.caches.set('fileUploads', getFileUploadCache());
    this.caches.set('auditLog', getAuditLogCache());
    this.caches.set('areaSummary', getAreaSummaryCache());
  }

  /**
   * Get cache instance by name
   */
  getCache<T>(name: string): AdvancedCache<T> | null {
    return this.caches.get(name) || null;
  }

  /**
   * Register new cache instance
   */
  registerCache<T>(name: string, cache: AdvancedCache<T>): void {
    this.caches.set(name, cache);
  }

  /**
   * Cleanup all caches
   */
  cleanup(): void {
    for (const cache of this.caches.values()) {
      cache.cleanup();
    }
  }

  /**
   * Clear all caches
   */
  clearAll(): void {
    for (const cache of this.caches.values()) {
      cache.clear();
    }
  }

  /**
   * Get combined statistics
   */
  getCombinedStats(): Record<string, CacheStats> {
    const stats: Record<string, CacheStats> = {};
    
    for (const [name, cache] of this.caches.entries()) {
      stats[name] = cache.getStats();
    }

    return stats;
  }

  /**
   * Invalidate related caches when data changes
   */
  invalidateRelated(dataType: string, operation: 'create' | 'update' | 'delete'): void {
    switch (dataType) {
      case 'initiative':
        // Invalidate initiative cache and related metrics
        this.caches.get('initiatives')?.invalidatePattern('.*');
        this.caches.get('metrics')?.invalidatePattern('.*');
        this.caches.get('areaSummary')?.invalidatePattern('.*');
        break;
      
      case 'area':
        // Invalidate areas and related data
        this.caches.get('areas')?.invalidatePattern('.*');
        this.caches.get('initiatives')?.invalidatePattern('.*');
        this.caches.get('metrics')?.invalidatePattern('.*');
        this.caches.get('areaSummary')?.invalidatePattern('.*');
        break;
      
      case 'subtask':
        // Invalidate related initiatives and metrics
        this.caches.get('initiatives')?.invalidatePattern('.*');
        this.caches.get('metrics')?.invalidatePattern('.*');
        this.caches.get('areaSummary')?.invalidatePattern('.*');
        break;
      
      case 'file_upload':
        // Invalidate file uploads and area summary
        this.caches.get('fileUploads')?.invalidatePattern('.*');
        this.caches.get('areaSummary')?.invalidatePattern('.*');
        break;
      
      case 'audit_log':
        // Invalidate audit log cache
        this.caches.get('auditLog')?.invalidatePattern('.*');
        break;
      
      default:
        break;
    }
  }
}

/**
 * Global cache manager instance
 */
export const cacheManager = new CacheManager();

/**
 * React hook for cache statistics
 */
export function useCacheStats() {
  return cacheManager.getCombinedStats();
}

/**
 * Enhanced caching utilities for area-specific data
 */
export class AreaDataCache {
  private static instance: AreaDataCache;
  
  static getInstance(): AreaDataCache {
    if (!AreaDataCache.instance) {
      AreaDataCache.instance = new AreaDataCache();
    }
    return AreaDataCache.instance;
  }

  /**
   * Cache area summary data with intelligent key generation
   */
  cacheAreaSummary(tenantId: string, areaId: string, data: any): void {
    const key = `${tenantId}:${areaId}:summary`;
    getAreaSummaryCache().set(key, data);
  }

  /**
   * Get cached area summary data
   */
  getAreaSummary(tenantId: string, areaId: string): any | null {
    const key = `${tenantId}:${areaId}:summary`;
    return getAreaSummaryCache().get(key);
  }

  /**
   * Cache area metrics with shorter TTL
   */
  cacheAreaMetrics(tenantId: string, areaId: string, metrics: any): void {
    const key = `${tenantId}:${areaId}:metrics`;
    getMetricsCache().set(key, metrics, 1 * 60 * 1000); // 1 minute TTL for metrics
  }

  /**
   * Get cached area metrics
   */
  getAreaMetrics(tenantId: string, areaId: string): any | null {
    const key = `${tenantId}:${areaId}:metrics`;
    return getMetricsCache().get(key);
  }

  /**
   * Cache area activity feed
   */
  cacheAreaActivity(tenantId: string, areaId: string, activity: any[]): void {
    const key = `${tenantId}:${areaId}:activity`;
    getAuditLogCache().set(key, activity, 2 * 60 * 1000); // 2 minutes TTL for activity
  }

  /**
   * Get cached area activity
   */
  getAreaActivity(tenantId: string, areaId: string): any[] | null {
    const key = `${tenantId}:${areaId}:activity`;
    return getAuditLogCache().get(key);
  }

  /**
   * Cache area file uploads
   */
  cacheAreaFiles(tenantId: string, areaId: string, files: any[]): void {
    const key = `${tenantId}:${areaId}:files`;
    getFileUploadCache().set(key, files);
  }

  /**
   * Get cached area files
   */
  getAreaFiles(tenantId: string, areaId: string): any[] | null {
    const key = `${tenantId}:${areaId}:files`;
    return getFileUploadCache().get(key);
  }

  /**
   * Invalidate all area-related cache entries
   */
  invalidateArea(tenantId: string, areaId: string): void {
    const patterns = [
      `.*${tenantId}:${areaId}:.*`,
      `.*${areaId}.*`
    ];

    patterns.forEach(pattern => {
      getAreaSummaryCache().invalidatePattern(pattern);
      getMetricsCache().invalidatePattern(pattern);
      getAuditLogCache().invalidatePattern(pattern);
      getFileUploadCache().invalidatePattern(pattern);
      getInitiativeCache().invalidatePattern(pattern);
    });
  }

  /**
   * Warm up cache for area data
   */
  async warmUpAreaCache(
    tenantId: string, 
    areaId: string, 
    dataFetchers: {
      summary?: () => Promise<any>;
      metrics?: () => Promise<any>;
      activity?: () => Promise<any[]>;
      files?: () => Promise<any[]>;
    }
  ): Promise<void> {
    const promises: Promise<any>[] = [];

    // Only fetch if not already cached
    if (dataFetchers.summary && !this.getAreaSummary(tenantId, areaId)) {
      promises.push(
        dataFetchers.summary().then(data => this.cacheAreaSummary(tenantId, areaId, data))
      );
    }

    if (dataFetchers.metrics && !this.getAreaMetrics(tenantId, areaId)) {
      promises.push(
        dataFetchers.metrics().then(data => this.cacheAreaMetrics(tenantId, areaId, data))
      );
    }

    if (dataFetchers.activity && !this.getAreaActivity(tenantId, areaId)) {
      promises.push(
        dataFetchers.activity().then(data => this.cacheAreaActivity(tenantId, areaId, data))
      );
    }

    if (dataFetchers.files && !this.getAreaFiles(tenantId, areaId)) {
      promises.push(
        dataFetchers.files().then(data => this.cacheAreaFiles(tenantId, areaId, data))
      );
    }

    await Promise.allSettled(promises);
  }

  /**
   * Get cache hit rate for area data
   */
  getAreaCacheStats(): {
    areaSummary: CacheStats;
    metrics: CacheStats;
    activity: CacheStats;
    files: CacheStats;
  } {
    return {
      areaSummary: getAreaSummaryCache().getStats(),
      metrics: getMetricsCache().getStats(),
      activity: getAuditLogCache().getStats(),
      files: getFileUploadCache().getStats()
    };
  }
}

/**
 * Singleton instance for area data cache
 */
export const areaDataCache = AreaDataCache.getInstance();

/**
 * Initialize cache cleanup only in browser environment
 */
export function initializeCacheCleanup() {
  if (typeof window !== 'undefined') {
    // Cleanup expired entries every 5 minutes
    setInterval(() => {
      cacheManager.cleanup();
    }, 5 * 60 * 1000);
  }
}

// Auto-initialize cleanup in browser environment
if (typeof window !== 'undefined') {
  initializeCacheCleanup();
}