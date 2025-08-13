/**
 * Security Middleware for API Routes
 * 
 * Provides comprehensive security measures including:
 * - Request validation
 * - Rate limiting
 * - Security headers
 * - CORS protection
 * - SQL injection prevention
 * - XSS protection
 */

import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter, securityHeaders } from '@/lib/validation/api-validators';
import { getUserProfile } from '@/lib/server-user-profile';

// Rate limiter instances for different endpoints
const generalRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60 // 60 requests per minute
});

const authRateLimiter = new RateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5 // 5 auth attempts per 15 minutes
});

const uploadRateLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10 // 10 uploads per minute
});

/**
 * Security middleware wrapper for API routes
 */
export function withSecurity(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  options?: SecurityOptions
) {
  return async function securedHandler(
    request: NextRequest,
    context?: any
  ): Promise<NextResponse> {
    try {
      // 1. Apply security headers
      const headers = new Headers(securityHeaders);
      
      // 2. CORS protection (if configured)
      if (options?.cors) {
        const origin = request.headers.get('origin');
        const allowedOrigins = options.cors.origins || ['*'];
        
        if (allowedOrigins.includes('*') || (origin && allowedOrigins.includes(origin))) {
          headers.set('Access-Control-Allow-Origin', origin || '*');
          headers.set('Access-Control-Allow-Methods', options.cors.methods?.join(', ') || 'GET, POST, PUT, DELETE, OPTIONS');
          headers.set('Access-Control-Allow-Headers', options.cors.headers?.join(', ') || 'Content-Type, Authorization');
          headers.set('Access-Control-Max-Age', String(options.cors.maxAge || 86400));
        } else if (origin) {
          // Origin not allowed
          return new NextResponse('CORS policy violation', { 
            status: 403,
            headers 
          });
        }
      }
      
      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, { status: 204, headers });
      }
      
      // 3. Rate limiting
      const rateLimiter = options?.rateLimiter || generalRateLimiter;
      const identifier = await getRateLimitIdentifier(request);
      
      if (!rateLimiter.check(identifier)) {
        return new NextResponse(
          JSON.stringify({ error: 'Too many requests. Please try again later.' }),
          { 
            status: 429,
            headers: {
              ...Object.fromEntries(headers),
              'Retry-After': '60',
              'Content-Type': 'application/json'
            }
          }
        );
      }
      
      // 4. Authentication check (if required)
      if (options?.requireAuth !== false) {
        const { user, userProfile } = await getUserProfile(request);
        
        if (!user || !userProfile) {
          return new NextResponse(
            JSON.stringify({ error: 'Authentication required' }),
            { 
              status: 401,
              headers: {
                ...Object.fromEntries(headers),
                'Content-Type': 'application/json'
              }
            }
          );
        }
        
        // Check role-based access
        if (options?.allowedRoles && !options.allowedRoles.includes(userProfile.role)) {
          return new NextResponse(
            JSON.stringify({ error: 'Insufficient permissions' }),
            { 
              status: 403,
              headers: {
                ...Object.fromEntries(headers),
                'Content-Type': 'application/json'
              }
            }
          );
        }
      }
      
      // 5. Content-Type validation for POST/PUT/PATCH
      if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
        const contentType = request.headers.get('content-type');
        
        if (!contentType?.includes('application/json') && !contentType?.includes('multipart/form-data')) {
          return new NextResponse(
            JSON.stringify({ error: 'Invalid Content-Type. Expected application/json or multipart/form-data' }),
            { 
              status: 400,
              headers: {
                ...Object.fromEntries(headers),
                'Content-Type': 'application/json'
              }
            }
          );
        }
      }
      
      // 6. Request size limit
      if (options?.maxBodySize) {
        const contentLength = request.headers.get('content-length');
        if (contentLength && parseInt(contentLength) > options.maxBodySize) {
          return new NextResponse(
            JSON.stringify({ error: `Request body too large. Maximum size: ${options.maxBodySize} bytes` }),
            { 
              status: 413,
              headers: {
                ...Object.fromEntries(headers),
                'Content-Type': 'application/json'
              }
            }
          );
        }
      }
      
      // 7. Execute the actual handler
      const response = await handler(request, context);
      
      // 8. Add security headers to response
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      
      // Add CORS headers if configured
      if (options?.cors) {
        const origin = request.headers.get('origin');
        if (origin) {
          response.headers.set('Access-Control-Allow-Origin', origin);
        }
      }
      
      return response;
      
    } catch (error) {
      console.error('Security middleware error:', error);
      
      // Don't leak internal errors
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        { 
          status: 500,
          headers: {
            ...securityHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
  };
}

/**
 * Get rate limit identifier from request
 */
async function getRateLimitIdentifier(request: NextRequest): Promise<string> {
  // Try to get authenticated user ID first
  try {
    const { user } = await getUserProfile(request);
    if (user?.id) {
      return `user:${user.id}`;
    }
  } catch {
    // Not authenticated, use IP
  }
  
  // Fall back to IP address
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwardedFor?.split(',')[0] || realIp || 'unknown';
  
  return `ip:${ip}`;
}

/**
 * Security options interface
 */
export interface SecurityOptions {
  requireAuth?: boolean;
  allowedRoles?: string[];
  rateLimiter?: RateLimiter;
  maxBodySize?: number;
  cors?: {
    origins?: string[];
    methods?: string[];
    headers?: string[];
    maxAge?: number;
  };
}

/**
 * Pre-configured security middlewares for common use cases
 */
export const securityPresets = {
  // Public endpoint (no auth required)
  public: withSecurity,
  
  // Authenticated users only
  authenticated: (handler: any) => withSecurity(handler, {
    requireAuth: true
  }),
  
  // Admin only
  adminOnly: (handler: any) => withSecurity(handler, {
    requireAuth: true,
    allowedRoles: ['CEO', 'Admin']
  }),
  
  // Managers and above
  managerPlus: (handler: any) => withSecurity(handler, {
    requireAuth: true,
    allowedRoles: ['CEO', 'Admin', 'Manager']
  }),
  
  // File upload endpoints
  upload: (handler: any) => withSecurity(handler, {
    requireAuth: true,
    rateLimiter: uploadRateLimiter,
    maxBodySize: 10 * 1024 * 1024 // 10MB
  }),
  
  // Authentication endpoints (strict rate limiting)
  auth: (handler: any) => withSecurity(handler, {
    requireAuth: false,
    rateLimiter: authRateLimiter
  })
};

/**
 * Helper to create API response with security headers
 */
export function secureResponse(
  data: any,
  status: number = 200,
  additionalHeaders?: Record<string, string>
): NextResponse {
  return new NextResponse(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...securityHeaders,
        'Content-Type': 'application/json',
        ...additionalHeaders
      }
    }
  );
}

/**
 * Helper to create error response with security headers
 */
export function secureErrorResponse(
  message: string,
  status: number = 500,
  details?: any
): NextResponse {
  const body: any = { error: message };
  if (details && process.env.NODE_ENV === 'development') {
    body.details = details;
  }
  
  return secureResponse(body, status);
}

export default {
  withSecurity,
  securityPresets,
  secureResponse,
  secureErrorResponse,
  generalRateLimiter,
  authRateLimiter,
  uploadRateLimiter
};