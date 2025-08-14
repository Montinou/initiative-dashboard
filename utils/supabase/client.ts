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
      },
      // Enhanced security configuration per docs/supabase-sesion.md lines 503-521
      cookieOptions: {
        name: 'sb-session',
        domain: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_APP_URL 
          ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname.replace('www.', '.')
          : undefined,
        path: '/',
        sameSite: 'lax',                // Mitigate CSRF attacks
        secure: process.env.NODE_ENV === 'production', // Require HTTPS in production
        httpOnly: false,                // Browser client needs access
        maxAge: 3600,                   // Align with token expiration
      }
    }
  )
}

// Export default instance for backward compatibility
export const supabase = createClient()