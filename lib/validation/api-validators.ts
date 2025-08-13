/**
 * API Input Validation Utilities
 * 
 * Provides comprehensive input validation and sanitization for API routes
 * to prevent SQL injection, XSS, and other injection attacks.
 */

import { z } from 'zod';

/**
 * UUID v4 format validation
 * Ensures all ID parameters are valid UUIDs to prevent injection
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * Safe string schema with injection prevention
 * - Trims whitespace
 * - Limits length
 * - Prevents SQL injection patterns
 * - Sanitizes special characters
 */
export const safeStringSchema = z.string()
  .trim()
  .min(1, 'Value cannot be empty')
  .max(500, 'Value too long')
  .refine((val) => {
    // Check for common SQL injection patterns BEFORE transformation
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE|SCRIPT|TRUNCATE)\b)/i,
      /(;--|\/\*|\*\/|xp_|sp_|0x)/i,
      /(\bOR\b\s*\d+\s*=\s*\d+)/i,
      /(\bAND\b\s*\d+\s*=\s*\d+)/i,
      /(\bOR\b\s*'[^']*'\s*=\s*'[^']*')/i,
      /('\s*(OR|AND)\s+')/i,  // Catch patterns like "' OR '" or "' AND '"
      /('\s*--)/i,  // Catch SQL comment after quote
    ];
    
    return !sqlPatterns.some(pattern => pattern.test(val));
  }, 'Input contains potentially malicious patterns')
  .transform((val) => {
    // Remove any null bytes
    val = val.replace(/\0/g, '');
    
    // Remove potential SQL comment sequences
    val = val.replace(/--/g, '');
    val = val.replace(/\/\*/g, '');
    val = val.replace(/\*\//g, '');
    
    return val;
  });

/**
 * Search string schema - more permissive but still safe
 */
export const searchStringSchema = z.string()
  .trim()
  .max(200, 'Search query too long')
  .transform((val) => {
    // Remove null bytes
    val = val.replace(/\0/g, '');
    
    // Remove SQL comment sequences
    val = val.replace(/--/g, '');
    val = val.replace(/\/\*/g, '');
    val = val.replace(/\*\//g, '');
    
    // Escape special characters for ILIKE pattern matching
    // % and _ are wildcards in SQL LIKE/ILIKE
    val = val.replace(/[\\%_]/g, '\\$&');
    
    return val;
  })
  .optional();

/**
 * Pagination parameters validation
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

/**
 * Date string validation
 */
export const dateSchema = z.string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format. Use YYYY-MM-DD')
  .refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime());
  }, 'Invalid date');

/**
 * Sort parameters validation
 */
export const sortSchema = z.object({
  sort_by: z.string().regex(/^[a-z_]+$/, 'Invalid sort field'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

/**
 * Boolean parameter validation
 */
export const booleanParamSchema = z.enum(['true', 'false'])
  .transform(val => val === 'true')
  .optional();

/**
 * Progress percentage validation
 */
export const progressSchema = z.coerce.number()
  .int()
  .min(0, 'Progress cannot be negative')
  .max(100, 'Progress cannot exceed 100');

/**
 * Email validation
 */
export const emailSchema = z.string()
  .email('Invalid email format')
  .max(255, 'Email too long')
  .refine((val) => {
    // Additional checks for SQL injection in email
    return !val.includes("'") && !val.includes('--') && !val.includes('/*');
  }, 'Email contains invalid characters')
  .transform(val => val.toLowerCase());

/**
 * Phone number validation
 */
export const phoneSchema = z.string()
  .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format')
  .min(10, 'Phone number too short')
  .max(20, 'Phone number too long')
  .optional();

/**
 * Enum validation factory
 */
export function createEnumSchema<T extends readonly string[]>(
  values: T,
  errorMessage?: string
): z.ZodEnum<[T[number], ...T[number][]]> {
  return z.enum(values as any, {
    errorMap: () => ({ 
      message: errorMessage || `Must be one of: ${values.join(', ')}` 
    })
  });
}

/**
 * Validate and sanitize query parameters
 */
export function validateQueryParams<T extends z.ZodSchema>(
  searchParams: URLSearchParams,
  schema: T
): z.infer<T> | { error: string } {
  try {
    const params: Record<string, any> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        error: `Validation error: ${error.errors?.map(e => `${e.path?.join('.') || 'field'}: ${e.message}`).join(', ') || 'Invalid parameters'}` 
      };
    }
    return { error: 'Invalid parameters' };
  }
}

/**
 * Validate request body
 */
export async function validateRequestBody<T extends z.ZodSchema>(
  request: Request,
  schema: T
): Promise<z.infer<T> | { error: string }> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        error: `Validation error: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}` 
      };
    }
    return { error: 'Invalid request body' };
  }
}

