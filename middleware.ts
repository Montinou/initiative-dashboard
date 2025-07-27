import { NextResponse, type NextRequest } from 'next/server'
import { getDomainTenantRestriction, getThemeFromDomain } from '@/lib/theme-config'
import { superadminMiddleware } from '@/lib/superadmin-middleware'
import { validateAuth, checkRoutePermissions } from '@/lib/auth-validator'

export async function middleware(request: NextRequest) {
  try {
    // Handle superadmin routes with separate middleware
    if (request.nextUrl.pathname.startsWith('/superadmin')) {
      return superadminMiddleware(request);
    }

    // Skip middleware for static files and API routes that don't need auth
    if (
      request.nextUrl.pathname.startsWith('/_next') ||
      request.nextUrl.pathname.startsWith('/api/') ||
      request.nextUrl.pathname.includes('.')
    ) {
      return NextResponse.next()
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

    // Validate authentication using our new auth validator
    const authResult = await validateAuth(request)
    const { isAuthenticated, user, profile, redirectResponse } = authResult

    // Check route permissions
    const permissionResult = await checkRoutePermissions(request, user, profile)
    
    if (!permissionResult.hasAccess && permissionResult.redirectResponse) {
      return permissionResult.redirectResponse
    }

    // Use the response from auth validation (includes cookie updates)
    const response = redirectResponse || NextResponse.next()

    // Add theme info to headers if available
    if (theme && isAuthenticated) {
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