import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,          // Auto-refresh tokens
        persistSession: true,            // Persist session in storage
        detectSessionInUrl: true,        // Detect session in URL for OAuth
        flowType: 'pkce',               // More secure PKCE flow
        debug: false,                   // Disable debug in production
      }
      // Remove custom cookieOptions to use default Supabase cookie naming
      // This ensures consistency between client and server
    }
  )
}

// Export default instance for backward compatibility
export const supabase = createClient()