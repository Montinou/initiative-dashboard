'use client'

import React, { createContext, useContext, useRef, useCallback } from 'react'

interface FetchState {
  loading: boolean
  promise?: Promise<any>
  data?: any
  error?: any
  timestamp?: number
}

interface DataFetchContextType {
  getFetchState: (key: string) => FetchState | undefined
  executeFetch: <T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      ttl?: number // Time to live in milliseconds
      dedupWindow?: number // Deduplication window in milliseconds
    }
  ) => Promise<T>
  clearCache: (key?: string) => void
}

const DataFetchContext = createContext<DataFetchContextType | undefined>(undefined)

/**
 * Provider for coordinating data fetches across components
 * Prevents duplicate API calls and provides caching
 */
export function DataFetchProvider({ children }: { children: React.ReactNode }) {
  const fetchStates = useRef<Map<string, FetchState>>(new Map())

  const getFetchState = useCallback((key: string): FetchState | undefined => {
    return fetchStates.current.get(key)
  }, [])

  const executeFetch = useCallback(async <T,>(
    key: string,
    fetcher: () => Promise<T>,
    options: {
      ttl?: number
      dedupWindow?: number
    } = {}
  ): Promise<T> => {
    const { ttl = 60000, dedupWindow = 100 } = options // Default 1 minute TTL, 100ms dedup
    const now = Date.now()
    const state = fetchStates.current.get(key)

    // Check if we have valid cached data
    if (state?.data && state.timestamp && (now - state.timestamp < ttl)) {
      console.log(`[DataFetch] Using cached data for key: ${key}`)
      return state.data as T
    }

    // Check if there's a promise in flight within dedup window
    if (state?.promise && state.timestamp && (now - state.timestamp < dedupWindow)) {
      console.log(`[DataFetch] Deduplicating request for key: ${key}`)
      return state.promise as Promise<T>
    }

    // Execute new fetch
    console.log(`[DataFetch] Executing new fetch for key: ${key}`)
    const promise = fetcher()
    
    // Store the promise immediately
    fetchStates.current.set(key, {
      loading: true,
      promise,
      timestamp: now,
      data: state?.data, // Keep old data while loading
      error: undefined
    })

    try {
      const data = await promise
      
      // Update with successful result
      fetchStates.current.set(key, {
        loading: false,
        data,
        timestamp: now,
        error: undefined
      })
      
      return data
    } catch (error) {
      // Update with error
      fetchStates.current.set(key, {
        loading: false,
        error,
        timestamp: now,
        data: state?.data // Keep old data on error
      })
      
      throw error
    }
  }, [])

  const clearCache = useCallback((key?: string) => {
    if (key) {
      fetchStates.current.delete(key)
      console.log(`[DataFetch] Cleared cache for key: ${key}`)
    } else {
      fetchStates.current.clear()
      console.log('[DataFetch] Cleared all cache')
    }
  }, [])

  return (
    <DataFetchContext.Provider value={{ getFetchState, executeFetch, clearCache }}>
      {children}
    </DataFetchContext.Provider>
  )
}

export function useDataFetch() {
  const context = useContext(DataFetchContext)
  if (context === undefined) {
    throw new Error('useDataFetch must be used within a DataFetchProvider')
  }
  return context
}

/**
 * Custom hook for coordinated API fetching
 */
export function useCoordinatedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttl?: number
    dedupWindow?: number
    dependencies?: any[]
  }
) {
  const { executeFetch, getFetchState } = useDataFetch()
  const [data, setData] = React.useState<T | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<any>(null)

  const fetch = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const result = await executeFetch(key, fetcher, options)
      setData(result)
      return result
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [key, executeFetch, ...(options?.dependencies || [])])

  React.useEffect(() => {
    fetch().catch(console.error)
  }, [fetch])

  return { data, loading, error, refetch: fetch }
}