/**
 * Server-side user profile utilities for API routes
 * This file contains server-only code and should not be imported on the client
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

/**
 * Server-side helper to get user profile from API routes
 * This is used in API routes to authenticate and get user data
 * 
 * @param request - Optional NextRequest parameter to read Authorization header when present
 * @returns Object with user and userProfile, or nulls if not authenticated
 */
export async function getUserProfile(request?: NextRequest): Promise<{ user: any, userProfile: UserProfile | null }> {
  try {
    const supabase = await createClient()

    // Extract Bearer token from Authorization header if provided
    const authHeader = request?.headers.get('authorization') || request?.headers.get('Authorization') || null
    const bearerToken = authHeader?.toLowerCase().startsWith('bearer ')
      ? authHeader.split(' ')[1]?.trim()
      : undefined

    // Get current user from either Bearer token or session cookies
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
      return { user: null, userProfile: null }
    }

    // Try to get user profile - handle both schema patterns
    let profileData: any = null
    let fetchError: any = null

    // Fetch all available columns from user_profiles
    console.log('Server-side: Fetching user profile for production schema...')
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
        console.log('Server-side: Found profile in production schema')
      } else {
        fetchError = error
        console.error('Server-side: Profile not found:', error)
      }
    } catch (error) {
      console.error('Server-side: Error in profile query:', error)
      fetchError = error
    }

    if (fetchError || !profileData) {
      console.error('Server-side profile fetch error:', fetchError)
      return { user: null, userProfile: null }
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
    
    return { user, userProfile }
  } catch (error) {
    console.error('Server-side getUserProfile error:', error)
    return { user: null, userProfile: null }
  }
}

export type { UserProfile }
