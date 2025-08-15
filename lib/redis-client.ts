import { createClient } from 'redis';

let redisClient: ReturnType<typeof createClient> | null = null;
let isConnecting = false;

/**
 * Get or create Redis client connection
 */
export async function getRedisClient() {
  // Only use Redis on server-side
  if (typeof window !== 'undefined') {
    return null;
  }

  // Skip Redis if not configured
  if (!process.env.REDIS_URL) {
    return null;
  }

  // Return existing client if connected
  if (redisClient?.isReady) {
    return redisClient;
  }

  // Prevent multiple connection attempts
  if (isConnecting) {
    // Wait a bit for connection to complete
    await new Promise(resolve => setTimeout(resolve, 100));
    return redisClient?.isReady ? redisClient : null;
  }

  try {
    isConnecting = true;

    // Create new client
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 2000, // Reduce timeout to fail faster
        reconnectStrategy: (retries) => {
          if (retries > 1) { // Reduce retry attempts
            console.log('[Redis] Connection unavailable - continuing without cache');
            return new Error('Redis not available');
          }
          return Math.min(retries * 100, 1000);
        },
      },
    });

    // Error handling - suppress connection errors since Redis is optional
    redisClient.on('error', (err) => {
      // Only log non-connection errors
      if (!err.message.includes('ENOTFOUND') && !err.message.includes('ECONNREFUSED')) {
        console.error('[Redis] Client Error:', err.message);
      }
    });

    redisClient.on('connect', () => {
      console.log('[Redis] Connected successfully');
    });

    redisClient.on('ready', () => {
      console.log('[Redis] Client ready');
    });

    // Connect to Redis
    await redisClient.connect();
    
    return redisClient;
  } catch (error: any) {
    console.warn('[Redis] Connection failed:', error.message || error);
    redisClient = null;
    return null;
  } finally {
    isConnecting = false;
  }
}

/**
 * Set value in Redis with optional TTL
 */
export async function setRedisValue(key: string, value: any, ttlSeconds?: number) {
  try {
    const client = await getRedisClient();
    if (!client) return false;

    const serialized = JSON.stringify(value);
    
    if (ttlSeconds) {
      await client.setEx(key, ttlSeconds, serialized);
    } else {
      await client.set(key, serialized);
    }
    
    return true;
  } catch (error) {
    console.error(`[Redis] Failed to set key "${key}":`, error);
    return false;
  }
}

/**
 * Get value from Redis
 */
export async function getRedisValue<T = any>(key: string): Promise<T | null> {
  try {
    const client = await getRedisClient();
    if (!client) return null;

    const value = await client.get(key);
    if (!value) return null;

    return JSON.parse(value) as T;
  } catch (error) {
    console.error(`[Redis] Failed to get key "${key}":`, error);
    return null;
  }
}

/**
 * Delete value from Redis
 */
export async function deleteRedisValue(key: string): Promise<boolean> {
  try {
    const client = await getRedisClient();
    if (!client) return false;

    await client.del(key);
    return true;
  } catch (error) {
    console.error(`[Redis] Failed to delete key "${key}":`, error);
    return false;
  }
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    if (!client) return false;
    
    await client.ping();
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Disconnect Redis client (for cleanup)
 */
export async function disconnectRedis() {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      console.log('[Redis] Disconnected');
    } catch (error) {
      console.error('[Redis] Error disconnecting:', error);
    }
  }
}