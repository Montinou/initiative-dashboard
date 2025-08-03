import { SWRConfiguration } from "swr"

export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
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
  dedupingInterval: 5000, // Increased from 2000ms to reduce duplicate requests
  fetcher: async (url: string) => {
    // Get auth token from session storage or cookie if available
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    // Try to get session from supabase client with timeout
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
      } catch (error) {
        console.warn('Failed to get auth token for SWR request:', error)
        // Continue without auth header
      }
    }
    
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