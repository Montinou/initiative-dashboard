import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getThemeFromDomain } from '@/lib/theme-config'
import { superadminMiddleware } from '@/lib/superadmin-middleware'

// Simplified role validation helper
async function validateUserAccess(supabase: any, userId: string, requiredRole?: string) {
  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('id, tenant_id, role, area_id, is_active, areas(id, name)')
    .eq('user_id', userId)
    .single();

  if (error || !profile?.is_active) return null;
  if (requiredRole && profile.role !== requiredRole) return null;
  
  return profile;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Skip middleware for static files and API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  try {
    let response = NextResponse.next({
      request: { headers: request.headers }
    })

    // Create simplified Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            response.cookies.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            response.cookies.set({ name, value: '', ...options })
          },
        },
      }
    )

    // Handle route-specific authentication
    if (pathname.startsWith('/superadmin')) {
      return superadminMiddleware(request)
    }

    if (pathname.startsWith('/manager-dashboard')) {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        return NextResponse.redirect(new URL('/auth/login', request.url))
      }
      
      const profile = await validateUserAccess(supabase, session.user.id, 'Manager')
      if (!profile) {
        return NextResponse.redirect(new URL('/unauthorized', request.url))
      }
      
      // Add user context to headers
      response.headers.set('x-user-role', profile.role)
      response.headers.set('x-user-area-id', profile.area_id || '')
      response.headers.set('x-user-tenant-id', profile.tenant_id)
    }

    // Handle theme configuration
    const hostname = request.headers.get('host') || ''
    try {
      const theme = await getThemeFromDomain(hostname)
      if (theme) {
        response.headers.set('x-domain-theme', theme.tenantId)
      }
    } catch (error) {
      console.error('Theme config error:', error)
    }

    return response
  } catch (error) {
    console.error('Middleware error:', error)
    return NextResponse.next({ request })
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}