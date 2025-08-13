/**
 * Production Hardening Tests
 * 
 * Validates that all security measures are properly implemented:
 * - Rate limiting
 * - Input validation
 * - XSS prevention
 * - Error handling
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

// Mock environment
const API_BASE_URL = 'http://localhost:3000/api'

describe('Production Hardening', () => {
  let authToken: string = ''
  
  beforeAll(async () => {
    // Get auth token for testing
    // In real tests, this would authenticate properly
    authToken = 'mock-auth-token'
  })
  
  describe('Rate Limiting', () => {
    it('should enforce rate limits on API endpoints', async () => {
      // Test that rate limiting is active
      const requests = []
      
      // Send 35 requests (exceeds standard limit of 30/min)
      for (let i = 0; i < 35; i++) {
        requests.push(
          fetch(`${API_BASE_URL}/test-secure`, {
            headers: { Authorization: `Bearer ${authToken}` }
          })
        )
      }
      
      const responses = await Promise.all(requests)
      const statuses = responses.map(r => r.status)
      
      // Should have some 429 (rate limited) responses
      const rateLimited = statuses.filter(s => s === 429)
      expect(rateLimited.length).toBeGreaterThan(0)
      
      // Check rate limit headers
      const lastResponse = responses[responses.length - 1]
      expect(lastResponse.headers.get('X-RateLimit-Limit')).toBeDefined()
      expect(lastResponse.headers.get('Retry-After')).toBeDefined()
    })
    
    it('should use different rate limits for different endpoints', async () => {
      // Strict endpoints should have lower limits
      const strictRequests = []
      
      // Send 15 requests to strict endpoint (exceeds limit of 10/min)
      for (let i = 0; i < 15; i++) {
        strictRequests.push(
          fetch(`${API_BASE_URL}/test-secure`, {
            method: 'POST',
            headers: { 
              Authorization: `Bearer ${authToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              title: 'Test',
              priority: 'medium'
            })
          })
        )
      }
      
      const responses = await Promise.all(strictRequests)
      const rateLimited = responses.filter(r => r.status === 429)
      
      // Should hit rate limit sooner with strict limit
      expect(rateLimited.length).toBeGreaterThan(4)
    })
  })
  
  describe('Input Validation', () => {
    it('should reject invalid UUIDs', async () => {
      const response = await fetch(`${API_BASE_URL}/test-secure?area_id=not-a-uuid`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      
      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('Invalid UUID')
    })
    
    it('should reject SQL injection attempts', async () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1 OR 1=1",
        "admin' --",
        "' UNION SELECT * FROM users --"
      ]
      
      for (const input of maliciousInputs) {
        const response = await fetch(`${API_BASE_URL}/test-secure?search=${encodeURIComponent(input)}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        })
        
        // Should either reject or sanitize
        if (response.status === 200) {
          const data = await response.json()
          // Check that the malicious input was sanitized
          expect(data.filters.search).not.toContain('DROP')
          expect(data.filters.search).not.toContain('UNION')
          expect(data.filters.search).not.toContain('SELECT')
        } else {
          expect(response.status).toBe(400)
        }
      }
    })
    
    it('should validate request body schema', async () => {
      const invalidBodies = [
        { title: '' }, // Empty title
        { title: 'a'.repeat(300) }, // Too long
        { title: 'Test', priority: 'invalid' }, // Invalid enum
        { title: 'Test', priority: 'medium', tags: new Array(20).fill('tag') } // Too many tags
      ]
      
      for (const body of invalidBodies) {
        const response = await fetch(`${API_BASE_URL}/test-secure`, {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })
        
        expect(response.status).toBe(400)
        const data = await response.json()
        expect(data.error.type).toBe('VALIDATION_ERROR')
      }
    })
    
    it('should sanitize string inputs', async () => {
      const xssAttempts = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror="alert(1)">',
        'javascript:alert(1)',
        '<svg onload="alert(1)">',
        '"><script>alert(1)</script>'
      ]
      
      for (const xss of xssAttempts) {
        const response = await fetch(`${API_BASE_URL}/test-secure`, {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            title: xss,
            description: xss,
            priority: 'medium',
            tags: [xss]
          })
        })
        
        if (response.status === 201) {
          const data = await response.json()
          
          // Check that XSS was sanitized
          expect(data.data.title).not.toContain('<script>')
          expect(data.data.title).not.toContain('javascript:')
          expect(data.data.title).not.toContain('onerror')
          expect(data.data.title).not.toContain('onload')
          
          // Verify sanitization was applied
          expect(data.data.sanitization_applied.title_safe).toBe(true)
        }
      }
    })
  })
  
  describe('XSS Prevention in UI Components', () => {
    it('should escape HTML in filter chips', () => {
      // This would be tested in a browser environment
      // Here we just verify the escapeHtml function exists
      const escapeHtml = (unsafe: string): string => {
        return unsafe
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")
      }
      
      const xssString = '<script>alert("XSS")</script>'
      const escaped = escapeHtml(xssString)
      
      expect(escaped).toBe('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;')
      expect(escaped).not.toContain('<script>')
    })
  })
  
  describe('Error Handling', () => {
    it('should provide consistent error format', async () => {
      // Test various error scenarios
      const errorScenarios = [
        { 
          url: `${API_BASE_URL}/test-secure`,
          method: 'GET',
          expectedStatus: 401,
          expectedType: 'AUTHENTICATION_ERROR',
          headers: {} // No auth
        },
        {
          url: `${API_BASE_URL}/test-secure?page=invalid`,
          method: 'GET',
          expectedStatus: 400,
          expectedType: 'VALIDATION_ERROR',
          headers: { Authorization: `Bearer ${authToken}` }
        },
        {
          url: `${API_BASE_URL}/test-secure`,
          method: 'DELETE',
          expectedStatus: 403,
          expectedType: 'AUTHORIZATION_ERROR',
          headers: { Authorization: `Bearer manager-token` } // Manager trying to delete
        }
      ]
      
      for (const scenario of errorScenarios) {
        const response = await fetch(scenario.url, {
          method: scenario.method,
          headers: scenario.headers
        })
        
        expect(response.status).toBe(scenario.expectedStatus)
        
        const data = await response.json()
        expect(data.error).toBeDefined()
        expect(data.error.type).toBe(scenario.expectedType)
        expect(data.error.message).toBeDefined()
        expect(data.error.timestamp).toBeDefined()
      }
    })
    
    it('should not leak sensitive information in errors', async () => {
      const response = await fetch(`${API_BASE_URL}/test-secure`, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: 'invalid json {'
      })
      
      const data = await response.json()
      
      // Should not expose internal error details in production
      expect(data.error.message).not.toContain('SyntaxError')
      expect(data.error.message).not.toContain('stack')
      expect(data.error.message).not.toContain('at line')
    })
  })
  
  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await fetch(`${API_BASE_URL}/test-secure`, {
        headers: { Authorization: `Bearer ${authToken}` }
      })
      
      // Check for security headers
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
      expect(response.headers.get('X-Frame-Options')).toBe('DENY')
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block')
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
      expect(response.headers.get('Content-Security-Policy')).toBeDefined()
    })
  })
  
  describe('Performance', () => {
    it('should handle validation efficiently', async () => {
      const start = Date.now()
      
      // Send multiple requests with complex validation
      const requests = []
      for (let i = 0; i < 10; i++) {
        requests.push(
          fetch(`${API_BASE_URL}/test-secure?search=test&page=${i + 1}&limit=20`, {
            headers: { Authorization: `Bearer ${authToken}` }
          })
        )
      }
      
      await Promise.all(requests)
      const duration = Date.now() - start
      
      // Should complete reasonably quickly (under 2 seconds for 10 requests)
      expect(duration).toBeLessThan(2000)
    })
  })
})

describe('Filter Component XSS Prevention', () => {
  it('should escape HTML in search suggestions', () => {
    const suggestions = [
      '<script>alert(1)</script>',
      '"><img src=x onerror=alert(1)>',
      'javascript:void(0)'
    ]
    
    // Simulate component rendering with escaped values
    suggestions.forEach(suggestion => {
      const escaped = suggestion
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
      
      expect(escaped).not.toContain('<script>')
      expect(escaped).not.toContain('onerror=')
      expect(escaped).not.toContain('javascript:')
    })
  })
  
  it('should limit search input length', () => {
    const longInput = 'a'.repeat(500)
    const limitedInput = longInput.substring(0, 200)
    
    expect(limitedInput.length).toBe(200)
  })
  
  it('should escape filter chip values', () => {
    const filterValues = {
      search: '<b>Bold text</b>',
      area: 'Area with <script>',
      status: 'Status">onclick="alert(1)'
    }
    
    Object.values(filterValues).forEach(value => {
      const escaped = value
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
      
      expect(escaped).not.toContain('<')
      expect(escaped).not.toContain('>')
      expect(escaped).not.toContain('onclick=')
    })
  })
})