import { createClient } from '@/utils/supabase/client'
import type { Session, User } from '@supabase/supabase-js'

// Session refresh intervals
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000 // Check every 5 minutes
const SESSION_WARNING_THRESHOLD = 10 * 60 * 1000 // Warn 10 minutes before expiry
const SESSION_REFRESH_THRESHOLD = 15 * 60 * 1000 // Refresh 15 minutes before expiry

export interface SessionStatus {
  isValid: boolean
  isExpiring: boolean
  expiresAt: Date | null
  timeUntilExpiry: number | null
  user: User | null
}

/**
 * Session Manager for handling Supabase auth sessions
 * Provides automatic refresh, expiry warnings, and session monitoring
 */
export class SessionManager {
  private static instance: SessionManager | null = null
  private checkInterval: NodeJS.Timeout | null = null
  private refreshPromise: Promise<Session | null> | null = null
  private listeners: Map<string, (status: SessionStatus) => void> = new Map()
  private supabase = createClient()
  
  private constructor() {
    this.startMonitoring()
  }
  
  /**
   * Get singleton instance of SessionManager
   */
  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }
  
  /**
   * Start monitoring session status
   */
  private startMonitoring() {
    // Initial check
    this.checkSession()
    
    // Set up periodic checks
    this.checkInterval = setInterval(() => {
      this.checkSession()
    }, SESSION_CHECK_INTERVAL)
    
    // Listen for auth state changes
    this.supabase.auth.onAuthStateChange((event, session) => {
      console.log(`📊 SessionManager: Auth state changed - ${event}`)
      this.notifyListeners(this.getSessionStatus(session))
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('🔄 SessionManager: Token refreshed successfully')
      }
    })
  }
  
  /**
   * Stop monitoring session
   */
  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }
  
  /**
   * Check current session status and refresh if needed
   */
  async checkSession(): Promise<SessionStatus> {
    try {
      const { data: { session }, error } = await this.supabase.auth.getSession()
      
      if (error) {
        console.error('❌ SessionManager: Error getting session:', error)
        return this.getSessionStatus(null)
      }
      
      const status = this.getSessionStatus(session)
      
      // Auto-refresh if expiring soon
      if (status.isValid && status.timeUntilExpiry && 
          status.timeUntilExpiry <= SESSION_REFRESH_THRESHOLD) {
        console.log('⏰ SessionManager: Session expiring soon, refreshing...')
        await this.refreshSession()
      }
      
      // Notify listeners
      this.notifyListeners(status)
      
      return status
    } catch (error) {
      console.error('❌ SessionManager: Error checking session:', error)
      return this.getSessionStatus(null)
    }
  }
  
  /**
   * Get session status from session object
   */
  private getSessionStatus(session: Session | null): SessionStatus {
    if (!session) {
      return {
        isValid: false,
        isExpiring: false,
        expiresAt: null,
        timeUntilExpiry: null,
        user: null
      }
    }
    
    const expiresAt = session.expires_at ? new Date(session.expires_at * 1000) : null
    const now = new Date()
    const timeUntilExpiry = expiresAt ? expiresAt.getTime() - now.getTime() : null
    
    return {
      isValid: true,
      isExpiring: timeUntilExpiry ? timeUntilExpiry <= SESSION_WARNING_THRESHOLD : false,
      expiresAt,
      timeUntilExpiry,
      user: session.user
    }
  }
  
  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<Session | null> {
    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      console.log('🔄 SessionManager: Refresh already in progress, waiting...')
      return this.refreshPromise
    }
    
    this.refreshPromise = this.performRefresh()
    
    try {
      const session = await this.refreshPromise
      return session
    } finally {
      this.refreshPromise = null
    }
  }
  
  /**
   * Perform the actual refresh
   */
  private async performRefresh(): Promise<Session | null> {
    try {
      console.log('🔄 SessionManager: Refreshing session...')
      
      const { data: { session }, error } = await this.supabase.auth.refreshSession()
      
      if (error) {
        console.error('❌ SessionManager: Error refreshing session:', error)
        return null
      }
      
      if (session) {
        console.log('✅ SessionManager: Session refreshed successfully')
        const status = this.getSessionStatus(session)
        this.notifyListeners(status)
      }
      
      return session
    } catch (error) {
      console.error('❌ SessionManager: Exception refreshing session:', error)
      return null
    }
  }
  
  /**
   * Add a listener for session status changes
   */
  addListener(id: string, callback: (status: SessionStatus) => void) {
    this.listeners.set(id, callback)
  }
  
  /**
   * Remove a listener
   */
  removeListener(id: string) {
    this.listeners.delete(id)
  }
  
  /**
   * Notify all listeners of status change
   */
  private notifyListeners(status: SessionStatus) {
    this.listeners.forEach(callback => {
      try {
        callback(status)
      } catch (error) {
        console.error('❌ SessionManager: Error in listener callback:', error)
      }
    })
  }
  
  /**
   * Get current session without checking/refreshing
   */
  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await this.supabase.auth.getSession()
    return session
  }
  
  /**
   * Verify session is valid (calls getUser which validates with server)
   */
  async verifySession(): Promise<boolean> {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser()
      return !error && !!user
    } catch {
      return false
    }
  }
  
  /**
   * Set session (useful for SSR hydration)
   */
  async setSession(accessToken: string, refreshToken: string): Promise<Session | null> {
    try {
      const { data: { session }, error } = await this.supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      })
      
      if (error) {
        console.error('❌ SessionManager: Error setting session:', error)
        return null
      }
      
      return session
    } catch (error) {
      console.error('❌ SessionManager: Exception setting session:', error)
      return null
    }
  }
  
  /**
   * Clear session (logout)
   */
  async clearSession(): Promise<void> {
    try {
      await this.supabase.auth.signOut()
      this.notifyListeners(this.getSessionStatus(null))
    } catch (error) {
      console.error('❌ SessionManager: Error clearing session:', error)
    }
  }
}

/**
 * React hook for using SessionManager
 */
export function useSessionManager() {
  const manager = SessionManager.getInstance()
  
  return {
    checkSession: () => manager.checkSession(),
    refreshSession: () => manager.refreshSession(),
    getCurrentSession: () => manager.getCurrentSession(),
    verifySession: () => manager.verifySession(),
    clearSession: () => manager.clearSession()
  }
}

/**
 * Helper to format time until expiry
 */
export function formatTimeUntilExpiry(milliseconds: number | null): string {
  if (!milliseconds || milliseconds <= 0) {
    return 'Expired'
  }
  
  const minutes = Math.floor(milliseconds / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}`
  }
  if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}`
  }
  return `${minutes} minute${minutes > 1 ? 's' : ''}`
}

/**
 * Helper to check if session needs refresh
 */
export function shouldRefreshSession(session: Session | null): boolean {
  if (!session || !session.expires_at) return false
  
  const expiresAt = new Date(session.expires_at * 1000)
  const now = new Date()
  const timeUntilExpiry = expiresAt.getTime() - now.getTime()
  
  return timeUntilExpiry <= SESSION_REFRESH_THRESHOLD
}

// Export singleton instance for direct use
export const sessionManager = SessionManager.getInstance()