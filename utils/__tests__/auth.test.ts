/**
 * Comprehensive test suite for authentication improvements
 * Tests all authentication flows and edge cases
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import { createClient } from '@/utils/supabase/client'
import { 
  validateServerSession, 
  validateClientSession, 
  isValidJWT, 
  isValidUUID,
  detectSessionAnomaly,
  verifyUserAccess,
  sanitizeInput,
  isValidEmail,
  validatePasswordStrength,
  isWeakPassword
} from '@/utils/auth-security'
import { 
  getAuthErrorMessage, 
  getErrorSeverity, 
  isRetryableError 
} from '@/utils/auth-errors'
// SessionManager and SessionPersistence removed - SDK handles session persistence automatically
import { rateLimiters } from '@/utils/rate-limiter'

// Mock Supabase client
jest.mock('@/utils/supabase/client')
jest.mock('@/utils/supabase/server')

describe('Authentication Security', () => {
  
  describe('Token Validation', () => {
    it('should validate correct JWT format', () => {
      const validJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c'
      expect(isValidJWT(validJWT)).toBe(true)
    })
    
    it('should reject invalid JWT format', () => {
      expect(isValidJWT('invalid.jwt')).toBe(false)
      expect(isValidJWT('eyJhbGci.eyJzdWI')).toBe(false)
      expect(isValidJWT('')).toBe(false)
      expect(isValidJWT(null as any)).toBe(false)
    })
    
    it('should validate correct UUID format', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000'
      expect(isValidUUID(validUUID)).toBe(true)
    })
    
    it('should reject invalid UUID format', () => {
      expect(isValidUUID('not-a-uuid')).toBe(false)
      expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false)
      expect(isValidUUID('')).toBe(false)
    })
  })
  
  describe('Session Validation', () => {
    let mockSupabase: any
    
    beforeEach(() => {
      mockSupabase = {
        auth: {
          getUser: jest.fn(),
          getSession: jest.fn()
        },
        from: jest.fn()
      }
      ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
    })
    
    it('should validate client session successfully', async () => {
      const mockUser = { id: '550e8400-e29b-41d4-a716-446655440000', email: 'test@example.com' }
      const mockSession = { 
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: mockUser 
      }
      
      mockSupabase.auth.getSession.mockResolvedValue({ 
        data: { session: mockSession }, 
        error: null 
      })
      mockSupabase.auth.getUser.mockResolvedValue({ 
        data: { user: mockUser }, 
        error: null 
      })
      
      const result = await validateClientSession()
      
      expect(result.isValid).toBe(true)
      expect(result.user).toEqual(mockUser)
      expect(result.error).toBeNull()
    })
    
    it('should reject expired session', async () => {
      const mockSession = { 
        expires_at: Math.floor(Date.now() / 1000) - 3600, // Expired
        user: { id: 'test-id' }
      }
      
      mockSupabase.auth.getSession.mockResolvedValue({ 
        data: { session: mockSession }, 
        error: null 
      })
      
      const result = await validateClientSession()
      
      expect(result.isValid).toBe(false)
      expect(result.error).toBe('Session expired')
    })
  })
  
  describe('Input Sanitization', () => {
    it('should sanitize malicious input', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script')
      expect(sanitizeInput('javascript:alert(1)')).toBe('alert(1)')
      expect(sanitizeInput('onclick="alert(1)"')).toBe('"alert(1)"')
    })
    
    it('should preserve safe input', () => {
      expect(sanitizeInput('normal text')).toBe('normal text')
      expect(sanitizeInput('user@example.com')).toBe('user@example.com')
    })
  })
  
  describe('Email Validation', () => {
    it('should validate correct email formats', () => {
      expect(isValidEmail('user@example.com')).toBe(true)
      expect(isValidEmail('user.name@example.co.uk')).toBe(true)
      expect(isValidEmail('user+tag@example.com')).toBe(true)
    })
    
    it('should reject invalid email formats', () => {
      expect(isValidEmail('notanemail')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('user@')).toBe(false)
      expect(isValidEmail('user @example.com')).toBe(false)
    })
  })
  
  describe('Password Validation', () => {
    it('should validate password strength', () => {
      const strongPassword = validatePasswordStrength('SecurePass123!')
      expect(strongPassword.isValid).toBe(true)
      expect(strongPassword.errors).toHaveLength(0)
      
      const weakPassword = validatePasswordStrength('12345')
      expect(weakPassword.isValid).toBe(false)
      expect(weakPassword.errors).toContain('La contraseña debe tener al menos 6 caracteres')
    })
    
    it('should detect weak passwords', () => {
      expect(isWeakPassword('password')).toBe(true)
      expect(isWeakPassword('123456')).toBe(true)
      expect(isWeakPassword('qwerty')).toBe(true)
      expect(isWeakPassword('SecureRandomPass123!')).toBe(false)
    })
  })
})

describe('Error Handling', () => {
  
  describe('Error Message Mapping', () => {
    it('should map Supabase error codes to Spanish messages', () => {
      const error = {
        code: 'invalid_credentials',
        message: 'Invalid login credentials'
      }
      
      const message = getAuthErrorMessage(error)
      expect(message).toBe('Email o contraseña incorrectos. Por favor, verifica tus credenciales.')
    })
    
    it('should handle unknown errors gracefully', () => {
      const message = getAuthErrorMessage(null)
      expect(message).toBe('Error desconocido. Por favor, intenta de nuevo más tarde.')
    })
    
    it('should detect network errors', () => {
      const error = { code: 'NETWORK_ERROR' }
      const message = getAuthErrorMessage(error)
      expect(message).toBe('Error de conexión. Por favor, verifica tu conexión a internet.')
    })
  })
  
  describe('Error Severity', () => {
    it('should classify error severity correctly', () => {
      expect(getErrorSeverity({ code: 'user_banned' })).toBe('critical')
      expect(getErrorSeverity({ code: 'invalid_credentials' })).toBe('error')
      expect(getErrorSeverity({ code: 'email_not_confirmed' })).toBe('warning')
      expect(getErrorSeverity(null)).toBe('info')
    })
  })
  
  describe('Retry Logic', () => {
    it('should identify retryable errors', () => {
      expect(isRetryableError({ code: 'NETWORK_ERROR' })).toBe(true)
      expect(isRetryableError({ message: 'timeout' })).toBe(true)
      expect(isRetryableError({ code: 'invalid_credentials' })).toBe(false)
      expect(isRetryableError({ code: 'user_banned' })).toBe(false)
    })
  })
})

// Session Management tests removed - Supabase SDK handles session persistence automatically
// The SDK manages localStorage with sb- keys and handles token refresh automatically
})

describe('Rate Limiting', () => {
  
  describe('Login Rate Limiting', () => {
    it('should allow attempts within limit', () => {
      const key = 'test-user-login'
      const limiter = rateLimiters.login
      
      // Reset any previous attempts
      limiter.reset(key)
      
      expect(limiter.isAllowed(key)).toBe(true)
      limiter.recordAttempt(key)
      
      expect(limiter.getRemainingAttempts(key)).toBe(4)
      expect(limiter.isAllowed(key)).toBe(true)
    })
    
    it('should block after exceeding limit', () => {
      const key = 'test-user-block'
      const limiter = rateLimiters.login
      
      // Reset and max out attempts
      limiter.reset(key)
      
      for (let i = 0; i < 5; i++) {
        limiter.recordAttempt(key)
      }
      
      expect(limiter.isAllowed(key)).toBe(false)
      expect(limiter.getRemainingAttempts(key)).toBe(0)
      expect(limiter.getBlockedTime(key)).toBeGreaterThan(0)
    })
  })
  
  describe('API Rate Limiting', () => {
    it('should handle high volume API limits', () => {
      const key = 'api-endpoint'
      const limiter = rateLimiters.api
      
      limiter.reset(key)
      
      // Should allow 100 requests
      for (let i = 0; i < 100; i++) {
        expect(limiter.isAllowed(key)).toBe(true)
        limiter.recordAttempt(key)
      }
      
      // 101st request should be blocked
      expect(limiter.isAllowed(key)).toBe(false)
    })
  })
})

describe('Tenant Integration', () => {
  let mockSupabase: any
  
  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })
  
  describe('User Access Verification', () => {
    it('should verify user with correct role and active status', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          role: 'Manager',
          is_active: true,
          tenant_id: 'tenant-123'
        },
        error: null
      })
      
      const result = await verifyUserAccess('user-123', ['Manager', 'Admin'])
      
      expect(result.hasAccess).toBe(true)
      expect(result.error).toBeUndefined()
    })
    
    it('should deny inactive users', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          role: 'Manager',
          is_active: false,
          tenant_id: 'tenant-123'
        },
        error: null
      })
      
      const result = await verifyUserAccess('user-123', ['Manager'])
      
      expect(result.hasAccess).toBe(false)
      expect(result.error).toBe('User account is inactive')
    })
    
    it('should deny users without required role', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          role: 'Analyst',
          is_active: true,
          tenant_id: 'tenant-123'
        },
        error: null
      })
      
      const result = await verifyUserAccess('user-123', ['Manager', 'Admin'])
      
      expect(result.hasAccess).toBe(false)
      expect(result.error).toBe('Insufficient permissions')
    })
  })
  
  describe('Session Anomaly Detection', () => {
    it('should detect suspicious email patterns', async () => {
      const user = {
        id: 'test-id',
        email: 'hack@test.com',
        user_metadata: {}
      }
      
      const result = await detectSessionAnomaly(user as any)
      
      expect(result.isAnomaly).toBe(true)
      expect(result.reason).toContain('Suspicious email pattern')
    })
    
    it('should allow normal email patterns', async () => {
      const user = {
        id: 'test-id',
        email: 'user@company.com',
        user_metadata: {}
      }
      
      const result = await detectSessionAnomaly(user as any)
      
      expect(result.isAnomaly).toBe(false)
    })
  })
})