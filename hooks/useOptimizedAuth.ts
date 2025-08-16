/**
 * Optimized Authentication Hook
 * 
 * Handles the 391ms timeout issue by:
 * 1. Using fast profile fetch after successful auth
 * 2. Warming up RLS function cache
 * 3. Providing better error handling and user feedback
 */

import { useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { initializeUserSession, FastProfile } from '@/lib/auth/fast-profile-fetch'

interface AuthState {
  loading: boolean
  error: string | null
  profile: FastProfile | null
  isAuthenticated: boolean
}

export function useOptimizedAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    loading: false,
    error: null,
    profile: null,
    isAuthenticated: false
  })

  const supabase = createClient()

  const signIn = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, loading: true, error: null }))

    try {
      console.log('🔐 Starting optimized sign in...')
      
      // Step 1: Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (authError) {
        throw new Error(`Authentication failed: ${authError.message}`)
      }

      if (!authData.user) {
        throw new Error('No user data returned')
      }

      console.log('✅ Authentication successful, initializing session...')

      // Step 2: Warm up the tenant cache to prevent RLS delays
      try {
        console.log('🔥 Warming up tenant cache...')
        await supabase.rpc('warm_tenant_cache')
        console.log('✅ Tenant cache warmed successfully')
      } catch (warmupError) {
        console.warn('⚠️  Cache warmup failed (non-critical):', warmupError)
        // Continue anyway - this is just an optimization
      }

      // Step 3: Initialize user session with fast profile fetch
      const sessionResult = await initializeUserSession()
      
      if (!sessionResult.success || !sessionResult.profile) {
        throw new Error(sessionResult.error || 'Failed to initialize user session')
      }

      console.log('✅ User session initialized successfully')
      
      setAuthState({
        loading: false,
        error: null,
        profile: sessionResult.profile,
        isAuthenticated: true
      })

      return {
        success: true,
        user: authData.user,
        profile: sessionResult.profile
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed'
      console.error('❌ Optimized sign in failed:', errorMessage)
      
      setAuthState({
        loading: false,
        error: errorMessage,
        profile: null,
        isAuthenticated: false
      })

      return {
        success: false,
        error: errorMessage
      }
    }
  }, [supabase])

  const signOut = useCallback(async () => {
    setAuthState(prev => ({ ...prev, loading: true }))

    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setAuthState({
        loading: false,
        error: null,
        profile: null,
        isAuthenticated: false
      })

      return { success: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed'
      setAuthState(prev => ({ ...prev, loading: false, error: errorMessage }))
      return { success: false, error: errorMessage }
    }
  }, [supabase])

  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }))
  }, [])

  const validateSession = useCallback(async () => {
    try {
      console.log('🔍 Validating session...')
      
      // Quick session validation using optimized RPC
      const { data: sessionData, error: sessionError } = await supabase.rpc('validate_user_session')
      
      if (sessionError || !sessionData) {
        console.log('❌ Session validation failed')
        setAuthState({
          loading: false,
          error: null,
          profile: null,
          isAuthenticated: false
        })
        return { valid: false }
      }

      console.log('✅ Session is valid')
      return { valid: true, data: sessionData }
      
    } catch (error) {
      console.error('❌ Session validation error:', error)
      setAuthState({
        loading: false,
        error: null,
        profile: null,
        isAuthenticated: false
      })
      return { valid: false }
    }
  }, [supabase])

  return {
    ...authState,
    signIn,
    signOut,
    clearError,
    validateSession
  }
}

export default useOptimizedAuth
