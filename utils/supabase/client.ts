import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // Get cookie from browser
          const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith(`${name}=`))
            ?.split('=')[1]
          
          return cookieValue ? decodeURIComponent(cookieValue) : undefined
        },
        set(name: string, value: string, options?: any) {
          // Set cookie in browser with proper options
          const cookieOptions = {
            path: '/',
            sameSite: 'lax' as const,
            secure: window.location.protocol === 'https:',
            maxAge: options?.maxAge || 60 * 60 * 24 * 365, // 1 year default
            ...options
          }
          
          const cookieString = `${name}=${encodeURIComponent(value)}; ` +
            `path=${cookieOptions.path}; ` +
            `max-age=${cookieOptions.maxAge}; ` +
            `SameSite=${cookieOptions.sameSite}` +
            (cookieOptions.secure ? '; Secure' : '')
          
          document.cookie = cookieString
        },
        remove(name: string, options?: any) {
          // Remove cookie by setting expiry in the past
          document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT`
        }
      }
    }
  )
}

// Export default instance for backward compatibility
export const supabase = createClient()