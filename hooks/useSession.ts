'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Session } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/client'

export interface SessionInfo {
  session: Session | null
  isValid: boolean
  expiresAt: Date | null
  expiresIn: number | null // seconds until expiration
  needsRefresh: boolean
}

export interface SessionMethods {
  refreshSession: () => Promise<void>
  validateSession: () => Promise<boolean>
  clearSession: () => Promise<void>
  getAccessToken: () => string | null
  getRefreshToken: () => string | null
}

/**
 * Hook for managing user session with automatic refresh
 */
export function useSession(): SessionInfo & SessionMethods {
  const supabase = createClient()
  
  const [session, setSession] = useState<Session | null>(null)
  const [isValid, setIsValid] = useState(false)
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [expiresIn, setExpiresIn] = useState<number | null>(null)
  const [needsRefresh, setNeedsRefresh] = useState(false)
  
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Calculate session expiration
  const calculateExpiration = useCallback((currentSession: Session | null) => {
    if (!currentSession?.expires_at) {
      setExpiresAt(null)
      setExpiresIn(null)
      setNeedsRefresh(false)
      return
    }
    
    const expirationTime = new Date(currentSession.expires_at * 1000)
    setExpiresAt(expirationTime)
    
    const now = new Date()
    const secondsUntilExpiry = Math.floor((expirationTime.getTime() - now.getTime()) / 1000)
    setExpiresIn(secondsUntilExpiry)
    
    // Consider refresh needed if less than 5 minutes until expiry
    setNeedsRefresh(secondsUntilExpiry < 300)
    
    return secondsUntilExpiry
  }, [])
  
  // Set up automatic refresh
  const setupAutoRefresh = useCallback((currentSession: Session | null) => {
    // Clear existing timeout
    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }
    
    if (!currentSession?.expires_at) return
    
    const secondsUntilExpiry = calculateExpiration(currentSession)
    if (!secondsUntilExpiry || secondsUntilExpiry <= 0) return
    
    // Refresh 60 seconds before expiry
    const refreshIn = Math.max(0, (secondsUntilExpiry - 60) * 1000)
    
    if (refreshIn > 0) {
      refreshTimeoutRef.current = setTimeout(async () => {
        console.log('Auto-refreshing session...')
        try {
          const { data: { session: newSession }, error } = await supabase.auth.refreshSession()
          
          if (!error && newSession) {
            setSession(newSession)
            setIsValid(true)
            calculateExpiration(newSession)
            setupAutoRefresh(newSession)
          }
        } catch (err) {
          console.error('Auto-refresh failed:', err)
        }
      }, refreshIn)
    }
  }, [supabase, calculateExpiration])
  
  // Initialize session
  useEffect(() => {
    let mounted = true
    
    const initSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession()
        
        if (error) throw error
        
        if (mounted) {
          setSession(initialSession)
          setIsValid(!!initialSession)
          
          if (initialSession) {
            calculateExpiration(initialSession)
            setupAutoRefresh(initialSession)
          }
        }
      } catch (err) {
        console.error('Failed to initialize session:', err)
        if (mounted) {
          setSession(null)
          setIsValid(false)
        }
      }
    }
    
    initSession()
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        if (mounted) {
          setSession(currentSession)
          setIsValid(!!currentSession)
          
          if (currentSession) {
            calculateExpiration(currentSession)
            setupAutoRefresh(currentSession)
          } else {
            setExpiresAt(null)
            setExpiresIn(null)
            setNeedsRefresh(false)
          }
          
          // Log session events
          console.log('Session event:', event)
        }
      }
    )
    
    // Set up interval to update expiresIn
    checkIntervalRef.current = setInterval(() => {
      if (session?.expires_at) {
        const now = new Date()
        const expirationTime = new Date(session.expires_at * 1000)
        const secondsUntilExpiry = Math.floor((expirationTime.getTime() - now.getTime()) / 1000)
        
        setExpiresIn(secondsUntilExpiry)
        setNeedsRefresh(secondsUntilExpiry < 300)
      }
    }, 10000) // Update every 10 seconds
    
    return () => {
      mounted = false
      subscription.unsubscribe()
      
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
      
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [])
  
  // Manually refresh session
  const refreshSession = useCallback(async () => {
    try {
      const { data: { session: newSession }, error } = await supabase.auth.refreshSession()
      
      if (error) throw error
      
      setSession(newSession)
      setIsValid(!!newSession)
      
      if (newSession) {
        calculateExpiration(newSession)
        setupAutoRefresh(newSession)
      }
      
      console.log('Session refreshed successfully')
    } catch (err) {
      console.error('Failed to refresh session:', err)
      throw err
    }
  }, [supabase, calculateExpiration, setupAutoRefresh])
  
  // Validate current session
  const validateSession = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        setIsValid(false)
        return false
      }
      
      setIsValid(true)
      return true
    } catch (err) {
      console.error('Failed to validate session:', err)
      setIsValid(false)
      return false
    }
  }, [supabase])
  
  // Clear session (sign out)
  const clearSession = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      
      if (error) throw error
      
      setSession(null)
      setIsValid(false)
      setExpiresAt(null)
      setExpiresIn(null)
      setNeedsRefresh(false)
      
      // Clear refresh timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }
      
      console.log('Session cleared')
    } catch (err) {
      console.error('Failed to clear session:', err)
      throw err
    }
  }, [supabase])
  
  // Get access token
  const getAccessToken = useCallback((): string | null => {
    return session?.access_token ?? null
  }, [session])
  
  // Get refresh token
  const getRefreshToken = useCallback((): string | null => {
    return session?.refresh_token ?? null
  }, [session])
  
  return {
    session,
    isValid,
    expiresAt,
    expiresIn,
    needsRefresh,
    refreshSession,
    validateSession,
    clearSession,
    getAccessToken,
    getRefreshToken
  }
}