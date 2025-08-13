/**
 * Request Validation Middleware
 * 
 * Validates and sanitizes all request parameters
 * Prevents SQL injection, XSS, and other attacks
 */

import { NextRequest } from 'next/server'
import { z, ZodSchema, ZodError } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

// Common validation schemas
export const commonSchemas = {
  // UUID validation
  uuid: z.string().uuid('Invalid UUID format'),
  
  // Pagination
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
  
  // Sorting
  sortBy: z.string().regex(/^[a-zA-Z_]+$/, 'Invalid sort field'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  
  // Dates
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)'),
  datetime: z.string().datetime('Invalid datetime format'),
  
  // Search
  search: z.string().min(1).max(100).transform(sanitizeString),
  
  // Status enums
  status: z.enum(['planning', 'in_progress', 'completed', 'on_hold', 'overdue']),
  priority: z.enum(['high', 'medium', 'low']),
  
  // Boolean flags
  boolean: z.enum(['true', 'false']).transform(val => val === 'true'),
  
  // Numbers
  progress: z.coerce.number().int().min(0).max(100),
  
  // Arrays
  uuidArray: z.array(z.string().uuid()).or(z.string().uuid().transform(id => [id])),
  stringArray: z.array(z.string()).or(z.string().transform(str => [str]))
}

/**
 * Sanitize string to prevent XSS
 */
export function sanitizeString(input: string): string {
  // Remove any HTML tags and scripts
  const cleaned = DOMPurify.sanitize(input, { 
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true
  })
  
  // Additional sanitization for SQL-like patterns
  return cleaned
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj)
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {}
    for (const key in obj) {
      // Sanitize the key as well
      const sanitizedKey = sanitizeString(key)
      sanitized[sanitizedKey] = sanitizeObject(obj[key])
    }
    return sanitized
  }
  
  return obj
}

/**
 * Validate query parameters
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): { data?: T; error?: ZodError } {
  try {
    // Convert URLSearchParams to object
    const params: any = {}
    for (const [key, value] of searchParams.entries()) {
      // Handle multiple values for the same key (arrays)
      if (params[key]) {
        if (Array.isArray(params[key])) {
          params[key].push(value)
        } else {
          params[key] = [params[key], value]
        }
      } else {
        params[key] = value
      }
    }
    
    // Validate and sanitize
    const data = schema.parse(params)
    return { data }
  } catch (error) {
    if (error instanceof ZodError) {
      return { error }
    }
    throw error
  }
}

/**
 * Validate request body
 */
export async function validateRequestBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data?: T; error?: ZodError }> {
  try {
    const body = await request.json()
    
    // Sanitize the entire body first
    const sanitizedBody = sanitizeObject(body)
    
    // Validate with schema
    const data = schema.parse(sanitizedBody)
    return { data }
  } catch (error) {
    if (error instanceof ZodError) {
      return { error }
    }
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return {
        error: new ZodError([{
          code: 'custom',
          message: 'Invalid JSON in request body',
          path: []
        }])
      }
    }
    throw error
  }
}

/**
 * Create validation schemas for common endpoints
 */
export const endpointSchemas = {
  // Objectives endpoint
  objectives: {
    get: z.object({
      tenant_id: commonSchemas.uuid.optional(),
      area_id: commonSchemas.uuid.optional(),
      objective_id: commonSchemas.uuid.optional(),
      initiative_id: commonSchemas.uuid.optional(),
      assigned_to: commonSchemas.uuid.optional(),
      start_date: commonSchemas.date.optional(),
      end_date: commonSchemas.date.optional(),
      status: commonSchemas.status.optional(),
      priority: commonSchemas.priority.optional(),
      is_completed: commonSchemas.boolean.optional(),
      min_progress: commonSchemas.progress.optional(),
      max_progress: commonSchemas.progress.optional(),
      page: commonSchemas.page,
      limit: commonSchemas.limit,
      sort_by: commonSchemas.sortBy.optional(),
      sort_order: commonSchemas.sortOrder,
      search: commonSchemas.search.optional(),
      include_initiatives: commonSchemas.boolean.optional()
    }),
    
    post: z.object({
      title: z.string().min(1).max(255).transform(sanitizeString),
      description: z.string().max(1000).transform(sanitizeString).optional(),
      area_id: commonSchemas.uuid.optional(),
      start_date: commonSchemas.date.optional(),
      end_date: commonSchemas.date.optional(),
      priority: commonSchemas.priority.optional(),
      status: commonSchemas.status.optional()
    }),
    
    patch: z.object({
      title: z.string().min(1).max(255).transform(sanitizeString).optional(),
      description: z.string().max(1000).transform(sanitizeString).optional(),
      area_id: commonSchemas.uuid.optional(),
      start_date: commonSchemas.date.optional(),
      end_date: commonSchemas.date.optional(),
      priority: commonSchemas.priority.optional(),
      status: commonSchemas.status.optional(),
      progress: commonSchemas.progress.optional()
    })
  },
  
  // Initiatives endpoint
  initiatives: {
    get: z.object({
      area_id: commonSchemas.uuid.optional(),
      objective_id: commonSchemas.uuid.optional(),
      initiative_id: commonSchemas.uuid.optional(),
      assigned_to: commonSchemas.uuid.optional(),
      created_by: commonSchemas.uuid.optional(),
      start_date: commonSchemas.date.optional(),
      end_date: commonSchemas.date.optional(),
      status: commonSchemas.status.optional(),
      priority: commonSchemas.priority.optional(),
      is_completed: commonSchemas.boolean.optional(),
      min_progress: commonSchemas.progress.optional(),
      max_progress: commonSchemas.progress.optional(),
      page: commonSchemas.page,
      limit: commonSchemas.limit,
      sort_by: commonSchemas.sortBy.optional(),
      sort_order: commonSchemas.sortOrder,
      search: commonSchemas.search.optional()
    }),
    
    post: z.object({
      title: z.string().min(1).max(255).transform(sanitizeString),
      description: z.string().max(1000).transform(sanitizeString).optional(),
      area_id: commonSchemas.uuid,
      objective_ids: commonSchemas.uuidArray.optional(),
      start_date: commonSchemas.date.optional(),
      due_date: commonSchemas.date.optional(),
      priority: commonSchemas.priority.optional(),
      activities: z.array(z.object({
        title: z.string().min(1).max(255).transform(sanitizeString),
        description: z.string().max(500).transform(sanitizeString).optional(),
        assigned_to: commonSchemas.uuid.optional(),
        is_completed: z.boolean().default(false)
      })).optional()
    }),
    
    patch: z.object({
      title: z.string().min(1).max(255).transform(sanitizeString).optional(),
      description: z.string().max(1000).transform(sanitizeString).optional(),
      progress: commonSchemas.progress.optional(),
      due_date: commonSchemas.date.optional(),
      status: commonSchemas.status.optional(),
      priority: commonSchemas.priority.optional()
    })
  },
  
  // Areas endpoint
  areas: {
    get: z.object({
      page: commonSchemas.page,
      limit: commonSchemas.limit,
      search: commonSchemas.search.optional(),
      includeStats: commonSchemas.boolean.optional()
    }),
    
    post: z.object({
      name: z.string().min(1).max(100).transform(sanitizeString),
      description: z.string().max(500).transform(sanitizeString).optional(),
      manager_id: commonSchemas.uuid.optional()
    }),
    
    patch: z.object({
      name: z.string().min(1).max(100).transform(sanitizeString).optional(),
      description: z.string().max(500).transform(sanitizeString).optional(),
      manager_id: commonSchemas.uuid.optional(),
      is_active: z.boolean().optional()
    })
  }
}

