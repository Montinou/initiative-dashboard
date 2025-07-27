import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hasPermission, UserRole, ROLE_HIERARCHY } from './role-permissions'

export interface RouteProtection {
  requiredRole?: UserRole
  requiredPermission?: string
  allowedRoles?: UserRole[]
  requireAnyRole?: boolean
}

const ROUTE_PERMISSIONS: Record<string, RouteProtection> = {
  '/dashboard': { requireAnyRole: true },
  '/profile': { requireAnyRole: true },
  '/admin': { allowedRoles: ['CEO', 'Admin'] },
  '/analytics': { requiredPermission: 'accessAnalytics' },
  '/users': { requiredPermission: 'manageUsers' },
  '/areas': { requiredPermission: 'manageAreas' },
  '/initiatives': { requiredPermission: 'viewOKRs' },
}

export async function checkRoutePermission(
  request: NextRequest,
  user: any
): Promise<boolean> {
  const pathname = request.nextUrl.pathname
  
  if (!user) return false

  // Get user profile to determine role
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {}
      }
    }
  )

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile?.role) return false

  const userRole = profile.role as UserRole

  // Check specific route protection
  for (const [route, protection] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route)) {
      return checkPermission(userRole, protection)
    }
  }

  return true
}

function checkPermission(userRole: UserRole, protection: RouteProtection): boolean {
  if (protection.requireAnyRole) {
    return true
  }

  if (protection.allowedRoles) {
    return protection.allowedRoles.includes(userRole)
  }

  if (protection.requiredRole) {
    return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[protection.requiredRole]
  }

  if (protection.requiredPermission) {
    return hasPermission(userRole, protection.requiredPermission as any)
  }

  return true
}

export function getUnauthorizedRedirect(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL('/unauthorized', request.url))
}