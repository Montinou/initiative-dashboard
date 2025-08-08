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
          
          // Get user profile using service role key from environment
          const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
          const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
          
          try {
            const response = await fetch(
              `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${headerUser.id}&select=id,tenant_id,role,area_id`,
              {
                headers: {
                  'apikey': serviceKey,
                  'Authorization': `Bearer ${serviceKey}`,
                  'Accept': 'application/json',
                  'Content-Type': 'application/json',
                  'Prefer': 'return=representation,count=none'
                }
              }
            );
            
            if (!response.ok) {
              const error = await response.text();
              console.error('API Auth: Direct fetch error:', response.status, error);
              return { user: null, error: 'Profile fetch failed' };
            }
            
            const profiles = await response.json();
            const profile = profiles && profiles.length > 0 ? profiles[0] : null;
            
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
          } catch (err) {
            console.error('API Auth: Profile fetch exception:', err);
            return { user: null, error: 'Profile fetch failed' };
          }
        }
      }
      
      return { user: null, error: 'Authentication required' }
    }
    
    if (!user) {
      return { user: null, error: 'No authenticated user' }
    }
    
    // Get user profile using service role key from environment
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    
    try {
      const response = await fetch(
        `${supabaseUrl}/rest/v1/user_profiles?user_id=eq.${user.id}&select=id,tenant_id,role,area_id`,
        {
          headers: {
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Prefer': 'return=representation,count=none'
          }
        }
      );
      
      if (!response.ok) {
        const error = await response.text();
        console.error('API Auth: Direct fetch error:', response.status, error);
        return { user: null, error: 'User profile not found' };
      }
      
      const profiles = await response.json();
      const profile = profiles && profiles.length > 0 ? profiles[0] : null;
      
      if (!profile) {
        console.error('API Auth: No profile found for user:', user.id);
        return { user: null, error: 'User profile not found' };
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