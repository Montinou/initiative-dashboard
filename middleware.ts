import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getDomainTenantRestriction, getThemeFromDomain } from '@/lib/theme-config'
import { superadminMiddleware } from '@/lib/superadmin-middleware'

// Manager middleware for role validation and area access control
async function managerMiddleware(
  request: NextRequest, 
  response: NextResponse,
  supabase: any
) {
  try {
    // Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session?.user) {
      console.log('Manager middleware: No valid session, redirecting to login');
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    // Get user profile with area information
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        tenant_id,
        role,
        area_id,
        is_active,
        areas!user_profiles_area_id_fkey (
          id,
          name
        )
      `)
      .eq('id', session.user.id)
      .single();

    if (profileError || !profile) {
      console.error('Manager middleware: Failed to fetch user profile:', profileError);
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Check if user is active
    if (!profile.is_active) {
      console.log('Manager middleware: User account is inactive');
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Check if user has Manager role
    if (profile.role !== 'Manager') {
      console.log('Manager middleware: User is not a Manager:', profile.role);
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Check if manager has an assigned area
    if (!profile.area_id) {
      console.log('Manager middleware: Manager has no assigned area');
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Add manager context to headers for use in components
    response.headers.set('x-manager-area-id', profile.area_id);
    response.headers.set('x-manager-area-name', profile.areas?.name || '');
    response.headers.set('x-manager-tenant-id', profile.tenant_id);

    console.log('Manager middleware: Access granted for manager:', {
      userId: profile.id,
      areaId: profile.area_id,
      areaName: profile.areas?.name
    });

    return response;
  } catch (error) {
    console.error('Manager middleware error:', error);
    return NextResponse.redirect(new URL('/unauthorized', request.url));
  }
}

export async function middleware(request: NextRequest) {
  console.log('🌐 Middleware: Request URL:', request.url);
  console.log('🏠 Middleware: Host header:', request.headers.get('host'));
  
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

    // Handle manager dashboard routes with role validation
    if (request.nextUrl.pathname.startsWith('/manager-dashboard')) {
      return await managerMiddleware(request, response, supabase);
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