/**
 * Validation middleware wrapper
 */
export function withValidation<T>(
  querySchema?: ZodSchema<any>,
  bodySchema?: ZodSchema<T>
) {
  return function (
    handler: (
      req: NextRequest,
      context: { params?: any; query?: any; body?: T }
    ) => Promise<Response>
  ) {
    return async function validatedHandler(
      req: NextRequest,
      context: { params?: any } = {}
    ): Promise<Response> {
      const validatedContext: any = { ...context }
      
      // Validate query parameters
      if (querySchema) {
        const searchParams = new URL(req.url).searchParams
        const { data, error } = validateQueryParams(searchParams, querySchema)
        
        if (error) {
          return new Response(
            JSON.stringify({
              error: 'Validation Error',
              message: 'Invalid query parameters',
              details: error.errors.map(e => ({
                path: e.path.join('.'),
                message: e.message
              }))
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
        
        validatedContext.query = data
      }
      
      // Validate request body
      if (bodySchema && ['POST', 'PUT', 'PATCH'].includes(req.method)) {
        const { data, error } = await validateRequestBody(req, bodySchema)
        
        if (error) {
          return new Response(
            JSON.stringify({
              error: 'Validation Error',
              message: 'Invalid request body',
              details: error.errors.map(e => ({
                path: e.path.join('.'),
                message: e.message
              }))
            }),
            {
              status: 400,
              headers: { 'Content-Type': 'application/json' }
            }
          )
        }
        
        validatedContext.body = data
      }
      
      // Call the original handler with validated data
      return handler(req, validatedContext)
    }
  }
}

/**
 * Check for SQL injection patterns
 */
export function detectSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|FROM|WHERE|JOIN|ORDER BY|GROUP BY|HAVING)\b)/gi,
    /(--|#|\/\*|\*\/)/g, // SQL comments
    /(\bOR\b\s*\d+\s*=\s*\d+)/gi, // OR 1=1
    /(\bAND\b\s*\d+\s*=\s*\d+)/gi, // AND 1=1
    /(';|";|\)|;)/g, // SQL terminators
    /(\bxp_\w+)/gi, // Extended stored procedures
    /(\bsp_\w+)/gi // System stored procedures
  ]
  
  return sqlPatterns.some(pattern => pattern.test(input))
}

/**
 * Validate and sanitize file uploads
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number // in bytes
    allowedTypes?: string[]
    allowedExtensions?: string[]
  } = {}
): { valid: boolean; error?: string } {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf']
  } = options
  
  // Check file size
  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size exceeds maximum of ${maxSize / (1024 * 1024)}MB`
    }
  }
  
  // Check MIME type
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `File type '${file.type}' is not allowed`
    }
  }
  
  // Check file extension
  const extension = '.' + file.name.split('.').pop()?.toLowerCase()
  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `File extension '${extension}' is not allowed`
    }
  }
  
  // Check for double extensions (potential attack)
  if ((file.name.match(/\./g) || []).length > 1) {
    const parts = file.name.split('.')
    if (parts.some(part => allowedExtensions.includes('.' + part.toLowerCase()))) {
      return {
        valid: false,
        error: 'Multiple file extensions detected'
      }
    }
  }
  
  return { valid: true }
}