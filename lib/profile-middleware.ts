import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { UserProfile } from './user-profile-service'
import { UserRole } from './role-permissions'

// Cache configuration
const PROFILE_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const MAX_CACHE_SIZE = 1000 // Maximum number of cached profiles

// In-memory cache for profile data
interface CachedProfileData {
  profile: UserProfile
  expiresAt: number
  lastAccessed: number
}

class ProfileCache {
  private cache = new Map<string, CachedProfileData>()
  
  get(userId: string): UserProfile | null {
    const cached = this.cache.get(userId)
    if (!cached) return null
    
    const now = Date.now()
    if (cached.expiresAt <= now) {
      this.cache.delete(userId)
      return null
    }
    
    // Update last accessed time
    cached.lastAccessed = now
    return cached.profile
  }
  
  set(userId: string, profile: UserProfile): void {
    const now = Date.now()
    
    // Clean up cache if it's getting too large
    if (this.cache.size >= MAX_CACHE_SIZE) {
      this.cleanup()
    }
    
    this.cache.set(userId, {
      profile,
      expiresAt: now + PROFILE_CACHE_DURATION,
      lastAccessed: now
    })
  }
  
  delete(userId: string): void {
    this.cache.delete(userId)
  }
  
  clear(): void {
    this.cache.clear()
  }
  
  private cleanup(): void {
    const now = Date.now()
    const entries = Array.from(this.cache.entries())
    
    // Remove expired entries first
    entries.forEach(([userId, data]) => {
      if (data.expiresAt <= now) {
        this.cache.delete(userId)
      }
    })
    
    // If still too large, remove least recently accessed
    if (this.cache.size >= MAX_CACHE_SIZE) {
      const sortedEntries = entries
        .filter(([, data]) => data.expiresAt > now)
        .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed)
      
      const toRemove = Math.ceil(MAX_CACHE_SIZE * 0.2) // Remove 20%
      for (let i = 0; i < toRemove && i < sortedEntries.length; i++) {
        this.cache.delete(sortedEntries[i][0])
      }
    }
  }
  
  getStats() {
    const now = Date.now()
    const valid = Array.from(this.cache.values()).filter(data => data.expiresAt > now)
    return {
      total: this.cache.size,
      valid: valid.length,
      expired: this.cache.size - valid.length
    }
  }
}

// Global profile cache instance
const profileCache = new ProfileCache()

// Middleware response types
export interface ProfileMiddlewareResult {
  success: true
  user: {
    id: string
    email: string
  }
  profile: UserProfile
}

export interface ProfileMiddlewareError {
  success: false
  error: string
  status: number
}

export type ProfileMiddlewareResponse = ProfileMiddlewareResult | ProfileMiddlewareError

// Create Supabase admin client
function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Normalize profile data structure
function normalizeProfile(rawProfile: any): UserProfile {
  // Handle areas array or single area object
  let area = null
  if (rawProfile.areas) {
    if (Array.isArray(rawProfile.areas) && rawProfile.areas.length > 0) {
      area = rawProfile.areas[0]
    } else if (typeof rawProfile.areas === 'object') {
      area = rawProfile.areas
    }
  } else if (rawProfile.area) {
    area = rawProfile.area
  }

  return {
    id: rawProfile.id,
    tenant_id: rawProfile.tenant_id,
    email: rawProfile.email,
    full_name: rawProfile.full_name,
    role: rawProfile.role as UserRole,
    area_id: rawProfile.area_id,
    area: area,
    avatar_url: rawProfile.avatar_url,
    phone: rawProfile.phone,
    is_active: rawProfile.is_active,
    is_system_admin: rawProfile.is_system_admin,
    last_login: rawProfile.last_login,
    created_at: rawProfile.created_at,
    updated_at: rawProfile.updated_at
  }
}

