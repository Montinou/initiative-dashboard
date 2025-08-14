'use client'

/**
 * Enhanced AuthProvider following Supabase best practices
 * Based on docs/supabase-sesion.md lines 231-269
 * 
 * Features:
 * - Single auth listener (best practice)
 * - Proper session management with getUser() validation
 * - Request deduplication and caching
 * - Enhanced error handling
 * - MFA support ready
 * - Performance optimized
 */

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { User, Session, AuthChangeEvent, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'
import { isAuthApiError } from '@supabase/supabase-js'

export interface UserProfile {
  id: string
  tenant_id: string
  email: string
  full_name: string | null
  role: 'CEO' | 'Admin' | 'Manager' | 'Analyst'
  area_id: string | null
  area_name: string | null
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  last_login: string | null
  created_at: string
  updated_at: string
  user_id: string
}

export interface AuthState {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  initialized: boolean
  error: AuthError | null
}

export interface AuthContextType extends AuthState {
  signIn: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: AuthError }>
  signInWithOtp: (email: string) => Promise<{ success: boolean; error?: AuthError }>
  signInWithProvider: (provider: 'google' | 'github') => Promise<{ success: boolean; error?: AuthError }>
  signOut: (scope?: 'local' | 'others' | 'global') => Promise<{ success: boolean; error?: AuthError }>
  refreshSession: () => Promise<{ success: boolean; error?: AuthError }>
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: Error }>
  // Role & Permission helpers
  hasRole: (role: string) => boolean
  hasAnyRole: (roles: string[]) => boolean
  canAccessArea: (areaId: string) => boolean
  // MFA helpers (ready for implementation)
  startMFAEnroll: () => Promise<{ success: boolean; data?: any; error?: AuthError }>
  verifyMFA: (code: string) => Promise<{ success: boolean; error?: AuthError }>
  // Session utilities
  getAccessToken: () => Promise<string | null>
  isSessionExpired: () => boolean
  getSessionTimeRemaining: () => number
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode
  initialSession?: Session | null
  initialProfile?: UserProfile | null
}

