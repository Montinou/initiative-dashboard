import { createClient } from '@/utils/supabase/client'
import type { Session } from '@supabase/supabase-js'

// Storage keys
const SESSION_STORAGE_KEY = 'sb-session-cache'
const SESSION_TIMESTAMP_KEY = 'sb-session-timestamp'
const SESSION_CACHE_DURATION = 5 * 60 * 1000 // 5 minutes cache

/**
 * Session persistence utilities for better UX during page loads
 */
export class SessionPersistence {
  /**
   * Save session to local storage for faster hydration
   */
  static saveSession(session: Session | null) {
    if (typeof window === 'undefined') return
    
    try {
      if (session) {
        // Save session data
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
          user: {
            id: session.user.id,
            email: session.user.email,
            user_metadata: session.user.user_metadata
          }
        }))
        
        // Save timestamp
        localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString())
        
        console.log('💾 SessionPersistence: Session saved to cache')
      } else {
        // Clear cache if no session
        this.clearSession()
      }
    } catch (error) {
      console.error('❌ SessionPersistence: Error saving session:', error)
    }
  }
  
  /**
   * Load cached session for faster initial render
   */
  static loadCachedSession(): Partial<Session> | null {
    if (typeof window === 'undefined') return null
    
    try {
      const cachedData = localStorage.getItem(SESSION_STORAGE_KEY)
      const timestamp = localStorage.getItem(SESSION_TIMESTAMP_KEY)
      
      if (!cachedData || !timestamp) return null
      
      // Check if cache is still valid
      const age = Date.now() - parseInt(timestamp)
      if (age > SESSION_CACHE_DURATION) {
        console.log('⏰ SessionPersistence: Cache expired, clearing')
        this.clearSession()
        return null
      }
      
      const session = JSON.parse(cachedData)
      console.log('✅ SessionPersistence: Loaded cached session')
      return session
    } catch (error) {
      console.error('❌ SessionPersistence: Error loading cached session:', error)
      this.clearSession()
      return null
    }
  }
  
  /**
   * Clear cached session
   */
  static clearSession() {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      localStorage.removeItem(SESSION_TIMESTAMP_KEY)
      console.log('🗑️ SessionPersistence: Cache cleared')
    } catch (error) {
      console.error('❌ SessionPersistence: Error clearing cache:', error)
    }
  }
  
  /**
   * Validate cached session is still valid
   */
  static async validateCachedSession(): Promise<boolean> {
    const cached = this.loadCachedSession()
    if (!cached) return false
    
    try {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        this.clearSession()
        return false
      }
      
      // Check if user ID matches
      if (user.id !== cached.user?.id) {
        this.clearSession()
        return false
      }
      
      return true
    } catch (error) {
      console.error('❌ SessionPersistence: Error validating cache:', error)
      this.clearSession()
      return false
    }
  }
  
  /**
   * Sync session between tabs
   */
  static setupCrossTabSync() {
    if (typeof window === 'undefined') return
    
    // Listen for storage events from other tabs
    window.addEventListener('storage', (e) => {
      if (e.key === SESSION_STORAGE_KEY) {
        if (e.newValue) {
          console.log('🔄 SessionPersistence: Session updated in another tab')
          // Reload the page to sync auth state
          window.location.reload()
        } else {
          console.log('🚪 SessionPersistence: Session cleared in another tab')
          // Redirect to login
          window.location.href = '/auth/login'
        }
      }
    })
  }
  
  /**
   * Get session recovery data for SSR
   */
  static getRecoveryData(): { 
    hasCache: boolean; 
    isExpired: boolean;
    userId?: string;
  } {
    const cached = this.loadCachedSession()
    
    if (!cached) {
      return { hasCache: false, isExpired: true }
    }
    
    const isExpired = cached.expires_at 
      ? new Date(cached.expires_at * 1000) < new Date()
      : true
    
    return {
      hasCache: true,
      isExpired,
      userId: cached.user?.id
    }
  }
}

/**
 * React hook for session persistence
 */
export function useSessionPersistence() {
  const supabase = createClient()
  
  // Set up persistence on auth state changes
  useEffect(() => {
    // Set up cross-tab sync
    SessionPersistence.setupCrossTabSync()
    
    // Listen for auth changes and persist
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log(`💾 useSessionPersistence: Auth event - ${event}`)
        
        // Save or clear session based on event
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          SessionPersistence.saveSession(session)
        } else if (event === 'SIGNED_OUT') {
          SessionPersistence.clearSession()
        }
      }
    )
    
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])
  
  return {
    loadCachedSession: SessionPersistence.loadCachedSession,
    clearCache: SessionPersistence.clearSession,
    validateCache: SessionPersistence.validateCachedSession,
    getRecoveryData: SessionPersistence.getRecoveryData
  }
}

/**
 * Hook for optimistic session loading
 */
export function useOptimisticSession() {
  const [optimisticSession, setOptimisticSession] = useState<Partial<Session> | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  
  useEffect(() => {
    // Load cached session immediately
    const cached = SessionPersistence.loadCachedSession()
    if (cached) {
      setOptimisticSession(cached)
    }
    
    // Validate in background
    SessionPersistence.validateCachedSession().then(isValid => {
      if (!isValid) {
        setOptimisticSession(null)
      }
      setIsValidating(false)
    })
  }, [])
  
  return {
    optimisticSession,
    isValidating,
    hasOptimisticData: !!optimisticSession
  }
}

/**
 * Storage fallback for environments without localStorage
 */
class MemoryStorage {
  private store: Map<string, string> = new Map()
  
  getItem(key: string): string | null {
    return this.store.get(key) || null
  }
  
  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
  
  removeItem(key: string): void {
    this.store.delete(key)
  }
  
  clear(): void {
    this.store.clear()
  }
}

// Create storage abstraction
export const storage = typeof window !== 'undefined' && window.localStorage
  ? window.localStorage
  : new MemoryStorage()

// Missing import
import { useEffect, useState } from 'react'