// Main middleware function to get authenticated user and profile
export async function getProfileFromRequest(
  request: NextRequest,
  options: {
    useCache?: boolean
    requireProfile?: boolean
    allowInactive?: boolean
  } = {}
): Promise<ProfileMiddlewareResponse> {
  const { useCache = true, requireProfile = true, allowInactive = false } = options
  
  try {
    // Create server client with cookies
    const cookieStore = await cookies()
    const supabase = createServerClient(cookieStore)

    // Get current user from session
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required',
        status: 401
      }
    }

    // Check cache first if enabled
    if (useCache) {
      const cachedProfile = profileCache.get(user.id)
      if (cachedProfile) {
        // Validate cached profile
        if (!allowInactive && !cachedProfile.is_active) {
          return {
            success: false,
            error: 'Account is inactive',
            status: 403
          }
        }
        
        return {
          success: true,
          user: {
            id: user.id,
            email: user.email!
          },
          profile: cachedProfile
        }
      }
    }

    // Fetch profile from database
    const supabaseAdmin = createAdminClient()
    
    const { data: profileData, error: profileError } = await supabaseAdmin
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

    if (profileError || !profileData) {
      if (requireProfile) {
        return {
          success: false,
          error: 'User profile not found',
          status: 404
        }
      } else {
        // Return minimal user data without profile
        return {
          success: true,
          user: {
            id: user.id,
            email: user.email!
          },
          profile: null as any // This should be handled by the caller
        }
      }
    }

    const profile = normalizeProfile(profileData)
    
    // Validate profile status
    if (!allowInactive && !profile.is_active) {
      return {
        success: false,
        error: 'Account is inactive',
        status: 403
      }
    }

    // Cache the profile if caching is enabled
    if (useCache) {
      profileCache.set(user.id, profile)
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email!
      },
      profile
    }
  } catch (error) {
    console.error('Profile middleware error:', error)
    return {
      success: false,
      error: 'Internal server error',
      status: 500
    }
  }
}

// Middleware function specifically for API routes that need profile data
export async function withProfileMiddleware<T = any>(
  request: NextRequest,
  handler: (profile: UserProfile, user: { id: string; email: string }) => Promise<NextResponse<T>>,
  options: {
    useCache?: boolean
    requireProfile?: boolean
    allowInactive?: boolean
    requiredRole?: UserRole
    requiredPermissions?: string[]
  } = {}
): Promise<NextResponse> {
  const result = await getProfileFromRequest(request, options)
  
  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status }
    )
  }

  // Check role requirements
  if (options.requiredRole && result.profile.role !== options.requiredRole) {
    return NextResponse.json(
      { error: `Access denied. Required role: ${options.requiredRole}` },
      { status: 403 }
    )
  }

  // TODO: Implement permission checking when permission system is added
  // if (options.requiredPermissions) {
  //   const hasAllPermissions = options.requiredPermissions.every(permission =>
  //     hasPermission(result.profile.role, permission)
  //   )
  //   
  //   if (!hasAllPermissions) {
  //     return NextResponse.json(
  //       { error: 'Insufficient permissions' },
  //       { status: 403 }
  //     )
  //   }
  // }

  try {
    return await handler(result.profile, result.user)
  } catch (error) {
    console.error('Handler error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to invalidate profile cache
export function invalidateProfileCache(userId?: string): void {
  if (userId) {
    profileCache.delete(userId)
  } else {
    profileCache.clear()
  }
}

// Helper function to get cache statistics
export function getProfileCacheStats() {
  return profileCache.getStats()
}

// Middleware for tenant-specific operations
export async function getProfileWithTenantValidation(
  request: NextRequest,
  expectedTenantId?: string,
  options: {
    useCache?: boolean
    allowInactive?: boolean
  } = {}
): Promise<ProfileMiddlewareResponse> {
  const result = await getProfileFromRequest(request, options)
  
  if (!result.success) {
    return result
  }

  // Validate tenant if specified
  if (expectedTenantId && result.profile.tenant_id !== expectedTenantId) {
    return {
      success: false,
      error: 'Access denied. Invalid tenant.',
      status: 403
    }
  }

  return result
}

// Helper to extract tenant ID from domain
export function getTenantIdFromRequest(request: NextRequest): string | null {
  const host = request.headers.get('host') || ''
  
  // Extract subdomain (assuming format: subdomain.domain.com)
  const parts = host.split('.')
  if (parts.length >= 3) {
    return parts[0] // Return subdomain as tenant identifier
  }
  
  // Fallback for localhost or custom domains
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return 'demo' // Default tenant for local development
  }
  
  return null
}

// Area-specific filtering helper for managers
export function getAreaFiltersForProfile(profile: UserProfile) {
  // Managers can only access their own area
  if (profile.role === 'Manager') {
    return { area_id: profile.area_id }
  }
  
  // CEO, Admin, and Analyst can access all areas
  if (['CEO', 'Admin', 'Analyst'].includes(profile.role)) {
    return null // No filter - access all areas
  }
  
  return { area_id: null } // Default: no access
}

// Get tenant filter (always applies)
export function getTenantFilterForProfile(profile: UserProfile) {
  return { tenant_id: profile.tenant_id }
}

// Get combined filters for database queries
export function getDataFiltersForProfile(profile: UserProfile) {
  const tenantFilter = getTenantFilterForProfile(profile)
  const areaFilter = getAreaFiltersForProfile(profile)
  
  if (areaFilter) {
    return { ...tenantFilter, ...areaFilter }
  }
  
  return tenantFilter
}