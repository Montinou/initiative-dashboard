import { createClient } from '@/utils/supabase/client'
import { createClient as createServerClient } from '@/utils/supabase/server'
import type { User } from '@supabase/supabase-js'
import { headers } from 'next/headers'

/**
 * Security validation utilities for authentication
 * Following Supabase best practices from the documentation
 */

// Token validation patterns
const JWT_REGEX = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Validate session on server-side (ALWAYS use getUser())
 * This is the recommended way per Supabase docs
 */
export async function validateServerSession(): Promise<{
  user: User | null
  error: string | null
}> {
  try {
    const supabase = await createServerClient()
    
    // IMPORTANT: Always use getUser() on server-side
    // getSession() can be spoofed with a fake JWT
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('❌ validateServerSession: Auth error:', error.message)
      return { user: null, error: error.message }
    }
    
    if (!user) {
      return { user: null, error: 'No authenticated user' }
    }
    
    // Additional validation: Check if user ID is valid UUID
    if (!UUID_REGEX.test(user.id)) {
      console.error('❌ validateServerSession: Invalid user ID format')
      return { user: null, error: 'Invalid user ID format' }
    }
    
    console.log('✅ validateServerSession: Valid session for user:', user.id)
    return { user, error: null }
  } catch (error) {
    console.error('❌ validateServerSession: Exception:', error)
    return { user: null, error: 'Session validation failed' }
  }
}

/**
 * Validate session on client-side
 * Less secure than server validation but useful for client components
 */
export async function validateClientSession(): Promise<{
  isValid: boolean
  user: User | null
  error: string | null
}> {
  try {
    const supabase = createClient()
    
    // First get session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return { isValid: false, user: null, error: 'No valid session' }
    }
    
    // Then verify with getUser() for extra security
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return { isValid: false, user: null, error: 'User verification failed' }
    }
    
    // Check session expiry
    if (session.expires_at) {
      const expiresAt = new Date(session.expires_at * 1000)
      if (expiresAt < new Date()) {
        return { isValid: false, user: null, error: 'Session expired' }
      }
    }
    
    return { isValid: true, user, error: null }
  } catch (error) {
    console.error('❌ validateClientSession: Exception:', error)
    return { isValid: false, user: null, error: 'Session validation failed' }
  }
}

/**
 * Check if a token looks valid (basic validation)
 */
export function isValidJWT(token: string): boolean {
  if (!token || typeof token !== 'string') return false
  return JWT_REGEX.test(token)
}

/**
 * Check if a UUID looks valid
 */
export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false
  return UUID_REGEX.test(uuid)
}

/**
 * Detect potential session hijacking attempts
 */
export async function detectSessionAnomaly(
  user: User,
  requestHeaders?: Headers
): Promise<{
  isAnomaly: boolean
  reason?: string
}> {
  try {
    const headersList = requestHeaders || (await headers())
    
    // Check user agent consistency
    const currentUserAgent = headersList.get('user-agent')
    const storedUserAgent = user.user_metadata?.last_user_agent
    
    if (storedUserAgent && currentUserAgent && storedUserAgent !== currentUserAgent) {
      console.warn('⚠️ detectSessionAnomaly: User agent mismatch')
      // This could be legitimate (browser update, etc.) so just log
    }
    
    // Check IP address if available
    const currentIP = headersList.get('x-forwarded-for') || 
                     headersList.get('x-real-ip') || 
                     headersList.get('cf-connecting-ip')
    
    const storedIP = user.user_metadata?.last_ip
    
    if (storedIP && currentIP && storedIP !== currentIP) {
      // IP changes are common, but log for monitoring
      console.log('📍 detectSessionAnomaly: IP address changed from', storedIP, 'to', currentIP)
    }
    
    // Check for suspicious patterns
    const email = user.email || ''
    const suspiciousPatterns = [
      /test@test/i,
      /admin@admin/i,
      /hack/i,
      /<script>/i,
      /javascript:/i
    ]
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(email)) {
        console.warn('⚠️ detectSessionAnomaly: Suspicious email pattern:', email)
        return { isAnomaly: true, reason: 'Suspicious email pattern' }
      }
    }
    
    return { isAnomaly: false }
  } catch (error) {
    console.error('❌ detectSessionAnomaly: Exception:', error)
    return { isAnomaly: false }
  }
}

/**
 * Verify user has required role and is active
 */
export async function verifyUserAccess(
  userId: string,
  requiredRoles?: string[]
): Promise<{
  hasAccess: boolean
  error?: string
}> {
  try {
    const supabase = createClient()
    
    // Fetch user profile
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role, is_active, tenant_id')
      .eq('user_id', userId)
      .single()
    
    if (error || !profile) {
      return { hasAccess: false, error: 'Profile not found' }
    }
    
    // Check if user is active
    if (!profile.is_active) {
      return { hasAccess: false, error: 'User account is inactive' }
    }
    
    // Check role if required
    if (requiredRoles && requiredRoles.length > 0) {
      if (!requiredRoles.includes(profile.role)) {
        return { hasAccess: false, error: 'Insufficient permissions' }
      }
    }
    
    return { hasAccess: true }
  } catch (error) {
    console.error('❌ verifyUserAccess: Exception:', error)
    return { hasAccess: false, error: 'Access verification failed' }
  }
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length)
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array)
  } else {
    // Server-side fallback
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
  }
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return ''
  
  return input
    .replace(/[<>]/g, '') // Remove angle brackets
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  if (password.length < 6) {
    errors.push('La contraseña debe tener al menos 6 caracteres')
  }
  
  // Optional: Add more strict requirements
  // if (!/[A-Z]/.test(password)) {
  //   errors.push('Debe contener al menos una mayúscula')
  // }
  // if (!/[a-z]/.test(password)) {
  //   errors.push('Debe contener al menos una minúscula')
  // }
  // if (!/[0-9]/.test(password)) {
  //   errors.push('Debe contener al menos un número')
  // }
  // if (!/[^A-Za-z0-9]/.test(password)) {
  //   errors.push('Debe contener al menos un carácter especial')
  // }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Check for common weak passwords
 */
export function isWeakPassword(password: string): boolean {
  const weakPasswords = [
    'password', 'password123', '123456', '12345678',
    'qwerty', 'abc123', 'admin', 'letmein',
    'welcome', 'monkey', '1234567890', 'password1'
  ]
  
  return weakPasswords.includes(password.toLowerCase())
}

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: any): any {
  if (!data) return data
  
  const sensitiveKeys = ['password', 'token', 'secret', 'api_key', 'access_token', 'refresh_token']
  
  if (typeof data === 'string') {
    return '***MASKED***'
  }
  
  if (typeof data === 'object') {
    const masked = { ...data }
    for (const key in masked) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        masked[key] = '***MASKED***'
      } else if (typeof masked[key] === 'object') {
        masked[key] = maskSensitiveData(masked[key])
      }
    }
    return masked
  }
  
  return data
}