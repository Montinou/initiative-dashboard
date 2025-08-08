import { createClient } from '@/utils/supabase/client'
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

interface CachedProfile {
  profile: UserProfile
  expiresAt: Date
  lastFetched: Date
}

interface ServiceOptions {
  retryAttempts?: number
  retryDelay?: number
  cacheExpiration?: number
}

class UserProfileService {
  private static instance: UserProfileService
  private profile: UserProfile | null = null
  private supabase = createClient()
  private fetchPromise: Promise<UserProfile | null> | null = null
  private options: ServiceOptions = {
    retryAttempts: 3,
    retryDelay: 1000,
    cacheExpiration: 5 * 60 * 1000 // 5 minutes
  }

  static getInstance(): UserProfileService {
    if (!UserProfileService.instance) {
      UserProfileService.instance = new UserProfileService()
    }
    return UserProfileService.instance
  }

  async getProfile(forceRefresh = false): Promise<UserProfile | null> {
    // Return in-memory cache if available and not force refreshing
    if (this.profile && !forceRefresh) {
      return this.profile
    }

    // Check localStorage cache if not force refreshing
    if (!forceRefresh) {
      const cached = this.getCachedProfile()
      if (cached) {
        this.profile = cached
        return cached
      }
    }

    // Prevent multiple concurrent fetch requests
    if (this.fetchPromise && !forceRefresh) {
      return this.fetchPromise
    }

    // Create a new fetch promise
    this.fetchPromise = this.fetchProfileWithRetry()
    
    try {
      const profile = await this.fetchPromise
      this.profile = profile
      
      if (profile) {
        this.setCachedProfile(profile)
      } else {
        this.clearProfile()
      }
      
      return profile
    } finally {
      this.fetchPromise = null
    }
  }

  private async fetchProfileWithRetry(): Promise<UserProfile | null> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < this.options.retryAttempts!; attempt++) {
      try {
        const { data: { user } } = await this.supabase.auth.getUser()
        if (!user) {
          return null
        }

        // Try direct database query first
        const { data: profile, error } = await this.supabase
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
            updated_at,
            areas:area_id (
              id,
              name
            )
          `)
          .eq('user_id', user.id)
          .single()

        if (error) {
          // Fallback to API endpoint
          console.warn(`Direct query failed (attempt ${attempt + 1}), trying API endpoint:`, error.message)
          
          const response = await fetch('/api/profile/user', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            signal: AbortSignal.timeout(10000)
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`)
          }

          const apiResult = await response.json()
          return this.normalizeProfile(apiResult.profile)
        }

        return this.normalizeProfile(profile)
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        console.warn(`Profile fetch attempt ${attempt + 1} failed:`, lastError.message)
        
        // Wait before retrying (except on last attempt)
        if (attempt < this.options.retryAttempts! - 1) {
          await this.delay(this.options.retryDelay! * Math.pow(2, attempt)) // Exponential backoff
        }
      }
    }

    console.error('All profile fetch attempts failed:', lastError?.message)
    return null
  }

  private normalizeProfile(rawProfile: any): UserProfile {
    // Handle areas array or single area object
    let area = null
    if (rawProfile.areas) {
      if (Array.isArray(rawProfile.areas) && rawProfile.areas.length > 0) {
        const areaData = rawProfile.areas[0]
        area = {
          id: areaData.id,
          name: areaData.name,
          description: areaData.description || areaData.name // Use name as fallback
        }
      } else if (typeof rawProfile.areas === 'object') {
        area = {
          id: rawProfile.areas.id,
          name: rawProfile.areas.name,
          description: rawProfile.areas.description || rawProfile.areas.name
        }
      }
    } else if (rawProfile.area) {
      area = rawProfile.area
    }

    // Production schema doesn't have: avatar_url, phone, is_active, is_system_admin, last_login, created_at, updated_at
    return {
      id: rawProfile.id,
      tenant_id: rawProfile.tenant_id,
      email: rawProfile.email,
      full_name: rawProfile.full_name,
      role: rawProfile.role,
      area_id: rawProfile.area_id,
      area: area,
      avatar_url: rawProfile.avatar_url || null,
      phone: rawProfile.phone || null,
      is_active: rawProfile.is_active,
      is_system_admin: rawProfile.is_system_admin || rawProfile.role === 'CEO',
      last_login: rawProfile.last_login || null,
      created_at: rawProfile.created_at || new Date().toISOString(),
      updated_at: rawProfile.updated_at || new Date().toISOString()
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private getCachedProfile(): UserProfile | null {
    try {
      const cached = localStorage.getItem('user_profile_v2')
      if (!cached) {
        // Clean up old cache format
        localStorage.removeItem('user_profile')
        return null
      }
      
      const parsed: CachedProfile = JSON.parse(cached)
      const expiresAt = new Date(parsed.expiresAt)
      
      if (expiresAt <= new Date()) {
        localStorage.removeItem('user_profile_v2')
        return null
      }
      
      return parsed.profile
    } catch (error) {
      console.warn('Failed to parse cached profile:', error)
      localStorage.removeItem('user_profile_v2')
      return null
    }
  }

  private setCachedProfile(profile: UserProfile): void {
    try {
      const cacheData: CachedProfile = {
        profile,
        expiresAt: new Date(Date.now() + this.options.cacheExpiration!),
        lastFetched: new Date()
      }
      localStorage.setItem('user_profile_v2', JSON.stringify(cacheData))
      
      // Clean up old cache format
      localStorage.removeItem('user_profile')
    } catch (error) {
      console.warn('Failed to cache profile:', error)
    }
  }

  clearProfile(): void {
    this.profile = null
    this.fetchPromise = null
    
    try {
      localStorage.removeItem('user_profile_v2')
      localStorage.removeItem('user_profile') // Clean up old format
    } catch (error) {
      console.warn('Failed to clear profile cache:', error)
    }
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<{ success: boolean; error?: string }> {
    if (!this.profile) {
      return { success: false, error: 'No profile loaded' }
    }

    try {
      // Optimistically update local profile
      const updatedProfile = { ...this.profile, ...updates, updated_at: new Date().toISOString() }
      
      // Update via API
      const response = await fetch('/api/profile/user', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      const serverProfile = this.normalizeProfile(result.profile)
      
      // Update with server response
      this.profile = serverProfile
      this.setCachedProfile(serverProfile)
      
      return { success: true }
    } catch (error) {
      console.error('Profile update failed:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Update failed' 
      }
    }
  }

  // Method to check if profile is stale and should be refreshed
  shouldRefresh(): boolean {
    if (!this.profile) return true
    
    try {
      const cached = localStorage.getItem('user_profile_v2')
      if (!cached) return true
      
      const parsed: CachedProfile = JSON.parse(cached)
      const age = Date.now() - new Date(parsed.lastFetched).getTime()
      
      // Refresh if cache is more than halfway to expiration
      return age > (this.options.cacheExpiration! / 2)
    } catch {
      return true
    }
  }

  // Method to invalidate cache and force refresh on next request
  invalidateCache(): void {
    this.profile = null
    this.fetchPromise = null
    
    try {
      localStorage.removeItem('user_profile_v2')
    } catch (error) {
      console.warn('Failed to invalidate profile cache:', error)
    }
  }

  // Get current profile without fetching (returns null if not loaded)
  getCurrentProfile(): UserProfile | null {
    return this.profile
  }

  // Check if profile is currently being fetched
  isFetching(): boolean {
    return this.fetchPromise !== null
  }
}

export const userProfileService = UserProfileService.getInstance()
export type { UserProfile, ServiceOptions }

