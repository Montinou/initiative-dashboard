import { NextResponse, type NextRequest } from 'next/server'
import { getDomainTenantRestriction, getThemeFromDomain } from '@/lib/theme-config'
import { superadminMiddleware } from '@/lib/superadmin-middleware'

export async function middleware(request: NextRequest) {
  try {
    // Handle superadmin routes with separate middleware
    if (request.nextUrl.pathname.startsWith('/superadmin')) {
      return superadminMiddleware(request);
    }

    // Skip middleware for static files, API routes, and auth routes
    if (
      request.nextUrl.pathname.startsWith('/_next') ||
      request.nextUrl.pathname.startsWith('/api/') ||
      request.nextUrl.pathname.startsWith('/auth/') ||
      request.nextUrl.pathname.includes('.')
    ) {
      return NextResponse.next()
    }

    // Only handle theme configuration - let client-side handle auth
    const hostname = request.headers.get('host') || ''
    let theme
    
    try {
      theme = getThemeFromDomain(hostname)
    } catch (error) {
      console.error('Theme config error:', error)
    }

    const response = NextResponse.next()

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