/**
 * API Authentication Helper
 * Provides robust authentication for API routes in production
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { dedupAuthRequest, getCachedUser, setCachedUser } from '@/lib/auth/auth-cache'

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
 * Supports both cookie-based auth and Bearer token auth
 */
export async function authenticateRequest(request?: NextRequest): Promise<{ 
  user?: any; 
  userProfile?: any; 
  supabase?: any; 
  error?: string 
}> {
  try {
    let supabase: any;
    
    // Check for Bearer token in Authorization header
    const authHeader = request?.headers?.get('authorization');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Extract token from Bearer header
      const token = authHeader.substring(7);
      
      // Create Supabase client with direct token
      supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          global: {
            headers: {
              Authorization: `Bearer ${token}`
            }
          },
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );
      
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      
      if (authError || !user) {
        console.error('API Auth: Authentication error:', authError?.message)
        return {
          error: authError?.message || 'Authentication required'
        }
      }
      
      var userToUse = user;
    } else {
      // Fall back to cookie-based auth
      supabase = await createClient();
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        console.error('API Auth: Authentication error:', authError?.message)
        return {
          error: authError?.message || 'Authentication required'
        }
      }
      
      var userToUse = user;
    }
    
    // Get user profile with tenant and organization info
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        *,
        tenant:tenants!user_profiles_tenant_id_fkey (
          id,
          subdomain,
          organization:organizations!tenants_organization_id_fkey (
            id,
            name,
            description
          )
        )
      `)
      .eq('user_id', userToUse.id)
      .single()
    
    if (profileError || !userProfile) {
      console.error('API Auth: Profile error:', profileError?.message, {
        userId: userToUse.id,
        profileError: profileError
      })
      return {
        user: userToUse,
        error: 'User profile not found or not properly configured'
      }
    }
    
    // Validate tenant_id exists
    if (!userProfile.tenant_id) {
      console.error('API Auth: User profile missing tenant_id', {
        userId: userToUse.id,
        profileId: userProfile.id,
        email: userProfile.email
      })
      return {
        user: userToUse,
        userProfile,
        error: 'User profile not properly configured - missing tenant association'
      }
    }
    
    return {
      user: userToUse,
      userProfile,
      supabase
    }
  } catch (error: any) {
    console.error('API Auth: Unexpected error:', error)
    return {
      error: error.message || 'Authentication failed'
    }
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