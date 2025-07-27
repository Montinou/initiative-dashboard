import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hasPermission, UserRole, ROLE_HIERARCHY } from './role-permissions'

export interface AuthValidationResult {
  isAuthenticated: boolean
  user: any
  profile: any
  redirectResponse?: NextResponse
}

export async function validateAuth(request: NextRequest): Promise<AuthValidationResult> {
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

  try {
    // Get both session and user for comprehensive auth check
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session || !session.user) {
      console.log('Auth validation failed:', sessionError?.message || 'No session')
      return {
        isAuthenticated: false,
        user: null,
        profile: null
      }
    }

    const user = session.user

    // Get user profile for role-based permissions
    let profile = null
    try {
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!profileError && userProfile) {
        profile = userProfile
      }
    } catch (profileError) {
      console.log('Profile fetch error:', profileError)
      // Continue without profile - some routes might not need it
    }

    console.log('Auth validation successful:', { userId: user.id, email: user.email, role: profile?.role })
    
    return {
      isAuthenticated: true,
      user,
      profile,
      redirectResponse: supabaseResponse
    }

  } catch (error) {
    console.error('Auth validation error:', error)
    return {
      isAuthenticated: false,
      user: null,
      profile: null
    }
  }
}

export interface RoutePermissionCheck {
  hasAccess: boolean
  redirectResponse?: NextResponse
}

export async function checkRoutePermissions(
  request: NextRequest,
  user: any,
  profile: any
): Promise<RoutePermissionCheck> {
  const pathname = request.nextUrl.pathname

  // Public routes - no auth needed
  const publicRoutes = ['/demo', '/auth/login', '/unauthorized']
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return { hasAccess: true }
  }

  // If no user, redirect to login
  if (!user) {
    const redirectUrl = new URL('/auth/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return {
      hasAccess: false,
      redirectResponse: NextResponse.redirect(redirectUrl)
    }
  }

  // Root redirect
  if (pathname === '/') {
    return {
      hasAccess: false,
      redirectResponse: NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Role-based route protection
  const roleBasedRoutes: Record<string, UserRole[]> = {
    '/admin': ['CEO', 'Admin'],
    '/users': ['CEO', 'Admin'],
    '/areas': ['CEO', 'Admin'],
    '/analytics': ['CEO', 'Admin', 'Analyst']
  }

  for (const [route, allowedRoles] of Object.entries(roleBasedRoutes)) {
    if (pathname.startsWith(route)) {
      if (!profile?.role || !allowedRoles.includes(profile.role as UserRole)) {
        return {
          hasAccess: false,
          redirectResponse: NextResponse.redirect(new URL('/unauthorized', request.url))
        }
      }
      break
    }
  }

  return { hasAccess: true }
}

export function createAuthRedirect(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.url))
}