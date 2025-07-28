import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient(cookieStore: ReturnType<typeof cookies>) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  console.log('🔧 Server Supabase client config:', {
    url: supabaseUrl ? 'Set' : 'Missing',
    key: supabaseAnonKey ? 'Set' : 'Missing',
    urlStart: supabaseUrl?.substring(0, 20) + '...',
    keyStart: supabaseAnonKey?.substring(0, 20) + '...'
  });

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  )
}