/**
 * Redis Configuration for PERF-002 Caching Strategy
 * 
 * Production-ready Redis configuration with:
 * - Connection pooling and clustering support
 * - Automatic failover and retry logic
 * - Environment-based configuration
 * - Connection health monitoring
 * 
 * Author: Claude Code Assistant
 * Date: 2025-08-04
 * Part of: PERF-002 Caching Strategy
 */

// Dynamic import for server-side only
let Redis: any = null;
let RedisOptions: any = null;
let Cluster: any = null;

// Initialize Redis only on server-side
if (typeof window === 'undefined') {
  try {
    const ioredis = require('ioredis');
    Redis = ioredis.default || ioredis;
    RedisOptions = ioredis.RedisOptions;
    Cluster = ioredis.Cluster;
  } catch (error) {
    console.warn('[Redis Config] ioredis not available:', error.message);
  }
}

type RedisOptions = any;
type Cluster = any;

// Redis configuration interface
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  enableCluster: boolean;
  clusterNodes?: Array<{ host: string; port: number }>;
  maxRetriesPerRequest: number;
  retryDelayOnFailover: number;
  enableOfflineQueue: boolean;
  connectTimeout: number;
  lazyConnect: boolean;
  keepAlive: number;
}

// Environment-based configuration
const getRedisConfig = (): RedisConfig => {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    enableCluster: process.env.REDIS_CLUSTER_ENABLED === 'true',
    clusterNodes: process.env.REDIS_CLUSTER_NODES 
      ? JSON.parse(process.env.REDIS_CLUSTER_NODES)
      : undefined,
    maxRetriesPerRequest: isProduction ? 3 : 1,
    retryDelayOnFailover: isProduction ? 100 : 50,
    enableOfflineQueue: false, // Disable for better error handling
    connectTimeout: 10000, // 10 seconds
    lazyConnect: true, // Connect only when needed
    keepAlive: 30000, // 30 seconds
  };
};

// Redis connection manager
class RedisConnectionManager {
  private static instance: RedisConnectionManager;
  private client: Redis | Cluster | null = null;
  private config: RedisConfig;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' = 'disconnected';
  private lastError: Error | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.config = getRedisConfig();
    this.setupEventListeners = this.setupEventListeners.bind(this);
    this.startHealthCheck = this.startHealthCheck.bind(this);
  }

  static getInstance(): RedisConnectionManager {
    if (!RedisConnectionManager.instance) {
      RedisConnectionManager.instance = new RedisConnectionManager();
    }
    return RedisConnectionManager.instance;
  }

  /**
   * Get Redis client instance with connection management
   */
  async getClient(): Promise<Redis | Cluster> {
    if (!this.client || this.connectionStatus === 'error') {
      await this.connect();
    }

    if (!this.client) {
      throw new Error('Failed to establish Redis connection');
    }

    return this.client;
  }

  /**
   * Connect to Redis with proper error handling
   */
  private async connect(): Promise<void> {
    try {
      this.connectionStatus = 'connecting';

      const options: RedisOptions = {
        host: this.config.host,
        port: this.config.port,
        password: this.config.password,
        db: this.config.db,
        maxRetriesPerRequest: this.config.maxRetriesPerRequest,
        retryDelayOnFailover: this.config.retryDelayOnFailover,
        enableOfflineQueue: this.config.enableOfflineQueue,
        connectTimeout: this.config.connectTimeout,
        lazyConnect: this.config.lazyConnect,
        keepAlive: this.config.keepAlive,
        
        // Retry configuration
        retryDelayOnConnect: (times: number) => Math.min(times * 50, 2000),
        
        // Family preference (IPv4 first)
        family: 4,
        
        // Enable ready check
        enableReadyCheck: true,
      };

      if (this.config.enableCluster && this.config.clusterNodes) {
        // Cluster mode
        this.client = new Redis.Cluster(this.config.clusterNodes, {
          redisOptions: options,
          enableOfflineQueue: false,
          retryDelayOnFailover: this.config.retryDelayOnFailover,
        });
      } else {
        // Single instance mode
        this.client = new Redis(options);
      }

      this.setupEventListeners();
      
      // Wait for connection
      await this.client.ping();
      
      this.connectionStatus = 'connected';
      this.lastError = null;
      this.startHealthCheck();
      
      console.log(`[Redis] Connected successfully to ${this.config.host}:${this.config.port}`);
    } catch (error) {
      this.connectionStatus = 'error';
      this.lastError = error as Error;
      console.error('[Redis] Connection failed:', error);
      throw error;
    }
  }

  /**
   * Setup event listeners for connection monitoring
   */
  private setupEventListeners(): void {
    if (!this.client) return;

    this.client.on('connect', () => {
      console.log('[Redis] Connection established');
      this.connectionStatus = 'connected';
    });

    this.client.on('ready', () => {
      console.log('[Redis] Client ready');
      this.connectionStatus = 'connected';
      this.lastError = null;
    });

    this.client.on('error', (error: Error) => {
      console.error('[Redis] Connection error:', error);
      this.connectionStatus = 'error';
      this.lastError = error;
    });

    this.client.on('close', () => {
      console.log('[Redis] Connection closed');
      this.connectionStatus = 'disconnected';
    });

    this.client.on('reconnecting', (delay: number) => {
      console.log(`[Redis] Reconnecting after ${delay}ms`);
      this.connectionStatus = 'connecting';
    });

    // Cluster-specific events
    if (this.client instanceof Redis.Cluster) {
      this.client.on('node error', (error: Error, node: any) => {
        console.error(`[Redis Cluster] Node error on ${node.options.host}:${node.options.port}:`, error);
      });
    }
  }

  /**
   * Start periodic health check
   */
  private startHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        if (this.client) {
          await this.client.ping();
          if (this.connectionStatus !== 'connected') {
            this.connectionStatus = 'connected';
            this.lastError = null;
          }
        }
      } catch (error) {
        console.warn('[Redis] Health check failed:', error);
        this.connectionStatus = 'error';
        this.lastError = error as Error;
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get connection status and health info
   */
  getConnectionInfo(): {
    status: typeof this.connectionStatus;
    config: RedisConfig;
    lastError: Error | null;
    isCluster: boolean;
  } {
    return {
      status: this.connectionStatus,
      config: this.config,
      lastError: this.lastError,
      isCluster: this.config.enableCluster,
    };
  }

  /**
   * Test Redis connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const client = await this.getClient();
      await client.ping();
      return true;
    } catch (error) {
      console.error('[Redis] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Gracefully disconnect from Redis
   */
  async disconnect(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.client) {
      try {
        await this.client.quit();
        this.client = null;
        this.connectionStatus = 'disconnected';
        console.log('[Redis] Disconnected successfully');
      } catch (error) {
        console.error('[Redis] Error during disconnect:', error);
      }
    }
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<void> {
    await this.disconnect();
    await this.connect();
  }
}

