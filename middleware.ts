import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getDomainTenantRestriction } from '@/lib/theme-config'

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const url = request.nextUrl.clone()
  const pathname = url.pathname
  
  // Handle domain-based routing FIRST
  if (hostname.includes('stratix-platform')) {
    // Stratix Platform - Demo/Landing page
    if (pathname === '/') {
      url.pathname = '/demo'
      return NextResponse.rewrite(url)
    }
    // Allow access to all routes for demo domain (skip tenant validation)
    if (pathname === '/demo') {
      return NextResponse.next()
    }
    
  } else if (hostname.includes('fema-electricidad')) {
    // FEMA domain - Direct to login, restrict to FEMA tenant
    if (pathname === '/') {
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }
    // Block access to demo page from client domains
    if (pathname === '/demo') {
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }
    
  } else if (hostname.includes('siga-turismo')) {
    // SIGA domain - Direct to login, restrict to SIGA tenant
    if (pathname === '/') {
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }
    // Block access to demo page from client domains
    if (pathname === '/demo') {
      url.pathname = '/auth/login'
      return NextResponse.redirect(url)
    }
    
  } else if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    // For localhost - default to demo (Stratix behavior)
    if (pathname === '/') {
      url.pathname = '/demo'
      return NextResponse.rewrite(url)
    }
    if (pathname === '/demo') {
      return NextResponse.next()
    }
  }

  let supabaseResponse = NextResponse.next({
    request,
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

  // Check auth status
  const { data: { user }, error } = await supabase.auth.getUser()

  // Define protected routes
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') || 
                          request.nextUrl.pathname.startsWith('/admin') ||
                          request.nextUrl.pathname === '/'

  // Define auth routes
  const isAuthRoute = request.nextUrl.pathname.startsWith('/auth')

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect authenticated users away from auth pages
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // For authenticated users, verify they belong to the correct tenant based on domain
  if (user && isProtectedRoute) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id, role, area_id')
        .eq('id', user.id)
        .single()

      // Get domain tenant restriction
      const domainTenantRestriction = getDomainTenantRestriction(hostname)
      
      if (!userData) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }

      // If domain restricts to specific tenant, validate user belongs to it
      if (domainTenantRestriction && userData.tenant_id !== domainTenantRestriction) {
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }

      // Add user data to headers for use in components
      supabaseResponse.headers.set('x-user-role', userData.role)
      supabaseResponse.headers.set('x-user-tenant', userData.tenant_id)
      if (userData.area_id) {
        supabaseResponse.headers.set('x-user-area', userData.area_id)
      }
    } catch (error) {
      console.error('Error verifying user tenant:', error)
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}