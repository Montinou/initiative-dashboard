/**
 * API Error Handler
 * 
 * Provides comprehensive error handling for API endpoints
 * with consistent error response format and logging
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { PostgrestError } from '@supabase/supabase-js'

// Error types enum
export enum ErrorType {
  VALIDATION = 'VALIDATION_ERROR',
  AUTHENTICATION = 'AUTHENTICATION_ERROR',
  AUTHORIZATION = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMIT = 'RATE_LIMIT_ERROR',
  DATABASE = 'DATABASE_ERROR',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE_ERROR',
  INTERNAL = 'INTERNAL_ERROR',
  BAD_REQUEST = 'BAD_REQUEST'
}

// Standard error response interface
export interface ErrorResponse {
  error: {
    type: ErrorType
    message: string
    details?: any
    code?: string
    timestamp: string
    requestId?: string
    path?: string
    method?: string
  }
}

// Custom API Error class
export class ApiError extends Error {
  public readonly type: ErrorType
  public readonly statusCode: number
  public readonly details?: any
  public readonly code?: string
  
  constructor(
    type: ErrorType,
    message: string,
    statusCode: number = 500,
    details?: any,
    code?: string
  ) {
    super(message)
    this.name = 'ApiError'
    this.type = type
    this.statusCode = statusCode
    this.details = details
    this.code = code
    
    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, ApiError)
  }
}

// Common API errors
export class ValidationError extends ApiError {
  constructor(message: string, details?: any) {
    super(ErrorType.VALIDATION, message, 400, details, 'VALIDATION_FAILED')
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = 'Authentication required', details?: any) {
    super(ErrorType.AUTHENTICATION, message, 401, details, 'AUTH_REQUIRED')
  }
}

export class AuthorizationError extends ApiError {
  constructor(message: string = 'Insufficient permissions', details?: any) {
    super(ErrorType.AUTHORIZATION, message, 403, details, 'FORBIDDEN')
  }
}

export class NotFoundError extends ApiError {
  constructor(resource: string, id?: string) {
    const message = id 
      ? `${resource} with id '${id}' not found`
      : `${resource} not found`
    super(ErrorType.NOT_FOUND, message, 404, { resource, id }, 'RESOURCE_NOT_FOUND')
  }
}

export class ConflictError extends ApiError {
  constructor(message: string, details?: any) {
    super(ErrorType.CONFLICT, message, 409, details, 'CONFLICT')
  }
}

export class RateLimitError extends ApiError {
  constructor(retryAfter?: number) {
    const message = 'Too many requests. Please try again later.'
    super(
      ErrorType.RATE_LIMIT, 
      message, 
      429, 
      { retryAfter }, 
      'RATE_LIMIT_EXCEEDED'
    )
  }
}

export class DatabaseError extends ApiError {
  constructor(message: string, originalError?: any) {
    super(
      ErrorType.DATABASE, 
      'Database operation failed', 
      500, 
      { message, originalError }, 
      'DB_ERROR'
    )
  }
}

/**
 * Main error handler function
 */
export function handleApiError(
  error: unknown,
  context?: {
    path?: string
    method?: string
    requestId?: string
  }
): NextResponse<ErrorResponse> {
  // Log error for monitoring
  logError(error, context)
  
  // Handle known error types
  if (error instanceof ApiError) {
    return createErrorResponse(error, context)
  }
  
  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const validationError = new ValidationError(
      'Request validation failed',
      formatZodErrors(error)
    )
    return createErrorResponse(validationError, context)
  }
  
  // Handle Supabase/Postgres errors
  if (isPostgrestError(error)) {
    const dbError = handleDatabaseError(error)
    return createErrorResponse(dbError, context)
  }
  
  // Handle standard errors
  if (error instanceof Error) {
    // Check for specific error messages
    if (error.message.toLowerCase().includes('unauthorized')) {
      const authError = new AuthenticationError(error.message)
      return createErrorResponse(authError, context)
    }
    
    if (error.message.toLowerCase().includes('forbidden')) {
      const authzError = new AuthorizationError(error.message)
      return createErrorResponse(authzError, context)
    }
    
    // Generic error
    const genericError = new ApiError(
      ErrorType.INTERNAL,
      'An unexpected error occurred',
      500,
      { originalMessage: error.message },
      'INTERNAL_ERROR'
    )
    return createErrorResponse(genericError, context)
  }
  
  // Unknown error type
  const unknownError = new ApiError(
    ErrorType.INTERNAL,
    'An unknown error occurred',
    500,
    { error: String(error) },
    'UNKNOWN_ERROR'
  )
  return createErrorResponse(unknownError, context)
}