// Redis utility functions for cache operations
export class RedisUtils {
  private static connectionManager = RedisConnectionManager.getInstance();

  /**
   * Set cache entry with TTL
   */
  static async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    // Only work on server-side
    if (typeof window !== 'undefined') {
      return false;
    }

    try {
      const client = await this.connectionManager.getClient();
      const serializedValue = JSON.stringify(value);
      
      if (ttlSeconds) {
        await client.setex(key, ttlSeconds, serializedValue);
      } else {
        await client.set(key, serializedValue);
      }
      
      return true;
    } catch (error) {
      console.error(`[Redis] Failed to set key "${key}":`, error);
      return false;
    }
  }

  /**
   * Get cache entry
   */
  static async get<T = any>(key: string): Promise<T | null> {
    // Only work on server-side
    if (typeof window !== 'undefined') {
      return null;
    }

    try {
      const client = await this.connectionManager.getClient();
      const value = await client.get(key);
      
      if (value === null) {
        return null;
      }
      
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`[Redis] Failed to get key "${key}":`, error);
      return null;
    }
  }

  /**
   * Delete cache entries by key(s)
   */
  static async del(keys: string | string[]): Promise<number> {
    try {
      const client = await this.connectionManager.getClient();
      const keysArray = Array.isArray(keys) ? keys : [keys];
      return await client.del(...keysArray);
    } catch (error) {
      console.error(`[Redis] Failed to delete keys:`, error);
      return 0;
    }
  }

  /**
   * Delete cache entries by pattern
   */
  static async delPattern(pattern: string): Promise<number> {
    try {
      const client = await this.connectionManager.getClient();
      const keys = await client.keys(pattern);
      
      if (keys.length === 0) {
        return 0;
      }
      
      return await client.del(...keys);
    } catch (error) {
      console.error(`[Redis] Failed to delete pattern "${pattern}":`, error);
      return 0;
    }
  }

  /**
   * Check if key exists
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const client = await this.connectionManager.getClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[Redis] Failed to check existence of key "${key}":`, error);
      return false;
    }
  }

  /**
   * Set TTL for existing key
   */
  static async expire(key: string, ttlSeconds: number): Promise<boolean> {
    try {
      const client = await this.connectionManager.getClient();
      const result = await client.expire(key, ttlSeconds);
      return result === 1;
    } catch (error) {
      console.error(`[Redis] Failed to set TTL for key "${key}":`, error);
      return false;
    }
  }

  /**
   * Get TTL for key
   */
  static async ttl(key: string): Promise<number> {
    try {
      const client = await this.connectionManager.getClient();
      return await client.ttl(key);
    } catch (error) {
      console.error(`[Redis] Failed to get TTL for key "${key}":`, error);
      return -1;
    }
  }

  /**
   * Increment counter
   */
  static async incr(key: string): Promise<number> {
    try {
      const client = await this.connectionManager.getClient();
      return await client.incr(key);
    } catch (error) {
      console.error(`[Redis] Failed to increment key "${key}":`, error);
      return 0;
    }
  }

  /**
   * Get Redis info
   */
  static async info(): Promise<string | null> {
    try {
      const client = await this.connectionManager.getClient();
      return await client.info();
    } catch (error) {
      console.error('[Redis] Failed to get info:', error);
      return null;
    }
  }

  /**
   * Test connection
   */
  static async ping(): Promise<boolean> {
    return await this.connectionManager.testConnection();
  }

  /**
   * Get connection status
   */
  static getConnectionInfo() {
    return this.connectionManager.getConnectionInfo();
  }
}

// Export singleton connection manager
export const redisConnection = RedisConnectionManager.getInstance();

// Export Redis configuration
export { type RedisConfig, getRedisConfig };