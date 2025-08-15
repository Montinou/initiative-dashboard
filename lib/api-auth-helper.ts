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
 * Supports both cookie-based auth and Bearer token auth
 */
export async function authenticateRequest(request?: NextRequest): Promise<{ 
  user: any; 
  userProfile: any; 
  supabase: any; 
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
      
      // When using Bearer token, pass it directly to getUser()
      var { data: { user }, error: authError } = await supabase.auth.getUser(token);
    } else {
      // Fall back to cookie-based auth
      supabase = await createClient();
      
      // For cookie-based auth, call getUser() without parameters
      var { data: { user }, error: authError } = await supabase.auth.getUser();
    }
    
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