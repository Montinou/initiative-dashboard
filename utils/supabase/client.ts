import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Use default cookie handling from @supabase/ssr which works properly with Next.js
  // This ensures cookies are properly synced between client and server
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Export default instance for backward compatibility
export const supabase = createClient()