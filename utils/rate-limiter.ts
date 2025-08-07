/**
 * Client-side rate limiting implementation
 * Helps prevent abuse and protects against brute force attacks
 */

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
  blockDurationMs?: number
}

interface AttemptRecord {
  count: number
  firstAttempt: number
  blockedUntil?: number
}

class RateLimiter {
  private attempts: Map<string, AttemptRecord> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null
  
  constructor(private config: RateLimitConfig) {
    // Cleanup old records every minute
    if (typeof window !== 'undefined') {
      this.cleanupInterval = setInterval(() => this.cleanup(), 60000)
    }
  }
  
  /**
   * Check if an action is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now()
    const record = this.attempts.get(key)
    
    // No record, allow
    if (!record) {
      return true
    }
    
    // Check if blocked
    if (record.blockedUntil && record.blockedUntil > now) {
      return false
    }
    
    // Check if window has expired
    if (now - record.firstAttempt > this.config.windowMs) {
      // Reset the record
      this.attempts.delete(key)
      return true
    }
    
    // Check if under limit
    return record.count < this.config.maxAttempts
  }
  
  /**
   * Record an attempt
   */
  recordAttempt(key: string): void {
    const now = Date.now()
    const record = this.attempts.get(key)
    
    if (!record) {
      // First attempt
      this.attempts.set(key, {
        count: 1,
        firstAttempt: now
      })
    } else {
      // Check if window has expired
      if (now - record.firstAttempt > this.config.windowMs) {
        // Reset with new window
        this.attempts.set(key, {
          count: 1,
          firstAttempt: now
        })
      } else {
        // Increment count
        record.count++
        
        // Block if limit exceeded
        if (record.count >= this.config.maxAttempts && this.config.blockDurationMs) {
          record.blockedUntil = now + this.config.blockDurationMs
        }
      }
    }
  }
  
  /**
   * Get remaining attempts
   */
  getRemainingAttempts(key: string): number {
    const record = this.attempts.get(key)
    if (!record) return this.config.maxAttempts
    
    const now = Date.now()
    if (now - record.firstAttempt > this.config.windowMs) {
      return this.config.maxAttempts
    }
    
    return Math.max(0, this.config.maxAttempts - record.count)
  }
  
  /**
   * Get time until unblocked (in seconds)
   */
  getBlockedTime(key: string): number {
    const record = this.attempts.get(key)
    if (!record || !record.blockedUntil) return 0
    
    const now = Date.now()
    if (record.blockedUntil <= now) return 0
    
    return Math.ceil((record.blockedUntil - now) / 1000)
  }
  
  /**
   * Reset attempts for a key
   */
  reset(key: string): void {
    this.attempts.delete(key)
  }
  
  /**
   * Cleanup old records
   */
  private cleanup(): void {
    const now = Date.now()
    const expiredKeys: string[] = []
    
    this.attempts.forEach((record, key) => {
      // Remove records older than 2x the window
      if (now - record.firstAttempt > this.config.windowMs * 2) {
        expiredKeys.push(key)
      }
      // Remove unblocked records
      if (record.blockedUntil && record.blockedUntil < now) {
        expiredKeys.push(key)
      }
    })
    
    expiredKeys.forEach(key => this.attempts.delete(key))
  }
  
