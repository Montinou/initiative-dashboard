import { useState, useEffect, useCallback, useRef } from 'react'
import { useLoadingState } from '@/lib/loading-context'

interface ProgressiveLoadOptions<T> {
  // Unique key for this loading operation
  key: string
  // Function to load data
  loadFn: () => Promise<T>
  // Dependencies that trigger reload
  deps?: any[]
  // Initial data
  initialData?: T
  // Delay before showing loading state (ms)
  loadingDelay?: number
  // Minimum loading time (ms) to prevent flashing
  minLoadingTime?: number
  // Whether to load immediately or wait for manual trigger
  immediate?: boolean
  // Callback on successful load
  onSuccess?: (data: T) => void
  // Callback on error
  onError?: (error: Error) => void
}

export function useProgressiveLoad<T>({
  key,
  loadFn,
  deps = [],
  initialData,
  loadingDelay = 200,
  minLoadingTime = 300,
  immediate = true,
  onSuccess,
  onError
}: ProgressiveLoadOptions<T>) {
  const [data, setData] = useState<T | undefined>(initialData)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const { isLoading, error, startLoading, stopLoading, setError } = useLoadingState(key)
  
  const loadingTimerRef = useRef<NodeJS.Timeout>()
  const minLoadingTimerRef = useRef<NodeJS.Timeout>()
  const loadStartTimeRef = useRef<number>()
  
  const load = useCallback(async () => {
    // Clear any existing timers
    if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
    if (minLoadingTimerRef.current) clearTimeout(minLoadingTimerRef.current)
    
    // Set a timer to show loading state after delay
    loadingTimerRef.current = setTimeout(() => {
      startLoading('Loading data...')
      loadStartTimeRef.current = Date.now()
    }, loadingDelay)
    
    try {
      const result = await loadFn()
      
      // Calculate how long we've been showing the loading state
      const loadingDuration = loadStartTimeRef.current 
        ? Date.now() - loadStartTimeRef.current 
        : 0
      
      // If we've been showing loading, ensure minimum time
      if (loadingDuration > 0 && loadingDuration < minLoadingTime) {
        await new Promise(resolve => {
          minLoadingTimerRef.current = setTimeout(resolve, minLoadingTime - loadingDuration)
        })
      }
      
      setData(result)
      setIsInitialLoad(false)
      
      // Clear loading timer if it hasn't fired yet
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
      
      stopLoading()
      onSuccess?.(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load data')
      
      // Clear loading timer if it hasn't fired yet
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
      
      setError(error.message)
      onError?.(error)
    }
  }, [loadFn, startLoading, stopLoading, setError, loadingDelay, minLoadingTime, onSuccess, onError])
  
  // Load data on mount if immediate
  useEffect(() => {
    if (immediate) {
      load()
    }
    
    return () => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current)
      if (minLoadingTimerRef.current) clearTimeout(minLoadingTimerRef.current)
    }
  }, [...deps, immediate])
  
  return {
    data,
    isLoading,
    error,
    isInitialLoad,
    refetch: load,
    // Show skeleton on initial load, show data with overlay on subsequent loads
    shouldShowSkeleton: isInitialLoad && isLoading,
    shouldShowOverlay: !isInitialLoad && isLoading
  }
}

// Hook for paginated/infinite loading
export function useProgressivePagination<T>({
  key,
  loadFn,
  pageSize = 10,
  initialData = []
}: {
  key: string
  loadFn: (page: number, pageSize: number) => Promise<T[]>
  pageSize?: number
  initialData?: T[]
}) {
  const [items, setItems] = useState<T[]>(initialData)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const { isLoading, error, startLoading, stopLoading, setError, setProgress } = useLoadingState(key)
  
  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return
    
    startLoading(`Loading page ${page}...`)
    
    try {
      const newItems = await loadFn(page, pageSize)
      
      if (newItems.length < pageSize) {
        setHasMore(false)
      }
      
      setItems(prev => [...prev, ...newItems])
      setPage(prev => prev + 1)
      
      // Update progress
      const totalLoaded = items.length + newItems.length
      setProgress(Math.min((totalLoaded / (totalLoaded + pageSize)) * 100, 90))
      
      stopLoading()
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load more items')
      setError(error.message)
    }
  }, [page, pageSize, hasMore, isLoading, items.length, loadFn, startLoading, stopLoading, setError, setProgress])
  
  const reset = useCallback(() => {
    setItems([])
    setPage(1)
    setHasMore(true)
  }, [])
  
  return {
    items,
    isLoading,
    error,
    hasMore,
    loadMore,
    reset
  }
}