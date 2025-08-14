/**
 * API Authentication Helper
 * Provides robust authentication for API routes in production
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'

export interface AuthenticatedUser {
  id: string
  email: string
  user_id: string
  tenant_id: string
  role: string
  area_id?: string | null
}

/**
 * Authenticate API request and get user info
 * Following Supabase best practices from docs/supabase-sesion.md
 * ALWAYS use getUser() on server-side, NEVER getSession()
 */
export async function authenticateRequest(): Promise<{ 
  user: any; 
  userProfile: any; 
  supabase: any; 
  error?: string 
}> {
  try {
    // Create Supabase client with cookie handling
    const supabase = await createClient()
    
    // IMPORTANT: Always use getUser() on server-side per Supabase docs
    // This verifies the JWT and cannot be spoofed
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('API Auth: Authentication error:', authError?.message)
      throw new Error('Authentication required')
    }
    
    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()
    
    if (profileError || !userProfile) {
      console.error('API Auth: Profile error:', profileError?.message)
      throw new Error('User profile not found')
    }
    
    return {
      user,
      userProfile,
      supabase
    }
  } catch (error) {
    console.error('API Auth: Unexpected error:', error)
    throw error
  }
}

/**
 * Standard unauthorized response
 */
export function unauthorizedResponse(message: string = 'Authentication required') {
  return NextResponse.json(
    { error: message },
    { 
      status: 401,
      headers: {
        'WWW-Authenticate': 'Bearer realm="api"'
      }
    }
  )
}

/**
 * Add CORS headers for production
 */
export function addCorsHeaders(response: NextResponse): NextResponse {
  const headers = new Headers(response.headers)
  
  // Add CORS headers for production
  headers.set('Access-Control-Allow-Credentials', 'true')
  headers.set('Access-Control-Allow-Origin', process.env.NEXT_PUBLIC_APP_URL || '*')
  headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  })
}