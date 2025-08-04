import { SWRConfiguration } from "swr"
import { kpiCache, CachePerformanceMonitor } from "@/lib/cache/kpi-cache"

export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  // Performance optimizations for PERF-001
  revalidateIfStale: true,
  keepPreviousData: true,
  suspense: false,
  // Enhanced request deduplication
  dedupingInterval: 10000, // Increased to 10s for better cache utilization
  // Optimize retry behavior
  shouldRetryOnError: (error) => {
    // Don't retry on 404 errors (missing user profiles after data reset)
    if (error.status === 404) return false;
    // Don't retry on 401/403 (auth issues)
    if (error.status === 401 || error.status === 403) return false;
    // Don't retry on 400 (bad requests)
    if (error.status === 400) return false;
    // Retry on 500+ server errors
    return error.status >= 500;
  },
  errorRetryCount: 3,
  errorRetryInterval: 2000, // Increased from 1000ms to reduce server load
  // Performance monitoring
  onSuccess: (data, key, config) => {
    // Log successful cache operations for performance monitoring
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log(`[SWR] Cache HIT for key: ${key}`);
    }
  },
  onError: (error, key) => {
    // Log errors for performance monitoring
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.warn(`[SWR] Cache MISS/ERROR for key: ${key}`, error);
    }
  },
  fetcher: async (url: string) => {
    // Performance logging for development
    if (process.env.NODE_ENV === 'development') {
      console.log('🚀 SWR fetcher called for URL:', url);
    }
    
    // Start performance monitoring if not already started
    if (typeof window !== 'undefined') {
      CachePerformanceMonitor.startMonitoring();
    }
    
    // Get auth token and tenant ID from session storage or cookie if available
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    // Try to get session and user profile from local storage and supabase client with timeout
    if (typeof window !== 'undefined') {
      try {
        const { createClient } = await import('@/utils/supabase/client')
        const supabase = createClient()
        
        // Add timeout to session fetch
        const sessionPromise = supabase.auth.getSession()
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session timeout')), 2000)
        )
        
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]) as any
        
        if (session?.access_token && (!session.expires_at || (session.expires_at && new Date(session.expires_at * 1000) > new Date()))) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }

        // Get tenant ID from local storage (user profile)
        try {
          const userProfileData = localStorage.getItem('user_profile_v2')
          console.log('SWR: localStorage keys available:', Object.keys(localStorage))
          console.log('SWR: Raw localStorage data:', userProfileData ? userProfileData.substring(0, 200) : 'null')
          
          if (userProfileData) {
            const cachedProfile = JSON.parse(userProfileData)
            // Access the nested profile object from CachedProfile structure
            const userProfile = cachedProfile?.profile
            console.log('SWR: Parsed cached profile structure:', {
              hasProfile: !!userProfile,
              tenant_id: userProfile?.tenant_id,
              email: userProfile?.email,
              expiresAt: cachedProfile?.expiresAt
            })
            if (userProfile?.tenant_id) {
              headers['x-tenant-id'] = userProfile.tenant_id
              console.log('✅ SWR: Added x-tenant-id header:', userProfile.tenant_id)
            } else {
              console.warn('❌ SWR: No tenant_id found in user profile')
            }
          } else {
            console.warn('❌ SWR: No user_profile_v2 found in localStorage')
          }
        } catch (error) {
          console.error('❌ SWR: Failed to get tenant ID from local storage:', error)
        }
      } catch (error) {
        console.warn('Failed to get auth token for SWR request:', error)
        // Continue without auth header but still try to get tenant ID from local storage
        try {
          const userProfileData = localStorage.getItem('user_profile_v2')
          console.log('SWR (fallback): Checking localStorage for user profile:', userProfileData ? 'Found' : 'Not found')
          if (userProfileData) {
            const cachedProfile = JSON.parse(userProfileData)
            // Access the nested profile object from CachedProfile structure
            const userProfile = cachedProfile?.profile
            console.log('SWR (fallback): Parsed user profile:', { tenant_id: userProfile?.tenant_id, email: userProfile?.email })
            if (userProfile?.tenant_id) {
              headers['x-tenant-id'] = userProfile.tenant_id
              console.log('SWR (fallback): Added x-tenant-id header:', userProfile.tenant_id)
            } else {
              console.warn('SWR (fallback): No tenant_id found in user profile')
            }
          }
        } catch (storageError) {
          console.warn('Failed to get tenant ID from local storage:', storageError)
        }
      }
    }
    
    console.log('SWR: Making request to', url, 'with headers:', Object.keys(headers))
    const res = await fetch(url, { headers })
    
    if (!res.ok) {
      const error = new Error("An error occurred while fetching the data.")
      // @ts-ignore
      error.info = await res.json().catch(() => ({ message: res.statusText }))
      // @ts-ignore
      error.status = res.status
      throw error
    }
    
    return res.json()
  },
}