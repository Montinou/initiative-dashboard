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

    // First try the old schema pattern (id = auth user id)
    console.log('Server-side: Trying query with id column first...')
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          id,
          tenant_id,
          email,
          full_name,
          avatar_url,
          phone,
          role,
          is_active,
          last_login,
          created_at,
          updated_at,
          area_id
        `)
        .eq('id', user.id)
        .single()
      
      if (!error && data) {
        profileData = data;
        console.log('Server-side: Found profile using id column');
      } else {
        fetchError = error;
        console.log('Server-side: No profile found with id column, trying user_id...')
        
        // Try with user_id column (new schema)
        const fallback = await supabase
          .from('user_profiles')
          .select(`
            id,
            tenant_id,
            email,
            full_name,
            avatar_url,
            phone,
            role,
            is_active,
            last_login,
            created_at,
            updated_at,
            area_id
          `)
          .eq('user_id', user.id)
          .single()
        
        profileData = fallback.data;
        fetchError = fallback.error;
        
        if (!fallback.error && fallback.data) {
          console.log('Server-side: Found profile using user_id column');
        }
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
    const userProfile: UserProfile = {
      id: profileData.id,
      tenant_id: profileData.tenant_id,
      email: profileData.email,
      full_name: profileData.full_name,
      role: profileData.role,
      area_id: profileData.area_id,
      area: null, // Area name not available in this query
      avatar_url: profileData.avatar_url,
      phone: profileData.phone,
      is_active: profileData.is_active,
      last_login: profileData.last_login,
      created_at: profileData.created_at,
      updated_at: profileData.updated_at,
      user_id: user.id // Use the authenticated user id
    }
    
    return userProfile
  } catch (error) {
    console.error('Server-side getUserProfile error:', error)
    return null
  }
}

export type { UserProfile }
