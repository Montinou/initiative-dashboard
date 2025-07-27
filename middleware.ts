import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getDomainTenantRestriction, getThemeFromDomain } from '@/lib/theme-config'
import { superadminMiddleware } from '@/lib/superadmin-middleware'
import { checkRoutePermission, getUnauthorizedRedirect } from '@/lib/route-protection'

export async function middleware(request: NextRequest) {
  try {
    // Handle superadmin routes with separate middleware
    if (request.nextUrl.pathname.startsWith('/superadmin')) {
      return superadminMiddleware(request);
    }

    let supabaseResponse = NextResponse.next({
      request,
    })

    // Skip middleware for static files and API routes that don't need auth
    if (
      request.nextUrl.pathname.startsWith('/_next') ||
      request.nextUrl.pathname.startsWith('/api/') ||
      request.nextUrl.pathname.includes('.')
    ) {
      return supabaseResponse
    }

    // Get domain-based theme and tenant restrictions
    const hostname = request.headers.get('host') || ''
    let theme, domainTenantRestriction
    
    try {
      theme = getThemeFromDomain(hostname)
      domainTenantRestriction = getDomainTenantRestriction(hostname)
    } catch (error) {
      console.error('Theme config error:', error)
      // Continue without theme restrictions if there's an error
    }

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
            supabaseResponse = NextResponse.next({
              request,
            })
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    // Define protected routes
    const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') || 
                            request.nextUrl.pathname.startsWith('/admin') ||
                            request.nextUrl.pathname.startsWith('/profile') ||
                            request.nextUrl.pathname === '/'

    // Define auth routes
    const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')

    // For auth routes, just pass through (let components handle theming)
    if (isAuthRoute) {
      return supabaseResponse
    }

    // Check auth status for protected routes
    if (isProtectedRoute) {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (!user) {
        const redirectUrl = new URL('/auth/login', request.url)
        redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }

      // Redirect authenticated users from root to dashboard
      if (user && request.nextUrl.pathname === '/') {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      // Check role-based route permissions
      const hasAccess = await checkRoutePermission(request, user)
      if (!hasAccess) {
        return getUnauthorizedRedirect(request)
      }

      // Add basic user info to headers if available
      if (theme) {
        supabaseResponse.headers.set('x-domain-theme', theme.tenantId)
      }
    }

    return supabaseResponse
  } catch (error) {
    console.error('Middleware error:', error)
    // Return basic response if middleware fails
    return NextResponse.next({
      request,
    })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}