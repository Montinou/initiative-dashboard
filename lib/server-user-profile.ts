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
 * @param request - Optional NextRequest parameter (for future use if needed)
 * @returns User profile or null if not authenticated
 */
export async function getUserProfile(request?: NextRequest): Promise<UserProfile | null> {
  try {
    const supabase = await createClient()

    // Get current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return null
    }

    // Try to get user profile - handle both schema patterns
    let profileData: any = null;
    let fetchError: any = null;

    // Production schema only has these columns: id, tenant_id, email, full_name, role, area_id, user_id
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
          user_id
        `)
        .eq('user_id', user.id)
        .single()
      
      if (!error && data) {
        profileData = data;
        console.log('Server-side: Found profile in production schema');
      } else {
        fetchError = error;
        console.error('Server-side: Profile not found:', error);
      }
    } catch (error) {
      console.error('Server-side: Error in profile query:', error);
      fetchError = error;
    }

    if (fetchError || !profileData) {
      console.error('Server-side profile fetch error:', fetchError)
      return null
    }

    // Format the response to match UserProfile interface
    // Production schema doesn't have: avatar_url, phone, is_active, last_login, created_at, updated_at
    const userProfile: UserProfile = {
      id: profileData.id,
      tenant_id: profileData.tenant_id,
      email: profileData.email,
      full_name: profileData.full_name,
      role: profileData.role,
      area_id: profileData.area_id,
      area: null, // Area name not available in this query
      avatar_url: null, // Not in production schema
      phone: null, // Not in production schema
      is_active: true, // Default to true
      last_login: null, // Not in production schema
      created_at: new Date().toISOString(), // Default value
      updated_at: new Date().toISOString(), // Default value
      user_id: profileData.user_id || user.id // Use from profile or auth
    }
    
    return userProfile
  } catch (error) {
    console.error('Server-side getUserProfile error:', error)
    return null
  }
}

export type { UserProfile }
