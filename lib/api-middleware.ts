/**
 * API Middleware Collection
 * 
 * Combines rate limiting, validation, error handling, and security
 * for comprehensive API protection
 */

import { NextRequest, NextResponse } from 'next/server'
import { RateLimiter, securityHeaders, validateQueryParams, validateRequestBody } from './validation/api-validators'
import { z } from 'zod'
import { getUserProfile } from './server-user-profile'

// Rate limiter instances for different endpoint types
const rateLimiters = {
  strict: new RateLimiter({ windowMs: 60000, maxRequests: 10 }),  // 10 req/min
  standard: new RateLimiter({ windowMs: 60000, maxRequests: 30 }), // 30 req/min
  relaxed: new RateLimiter({ windowMs: 60000, maxRequests: 60 }),  // 60 req/min
  auth: new RateLimiter({ windowMs: 900000, maxRequests: 5 }),     // 5 req/15min
  upload: new RateLimiter({ windowMs: 60000, maxRequests: 5 })      // 5 req/min
}

export type RateLimitLevel = keyof typeof rateLimiters

/**
 * Comprehensive API middleware wrapper
 */
export function withApiMiddleware<T = any>(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    rateLimit?: RateLimitLevel
    requireAuth?: boolean
    querySchema?: z.ZodSchema
    bodySchema?: z.ZodSchema
    allowedRoles?: Array<'CEO' | 'Admin' | 'Manager'>
  } = {}
) {
  return async function middlewareHandler(
    req: NextRequest,
    context?: any
  ): Promise<NextResponse> {
    try {
      // 1. Apply security headers
      const response = new NextResponse()
      Object.entries(securityHeaders).forEach(([key, value]) => {
        response.headers.set(key, value)
      })

      // 2. Rate limiting
      if (options.rateLimit) {
        const identifier = getIdentifier(req)
        const limiter = rateLimiters[options.rateLimit]
        
        if (!limiter.check(identifier)) {
          return createRateLimitResponse()
        }
      }

      // 3. Authentication check
      let userProfile = null
      if (options.requireAuth) {
        const authResult = await getUserProfile(req)
        
        if (!authResult.user || !authResult.userProfile) {
          return createAuthErrorResponse()
        }
        
        userProfile = authResult.userProfile
        
        // 4. Role-based access control
        if (options.allowedRoles && !options.allowedRoles.includes(userProfile.role)) {
          return createForbiddenResponse()
        }
      }

      // 5. Query parameter validation
      let validatedQuery = {}
      if (options.querySchema) {
        const searchParams = new URL(req.url).searchParams
        const queryResult = validateQueryParams(searchParams, options.querySchema)
        
        if ('error' in queryResult) {
          return createValidationErrorResponse(queryResult.error, 'query')
        }
        
        validatedQuery = queryResult
      }

      // 6. Request body validation
      let validatedBody = {}
      if (options.bodySchema && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const bodyResult = await validateRequestBody(req.clone(), options.bodySchema)
        
        if ('error' in bodyResult) {
          return createValidationErrorResponse(bodyResult.error, 'body')
        }
        
        validatedBody = bodyResult
      }

      // 7. Call the actual handler with validated data
      const enhancedContext = {
        ...context,
        query: validatedQuery,
        body: validatedBody,
        userProfile
      }
      
      const handlerResponse = await handler(req, enhancedContext)
      
      // 8. Apply security headers to response
      Object.entries(securityHeaders).forEach(([key, value]) => {
        handlerResponse.headers.set(key, value)
      })
      
      return handlerResponse
      
    } catch (error) {
      console.error('API Middleware Error:', error)
      return createInternalErrorResponse(error)
    }
  }
}

/**
 * Get identifier for rate limiting
 */
function getIdentifier(req: NextRequest): string {
  // Try to get IP from various headers
  const ip = 
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    req.ip ||
    'unknown'
  
  // Try to get user ID from authorization header
  const authHeader = req.headers.get('authorization')
  const userId = authHeader ? simpleHash(authHeader) : 'anonymous'
  
  return `${ip}:${userId}`
}

/**
 * Simple hash function for token identification
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return hash.toString(36)
}

/**
 * Error response creators
 */
