// Centralized authentication utilities for consistent security across all API endpoints
import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  tenant_id: string;
  area?: string;
}

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
  statusCode?: number;
}

/**
 * Extract Bearer token from authorization header with validation
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader) {
    return null;
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  // Basic token format validation
  if (!token || token.length < 10) {
    return null;
  }
  
  return token;
}

/**
 * Authenticate user using Bearer token and return user profile
 */
export async function authenticateUser(request: NextRequest): Promise<AuthResult> {
  try {
    // Extract and validate token
    const token = extractBearerToken(request);
    if (!token) {
      return {
        success: false,
        error: 'Missing or invalid authorization header',
        statusCode: 401
      };
    }

    // Verify token with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Invalid token or user not found',
        statusCode: 401
      };
    }

    // Get user profile from user_profiles table
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('id, email, full_name, role, tenant_id, area_id, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (profileError || !userProfile) {
      return {
        success: false,
        error: 'User profile not found or inactive',
        statusCode: 404
      };
    }

    return {
      success: true,
      user: {
        id: userProfile.id,
        email: userProfile.email,
        full_name: userProfile.full_name,
        role: userProfile.role,
        tenant_id: userProfile.tenant_id,
        area: userProfile.area_id
      }
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Internal authentication error',
      statusCode: 500
    };
  }
}

/**
 * Check if user has required role(s)
 */
export function hasRole(user: AuthenticatedUser, requiredRoles: string[]): boolean {
  return requiredRoles.includes(user.role);
}

/**
 * Check if user belongs to specific tenant
 */
export function belongsToTenant(user: AuthenticatedUser, tenantId: string): boolean {
  return user.tenant_id === tenantId;
}

/**
 * Validate input data with common security checks
 */
export function validateInput(data: Record<string, any>, requiredFields: string[]): { valid: boolean; error?: string } {
  // Check required fields
  for (const field of requiredFields) {
    if (!data[field] || (typeof data[field] === 'string' && !data[field].trim())) {
      return {
        valid: false,
        error: `${field} is required`
      };
    }
  }

  // Email validation if email field exists
  if (data.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return {
        valid: false,
        error: 'Invalid email format'
      };
    }
  }

  // URL validation if URL fields exist
  const urlFields = ['website', 'logo_url', 'cover_image_url'];
  for (const field of urlFields) {
    if (data[field] && data[field].trim()) {
      try {
        new URL(data[field]);
      } catch {
        return {
          valid: false,
          error: `Invalid URL format for ${field}`
        };
      }
    }
  }

  // Phone validation if phone field exists
  if (data.phone && data.phone.trim()) {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(data.phone.replace(/[\s\-\(\)]/g, ''))) {
      return {
        valid: false,
        error: 'Invalid phone number format'
      };
    }
  }

  return { valid: true };
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  if (!input) return '';
  
  return input
    .trim()
    .replace(/[<>\"']/g, '') // Remove potential XSS characters
    .substring(0, 1000); // Limit length
}

/**
 * Rate limiting helper (basic implementation)
 */
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (record.count >= maxRequests) {
    return false;
  }
  
  record.count++;
  return true;
}

/**
 * Clean expired rate limit entries periodically
 */
export function cleanupRateLimit(): void {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

// Clean up rate limit entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupRateLimit, 5 * 60 * 1000);
}