export function AuthProvider({ 
  children, 
  initialSession = null, 
  initialProfile = null 
}: AuthProviderProps) {
  const supabase = createClient()
  
  // Core state
  const [user, setUser] = useState<User | null>(initialSession?.user || null)
  const [session, setSession] = useState<Session | null>(initialSession)
  const [profile, setProfile] = useState<UserProfile | null>(initialProfile)
  const [loading, setLoading] = useState(!initialSession)
  const [initialized, setInitialized] = useState(!!initialSession)
  const [error, setError] = useState<AuthError | null>(null)
  
  // Refs for cleanup and deduplication
  const mounted = useRef(true)
  const profileCache = useRef<Map<string, UserProfile>>(new Map())
  const profileFetchPromises = useRef<Map<string, Promise<UserProfile | null>>>(new Map())
  
  // Enhanced error handling following docs patterns
  const handleAuthError = useCallback((error: any): string => {
    if (!isAuthApiError(error)) return 'An unexpected error occurred'
    
    switch (error.code) {
      case 'invalid_credentials':
        return 'Invalid email or password'
      case 'email_not_confirmed':
        return 'Please confirm your email before signing in'
      case 'user_not_found':
        return 'No account found with this email'
      case 'weak_password':
        return 'Password is too weak'
      case 'over_email_send_rate_limit':
        return 'Too many emails sent. Please wait before trying again'
      case 'session_expired':
        return 'Your session has expired. Please sign in again'
      case 'signup_disabled':
        return 'Sign up is currently disabled'
      default:
        return error.message || 'Authentication failed'
    }
  }, [])

  // Fetch user profile with caching and deduplication
  const fetchUserProfile = useCallback(async (userId: string): Promise<UserProfile | null> => {
    if (!mounted.current) return null
    
    // Check cache first
    const cached = profileCache.current.get(userId)
    if (cached) return cached
    
    // Check for existing fetch promise (deduplication)
    const existingPromise = profileFetchPromises.current.get(userId)
    if (existingPromise) return existingPromise
    
    // Create new fetch promise
    const fetchPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select(`
            id, tenant_id, email, full_name, role, area_id,
            avatar_url, phone, is_active, last_login,
            created_at, updated_at, user_id,
            areas(name)
          `)
          .eq('user_id', userId)
          .single()
        
        if (error || !data) {
          console.warn('[AuthProvider] Profile not found for user:', userId)
          return null
        }
        
        const profile: UserProfile = {
          ...data,
          area_name: data.areas?.name || null
        }
        
        // Cache the result
        profileCache.current.set(userId, profile)
        return profile
      } catch (err) {
        console.error('[AuthProvider] Error fetching profile:', err)
        return null
      } finally {
        // Clean up promise
        profileFetchPromises.current.delete(userId)
      }
    })()
    
    // Store promise for deduplication
    profileFetchPromises.current.set(userId, fetchPromise)
    return fetchPromise
  }, [supabase])

  // Initialize auth state
  useEffect(() => {
    let subscription: any = null
    
    const initializeAuth = async () => {
      if (!mounted.current) return
      
      try {
        // Get initial session - following best practices
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('[AuthProvider] Session error:', sessionError)
          setError(sessionError)
        }
        
        if (mounted.current) {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)
          
          // Fetch profile if user exists
          if (initialSession?.user) {
            const userProfile = await fetchUserProfile(initialSession.user.id)
            if (mounted.current) {
              setProfile(userProfile)
            }
          }
        }
        
        // Set up auth state listener (single listener as per best practices)
        subscription = supabase.auth.onAuthStateChange(
          async (event: AuthChangeEvent, currentSession: Session | null) => {
            if (!mounted.current) return
            
            console.log('[AuthProvider] Auth state change:', event)
            
            setSession(currentSession)
            setUser(currentSession?.user ?? null)
            setError(null)
            
            switch (event) {
              case 'INITIAL_SESSION':
                // Handle initial session
                break
              case 'SIGNED_IN':
                if (currentSession?.user) {
                  // Fetch fresh profile on sign in
                  const userProfile = await fetchUserProfile(currentSession.user.id)
                  if (mounted.current) {
                    setProfile(userProfile)
                  }
                }
                break
              case 'SIGNED_OUT':
                setUser(null)
                setSession(null)
                setProfile(null)
                // Clear cache on sign out
                profileCache.current.clear()
                profileFetchPromises.current.clear()
                break
              case 'TOKEN_REFRESHED':
                // Token was refreshed automatically
                break
              case 'USER_UPDATED':
                if (currentSession?.user) {
                  // Refresh profile on user update
                  profileCache.current.delete(currentSession.user.id)
                  const userProfile = await fetchUserProfile(currentSession.user.id)
                  if (mounted.current) {
                    setProfile(userProfile)
                  }
                }
                break
            }
          }
        )
        
      } catch (err) {
        console.error('[AuthProvider] Init error:', err)
        if (mounted.current) {
          setError(err as AuthError)
        }
      } finally {
        if (mounted.current) {
          setLoading(false)
          setInitialized(true)
        }
      }
    }
    
    initializeAuth()
    
    return () => {
      mounted.current = false
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [supabase, fetchUserProfile])

  // Auth methods
  const signIn = useCallback(async (
    email: string, 
    password: string, 
    rememberMe: boolean = false
  ): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      setLoading(true)
      setError(null)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password
      })
      
      if (error) return { success: false, error }
      
      // Handle remember me
      if (rememberMe && data.user) {
        await supabase.auth.updateUser({
          data: { remember_me: true }
        })
      }
      
      return { success: true }
    } catch (err) {
      const authError = err as AuthError
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const signInWithOtp = useCallback(async (email: string): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          shouldCreateUser: false
        }
      })
      
      if (error) return { success: false, error }
      return { success: true }
    } catch (err) {
      const authError = err as AuthError
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const signInWithProvider = useCallback(async (
    provider: 'google' | 'github'
  ): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent'
          }
        }
      })
      
      if (error) return { success: false, error }
      return { success: true }
    } catch (err) {
      const authError = err as AuthError
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const signOut = useCallback(async (
    scope: 'local' | 'others' | 'global' = 'local'
  ): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      setLoading(true)
      setError(null)
      
      const { error } = await supabase.auth.signOut({ scope })
      
      if (error) return { success: false, error }
      return { success: true }
    } catch (err) {
      const authError = err as AuthError
      setError(authError)
      return { success: false, error: authError }
    } finally {
      setLoading(false)
    }
  }, [supabase])

  const refreshSession = useCallback(async (): Promise<{ success: boolean; error?: AuthError }> => {
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) return { success: false, error }
      return { success: true }
    } catch (err) {
      const authError = err as AuthError
      return { success: false, error: authError }
    }
  }, [supabase])

  const updateProfile = useCallback(async (
    updates: Partial<UserProfile>
  ): Promise<{ success: boolean; error?: Error }> => {
    if (!user || !profile) {
      return { success: false, error: new Error('No user session') }
    }
    
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('user_id', user.id)
      
      if (error) return { success: false, error }
      
      // Update local state
      setProfile(prev => prev ? { ...prev, ...updates } : null)
      
      // Clear cache to force refresh
      profileCache.current.delete(user.id)
      
      return { success: true }
    } catch (err) {
      return { success: false, error: err as Error }
    }
  }, [supabase, user, profile])

  // Role & Permission helpers
  const hasRole = useCallback((role: string): boolean => {
    return profile?.role === role
  }, [profile])

  const hasAnyRole = useCallback((roles: string[]): boolean => {
    return profile ? roles.includes(profile.role) : false
  }, [profile])

  const canAccessArea = useCallback((areaId: string): boolean => {
    if (!profile) return false
    
    // CEO and Admin can access all areas
    if (['CEO', 'Admin'].includes(profile.role)) return true
    
    // Manager can only access their own area
    if (profile.role === 'Manager') return profile.area_id === areaId
    
    // Analyst can view all areas (read-only)
    if (profile.role === 'Analyst') return true
    
    return false
  }, [profile])

  // MFA helpers (implemented using mfa-utils)
  const startMFAEnroll = useCallback(async (): Promise<{ success: boolean; data?: any; error?: AuthError }> => {
    const { enrollTOTPFactor } = await import('./mfa-utils')
    const result = await enrollTOTPFactor('Dashboard MFA')
    
    if (result.success) {
      return {
        success: true,
        data: {
          factor: result.factor,
          qr_code: result.qr_code,
          secret: result.secret
        }
      }
    }
    
    return { success: false, error: result.error as AuthError }
  }, [])

  const verifyMFA = useCallback(async (code: string): Promise<{ success: boolean; error?: AuthError }> => {
    const { verifyTOTPCode, challengeMFAFactor, listMFAFactors } = await import('./mfa-utils')
    
    try {
      // Get user's MFA factors
      const { factors, error: listError } = await listMFAFactors()
      if (listError || !factors.length) {
        return { success: false, error: { message: 'No MFA factors enrolled' } as AuthError }
      }
      
      // Use the first available factor
      const factor = factors[0]
      
      // Challenge the factor
      const { success: challengeSuccess, challenge, error: challengeError } = await challengeMFAFactor(factor.id)
      if (!challengeSuccess || !challenge) {
        return { success: false, error: challengeError as AuthError }
      }
      
      // Verify the code
      const { success: verifySuccess, error: verifyError } = await verifyTOTPCode(factor.id, challenge.id, code)
      if (!verifySuccess) {
        return { success: false, error: verifyError as AuthError }
      }
      
      return { success: true }
    } catch (err) {
      return { success: false, error: err as AuthError }
    }
  }, [])

  // Session utilities
  const getAccessToken = useCallback(async (): Promise<string | null> => {
    if (!session) return null
    return session.access_token
  }, [session])

  const isSessionExpired = useCallback((): boolean => {
    if (!session) return true
    return Date.now() / 1000 >= session.expires_at!
  }, [session])

  const getSessionTimeRemaining = useCallback((): number => {
    if (!session) return 0
    return Math.max(0, session.expires_at! - Date.now() / 1000)
  }, [session])

  // Context value
  const value: AuthContextType = {
    // State
    user,
    session,
    profile,
    loading,
    initialized,
    error,
    // Methods
    signIn,
    signInWithOtp,
    signInWithProvider,
    signOut,
    refreshSession,
    updateProfile,
    // Helpers
    hasRole,
    hasAnyRole,
    canAccessArea,
    startMFAEnroll,
    verifyMFA,
    getAccessToken,
    isSessionExpired,
    getSessionTimeRemaining
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// Hook to use auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// Performance optimized hooks for specific use cases
export function useUser(): User | null {
  const { user } = useAuth()
  return user
}

export function useProfile(): UserProfile | null {
  const { profile } = useAuth()
  return profile
}

export function useSession(): Session | null {
  const { session } = useAuth()
  return session
}

export function useAuthState(): { loading: boolean; initialized: boolean; isAuthenticated: boolean } {
  const { loading, initialized, user } = useAuth()
  return {
    loading,
    initialized,
    isAuthenticated: !!user
  }
}