function createRateLimitResponse(): NextResponse {
  return NextResponse.json(
    {
      error: {
        type: 'RATE_LIMIT_ERROR',
        message: 'Too many requests. Please try again later.',
        timestamp: new Date().toISOString()
      }
    },
    { 
      status: 429,
      headers: {
        'Retry-After': '60',
        ...securityHeaders
      }
    }
  )
}

function createAuthErrorResponse(): NextResponse {
  return NextResponse.json(
    {
      error: {
        type: 'AUTHENTICATION_ERROR',
        message: 'Authentication required',
        timestamp: new Date().toISOString()
      }
    },
    { 
      status: 401,
      headers: securityHeaders
    }
  )
}

function createForbiddenResponse(): NextResponse {
  return NextResponse.json(
    {
      error: {
        type: 'AUTHORIZATION_ERROR',
        message: 'Insufficient permissions',
        timestamp: new Date().toISOString()
      }
    },
    { 
      status: 403,
      headers: securityHeaders
    }
  )
}

function createValidationErrorResponse(error: string, source: 'query' | 'body'): NextResponse {
  return NextResponse.json(
    {
      error: {
        type: 'VALIDATION_ERROR',
        message: `Invalid ${source} parameters`,
        details: error,
        timestamp: new Date().toISOString()
      }
    },
    { 
      status: 400,
      headers: securityHeaders
    }
  )
}

function createInternalErrorResponse(error: unknown): NextResponse {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred'
  
  return NextResponse.json(
    {
      error: {
        type: 'INTERNAL_ERROR',
        message: process.env.NODE_ENV === 'production' 
          ? 'An internal error occurred' 
          : message,
        timestamp: new Date().toISOString()
      }
    },
    { 
      status: 500,
      headers: securityHeaders
    }
  )
}

/**
 * Logging middleware for development
 */
export function withLogging(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>
) {
  return async function loggedHandler(
    req: NextRequest,
    context?: any
  ): Promise<NextResponse> {
    const start = Date.now()
    const method = req.method
    const url = req.url
    
    try {
      const response = await handler(req, context)
      const duration = Date.now() - start
      
      console.log(`[API] ${method} ${url} - ${response.status} (${duration}ms)`)
      
      return response
    } catch (error) {
      const duration = Date.now() - start
      console.error(`[API] ${method} ${url} - ERROR (${duration}ms):`, error)
      throw error
    }
  }
}

/**
 * CORS middleware
 */
export function withCORS(
  handler: (req: NextRequest, context?: any) => Promise<NextResponse>,
  options: {
    allowedOrigins?: string[]
    allowedMethods?: string[]
    allowedHeaders?: string[]
    credentials?: boolean
  } = {}
) {
  const {
    allowedOrigins = ['*'],
    allowedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders = ['Content-Type', 'Authorization'],
    credentials = true
  } = options
  
  return async function corsHandler(
    req: NextRequest,
    context?: any
  ): Promise<NextResponse> {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: getCORSHeaders(req, { allowedOrigins, allowedMethods, allowedHeaders, credentials })
      })
    }
    
    const response = await handler(req, context)
    
    // Add CORS headers to response
    const corsHeaders = getCORSHeaders(req, { allowedOrigins, allowedMethods, allowedHeaders, credentials })
    Object.entries(corsHeaders).forEach(([key, value]) => {
      response.headers.set(key, value)
    })
    
    return response
  }
}

function getCORSHeaders(
  req: NextRequest,
  options: {
    allowedOrigins: string[]
    allowedMethods: string[]
    allowedHeaders: string[]
    credentials: boolean
  }
): Record<string, string> {
  const origin = req.headers.get('origin') || '*'
  const headers: Record<string, string> = {}
  
  // Check if origin is allowed
  if (options.allowedOrigins.includes('*') || options.allowedOrigins.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }
  
  headers['Access-Control-Allow-Methods'] = options.allowedMethods.join(', ')
  headers['Access-Control-Allow-Headers'] = options.allowedHeaders.join(', ')
  
  if (options.credentials) {
    headers['Access-Control-Allow-Credentials'] = 'true'
  }
  
  return headers
}

/**
 * Combine multiple middleware
 */
export function composeMiddleware(
  ...middlewares: Array<(handler: any) => any>
) {
  return function composedMiddleware(handler: any) {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler)
  }
}