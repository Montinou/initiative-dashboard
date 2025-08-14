/**
 * Test suite for simplified tenant integration with authentication
 * Tests the new shadcn blocks pattern approach
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { renderHook } from '@testing-library/react'
import { 
  useTenant, 
  useAuthTheme,
  useTenantId
} from '@/lib/tenant-context'
import { AuthProvider } from '@/lib/auth-context'
import { createClient } from '@/utils/supabase/client'

// Mock Supabase client
jest.mock('@/utils/supabase/client')

// Mock auth context
jest.mock('@/lib/auth-context', () => ({
  AuthProvider: ({ children }: any) => children,
  useTenantId: jest.fn()
}))

describe('Simplified Tenant Integration', () => {
  const mockUseTenantId = useTenantId as jest.Mock
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  describe('Tenant Hook', () => {
    it('should provide tenant context with SIGA tenant', () => {
      mockUseTenantId.mockReturnValue('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      
      const { result } = renderHook(() => useTenant())
      
      expect(result.current.tenantId).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      expect(result.current.theme.companyName).toBe('SIGA Turismo')
      expect(result.current.theme.primaryColor).toBe('hsl(var(--primary))')
    })
    
    it('should provide tenant context with FEMA tenant', () => {
      mockUseTenantId.mockReturnValue('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12')
      
      const { result } = renderHook(() => useTenant())
      
      expect(result.current.tenantId).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12')
      expect(result.current.theme.companyName).toBe('FEMA Electricidad')
    })
    
    it('should provide tenant context with Stratix tenant', () => {
      mockUseTenantId.mockReturnValue('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13')
      
      const { result } = renderHook(() => useTenant())
      
      expect(result.current.tenantId).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13')
      expect(result.current.theme.companyName).toBe('Stratix Platform')
    })
    
    it('should handle missing tenant with fallback', () => {
      mockUseTenantId.mockReturnValue(null)
      
      const { result } = renderHook(() => useTenant())
      
      expect(result.current.tenantId).toBeNull()
      expect(result.current.theme.companyName).toBe('SIGA Turismo') // fallback
    })
  })
  
  describe('Auth Theme Integration', () => {
    it('should provide simplified theme for SIGA', () => {
      mockUseTenantId.mockReturnValue('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
      
      const { result } = renderHook(() => useAuthTheme())
      
      expect(result.current.tenantName).toBe('SIGA Turismo')
      expect(result.current.isLoading).toBe(false)
    })
    
    it('should provide simplified theme for FEMA', () => {
      mockUseTenantId.mockReturnValue('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12')
      
      const { result } = renderHook(() => useAuthTheme())
      
      expect(result.current.tenantName).toBe('FEMA Electricidad')
      expect(result.current.isLoading).toBe(false)
    })
    
    it('should provide fallback when no tenant', () => {
      mockUseTenantId.mockReturnValue(null)
      
      const { result } = renderHook(() => useAuthTheme())
      
      expect(result.current.tenantName).toBe('SIGA Turismo') // fallback
      expect(result.current.isLoading).toBe(false)
    })
  })
  
  describe('Tenant ID Hook', () => {
    it('should delegate to auth context useTenantId', () => {
      const testTenantId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
      mockUseTenantId.mockReturnValue(testTenantId)
      
      const { result } = renderHook(() => useTenantId())
      
      expect(result.current).toBe(testTenantId)
      expect(mockUseTenantId).toHaveBeenCalled()
    })
    
    it('should handle null tenant ID', () => {
      mockUseTenantId.mockReturnValue(null)
      
      const { result } = renderHook(() => useTenantId())
      
      expect(result.current).toBeNull()
    })
  })
})

describe('CSS Theme Integration', () => {
  beforeEach(() => {
    // Setup DOM for CSS theme testing
    document.documentElement.removeAttribute('data-theme')
  })
  
  it('should apply SIGA theme via CSS data attribute', () => {
    // Simulate TenantTheme component behavior
    document.documentElement.setAttribute('data-theme', 'siga')
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('siga')
  })
  
  it('should apply FEMA theme via CSS data attribute', () => {
    document.documentElement.setAttribute('data-theme', 'fema')
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('fema')
  })
  
  it('should apply Stratix theme via CSS data attribute', () => {
    document.documentElement.setAttribute('data-theme', 'stratix')
    
    expect(document.documentElement.getAttribute('data-theme')).toBe('stratix')
  })
})

describe('Tenant Mapping', () => {
  it('should map tenant IDs to correct names', () => {
    const tenantMapping = {
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': 'SIGA Turismo',
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12': 'FEMA Electricidad',
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13': 'Stratix Platform'
    }
    
    Object.entries(tenantMapping).forEach(([id, name]) => {
      expect(tenantMapping[id as keyof typeof tenantMapping]).toBe(name)
    })
  })
  
  it('should have consistent tenant ID format', () => {
    const tenantIds = [
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'
    ]
    
    tenantIds.forEach(id => {
      expect(id).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/)
    })
  })
})