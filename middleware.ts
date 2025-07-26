import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
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

  // For authenticated users, verify they belong to the Fema tenant
  if (user && isProtectedRoute) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('tenant_id, role, area_id')
        .eq('id', user.id)
        .single()

      if (!userData || userData.tenant_id !== process.env.FEMA_TENANT_ID) {
        // User doesn't belong to Fema tenant
        await supabase.auth.signOut()
        return NextResponse.redirect(new URL('/auth/unauthorized', request.url))
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