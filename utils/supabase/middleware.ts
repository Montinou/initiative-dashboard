import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Protected routes configuration
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/manager-dashboard',
  '/admin',
  '/org-admin',
  '/analytics',
  '/areas',
  '/initiatives'
]

// Public routes that don't need auth
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/auth/login',
  '/auth/signup',
  '/auth/forgot-password',
  '/auth/reset-password'
]

export async function updateSession(request: NextRequest) {
  // Create response with enhanced security headers per best practices
  let supabaseResponse = NextResponse.next({
    request,
    headers: {
      // Enhanced security headers following OWASP guidelines
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
      'Strict-Transport-Security': process.env.NODE_ENV === 'production' 
        ? 'max-age=63072000; includeSubDomains; preload' 
        : '',
      'Content-Security-Policy': process.env.NODE_ENV === 'production'
        ? "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;"
        : '',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
            headers: supabaseResponse.headers
          })
          // Set cookies with Supabase's expected options
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const pathname = request.nextUrl.pathname
  
  // Skip auth check for public routes
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
  if (isPublicRoute) {
    return supabaseResponse
  }

  // Check if route is protected
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  
  // Get user session for protected routes
  if (isProtectedRoute) {
    // IMPORTANT: Always use getUser() on server-side per Supabase best practices
    // This verifies the JWT and cannot be spoofed (docs/supabase-sesion.md line 538)
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      // No valid session, redirect to login
      console.log('[Middleware] No valid session for protected route:', {
        pathname,
        hasUser: !!user,
        userError: userError?.message
      })
      
      const url = request.nextUrl.clone()
      url.pathname = '/auth/login'
      // Preserve the original URL as a redirect parameter
      url.searchParams.set('redirectTo', pathname)
      
      const redirectResponse = NextResponse.redirect(url)
      // Copy over the cookies to maintain any partial session state
      supabaseResponse.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value)
      })
      return redirectResponse
    }
    
    // User is authenticated - add user info to request headers for downstream use
    supabaseResponse.headers.set('x-user-id', user.id)
    supabaseResponse.headers.set('x-user-email', user.email || '')
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object instead of the supabaseResponse object

  return supabaseResponse
}