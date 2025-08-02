import { SWRConfiguration } from "swr"

export const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 2000,
  fetcher: async (url: string) => {
    // Get auth token from session storage or cookie if available
    let headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }
    
    // Try to get session from supabase client
    if (typeof window !== 'undefined') {
      try {
        const { createClient } = await import('@/utils/supabase/client')
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`
        }
      } catch (error) {
        console.warn('Failed to get auth token for SWR request:', error)
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