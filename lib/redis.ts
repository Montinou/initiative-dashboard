import { createClient } from 'redis'

// Create Redis client
const redisClient = createClient({
  url: process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL,
})

// Handle Redis connection
redisClient.on('error', (err) => console.error('Redis Client Error:', err))
redisClient.on('connect', () => console.log('Redis Client Connected'))

// Connect to Redis
if (!redisClient.isOpen) {
  redisClient.connect().catch(console.error)
}

// Cache TTL configuration (in seconds)
export const CACHE_TTL = {
  AI_INSIGHTS: 300, // 5 minutes for AI insights
  METRICS: 60,       // 1 minute for metrics
  DASHBOARD: 30,     // 30 seconds for dashboard data
}

// Cache key generators
export const cacheKeys = {
  aiInsights: (tenantId: string, context: string = 'ceo_dashboard') => 
    `ai_insights:${tenantId}:${context}`,
  
  metrics: (tenantId: string) => 
    `metrics:${tenantId}`,
  
  dashboard: (tenantId: string, userId: string) => 
    `dashboard:${tenantId}:${userId}`,
}

// Cache operations
export const cache = {
  // Get from cache
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redisClient.get(key)
      if (data) {
        console.log(`Cache hit for key: ${key}`)
        return JSON.parse(data) as T
      }
      console.log(`Cache miss for key: ${key}`)
      return null
    } catch (error) {
      console.error(`Redis get error for key ${key}:`, error)
      return null
    }
  },

  // Set in cache with TTL
  async set<T>(key: string, value: T, ttl: number = CACHE_TTL.AI_INSIGHTS): Promise<boolean> {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value))
      console.log(`Cached data for key: ${key} with TTL: ${ttl}s`)
      return true
    } catch (error) {
      console.error(`Redis set error for key ${key}:`, error)
      return false
    }
  },

  // Delete from cache
  async del(key: string): Promise<boolean> {
    try {
      await redisClient.del(key)
      console.log(`Deleted cache for key: ${key}`)
      return true
    } catch (error) {
      console.error(`Redis delete error for key ${key}:`, error)
      return false
    }
  },

  // Check if key exists
  async exists(key: string): Promise<boolean> {
    try {
      const exists = await redisClient.exists(key)
      return exists === 1
    } catch (error) {
      console.error(`Redis exists error for key ${key}:`, error)
      return false
    }
  },

  // Get remaining TTL
  async ttl(key: string): Promise<number> {
    try {
      const ttl = await redisClient.ttl(key)
      return ttl
    } catch (error) {
      console.error(`Redis TTL error for key ${key}:`, error)
      return -1
    }
  },

  // Clear all cache for a tenant
  async clearTenant(tenantId: string): Promise<void> {
    try {
      // Clear specific known keys for this tenant
      const keysToDelete = [
        cacheKeys.aiInsights(tenantId),
        cacheKeys.metrics(tenantId),
        // Add more keys as needed
      ]

      for (const key of keysToDelete) {
        await redisClient.del(key)
      }
      
      console.log(`Cleared all cache for tenant: ${tenantId}`)
    } catch (error) {
      console.error(`Error clearing tenant cache:`, error)
    }
  },
}

// Export Redis client for advanced operations
export { redisClient as redis }