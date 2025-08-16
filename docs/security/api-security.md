# API Security Measures

## Overview

This document outlines the comprehensive security measures implemented across all API endpoints in the Initiative Dashboard. Our API security follows OWASP best practices and implements defense-in-depth strategies.

## API Security Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Request Flow                              │
├─────────────────────────────────────────────────────────────┤
│  1. HTTPS/TLS Encryption                                     │
│  2. Rate Limiting                                           │
│  3. CORS Validation                                         │
│  4. Authentication (JWT/Bearer Token)                       │
│  5. Authorization (Role/Permission Check)                   │
│  6. Input Validation & Sanitization                         │
│  7. Business Logic                                          │
│  8. Output Encoding                                         │
│  9. Security Headers                                        │
│  10. Audit Logging                                          │
└─────────────────────────────────────────────────────────────┘
```

## Authentication Layer

### Bearer Token Authentication

All API endpoints require authentication via Bearer tokens in the Authorization header:

```typescript
// Required header format
Authorization: Bearer <jwt-token>

// Implementation in api-auth-helper.ts
export async function authenticateRequest(request?: NextRequest) {
  const authHeader = request?.headers?.get('authorization')
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    
    // Create Supabase client with token
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`
          }
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      }
    )
    
    // Validate token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return { error: 'Invalid or expired token' }
    }
    
    // Fetch user profile with tenant info
    const userProfile = await getUserProfile(supabase, user.id)
    
    return { user, userProfile, supabase }
  }
  
  // Fallback to cookie-based auth for web clients
  return cookieBasedAuth()
}
```

### Cookie-Based Authentication

For web clients, we support secure cookie-based sessions:

```typescript
// Secure cookie configuration
const cookieOptions = {
  name: 'sb-session',
  domain: process.env.COOKIE_DOMAIN,
  path: '/',
  sameSite: 'lax',    // CSRF protection
  secure: true,        // HTTPS only
  httpOnly: true,      // No JS access
  maxAge: 3600        // 1 hour
}
```

## Input Validation

### Validation Schemas

All API inputs are validated using Zod schemas:

```typescript
// Example: Objective creation schema
export const objectiveCreateSchema = z.object({
  title: z.string()
    .min(3, 'Title must be at least 3 characters')
    .max(255, 'Title must be less than 255 characters')
    .regex(/^[a-zA-Z0-9\s\-._]+$/, 'Title contains invalid characters'),
  
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  
  area_id: z.string().uuid('Invalid area ID'),
  
  priority: z.enum(['high', 'medium', 'low']),
  
  target_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .refine(date => new Date(date) > new Date(), 'Date must be in future')
})

// Usage in API route
export async function POST(request: NextRequest) {
  const body = await request.json()
  
  // Validate input
  const validationResult = objectiveCreateSchema.safeParse(body)
  
  if (!validationResult.success) {
    return NextResponse.json(
      { 
        error: 'Validation failed',
        details: validationResult.error.errors 
      },
      { status: 400 }
    )
  }
  
  // Use validated data
  const data = validationResult.data
}
```

### SQL Injection Prevention

All database queries use parameterized statements:

```typescript
// ✅ SAFE - Using parameterized queries
const { data, error } = await supabase
  .from('initiatives')
  .select('*')
  .eq('tenant_id', tenantId)  // Parameterized
  .eq('area_id', areaId)       // Parameterized

// ❌ NEVER construct queries with string concatenation
// const query = `SELECT * FROM initiatives WHERE id = '${id}'`
```

### XSS Prevention

```typescript
// Input sanitization for text fields
import DOMPurify from 'isomorphic-dompurify'

export function sanitizeInput(input: string): string {
  // Remove any HTML/script tags
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  })
  
  // Additional escaping for special characters
  return cleaned
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

// Output encoding for API responses
export function encodeOutput(data: any): any {
  if (typeof data === 'string') {
    return sanitizeInput(data)
  }
  
  if (Array.isArray(data)) {
    return data.map(encodeOutput)
  }
  
  if (typeof data === 'object' && data !== null) {
    const encoded: any = {}
    for (const key in data) {
      encoded[key] = encodeOutput(data[key])
    }
    return encoded
  }
  
  return data
}
```

## Rate Limiting

### Implementation

```typescript
// Rate limiter configuration
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'), // 100 requests per hour
  analytics: true,
})

// Middleware for rate limiting
export async function rateLimit(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const { success, limit, reset, remaining } = await ratelimit.limit(ip)
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(reset).toISOString(),
          'Retry-After': Math.floor((reset - Date.now()) / 1000).toString(),
        },
      }
    )
  }
  
  return null // Continue processing
}
```

### Rate Limit Tiers

| Endpoint Type | Authenticated | Unauthenticated | Time Window |
|--------------|---------------|-----------------|-------------|
| Standard API | 1000 requests | 100 requests | 1 hour |
| File Upload | 50 requests | 10 requests | 1 hour |
| Export/Report | 20 requests | 5 requests | 1 hour |
| Auth Endpoints | 10 requests | 5 requests | 15 minutes |

## CORS Configuration

### CORS Headers

```typescript
// CORS configuration in middleware
export function setCORSHeaders(response: NextResponse): NextResponse {
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    'https://app.example.com',
    'https://staging.example.com'
  ]
  
  const origin = request.headers.get('origin')
  
  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  } else if (process.env.NODE_ENV === 'development') {
    response.headers.set('Access-Control-Allow-Origin', '*')
  }
  
  response.headers.set('Access-Control-Allow-Credentials', 'true')
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
  response.headers.set('Access-Control-Max-Age', '86400') // 24 hours
  
  return response
}

// Preflight handling
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: getCORSHeaders(request)
  })
}
```

## Security Headers

### Standard Security Headers

```typescript
// Security headers applied to all API responses
export function setSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Prevent MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // Enable XSS protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Referrer policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // Permissions policy
  response.headers.set('Permissions-Policy', 
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()')
  
  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 
      'max-age=63072000; includeSubDomains; preload')
  }
  
  // Content Security Policy
  response.headers.set('Content-Security-Policy', 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co; " +
    "frame-ancestors 'none';")
  
  // Cache control for sensitive data
  response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  response.headers.set('Pragma', 'no-cache')
  response.headers.set('Expires', '0')
  
  return response
}
```

## Error Handling

### Secure Error Responses

```typescript
// Error handler that doesn't leak sensitive information
export function handleAPIError(error: any): NextResponse {
  // Log full error internally
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    code: error.code,
    timestamp: new Date().toISOString()
  })
  
  // Determine safe error message for client
  let clientMessage = 'An error occurred processing your request'
  let statusCode = 500
  
  // Known error types with safe messages
  if (error.code === 'PGRST116') {
    clientMessage = 'Resource not found'
    statusCode = 404
  } else if (error.code === '23505') {
    clientMessage = 'This item already exists'
    statusCode = 409
  } else if (error.code === '23503') {
    clientMessage = 'Invalid reference'
    statusCode = 400
  } else if (error.message?.includes('JWT')) {
    clientMessage = 'Authentication required'
    statusCode = 401
  } else if (error.message?.includes('permission')) {
    clientMessage = 'Insufficient permissions'
    statusCode = 403
  }
  
  // Return sanitized error
  return NextResponse.json(
    {
      error: clientMessage,
      request_id: generateRequestId(),
      timestamp: new Date().toISOString()
    },
    { status: statusCode }
  )
}
```

## API Versioning

### Version Management

```typescript
// API versioning strategy
const API_VERSIONS = {
  v1: {
    deprecated: false,
    sunset: null,
    routes: ['/api/v1/*']
  },
  v2: {
    deprecated: false,
    sunset: null,
    routes: ['/api/v2/*']
  }
}

// Version validation middleware
export function validateAPIVersion(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const version = pathname.split('/')[2] // Extract version from /api/v1/...
  
  if (!API_VERSIONS[version]) {
    return NextResponse.json(
      { error: 'Invalid API version' },
      { status: 400 }
    )
  }
  
  if (API_VERSIONS[version].deprecated) {
    const response = NextResponse.next()
    response.headers.set('Sunset', API_VERSIONS[version].sunset)
    response.headers.set('Deprecation', 'true')
    return response
  }
  
  return null
}
```

## Request Signing

### HMAC Signature Verification

```typescript
// For webhook endpoints and sensitive operations
import { createHmac } from 'crypto'

export function verifyRequestSignature(
  request: NextRequest,
  secret: string
): boolean {
  const signature = request.headers.get('x-signature')
  const timestamp = request.headers.get('x-timestamp')
  const body = request.body
  
  if (!signature || !timestamp) {
    return false
  }
  
  // Check timestamp to prevent replay attacks (5 minute window)
  const requestTime = parseInt(timestamp)
  const currentTime = Math.floor(Date.now() / 1000)
  
  if (Math.abs(currentTime - requestTime) > 300) {
    return false
  }
  
  // Compute expected signature
  const payload = `${timestamp}.${body}`
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
  
  // Constant-time comparison to prevent timing attacks
  return timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}
```

## API Documentation Security

### OpenAPI Security Schemes

```yaml
# OpenAPI 3.0 security definitions
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT token obtained from authentication endpoint
    
    ApiKeyAuth:
      type: apiKey
      in: header
      name: X-API-Key
      description: API key for service-to-service communication
    
    OAuth2:
      type: oauth2
      flows:
        authorizationCode:
          authorizationUrl: https://auth.example.com/oauth/authorize
          tokenUrl: https://auth.example.com/oauth/token
          scopes:
            read: Read access
            write: Write access
            admin: Admin access

security:
  - BearerAuth: []
  - OAuth2: [read, write]
```

## Monitoring & Alerting

### Security Event Monitoring

```typescript
// Security event logger
export interface SecurityEvent {
  type: 'auth_failure' | 'rate_limit' | 'invalid_input' | 'permission_denied'
  user_id?: string
  ip_address: string
  user_agent: string
  endpoint: string
  details: any
  timestamp: Date
}

export async function logSecurityEvent(event: SecurityEvent) {
  // Log to database
  await supabase.from('security_events').insert(event)
  
  // Alert on critical events
  if (event.type === 'auth_failure') {
    const recentFailures = await getRecentAuthFailures(event.ip_address)
    
    if (recentFailures > 5) {
      await sendSecurityAlert({
        level: 'critical',
        message: `Multiple auth failures from ${event.ip_address}`,
        details: event
      })
    }
  }
}
```

### Metrics Collection

```typescript
// API metrics for security monitoring
export const metrics = {
  authenticationFailures: new Counter({
    name: 'api_auth_failures_total',
    help: 'Total authentication failures'
  }),
  
  rateLimitExceeded: new Counter({
    name: 'api_rate_limit_exceeded_total',
    help: 'Total rate limit violations'
  }),
  
  invalidInputs: new Counter({
    name: 'api_invalid_inputs_total',
    help: 'Total invalid input attempts'
  }),
  
  responseTime: new Histogram({
    name: 'api_response_time_seconds',
    help: 'API response time in seconds',
    buckets: [0.1, 0.5, 1, 2, 5]
  })
}
```

## Security Testing

### Automated Security Tests

```typescript
// Example security test suite
describe('API Security', () => {
  it('should reject requests without authentication', async () => {
    const response = await fetch('/api/objectives', {
      method: 'GET'
    })
    
    expect(response.status).toBe(401)
  })
  
  it('should prevent SQL injection', async () => {
    const maliciousInput = "'; DROP TABLE users; --"
    
    const response = await fetch('/api/objectives', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${validToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: maliciousInput
      })
    })
    
    expect(response.status).toBe(400)
    
    // Verify table still exists
    const tableExists = await checkTableExists('users')
    expect(tableExists).toBe(true)
  })
  
  it('should enforce rate limiting', async () => {
    const requests = []
    
    // Send 101 requests (limit is 100)
    for (let i = 0; i < 101; i++) {
      requests.push(
        fetch('/api/objectives', {
          headers: { 'Authorization': `Bearer ${validToken}` }
        })
      )
    }
    
    const responses = await Promise.all(requests)
    const lastResponse = responses[100]
    
    expect(lastResponse.status).toBe(429)
    expect(lastResponse.headers.get('Retry-After')).toBeDefined()
  })
  
  it('should sanitize XSS attempts', async () => {
    const xssPayload = '<script>alert("XSS")</script>'
    
    const response = await fetch('/api/objectives', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${validToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Test',
        description: xssPayload
      })
    })
    
    const data = await response.json()
    expect(data.description).not.toContain('<script>')
    expect(data.description).toContain('&lt;script&gt;')
  })
})
```

## Best Practices Checklist

- [ ] All endpoints require authentication
- [ ] Input validation on every request
- [ ] Parameterized database queries
- [ ] Rate limiting implemented
- [ ] CORS properly configured
- [ ] Security headers on all responses
- [ ] Error messages don't leak sensitive info
- [ ] Audit logging for sensitive operations
- [ ] HTTPS enforced in production
- [ ] API versioning strategy
- [ ] Regular security testing
- [ ] Monitoring and alerting configured
- [ ] Documentation includes security requirements
- [ ] Regular dependency updates
- [ ] Security review before deployment

---

**Document Version**: 1.0.0
**Last Updated**: 2025-08-16
**Classification**: Internal Use Only