/**
 * Rate Limiter Utility
 * 
 * Provides configurable rate limiting for API endpoints
 * Uses in-memory storage with sliding window algorithm
 */

import { NextRequest, NextResponse } from 'next/server'

interface RateLimiterOptions {
  windowMs?: number // Time window in milliseconds (default: 60000 = 1 minute)
  maxRequests?: number // Maximum requests per window (default: 30)
  message?: string // Error message when rate limited
  skipSuccessfulRequests?: boolean // Don't count successful requests
  skipFailedRequests?: boolean // Don't count failed requests
  keyGenerator?: (req: NextRequest) => string // Custom key generation
  handler?: (req: NextRequest) => NextResponse // Custom handler for rate limited requests
}

interface RateLimiterStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

// In-memory store for rate limiting
// In production, this should be replaced with Redis or similar
const store: RateLimiterStore = {}

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key]
    }
  }
}, 5 * 60 * 1000)

/**
 * Creates a rate limiter middleware
 */
export function createRateLimiter(options: RateLimiterOptions = {}) {
  const {
    windowMs = 60000, // 1 minute
    maxRequests = 30,
    message = 'Too many requests, please try again later',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = defaultKeyGenerator,
    handler = defaultHandler
  } = options

  return async function rateLimiter(
    req: NextRequest,
    next?: () => Promise<NextResponse>
  ): Promise<NextResponse> {
    const key = keyGenerator(req)
    const now = Date.now()
    
    // Get or create rate limit entry
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 0,
        resetTime: now + windowMs
      }
    }
    
    const rateLimit = store[key]
    
    // Check if rate limit exceeded
    if (rateLimit.count >= maxRequests) {
      const retryAfter = Math.ceil((rateLimit.resetTime - now) / 1000)
      
      // Add rate limit headers
      const response = handler(req)
      response.headers.set('X-RateLimit-Limit', maxRequests.toString())
      response.headers.set('X-RateLimit-Remaining', '0')
      response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString())
      response.headers.set('Retry-After', retryAfter.toString())
      
      return response
    }
    
    // Increment counter
    rateLimit.count++
    
    // Execute the actual handler if provided
    let response: NextResponse
    if (next) {
      try {
        response = await next()
        
        // Optionally skip counting successful requests
        if (skipSuccessfulRequests && response.status < 400) {
          rateLimit.count--
        }
      } catch (error) {
        // Optionally skip counting failed requests
        if (skipFailedRequests) {
          rateLimit.count--
        }
        throw error
      }
    } else {
      response = NextResponse.next()
    }
    
    // Add rate limit headers to successful responses
    const remaining = Math.max(0, maxRequests - rateLimit.count)
    response.headers.set('X-RateLimit-Limit', maxRequests.toString())
    response.headers.set('X-RateLimit-Remaining', remaining.toString())
    response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetTime).toISOString())
    
    return response
  }
}

/**
 * Default key generator - uses IP address and user ID if available
 */
function defaultKeyGenerator(req: NextRequest): string {
  // Try to get IP from various headers
  const ip = 
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') || // Cloudflare
    req.ip ||
    'unknown'
  
  // Try to get user ID from authorization header
  const authHeader = req.headers.get('authorization')
  let userId = 'anonymous'
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // In production, decode JWT to get user ID
    // For now, use a hash of the token as identifier
    const token = authHeader.substring(7)
    userId = simpleHash(token)
  }
  
  return `${ip}:${userId}`
}

/**
 * Default handler for rate limited requests
 */
function defaultHandler(req: NextRequest): NextResponse {
  return NextResponse.json(
    {
      error: 'Too Many Requests',
      message: 'You have exceeded the rate limit. Please try again later.',
      retryAfter: req.headers.get('Retry-After')
    },
    { status: 429 }
  )
}

/**
 * Simple hash function for token identification
 */
function simpleHash(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(36)
}

/**
 * Rate limiter presets for different use cases
 */
export const rateLimiters = {
  // Strict rate limiting for sensitive endpoints
  strict: createRateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 10,
    message: 'Too many requests to sensitive endpoint'
  }),
  
  // Standard rate limiting for API endpoints
  standard: createRateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 30,
    message: 'API rate limit exceeded'
  }),
  
  // Relaxed rate limiting for read-only endpoints
  relaxed: createRateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 60,
    message: 'Rate limit exceeded'
  }),
  
  // Auth endpoints - very strict
  auth: createRateLimiter({
    windowMs: 15 * 60000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts'
  }),
  
  // File upload endpoints
  upload: createRateLimiter({
    windowMs: 60000, // 1 minute
    maxRequests: 5,
    message: 'Upload rate limit exceeded'
  })
}

/**
 * Wrapper function to apply rate limiting to API route handlers
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  options?: RateLimiterOptions
) {
  const limiter = createRateLimiter(options)
  
  return async function rateLimitedHandler(req: NextRequest): Promise<NextResponse> {
    return limiter(req, () => handler(req))
  }
}

/**
 * Check if IP is rate limited (for middleware use)
 */
export function isRateLimited(
  key: string,
  options: { windowMs?: number; maxRequests?: number } = {}
): boolean {
  const { windowMs = 60000, maxRequests = 30 } = options
  const now = Date.now()
  
  if (!store[key] || store[key].resetTime < now) {
    return false
  }
  
  return store[key].count >= maxRequests
}

/**
 * Reset rate limit for a specific key
 */
export function resetRateLimit(key: string): void {
  delete store[key]
}

/**
 * Get current rate limit status for a key
 */
export function getRateLimitStatus(
  key: string,
  options: { windowMs?: number; maxRequests?: number } = {}
): {
  limited: boolean
  remaining: number
  reset: Date
} {
  const { windowMs = 60000, maxRequests = 30 } = options
  const now = Date.now()
  
  if (!store[key] || store[key].resetTime < now) {
    return {
      limited: false,
      remaining: maxRequests,
      reset: new Date(now + windowMs)
    }
  }
  
  return {
    limited: store[key].count >= maxRequests,
    remaining: Math.max(0, maxRequests - store[key].count),
    reset: new Date(store[key].resetTime)
  }
}