/**
 * Create standardized error response
 */
function createErrorResponse(
  error: ApiError,
  context?: {
    path?: string
    method?: string
    requestId?: string
  }
): NextResponse<ErrorResponse> {
  const response: ErrorResponse = {
    error: {
      type: error.type,
      message: error.message,
      code: error.code,
      timestamp: new Date().toISOString(),
      ...(error.details && { details: sanitizeErrorDetails(error.details) }),
      ...(context?.requestId && { requestId: context.requestId }),
      ...(context?.path && { path: context.path }),
      ...(context?.method && { method: context.method })
    }
  }
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  }
  
  // Add retry-after header for rate limit errors
  if (error.type === ErrorType.RATE_LIMIT && error.details?.retryAfter) {
    headers['Retry-After'] = String(error.details.retryAfter)
  }
  
  return NextResponse.json(response, { 
    status: error.statusCode,
    headers
  })
}

/**
 * Format Zod validation errors for response
 */
function formatZodErrors(error: ZodError): any {
  return {
    issues: error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      code: issue.code
    }))
  }
}

/**
 * Check if error is a Postgrest error
 */
function isPostgrestError(error: any): error is PostgrestError {
  return error && typeof error === 'object' && 'code' in error && 'message' in error
}

/**
 * Handle database-specific errors
 */
function handleDatabaseError(error: PostgrestError): ApiError {
  // Handle specific Postgres error codes
  switch (error.code) {
    case '23505': // Unique violation
      return new ConflictError('A record with this value already exists', {
        code: error.code,
        details: error.details
      })
    
    case '23503': // Foreign key violation
      return new ValidationError('Referenced record does not exist', {
        code: error.code,
        details: error.details
      })
    
    case '23502': // Not null violation
      return new ValidationError('Required field is missing', {
        code: error.code,
        details: error.details
      })
    
    case '42501': // Insufficient privilege
      return new AuthorizationError('Database permission denied', {
        code: error.code
      })
    
    case 'PGRST301': // JWT expired
      return new AuthenticationError('Session expired', {
        code: error.code
      })
    
    default:
      return new DatabaseError(error.message, {
        code: error.code,
        details: error.details,
        hint: error.hint
      })
  }
}

/**
 * Sanitize error details to prevent information leakage
 */
function sanitizeErrorDetails(details: any): any {
  if (!details) return undefined
  
  // Remove sensitive fields
  const sanitized = { ...details }
  const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'authorization']
  
  for (const field of sensitiveFields) {
    if (field in sanitized) {
      sanitized[field] = '[REDACTED]'
    }
  }
  
  // Recursively sanitize nested objects
  for (const key in sanitized) {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      sanitized[key] = sanitizeErrorDetails(sanitized[key])
    }
  }
  
  return sanitized
}

/**
 * Log error for monitoring
 */
function logError(
  error: unknown,
  context?: {
    path?: string
    method?: string
    requestId?: string
  }
): void {
  const timestamp = new Date().toISOString()
  const errorInfo = {
    timestamp,
    ...context,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error
  }
  
  // In production, send to logging service (e.g., Sentry, LogRocket)
  if (process.env.NODE_ENV === 'production') {
    // TODO: Integrate with logging service
    console.error('[API Error]', JSON.stringify(errorInfo))
  } else {
    console.error('[API Error]', errorInfo)
  }
}

/**
 * Async error wrapper for route handlers
 */
export function withErrorHandler<T extends any[], R>(
  handler: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R | NextResponse<ErrorResponse>> => {
    try {
      return await handler(...args)
    } catch (error) {
      // Extract context from request if available
      const [req] = args
      const context = req && typeof req === 'object' && 'url' in req 
        ? {
            path: new URL(req.url).pathname,
            method: req.method
          }
        : undefined
      
      return handleApiError(error, context) as any
    }
  }
}

/**
 * Create a request ID for tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}