  /**
   * Destroy the rate limiter
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    this.attempts.clear()
  }
}

// Pre-configured rate limiters for different scenarios
export const rateLimiters = {
  // Login attempts: 5 attempts per 15 minutes, block for 30 minutes
  login: new RateLimiter({
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000 // 30 minutes
  }),
  
  // Password reset: 3 attempts per hour, block for 1 hour
  passwordReset: new RateLimiter({
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000 // 1 hour
  }),
  
  // Email verification: 5 attempts per hour
  emailVerification: new RateLimiter({
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000 // 1 hour
  }),
  
  // API calls: 100 requests per minute
  api: new RateLimiter({
    maxAttempts: 100,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000 // 5 minutes
  }),
  
  // Form submissions: 10 per minute
  formSubmission: new RateLimiter({
    maxAttempts: 10,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000 // 5 minutes
  })
}

/**
 * React hook for rate limiting
 */
import { useState, useCallback, useEffect } from 'react'

export function useRateLimit(
  limiterName: keyof typeof rateLimiters,
  key: string
) {
  const limiter = rateLimiters[limiterName]
  const [isBlocked, setIsBlocked] = useState(false)
  const [remainingAttempts, setRemainingAttempts] = useState(limiter.config.maxAttempts)
  const [blockedTime, setBlockedTime] = useState(0)
  
  // Check if blocked and update state
  const checkStatus = useCallback(() => {
    const allowed = limiter.isAllowed(key)
    const remaining = limiter.getRemainingAttempts(key)
    const blocked = limiter.getBlockedTime(key)
    
    setIsBlocked(!allowed)
    setRemainingAttempts(remaining)
    setBlockedTime(blocked)
    
    return allowed
  }, [limiter, key])
  
  // Record an attempt
  const recordAttempt = useCallback(() => {
    limiter.recordAttempt(key)
    checkStatus()
  }, [limiter, key, checkStatus])
  
  // Reset the rate limit
  const reset = useCallback(() => {
    limiter.reset(key)
    checkStatus()
  }, [limiter, key, checkStatus])
  
  // Update blocked time every second if blocked
  useEffect(() => {
    if (!isBlocked) return
    
    const interval = setInterval(() => {
      const blocked = limiter.getBlockedTime(key)
      setBlockedTime(blocked)
      
      if (blocked === 0) {
        checkStatus()
      }
    }, 1000)
    
    return () => clearInterval(interval)
  }, [isBlocked, limiter, key, checkStatus])
  
  // Initial status check
  useEffect(() => {
    checkStatus()
  }, [checkStatus])
  
  return {
    isBlocked,
    remainingAttempts,
    blockedTime,
    checkStatus,
    recordAttempt,
    reset,
    getBlockedMessage: () => {
      if (!isBlocked) return null
      
      if (blockedTime > 60) {
        const minutes = Math.ceil(blockedTime / 60)
        return `Demasiados intentos. Por favor, espera ${minutes} minuto${minutes > 1 ? 's' : ''}.`
      }
      
      return `Demasiados intentos. Por favor, espera ${blockedTime} segundo${blockedTime > 1 ? 's' : ''}.`
    }
  }
}

/**
 * Decorator for rate-limited functions
 */
export function withRateLimit<T extends (...args: any[]) => any>(
  fn: T,
  limiter: RateLimiter,
  keyGenerator: (...args: Parameters<T>) => string
): T {
  return ((...args: Parameters<T>) => {
    const key = keyGenerator(...args)
    
    if (!limiter.isAllowed(key)) {
      const blockedTime = limiter.getBlockedTime(key)
      const error = new Error(
        blockedTime > 0 
          ? `Rate limit exceeded. Try again in ${blockedTime} seconds.`
          : 'Rate limit exceeded. Please try again later.'
      )
      ;(error as any).code = 'RATE_LIMIT_EXCEEDED'
      ;(error as any).blockedTime = blockedTime
      throw error
    }
    
    limiter.recordAttempt(key)
    return fn(...args)
  }) as T
}

/**
 * Express/Next.js API route rate limiter middleware helper
 */
export function createApiRateLimiter(config?: Partial<RateLimitConfig>) {
  const limiter = new RateLimiter({
    maxAttempts: config?.maxAttempts || 100,
    windowMs: config?.windowMs || 60 * 1000,
    blockDurationMs: config?.blockDurationMs || 5 * 60 * 1000
  })
  
  return {
    check: (identifier: string): { allowed: boolean; remaining: number; resetIn: number } => {
      const allowed = limiter.isAllowed(identifier)
      const remaining = limiter.getRemainingAttempts(identifier)
      const blockedTime = limiter.getBlockedTime(identifier)
      
      if (allowed) {
        limiter.recordAttempt(identifier)
      }
      
      return {
        allowed,
        remaining: Math.max(0, remaining - 1),
        resetIn: blockedTime || Math.ceil(config?.windowMs || 60000 / 1000)
      }
    },
    reset: (identifier: string) => limiter.reset(identifier),
    destroy: () => limiter.destroy()
  }
}