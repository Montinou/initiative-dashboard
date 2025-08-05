import { SWRConfiguration } from "swr"

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
  // Remove excessive logging to prevent performance issues
  fetcher: async (url: string) => {
    
    // Get tenant ID from local storage (user profile)
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    // Authentication is handled by server-side cookies, we only need tenant ID
    if (typeof window !== 'undefined') {
      try {
        const userProfileData = localStorage.getItem('user_profile_v2')
        
        if (userProfileData) {
          const cachedProfile = JSON.parse(userProfileData)
          const userProfile = cachedProfile?.profile
          
          if (userProfile?.tenant_id) {
            headers['x-tenant-id'] = userProfile.tenant_id
          }
        }
      } catch (error) {
        // Silently fail to avoid console spam
      }
    }
    
    const res = await fetch(url, { 
      headers,
      credentials: 'include' // Ensure cookies are sent
    })
    
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