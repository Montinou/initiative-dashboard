import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getDomainTenantRestriction, getThemeFromDomain } from '@/lib/theme-config'
import { superadminMiddleware } from '@/lib/superadmin-middleware'

export async function middleware(request: NextRequest) {
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    // Create Supabase client for session refresh
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: CookieOptions) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response = NextResponse.next({
              request: {
                headers: request.headers,
              },
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    // Refresh session to ensure tokens are up to date
    await supabase.auth.getSession()

    // Handle superadmin routes with separate middleware
    if (request.nextUrl.pathname.startsWith('/superadmin')) {
      return superadminMiddleware(request);
    }

    // Skip theme configuration for static files, API routes, and auth routes
    if (
      request.nextUrl.pathname.startsWith('/_next') ||
      request.nextUrl.pathname.startsWith('/api/') ||
      request.nextUrl.pathname.startsWith('/auth/') ||
      request.nextUrl.pathname.includes('.')
    ) {
      return response
    }

    // Handle theme configuration for domain-based theming
    const hostname = request.headers.get('host') || ''
    let theme
    
    try {
      theme = await getThemeFromDomain(hostname)
    } catch (error) {
      console.error('Theme config error:', error)
    }

    // Add theme info to headers if available
    if (theme) {
      response.headers.set('x-domain-theme', theme.tenantId)
    }

    return response
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