import { createClient } from '@/utils/supabase/client'

export interface FetchOptions {
  // Retry configuration
  maxRetries?: number
  retryDelay?: number
  // Timeout configuration
  timeout?: number
  // Cache configuration
  cacheKey?: string
  cacheTime?: number
  // Transform function
  transform?: (data: any) => any
}

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>()

export class DataFetcher {
  static async fetch<T>(
    query: () => Promise<{ data: T | null; error: any }>,
    options: FetchOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      retryDelay = 1000,
      timeout = 30000,
      cacheKey,
      cacheTime = 5 * 60 * 1000, // 5 minutes default
      transform
    } = options
    
    // Check cache first
    if (cacheKey) {
      const cached = cache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        return cached.data
      }
    }
    
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // Add timeout wrapper
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), timeout)
        })
        
        const result = await Promise.race([
          query(),
          timeoutPromise
        ]) as { data: T | null; error: any }
        
        if (result.error) {
          throw new Error(result.error.message || 'Database error')
        }
        
        if (!result.data) {
          throw new Error('No data returned')
        }
        
        // Apply transform if provided
        const finalData = transform ? transform(result.data) : result.data
        
        // Cache the result
        if (cacheKey) {
          cache.set(cacheKey, { data: finalData, timestamp: Date.now() })
        }
        
        return finalData
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        // Don't retry on certain errors
        if (
          lastError.message.includes('not authenticated') ||
          lastError.message.includes('not authorized')
        ) {
          throw lastError
        }
        
        // Wait before retrying
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)))
        }
      }
    }
    
    throw lastError || new Error('Failed after retries')
  }
  
  // Batch fetch multiple queries
  static async batchFetch<T extends Record<string, any>>(
    queries: Record<string, () => Promise<{ data: any; error: any }>>,
    options: FetchOptions = {}
  ): Promise<T> {
    const results = await Promise.allSettled(
      Object.entries(queries).map(async ([key, query]) => {
        try {
          const data = await this.fetch(query, { ...options, cacheKey: `batch_${key}` })
          return { key, data }
        } catch (error) {
          return { key, error }
        }
      })
    )
    
    const output: any = {}
    const errors: Record<string, Error> = {}
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        const { key, data, error } = result.value
        if (error) {
          errors[key] = error
        } else {
          output[key] = data
        }
      } else {
        // This shouldn't happen with allSettled, but just in case
        console.error('Unexpected rejection in batchFetch:', result.reason)
      }
    })
    
    if (Object.keys(errors).length > 0) {
      throw new Error(`Batch fetch errors: ${JSON.stringify(errors)}`)
    }
    
    return output as T
  }
  
  // Clear cache
  static clearCache(pattern?: string) {
    if (pattern) {
      // Clear entries matching pattern
      for (const [key] of cache) {
        if (key.includes(pattern)) {
          cache.delete(key)
        }
      }
    } else {
      // Clear all
      cache.clear()
    }
  }
  
  // Prefetch data
  static async prefetch<T>(
    key: string,
    query: () => Promise<{ data: T | null; error: any }>,
    options: FetchOptions = {}
  ): Promise<void> {
    try {
      await this.fetch(query, { ...options, cacheKey: key })
    } catch (error) {
      console.warn(`Prefetch failed for ${key}:`, error)
    }
  }
}

// Helper functions for common queries
export const dataFetcher = {
  // Fetch with automatic session handling
  async fetchWithAuth<T>(
    queryFn: (userId: string) => Promise<{ data: T | null; error: any }>,
    options?: FetchOptions
  ): Promise<T> {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.id) {
      throw new Error('User not authenticated')
    }
    
    return DataFetcher.fetch(() => queryFn(session.user.id), options)
  },
  
  // Fetch with pagination
  async fetchPaginated<T>(
    table: string,
    {
      page = 1,
      pageSize = 10,
      orderBy = 'created_at',
      ascending = false,
      filters = {},
      select = '*'
    }: {
      page?: number
      pageSize?: number
      orderBy?: string
      ascending?: boolean
      filters?: Record<string, any>
      select?: string
    },
    options?: FetchOptions
  ): Promise<{ data: T[]; total: number; hasMore: boolean }> {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    
    const supabase = createClient()
    // Build query
    let query = supabase.from(table).select(select, { count: 'exact' })
    
    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query = query.eq(key, value)
      }
    })
    
    // Apply ordering and pagination
    query = query.order(orderBy, { ascending }).range(from, to)
    
    const result = await DataFetcher.fetch(
      () => query,
      {
        ...options,
        cacheKey: options?.cacheKey || `${table}_page_${page}_${JSON.stringify(filters)}`,
        transform: (result) => ({
          data: result.data || [],
          total: result.count || 0,
          hasMore: (result.count || 0) > to + 1
        })
      }
    )
    
    return result as any
  }
}