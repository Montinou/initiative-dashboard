/**
 * Server-side user profile utilities for API routes
 * This file contains server-only code and should not be imported on the client
 */

import { NextRequest } from 'next/server'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { UserRole } from './role-permissions'

// Enhanced UserProfile interface matching the schema
interface UserProfile {
  id: string
  tenant_id: string
  email: string
  full_name: string | null
  role: UserRole
  area_id: string | null
  area: {
    id: string
    name: string
    description: string
  } | null
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  is_system_admin: boolean
  last_login: string | null
  created_at: string
  updated_at: string
}

/**
 * Server-side helper to get user profile from API routes
 * This is used in API routes to authenticate and get user data
 */
export async function getUserProfile(request?: NextRequest): Promise<{ user: any, userProfile: UserProfile | null }> {
  try {
    const supabase = await createServerClient()

    // Get current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { user: null, userProfile: null }
    }

    // Get complete user profile with area information
    const { data: profileData, error: fetchError } = await supabase
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
        is_system_admin,
        last_login,
        created_at,
        updated_at,
        area_id,
        areas!user_profiles_area_id_fkey (
          id,
          name,
          description
        )
      `)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !profileData) {
      console.error('Server-side profile fetch error:', fetchError)
      return { user, userProfile: null }
    }

    // Format the response to match UserProfile interface
    const userProfile = {
      id: profileData.id,
      tenant_id: profileData.tenant_id,
      email: profileData.email,
      full_name: profileData.full_name,
      role: profileData.role,
      area_id: profileData.area_id,
      area: profileData.areas && Array.isArray(profileData.areas) && profileData.areas.length > 0 ? {
        id: profileData.areas[0].id,
        name: profileData.areas[0].name,
        description: profileData.areas[0].description
      } : null,
      avatar_url: profileData.avatar_url,
      phone: profileData.phone,
      is_active: profileData.is_active,
      is_system_admin: profileData.is_system_admin,
      last_login: profileData.last_login,
      created_at: profileData.created_at,
      updated_at: profileData.updated_at
    }
    
    return { user, userProfile }
  } catch (error) {
    console.error('Server-side getUserProfile error:', error)
    return { user: null, userProfile: null }
  }
}

export type { UserProfile }