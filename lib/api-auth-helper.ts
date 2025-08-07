/**
 * API Authentication Helper
 * Provides robust authentication for API routes in production
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
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
export async function authenticateRequest(
  request: NextRequest
): Promise<{ user: AuthenticatedUser | null; error?: string }> {
  try {
    // Create Supabase client with cookie handling
    const supabase = await createClient()
    
    // IMPORTANT: Always use getUser() on server-side per Supabase docs
    // This verifies the JWT and cannot be spoofed
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      console.error('API Auth: Session error:', authError.message)
      
      // Try to get token from Authorization header as fallback
      const headersList = await headers()
      const authorization = headersList.get('authorization')
      
      if (authorization?.startsWith('Bearer ')) {
        const token = authorization.substring(7)
        
        // Verify the token
        const { data: { user: headerUser }, error: headerError } = 
          await supabase.auth.getUser(token)
        
        if (!headerError && headerUser) {
          console.log('API Auth: Authenticated via header token')
          
          // Get user profile
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('id, tenant_id, role, area_id')
            .eq('user_id', headerUser.id)
            .single()
          
          if (profile) {
            return {
              user: {
                id: profile.id,
                email: headerUser.email!,
                user_id: headerUser.id,
                tenant_id: profile.tenant_id,
                role: profile.role,
                area_id: profile.area_id
              }
            }
          }
        }
      }
      
      return { user: null, error: 'Authentication required' }
    }
    
    if (!user) {
      return { user: null, error: 'No authenticated user' }
    }
    
    // Get user profile with tenant info
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, tenant_id, role, area_id')
      .eq('user_id', user.id)
      .single()
    
    if (profileError || !profile) {
      console.error('API Auth: Profile fetch error:', profileError?.message)
      
      // Try with id column as fallback (old schema)
      const { data: fallbackProfile } = await supabase
        .from('user_profiles')
        .select('id, tenant_id, role, area_id')
        .eq('id', user.id)
        .single()
      
      if (fallbackProfile) {
        return {
          user: {
            id: fallbackProfile.id,
            email: user.email!,
            user_id: user.id,
            tenant_id: fallbackProfile.tenant_id,
            role: fallbackProfile.role,
            area_id: fallbackProfile.area_id
          }
        }
      }
      
      return { user: null, error: 'User profile not found' }
    }
    
    return {
      user: {
        id: profile.id,
        email: user.email!,
        user_id: user.id,
        tenant_id: profile.tenant_id,
        role: profile.role,
        area_id: profile.area_id
      }
    }
  } catch (error) {
    console.error('API Auth: Unexpected error:', error)
    return { user: null, error: 'Authentication failed' }
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