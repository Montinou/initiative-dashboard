/**
 * Server-side user profile utilities for API routes
 * Following Supabase August 2025 best practices from docs/supabase-sesion.md
 * IMPORTANT: Always use getUser() on server-side, NEVER getSession()
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { UserRole } from './role-permissions'

// Enhanced UserProfile interface matching the schema
interface UserProfile {
  id: string
  tenant_id: string
  email: string
  full_name: string | null
  role: UserRole
  area_id: string | null
  area: string | null // Simplified to just area name
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
  user_id: string // Added to match auth user id
}

// Request-scoped cache to prevent repeated auth checks within the same request
const requestCache = new WeakMap<NextRequest, { user: any, userProfile: UserProfile | null }>();

/**
 * Server-side helper to get user profile from API routes
 * Following Supabase best practices:
 * - Always uses getUser() on server-side (never getSession())
 * - Implements request-scoped caching to prevent repeated auth checks
 * - Reduces console logging to prevent log spam
 * 
 * @param request - Optional NextRequest parameter to read Authorization header when present
 * @returns Object with user and userProfile, or nulls if not authenticated
 */
export async function getUserProfile(request?: NextRequest): Promise<{ user: any, userProfile: UserProfile | null }> {
  try {
    // Check request-scoped cache first
    if (request) {
      const cached = requestCache.get(request);
      if (cached) {
        return cached;
      }
    }

    const supabase = await createClient()

    // Extract Bearer token from Authorization header if provided
    const authHeader = request?.headers.get('authorization') || request?.headers.get('Authorization') || null
    const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.split(' ')[1]?.trim()
      : undefined

    // CRITICAL: Always use getUser() on server-side per Supabase best practices
    // This verifies the JWT and cannot be spoofed (docs/supabase-sesion.md line 538)
    let user: any = null
    if (bearerToken) {
      const { data, error } = await supabase.auth.getUser(bearerToken)
      if (!error) user = data?.user
    }
    if (!user) {
      const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser()
      if (!authError && cookieUser) {
        user = cookieUser
      }
    }
    
    if (!user) {
      const result = { user: null, userProfile: null };
      if (request) {
        requestCache.set(request, result);
      }
      return result;
    }

    // Try to get user profile - handle both schema patterns
    let profileData: any = null
    let fetchError: any = null

    // Fetch all available columns from user_profiles
    // Only log on actual errors, not on every request
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          tenant_id,
          email,
          full_name,
          role,
          area_id,
          user_id,
          is_active,
          is_system_admin,
          avatar_url,
          phone,
          last_login,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .single()
      
      if (!error && data) {
        profileData = data
        // Remove excessive logging - only log errors
      } else {
        fetchError = error
        // Only log actual database errors, not missing profiles
        if (error && error.code !== 'PGRST116') {
          console.error('Server-side: Profile query error:', error)
        }
      }
    } catch (error) {
      console.error('Server-side: Error in profile query:', error)
      fetchError = error
    }

    if (fetchError || !profileData) {
      // Only log actual errors, not missing profiles
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Server-side profile fetch error:', fetchError)
      }
      const result = { user: null, userProfile: null };
      if (request) {
        requestCache.set(request, result);
      }
      return result;
    }

    // Format the response to match UserProfile interface
    const userProfile: UserProfile = {
      id: profileData.id,
      tenant_id: profileData.tenant_id,
      email: profileData.email,
      full_name: profileData.full_name,
      role: profileData.role,
      area_id: profileData.area_id,
      area: null, // Area name not available in this query
      avatar_url: profileData.avatar_url || null,
      phone: profileData.phone || null,
      is_active: profileData.is_active, // Use actual database value
      last_login: profileData.last_login || null,
      created_at: profileData.created_at || new Date().toISOString(),
      updated_at: profileData.updated_at || new Date().toISOString(),
      user_id: profileData.user_id || user.id // Use from profile or auth
    }
    
    const result = { user, userProfile };
    
    // Cache the result for this request
    if (request) {
      requestCache.set(request, result);
    }
    
    return result;
  } catch (error) {
    console.error('Server-side getUserProfile error:', error)
    const result = { user: null, userProfile: null };
    if (request) {
      requestCache.set(request, result);
    }
    return result;
  }
}

export type { UserProfile }
