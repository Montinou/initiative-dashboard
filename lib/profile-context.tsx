'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'
import { userProfileService, UserProfile } from './user-profile-service'
import { UserRole } from './role-permissions'

interface ProfileContextType {
  // Core state
  user: User | null
  session: Session | null
  profile: UserProfile | null
  
  // Loading states
  loading: boolean
  profileLoading: boolean
  updating: boolean
  
  // Error states
  error: string | null
  lastError: string | null
  
  // Actions
  refreshProfile: (force?: boolean) => Promise<void>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>
  clearError: () => void
  
  // Auth helpers
  isAuthenticated: boolean
  tenantId: string | null
  userRole: UserRole | null
  managedAreaId: string | null
  
  // Utility methods
  hasRole: (role: UserRole) => boolean
  isManager: boolean
  isAdmin: boolean
  isCEO: boolean
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined)

interface ProfileProviderProps {
  children: React.ReactNode
  initialSession?: Session | null
  initialProfile?: UserProfile | null
}

export function ProfileProvider({ 
  children, 
  initialSession, 
  initialProfile 
}: ProfileProviderProps) {
  const supabase = createClient()
  const mounted = useRef(true)
  
  // Core state
  const [user, setUser] = useState<User | null>(initialSession?.user || null)
  const [session, setSession] = useState<Session | null>(initialSession || null)
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile || null)
  
  // Loading states
  const [loading, setLoading] = useState(!initialSession && !initialProfile)
  const [profileLoading, setProfileLoading] = useState(false)
  const [updating, setUpdating] = useState(false)
  
  // Error states
  const [error, setError] = useState<string | null>(null)
  const [lastError, setLastError] = useState<string | null>(null)
  
  // Auth subscription cleanup
  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null)
  
  // Profile refresh with error handling
  const refreshProfile = useCallback(async (force = false) => {
    if (!user || profileLoading) return
    
    setProfileLoading(true)
    setError(null)
    
    try {
      const freshProfile = await userProfileService.getProfile(force)
      
      if (mounted.current) {
        setProfile(freshProfile)
        
        if (!freshProfile && user) {
          setError('Profile not found. Please contact support.')
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load profile'
      console.error('Profile refresh error:', err)
      
      if (mounted.current) {
        setError(errorMessage)
        setLastError(errorMessage)
      }
    } finally {
      if (mounted.current) {
        setProfileLoading(false)
      }
    }
  }, [user, profileLoading])
  
  // Profile update with optimistic updates
  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!profile || updating) {
      return { success: false, error: 'Profile not available or update in progress' }
    }
    
    setUpdating(true)
    setError(null)
    
    // Optimistic update
    const optimisticProfile = { ...profile, ...updates, updated_at: new Date().toISOString() }
    setProfile(optimisticProfile)
    
    try {
      const result = await userProfileService.updateProfile(updates)
      
      if (result.success) {
        // Get the updated profile from the service
        const updatedProfile = userProfileService.getCurrentProfile()
        if (updatedProfile && mounted.current) {
          setProfile(updatedProfile)
        }
      } else {
        // Revert optimistic update on failure
        if (mounted.current) {
          setProfile(profile)
          setError(result.error || 'Update failed')
          setLastError(result.error || 'Update failed')
        }
      }
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Update failed'
      
      if (mounted.current) {
        // Revert optimistic update
        setProfile(profile)
        setError(errorMessage)
        setLastError(errorMessage)
      }
      
      return { success: false, error: errorMessage }
    } finally {
      if (mounted.current) {
        setUpdating(false)
      }
    }
  }, [profile, updating])
  
  const clearError = useCallback(() => {
    setError(null)
  }, [])
  
  // Initialize and handle auth state changes
  useEffect(() => {
    mounted.current = true
    
    // If we have initial session, skip auth initialization
    if (initialSession) {
      console.log('ProfileProvider: Using initial session, skipping auth initialization')
      if (initialProfile) {
        userProfileService.updateProfile(initialProfile)
      }
      return
    }
    
    let initPromise: Promise<void>
    
    // Initialize session if not provided
    const initializeAuth = async () => {
      try {
        setLoading(true)
        
        const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.warn('Session initialization error:', sessionError)
          if (mounted.current) {
            setError(`Authentication error: ${sessionError.message}`)
            setSession(null)
            setUser(null)
            setProfile(null)
          }
          return
        }
        
        if (mounted.current) {
          setSession(currentSession)
          setUser(currentSession?.user || null)
          
          if (currentSession?.user) {
            await refreshProfile()
          } else {
            setProfile(null)
            userProfileService.clearProfile()
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err)
        if (mounted.current) {
          setError('Failed to initialize authentication')
        }
      } finally {
        if (mounted.current) {
          setLoading(false)
        }
      }
    }
    
    initPromise = initializeAuth()
    
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('ProfileProvider: Auth state change:', event)
        
        if (!mounted.current) return
        
        setSession(newSession)
        setUser(newSession?.user || null)
        
        if (newSession?.user) {
          // User signed in or session refreshed
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            await refreshProfile(event === 'SIGNED_IN') // Force refresh on sign in
          }
        } else {
          // User signed out
          setProfile(null)
          userProfileService.clearProfile()
        }
        
        setLoading(false)
      }
    )
    
    subscriptionRef.current = subscription
    
    return () => {
      mounted.current = false
      subscription.unsubscribe()
    }
  }, [initialSession, initialProfile, refreshProfile])
  
  // Periodic profile refresh for stale data
  useEffect(() => {
    if (!user || !profile) return
    
    const checkStaleProfile = () => {
      if (userProfileService.shouldRefresh() && !profileLoading) {
        console.log('ProfileProvider: Refreshing stale profile data')
        refreshProfile()
      }
    }
    
    // Check every minute
    const interval = setInterval(checkStaleProfile, 60000)
    
    return () => clearInterval(interval)
  }, [user, profile, profileLoading, refreshProfile])
  
  // Computed values
  const isAuthenticated = !!user && !!session
  const tenantId = profile?.tenant_id || null
  const userRole = profile?.role || null
  const managedAreaId = profile?.area_id || null
  
  const hasRole = useCallback((role: UserRole) => {
    return profile?.role === role
  }, [profile])
  
  const isManager = profile?.role === 'Manager'
  const isAdmin = profile?.role === 'Admin'
  const isCEO = profile?.role === 'CEO'
  
  const contextValue: ProfileContextType = {
    // Core state
    user,
    session,
    profile,
    
    // Loading states
    loading,
    profileLoading,
    updating,
    
    // Error states
    error,
    lastError,
    
    // Actions
    refreshProfile,
    updateProfile,
    clearError,
    
    // Auth helpers
    isAuthenticated,
    tenantId,
    userRole,
    managedAreaId,
    
    // Utility methods
    hasRole,
    isManager,
    isAdmin,
    isCEO
  }
  
  return (
    <ProfileContext.Provider value={contextValue}>
      {children}
    </ProfileContext.Provider>
  )
}

// Hook to use the profile context
export function useProfile() {
  const context = useContext(ProfileContext)
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider')
  }
  return context
}

// Convenience hooks
export function useProfileData() {
  const { profile, profileLoading, error } = useProfile()
  return { profile, loading: profileLoading, error }
}

export function useAuth() {
  const { user, session, isAuthenticated, loading } = useProfile()
  return { user, session, isAuthenticated, loading }
}

export function useUserRole() {
  const { userRole } = useProfile()
  return userRole
}

export function useTenantId() {
  const { tenantId } = useProfile()
  return tenantId
}

export function useManagerContext() {
  const { profile, isManager, managedAreaId } = useProfile()
  
  const managedAreaName = profile?.area?.name || null
  
  const canManageArea = useCallback((areaId: string): boolean => {
    return isManager && managedAreaId === areaId
  }, [isManager, managedAreaId])
  
  const getManagerArea = useCallback(() => {
    if (!isManager || !profile?.area) return null
    return {
      id: profile.area.id,
      name: profile.area.name,
      description: profile.area.description
    }
  }, [isManager, profile])
  
  return {
    isManager,
    managedAreaId,
    managedAreaName,
    canManageArea,
    getManagerArea,
    managerProfile: isManager ? profile : null
  }
}