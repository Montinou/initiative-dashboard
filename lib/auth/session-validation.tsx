/**
 * Session Validation Utilities
 * Server and client-side session validation helpers
 */

import React from 'react'
import { createClient } from '@/utils/supabase/server'
import { createClient as createBrowserClient } from '@/utils/supabase/client'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export interface ValidatedUser {
  id: string
  email: string
  profile: {
    id: string
    tenant_id: string
    role: string
    area_id?: string | null
    full_name?: string | null
  }
}

/**
 * Server-side session validation for protected pages
 * ALWAYS use getUser() on server-side, NEVER getSession()
 */
export async function validateServerSession(
  redirectTo: string = '/auth/login'
): Promise<ValidatedUser> {
  const supabase = await createClient()
  
  // IMPORTANT: Always use getUser() on server-side per Supabase docs
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    redirect(redirectTo)
  }
  
  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, tenant_id, role, area_id, full_name')
    .eq('user_id', user.id)
    .single()
  
  if (profileError || !profile) {
    console.error('Profile not found for user:', user.id)
    redirect(redirectTo)
  }
  
  return {
    id: user.id,
    email: user.email!,
    profile
  }
}

/**
 * Client-side session validation
 */
export async function validateClientSession(): Promise<ValidatedUser | null> {
  const supabase = createBrowserClient()
  
  try {
    // ALWAYS use getUser() for validation per Supabase best practices
    // This cannot be spoofed unlike getSession()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return null
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, tenant_id, role, area_id, full_name')
      .eq('user_id', user.id)
      .single()
    
    if (profileError || !profile) {
      console.error('Profile not found for user:', user.id)
      return null
    }
    
    return {
      id: user.id,
      email: user.email!,
      profile
    }
  } catch (error) {
    console.error('Session validation error:', error)
    return null
  }
}

/**
 * Role-based access validation
 */
export function validateRole(
  userRole: string,
  allowedRoles: string[]
): boolean {
  return allowedRoles.includes(userRole)
}

/**
 * Area-based access validation
 */
export function validateAreaAccess(
  userRole: string,
  userAreaId: string | null | undefined,
  targetAreaId: string
): boolean {
  // CEO and Admin can access all areas
  if (['CEO', 'Admin'].includes(userRole)) {
    return true
  }
  
  // Manager can only access their own area
  if (userRole === 'Manager') {
    return userAreaId === targetAreaId
  }
  
  // Analyst can view all areas (read-only)
  if (userRole === 'Analyst') {
    return true
  }
  
  return false
}

/**
 * Session expiry check
 */
export function isSessionExpired(expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  return now >= expiresAt
}

/**
 * Session needs refresh check (5 minutes before expiry)
 */
export function sessionNeedsRefresh(expiresAt: number): boolean {
  const now = Math.floor(Date.now() / 1000)
  const fiveMinutes = 5 * 60
  return (expiresAt - now) <= fiveMinutes
}

/**
 * Get session remaining time in seconds
 */
export function getSessionRemainingTime(expiresAt: number): number {
  const now = Math.floor(Date.now() / 1000)
  return Math.max(0, expiresAt - now)
}

/**
 * Format session remaining time for display
 */
export function formatSessionTime(seconds: number): string {
  if (seconds <= 0) return 'Expired'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`
  } else {
    return `${secs}s`
  }
}

/**
 * Create session cookie options
 */
export function getSessionCookieOptions(rememberMe: boolean = false) {
  const baseOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/'
  }
  
  if (rememberMe) {
    // 30 days for remember me
    return {
      ...baseOptions,
      maxAge: 30 * 24 * 60 * 60
    }
  }
  
  // Session cookie (expires when browser closes)
  return baseOptions
}

/**
 * Validate tenant access
 */
export async function validateTenantAccess(
  userTenantId: string,
  requestedTenantId?: string
): Promise<boolean> {
  // If no specific tenant requested, allow user's tenant
  if (!requestedTenantId) {
    return true
  }
  
  // Check if user belongs to requested tenant
  return userTenantId === requestedTenantId
}

/**
 * Protected route wrapper for server components
 */
export async function withAuth<T extends { [key: string]: any }>(
  Component: React.ComponentType<T & { user: ValidatedUser }>
) {
  return async function AuthenticatedComponent(props: T) {
    const user = await validateServerSession()
    
    return <Component {...props} user={user} />
  }
}

/**
 * Get session from request headers (for API routes)
 */
export async function getSessionFromHeaders(
  request: Request
): Promise<string | null> {
  const authorization = request.headers.get('authorization')
  
  if (!authorization?.startsWith('Bearer ')) {
    return null
  }
  
  return authorization.substring(7)
}

/**
 * Validate API request with session
 */
export async function validateApiSession(
  request: Request
): Promise<ValidatedUser | null> {
  const token = await getSessionFromHeaders(request)
  
  if (!token) {
    return null
  }
  
  const supabase = await createClient()
  
  try {
    // Verify the token
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user) {
      return null
    }
    
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, tenant_id, role, area_id, full_name')
      .eq('user_id', user.id)
      .single()
    
    if (profileError || !profile) {
      return null
    }
    
    return {
      id: user.id,
      email: user.email!,
      profile
    }
  } catch (error) {
    console.error('API session validation error:', error)
    return null
  }
}