import { createClient } from '@/utils/supabase/client'
import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

// Key bases
const SESSION_STORAGE_KEY = 'sb:min-session'
const SESSION_TS_KEY = 'sb:min-session:ts'
const PROFILE_KEY_BASE = 'sb:profile'
const PROFILE_TS_BASE = 'sb:profile:ts'
const CACHE_TTL = 5 * 60 * 1000 // 5 min

const debug = (...args: any[]) => {
  if (process.env.NEXT_PUBLIC_DEBUG_AUTH === 'true') {
    // eslint-disable-next-line no-console
    console.log(...args)
  }
}

const profileKey = (userId: string) => `${PROFILE_KEY_BASE}:${userId}`
const profileTsKey = (userId: string) => `${PROFILE_TS_BASE}:${userId}`

export class SessionPersistence {
  // Minimal (non‑sensitive) session save
  static saveSession(session: Session | null) {
    if (typeof window === 'undefined') return
    try {
      if (session?.user) {
        const payload = {
          expires_at: session.expires_at,
          user: {
            id: session.user.id,
            email: session.user.email,
            user_metadata: session.user.user_metadata || {}
          }
        }
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload))
        localStorage.setItem(SESSION_TS_KEY, Date.now().toString())
        debug('SessionPersistence: minimal session cached')
      } else {
        this.clearSession()
      }
    } catch (e) {
      console.error('SessionPersistence: saveSession error', e)
    }
  }

  static loadCachedSession(): Partial<Session> | null {
    if (typeof window === 'undefined') return null
    try {
      const raw = localStorage.getItem(SESSION_STORAGE_KEY)
      const ts = localStorage.getItem(SESSION_TS_KEY)
      if (!raw || !ts) return null
      if (Date.now() - parseInt(ts) > CACHE_TTL) {
        debug('SessionPersistence: session cache expired')
        this.clearSession()
        return null
      }
      const parsed = JSON.parse(raw)
      return parsed
    } catch (e) {
      console.error('SessionPersistence: loadCachedSession error', e)
      this.clearSession()
      return null
    }
  }

  // Profile caching
  static saveProfile(profile: any & { user_id?: string }) {
    if (typeof window === 'undefined' || !profile) return
    const uid = profile.user_id || profile.userId || profile.id
    if (!uid) return
    try {
      localStorage.setItem(profileKey(uid), JSON.stringify(profile))
      localStorage.setItem(profileTsKey(uid), Date.now().toString())
      debug('SessionPersistence: profile cached for', uid)
    } catch (e) {
      console.error('SessionPersistence: saveProfile error', e)
    }
  }

  static loadCachedProfile(userId: string | undefined | null) {
    if (typeof window === 'undefined' || !userId) return null
    try {
      const raw = localStorage.getItem(profileKey(userId))
      const ts = localStorage.getItem(profileTsKey(userId))
      if (!raw || !ts) return null
      if (Date.now() - parseInt(ts) > CACHE_TTL) {
        debug('SessionPersistence: profile cache expired', userId)
        localStorage.removeItem(profileKey(userId))
        localStorage.removeItem(profileTsKey(userId))
        return null
      }
      const parsed = JSON.parse(raw)
      if ((parsed.user_id || parsed.id) !== userId) {
        debug('SessionPersistence: profile user mismatch, clearing')
        localStorage.removeItem(profileKey(userId))
        localStorage.removeItem(profileTsKey(userId))
        return null
      }
      return parsed
    } catch (e) {
      console.error('SessionPersistence: loadCachedProfile error', e)
      localStorage.removeItem(profileKey(userId))
      localStorage.removeItem(profileTsKey(userId))
      return null
    }
  }

  static clearSession() {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY)
      localStorage.removeItem(SESSION_TS_KEY)
    } catch (e) {
      console.error('SessionPersistence: clearSession error', e)
    }
  }

  static clearAll() {
    if (typeof window === 'undefined') return
    try {
      this.clearSession()
      Object.keys(localStorage).filter(k => k.startsWith(PROFILE_KEY_BASE) || k.startsWith(PROFILE_TS_BASE))
        .forEach(k => localStorage.removeItem(k))
      debug('SessionPersistence: all caches cleared')
    } catch (e) {
      console.error('SessionPersistence: clearAll error', e)
    }
  }

  static async validateCachedSession(): Promise<boolean> {
    const cached = this.loadCachedSession()
    if (!cached?.user?.id) return false
    try {
      const supabase = createClient()
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user || user.id !== cached.user.id) {
        this.clearAll()
        return false
      }
      return true
    } catch (e) {
      console.error('SessionPersistence: validateCachedSession error', e)
      this.clearAll()
      return false
    }
  }

  static setupCrossTabSync() {
    if (typeof window === 'undefined') return
    window.addEventListener('storage', (e) => {
      if (e.key === SESSION_STORAGE_KEY) {
        if (e.newValue) {
          debug('SessionPersistence: session changed in another tab')
          window.location.reload()
        } else {
          debug('SessionPersistence: session cleared in another tab')
          window.location.href = '/auth/login'
        }
      }
    })
  }

  static getRecoveryData(): { hasCache: boolean; isExpired: boolean; userId?: string } {
    const cached = this.loadCachedSession()
    if (!cached?.user?.id) return { hasCache: false, isExpired: true }
    const isExpired = cached.expires_at ? new Date(cached.expires_at * 1000) < new Date() : true
    return { hasCache: true, isExpired, userId: cached.user.id }
  }
}

export function useSessionPersistence() {
  const supabase = createClient()
  useEffect(() => {
    SessionPersistence.setupCrossTabSync()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      debug('useSessionPersistence auth event', event)
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') SessionPersistence.saveSession(session)
      if (event === 'SIGNED_OUT') SessionPersistence.clearAll()
    })
    return () => subscription.unsubscribe()
  }, [supabase])
  return {
    loadCachedSession: SessionPersistence.loadCachedSession,
    loadCachedProfile: SessionPersistence.loadCachedProfile,
    clearCache: SessionPersistence.clearAll,
    validateCache: SessionPersistence.validateCachedSession,
    getRecoveryData: SessionPersistence.getRecoveryData
  }
}

export function useOptimisticSession() {
  const [optimisticSession, setOptimisticSession] = useState<Partial<Session> | null>(null)
  const [isValidating, setIsValidating] = useState(true)
  useEffect(() => {
    const cached = SessionPersistence.loadCachedSession()
    if (cached) setOptimisticSession(cached)
    SessionPersistence.validateCachedSession().then(valid => {
      if (!valid) setOptimisticSession(null)
      setIsValidating(false)
    })
  }, [])
  return { optimisticSession, isValidating, hasOptimisticData: !!optimisticSession }
}

// Memory storage fallback (rare)
class MemoryStorage { private store = new Map<string, string>(); getItem(k:string){return this.store.get(k)||null} setItem(k:string,v:string){this.store.set(k,v)} removeItem(k:string){this.store.delete(k)} clear(){this.store.clear()} }
export const storage = typeof window !== 'undefined' && window.localStorage ? window.localStorage : new MemoryStorage()