import { NextRequest, NextResponse } from 'next/server';
import { supabaseSuperadminAuth } from './supabase-superadmin-auth';

export interface SuperadminContext {
  superadmin: {
    id: string;
    email: string;
    name: string;
    role: 'superadmin';
  } | null;
  isAuthenticated: boolean;
}

/**
 * Updated middleware to protect superadmin routes using Supabase Auth
 */
export async function superadminMiddleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for public superadmin assets and login routes
  if (pathname.startsWith('/superadmin/_next') || 
      pathname.startsWith('/superadmin/api/auth/login') ||
      pathname === '/superadmin/login') {
    return NextResponse.next();
  }

  // Get session token from cookie (now contains Supabase access token)
  const sessionToken = request.cookies.get('superadmin-session')?.value;
  
  if (!sessionToken) {
    return redirectToLogin(request);
  }

  try {
    // Validate session using new Supabase-based auth
    const profile = await supabaseSuperadminAuth.validateSession(sessionToken);
    
    if (!profile) {
      // Invalid session, redirect to login and clear cookies
      const response = redirectToLogin(request);
      response.cookies.delete('superadmin-session');
      response.cookies.delete('superadmin-refresh');
      return response;
    }

    // Add superadmin context to headers for API routes
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-superadmin-id', profile.id);
    requestHeaders.set('x-superadmin-email', profile.email);
    requestHeaders.set('x-superadmin-name', profile.full_name || profile.email);
    requestHeaders.set('x-superadmin-role', 'superadmin');

    // Continue with authenticated request
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

  } catch (error) {
    console.error('Superadmin middleware error:', error);
    
    // Clear cookies and redirect on error
    const response = redirectToLogin(request);
    response.cookies.delete('superadmin-session');
    response.cookies.delete('superadmin-refresh');
    return response;
  }
}

/**
 * Extract superadmin context from request headers
 */
export function getSuperadminContext(request: NextRequest | Request): SuperadminContext {
  const headers = request.headers;
  const superadminId = headers.get('x-superadmin-id');
  const superadminEmail = headers.get('x-superadmin-email');
  const superadminName = headers.get('x-superadmin-name');
  const superadminRole = headers.get('x-superadmin-role');

  if (superadminId && superadminEmail && superadminName && superadminRole === 'superadmin') {
    return {
      superadmin: {
        id: superadminId,
        email: superadminEmail,
        name: superadminName,
        role: 'superadmin'
      },
      isAuthenticated: true,
    };
  }

  return {
    superadmin: null,
    isAuthenticated: false,
  };
}

/**
 * Higher-order function to protect API routes
 */
export function withSuperadminAuth<T extends any[]>(
  handler: (request: NextRequest, context: SuperadminContext, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const context = getSuperadminContext(request);
    
    if (!context.isAuthenticated) {
      return NextResponse.json(
        { error: 'Unauthorized: Superadmin access required' },
        { status: 401 }
      );
    }

    return handler(request, context, ...args);
  };
}

/**
 * Utility to redirect to login page
 */
function redirectToLogin(request: NextRequest): NextResponse {
  const loginUrl = new URL('/superadmin/login', request.url);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

/**
 * Rate limiting for superadmin endpoints (unchanged from original)
 */
class SuperadminRateLimiter {
  private attempts: Map<string, { count: number; resetTime: number }> = new Map();
  private readonly MAX_ATTEMPTS = 5;
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  check(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const record = this.attempts.get(identifier);

    if (!record || now > record.resetTime) {
      // First attempt or window expired
      this.attempts.set(identifier, { count: 1, resetTime: now + this.WINDOW_MS });
      return { allowed: true, remaining: this.MAX_ATTEMPTS - 1, resetTime: now + this.WINDOW_MS };
    }

    if (record.count >= this.MAX_ATTEMPTS) {
      // Rate limit exceeded
      return { allowed: false, remaining: 0, resetTime: record.resetTime };
    }

    // Increment attempts
    record.count++;
    this.attempts.set(identifier, record);
    
    return { 
      allowed: true, 
      remaining: this.MAX_ATTEMPTS - record.count, 
      resetTime: record.resetTime 
    };
  }

  reset(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

export const superadminRateLimiter = new SuperadminRateLimiter();

/**
 * Apply rate limiting to superadmin requests
 */
export function withRateLimit(
  handler: (request: NextRequest) => Promise<NextResponse>,
  identifier: (request: NextRequest) => string = (req) => getClientIP(req)
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const id = identifier(request);
    const rateLimitCheck = superadminRateLimiter.check(id);

    if (!rateLimitCheck.allowed) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          resetTime: rateLimitCheck.resetTime 
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitCheck.resetTime.toString(),
          }
        }
      );
    }

    const response = await handler(request);

    // Add rate limit headers to successful responses
    if (response.status < 400) {
      response.headers.set('X-RateLimit-Limit', '5');
      response.headers.set('X-RateLimit-Remaining', rateLimitCheck.remaining.toString());
      response.headers.set('X-RateLimit-Reset', rateLimitCheck.resetTime.toString());
    }

    return response;
  };
}

/**
 * Get client IP address from request
 */
export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return request.ip || 'unknown';
}

/**
 * Log superadmin action using new auth system
 */
export async function logSuperadminAction(
  superadminId: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: Record<string, any>,
  request?: NextRequest
): Promise<void> {
  try {
    const ipAddress = request ? getClientIP(request) : null;
    const userAgent = request ? request.headers.get('user-agent') : null;

    // Use the new auth system's logging method
    await supabaseSuperadminAuth['logAction'](
      superadminId,
      action,
      targetType,
      targetId || null,
      {
        ...details,
        ip_address: ipAddress,
        user_agent: userAgent,
        timestamp: new Date().toISOString()
      }
    );
    
  } catch (error) {
    console.error('Failed to log superadmin action:', error);
  }
}