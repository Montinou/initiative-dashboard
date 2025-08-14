'use client'

import { useEffect, useState, useCallback } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  error: Error | null
}

export interface AuthMethods {
  signIn: (email: string, password: string) => Promise<void>
  signInWithOAuth: (provider: 'google' | 'github') => Promise<void>
  signInWithMagicLink: (email: string) => Promise<void>
  signUp: (email: string, password: string, metadata?: Record<string, any>) => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  refreshSession: () => Promise<void>
}

/**
 * Enhanced authentication hook with all auth methods
 */
export function useAuth(): AuthState & AuthMethods {
  const router = useRouter()
  const supabase = createClient()
  
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  
  // Initialize auth state
  useEffect(() => {
    let mounted = true
    
    const initAuth = async () => {
      try {
        // Get initial session
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) throw sessionError
        
        if (mounted) {
          setSession(initialSession)
          setUser(initialSession?.user ?? null)
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error)
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }
    
    initAuth()
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, currentSession: Session | null) => {
        if (mounted) {
          setSession(currentSession)
          setUser(currentSession?.user ?? null)
          
          // Handle specific auth events
          switch (event) {
            case 'SIGNED_IN':
              console.log('User signed in')
              break
            case 'SIGNED_OUT':
              console.log('User signed out')
              setUser(null)
              setSession(null)
              break
            case 'TOKEN_REFRESHED':
              console.log('Token refreshed')
              break
            case 'USER_UPDATED':
              console.log('User updated')
              break
          }
        }
      }
    )
    
    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])
  
  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase])
  
  // Sign in with OAuth provider
  const signInWithOAuth = useCallback(async (provider: 'google' | 'github') => {
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) throw error
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase])
  
  // Sign in with magic link
  const signInWithMagicLink = useCallback(async (email: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) throw error
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase])
  
  // Sign up new user
  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: Record<string, any>
  ) => {
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })
      
      if (error) throw error
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase])
  
  // Sign out
  const signOut = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) throw error
      
      // Clear local state
      setUser(null)
      setSession(null)
      
      // Redirect to login
      router.push('/auth/login')
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase, router])
  
  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`
      })
      
      if (error) throw error
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase])
  
  // Update password
  const updatePassword = useCallback(async (newPassword: string) => {
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })
      
      if (error) throw error
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase])
  
  // Refresh session
  const refreshSession = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession()
      
      if (error) throw error
      
      setSession(newSession)
      setUser(newSession?.user ?? null)
    } catch (err) {
      setError(err as Error)
      throw err
    } finally {
      setLoading(false)
    }
  }, [supabase])
  
  return {
    user,
    session,
    loading,
    error,
    signIn,
    signInWithOAuth,
    signInWithMagicLink,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshSession
  }
}