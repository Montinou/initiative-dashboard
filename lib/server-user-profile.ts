/**
 * Server-side user profile utilities for API routes
 * Following Supabase August 2025 best practices from docs/supabase-sesion.md
 * IMPORTANT: Always use getUser() on server-side, NEVER getSession()
 */

import { NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { dedupAuthRequest, getCachedUser } from '@/lib/auth/auth-cache'
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
      
      // When using Bearer token, check cache first
      const cacheKey = `bearer-${token.substring(0, 8)}`;
      const cachedUser = getCachedUser(cacheKey);
      
      if (cachedUser) {
        console.log('[getUserProfile] Using cached user for Bearer token');
        var user = cachedUser;
        var authError = null;
      } else {
        // Deduplicate concurrent requests with the same token
        const result = await dedupAuthRequest(
          async () => {
            const { data: { user }, error } = await supabase.auth.getUser(token);
            return { user, error };
          },
          cacheKey
        );
        var { user, error: authError } = result;
      }
    } else {
      // Fall back to cookie-based auth
      supabase = await createClient();
      
      // For cookie-based auth, check cache first
      const cacheKey = 'cookie-auth';
      const cachedUser = getCachedUser(cacheKey);
      
      if (cachedUser) {
        console.log('[getUserProfile] Using cached user for cookie auth');
        var user = cachedUser;
        var authError = null;
      } else {
        // Deduplicate concurrent requests
        const result = await dedupAuthRequest(
          async () => {
            const { data: { user }, error } = await supabase.auth.getUser();
            return { user, error };
          },
          cacheKey
        );
        var { user, error: authError } = result;
      }
    }
    
    if (authError || !user) {
      console.log('Server-side auth check failed:', authError?.message || 'No user found')
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