/**
 * Sanitize HTML content to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Create a safe SQL identifier (for dynamic table/column names)
 * Note: Prefer to avoid dynamic identifiers when possible
 */
export function safeSqlIdentifier(identifier: string): string {
  // Only allow alphanumeric and underscore
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error('Invalid SQL identifier');
  }
  
  // Check against reserved words
  const reservedWords = ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'DROP', 'ALTER', 'CREATE', 'TABLE', 'FROM', 'WHERE'];
  if (reservedWords.includes(identifier.toUpperCase())) {
    throw new Error('Reserved word cannot be used as identifier');
  }
  
  return identifier;
}

/**
 * Standard query parameters schema for list endpoints
 */
export const standardQueryParamsSchema = z.object({
  // Pagination
  page: z.coerce.number().int().min(1).max(10000).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  
  // Sorting
  sort_by: z.string().regex(/^[a-z_]+$/).optional(),
  sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
  
  // Search
  search: searchStringSchema,
  
  // Date range
  start_date: dateSchema.optional(),
  end_date: dateSchema.optional(),
  
  // Common filters
  tenant_id: uuidSchema.optional(),
  area_id: uuidSchema.optional(),
  user_id: uuidSchema.optional(),
  
  // Status filters
  status: z.string().regex(/^[a-z_]+$/).optional(),
  is_active: booleanParamSchema,
  is_completed: booleanParamSchema,
  
  // Progress range
  min_progress: progressSchema.optional(),
  max_progress: progressSchema.optional(),
});

/**
 * Validate UUID parameter
 */
export function validateUuid(value: string | null): string | null {
  if (!value) return null;
  
  try {
    return uuidSchema.parse(value);
  } catch {
    throw new Error(`Invalid UUID format: ${value}`);
  }
}

/**
 * Validate and sanitize array of UUIDs
 */
export function validateUuidArray(values: string[]): string[] {
  return values.map(v => {
    try {
      return uuidSchema.parse(v);
    } catch {
      throw new Error(`Invalid UUID in array: ${v}`);
    }
  });
}

/**
 * Rate limiting check (to be used with Redis or in-memory store)
 */
export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  
  constructor(private options: RateLimitOptions) {}
  
  check(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    // Get existing requests for this identifier
    let requestTimes = this.requests.get(identifier) || [];
    
    // Filter out old requests outside the window
    requestTimes = requestTimes.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (requestTimes.length >= this.options.maxRequests) {
      return false;
    }
    
    // Add current request
    requestTimes.push(now);
    this.requests.set(identifier, requestTimes);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance to clean up
      this.cleanup();
    }
    
    return true;
  }
  
  private cleanup() {
    const now = Date.now();
    const windowStart = now - this.options.windowMs;
    
    for (const [key, times] of this.requests.entries()) {
      const validTimes = times.filter(time => time > windowStart);
      if (validTimes.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validTimes);
      }
    }
  }
}

/**
 * Content Security Policy headers
 */
export const securityHeaders = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
};

export default {
  uuidSchema,
  safeStringSchema,
  searchStringSchema,
  paginationSchema,
  dateSchema,
  sortSchema,
  booleanParamSchema,
  progressSchema,
  emailSchema,
  phoneSchema,
  createEnumSchema,
  validateQueryParams,
  validateRequestBody,
  sanitizeHtml,
  safeSqlIdentifier,
  standardQueryParamsSchema,
  validateUuid,
  validateUuidArray,
  RateLimiter,
  securityHeaders,
};