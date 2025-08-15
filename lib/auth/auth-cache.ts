/**
 * Authentication Cache Manager
 * Prevents redundant getUser() calls to Supabase
 * Implements a request-scoped cache for authentication data
 */

import { User } from '@supabase/supabase-js'

interface CacheEntry {
  user: User | null
  timestamp: number
  promise?: Promise<{ user: User | null; error: any }>
}

class AuthCache {
  private cache: Map<string, CacheEntry> = new Map()
  private readonly TTL = 5 * 60 * 1000 // 5 minutes cache TTL
  private readonly DEDUP_WINDOW = 100 // 100ms deduplication window

  /**
   * Get cached user or null if not cached/expired
   */
  getCachedUser(key: string = 'default'): User | null {
    const entry = this.cache.get(key)
    
    if (!entry) {
      return null
    }

    // Check if cache is still valid
    const now = Date.now()
    if (now - entry.timestamp > this.TTL) {
      this.cache.delete(key)
      return null
    }

    return entry.user
  }

  /**
   * Set user in cache
   */
  setCachedUser(user: User | null, key: string = 'default'): void {
    this.cache.set(key, {
      user,
      timestamp: Date.now()
    })
  }

  /**
   * Get or set a promise for deduplication
   * This prevents multiple concurrent requests for the same auth check
   */
  getOrSetPromise(
    key: string = 'default',
    factory: () => Promise<{ user: User | null; error: any }>
  ): Promise<{ user: User | null; error: any }> {
    const entry = this.cache.get(key)
    const now = Date.now()

    // If we have a recent promise in flight, return it
    if (entry?.promise && now - entry.timestamp < this.DEDUP_WINDOW) {
      console.log('[AuthCache] Deduplicating auth request, returning existing promise')
      return entry.promise
    }

    // Create new promise and cache it
    console.log('[AuthCache] Creating new auth request')
    const promise = factory()
    
    this.cache.set(key, {
      user: entry?.user || null,
      timestamp: now,
      promise
    })

    // Once promise resolves, update cache with result
    promise.then(({ user }) => {
      this.setCachedUser(user, key)
      // Clear the promise after resolution
      const currentEntry = this.cache.get(key)
      if (currentEntry) {
        delete currentEntry.promise
      }
    }).catch(() => {
      // On error, clear the cache entry
      this.cache.delete(key)
    })

    return promise
  }

  /**
   * Clear cache for a specific key or all entries
   */
  clearCache(key?: string): void {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
    console.log('[AuthCache] Cache cleared', key ? `for key: ${key}` : 'completely')
  }

  /**
   * Get cache statistics for debugging
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Export singleton instance
export const authCache = new AuthCache()

// Export convenience functions
export function getCachedUser(key?: string): User | null {
  return authCache.getCachedUser(key)
}

export function setCachedUser(user: User | null, key?: string): void {
  authCache.setCachedUser(user, key)
}

export function clearAuthCache(key?: string): void {
  authCache.clearCache(key)
}

export function dedupAuthRequest(
  factory: () => Promise<{ user: User | null; error: any }>,
  key?: string
): Promise<{ user: User | null; error: any }> {
  return authCache.getOrSetPromise(key, factory)
}