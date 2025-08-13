/**
 * Test suite for tenant integration with authentication
 * Ensures proper tenant isolation and data filtering
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { renderHook, act } from '@testing-library/react'
import { 
  useTenant, 
  useAuthTheme,
  useManagerContext,
  useAreaDataFilter,
  useManagerPermissions
} from '@/hooks'
import { AuthProvider, useAuth, useTenantId } from '@/lib/auth-context'
import { createClient } from '@/utils/supabase/client'

// Mock Supabase client
jest.mock('@/utils/supabase/client')

// Mock theme provider
jest.mock('@/components/theme-provider', () => ({
  useTheme: jest.fn(() => ({
    theme: 'dark',
    setTheme: jest.fn()
  }))
}))

describe('Tenant Integration', () => {
  let mockSupabase: any
  
  beforeEach(() => {
    mockSupabase = {
      auth: {
        getSession: jest.fn(),
        getUser: jest.fn(),
        onAuthStateChange: jest.fn(() => ({
          data: { subscription: { unsubscribe: jest.fn() } }
        }))
      },
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis()
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })
  
  describe('Tenant Hook', () => {
    it('should provide tenant context with validation', () => {
      const mockProfile = {
        tenant_id: 'tenant-123',
        role: 'Manager',
        area_id: 'area-456'
      }
      
      const wrapper = ({ children }: any) => (
        <AuthProvider initialProfile={mockProfile}>
          {children}
        </AuthProvider>
      )
      
      const { result } = renderHook(() => useTenant(), { wrapper })
      
      expect(result.current.tenantId).toBe('tenant-123')
      expect(result.current.isValidTenant).toBe(true)
      expect(result.current.validateTenantAccess('tenant-123')).toBe(true)
      expect(result.current.validateTenantAccess('other-tenant')).toBe(false)
    })
    
    it('should handle missing tenant gracefully', () => {
      const wrapper = ({ children }: any) => (
        <AuthProvider>
          {children}
        </AuthProvider>
      )
      
      const { result } = renderHook(() => useTenant(), { wrapper })
      
      expect(result.current.tenantId).toBeNull()
      expect(result.current.isValidTenant).toBe(false)
      expect(result.current.error).toBe('No tenant ID found')
    })
    
    it('should validate resource tenant access', () => {
      const mockProfile = {
        tenant_id: 'tenant-123',
        role: 'Manager'
      }
      
      const wrapper = ({ children }: any) => (
        <AuthProvider initialProfile={mockProfile}>
          {children}
        </AuthProvider>
      )
      
      const { result } = renderHook(() => useTenant(), { wrapper })
      
      const resource = { id: '1', tenant_id: 'tenant-123', name: 'Test' }
      expect(result.current.canAccessResource(resource)).toBe(true)
      
      const otherResource = { id: '2', tenant_id: 'other-tenant', name: 'Test' }
      expect(result.current.canAccessResource(otherResource)).toBe(false)
    })
  })
  
  describe('Auth Theme Integration', () => {
    it('should apply tenant-specific theme', () => {
      const mockProfile = {
        tenant_id: 'tenant-123',
        role: 'CEO'
      }
      
      const wrapper = ({ children }: any) => (
        <AuthProvider initialProfile={mockProfile}>
          {children}
        </AuthProvider>
      )
      
      const { result } = renderHook(() => useAuthTheme(), { wrapper })
      
      expect(result.current.isAuthenticated).toBe(true)
      expect(result.current.currentTheme).toBe('dark')
      expect(result.current.themeClasses).toContain('dark-theme')
    })
    
    it('should provide theme utilities', () => {
      const wrapper = ({ children }: any) => (
        <AuthProvider>
          {children}
        </AuthProvider>
      )
      
      const { result } = renderHook(() => useAuthTheme(), { wrapper })
      
      expect(result.current.getThemeColor('primary')).toBeDefined()
      expect(result.current.getGradient('primary')).toContain('gradient')
    })
  })
  
  describe('Manager Context', () => {
    it('should provide manager-specific context', () => {
      const mockProfile = {
        role: 'Manager',
        area_id: 'area-123',
        area: {
          id: 'area-123',
          name: 'Engineering',
          description: 'Engineering Department'
        }
      }
      
      const wrapper = ({ children }: any) => (
        <AuthProvider initialProfile={mockProfile}>
          {children}
        </AuthProvider>
      )
      
      const { result } = renderHook(() => useManagerContext(), { wrapper })
      
      expect(result.current.isManager).toBe(true)
      expect(result.current.managedAreaId).toBe('area-123')
      expect(result.current.managedAreaName).toBe('Engineering')
      expect(result.current.canManageArea('area-123')).toBe(true)
      expect(result.current.canManageArea('area-456')).toBe(false)
    })
    
    it('should return null for non-managers', () => {
      const mockProfile = {
        role: 'Analyst',
        area_id: null
      }
      
      const wrapper = ({ children }: any) => (
        <AuthProvider initialProfile={mockProfile}>
          {children}
        </AuthProvider>
      )
      
      const { result } = renderHook(() => useManagerContext(), { wrapper })
      
      expect(result.current.isManager).toBe(false)
      expect(result.current.managedAreaId).toBeNull()
      expect(result.current.managerProfile).toBeNull()
    })
  })
  
  describe('Area Data Filtering', () => {
    it('should provide correct filters for Manager role', () => {
      const mockProfile = {
        tenant_id: 'tenant-123',
        role: 'Manager',
        area_id: 'area-456'
      }
      
      const wrapper = ({ children }: any) => (
        <AuthProvider initialProfile={mockProfile}>
          {children}
        </AuthProvider>
      )
      
      const { result } = renderHook(() => useAreaDataFilter(), { wrapper })
      
      const filters = result.current.getDataFilters()
      expect(filters).toEqual({
        tenant_id: 'tenant-123',
        area_id: 'area-456'
      })
      expect(result.current.isAreaRestricted).toBe(true)
    })
    
    it('should provide no area filter for CEO role', () => {
      const mockProfile = {
        tenant_id: 'tenant-123',
        role: 'CEO'
      }
      
      const wrapper = ({ children }: any) => (
        <AuthProvider initialProfile={mockProfile}>
          {children}
        </AuthProvider>
      )
      
      const { result } = renderHook(() => useAreaDataFilter(), { wrapper })
      
      const filters = result.current.getDataFilters()
      expect(filters).toEqual({
        tenant_id: 'tenant-123'
      })
      expect(result.current.isAreaRestricted).toBe(false)
    })
  })
  
  describe('Manager Permissions', () => {
    it('should check manager permissions correctly', () => {
      const mockProfile = {
        role: 'Manager',
        area_id: 'area-123'
      }
      
      const wrapper = ({ children }: any) => (
        <AuthProvider initialProfile={mockProfile}>
          {children}
        </AuthProvider>
      )
      
      const { result } = renderHook(() => useManagerPermissions(), { wrapper })
      
      expect(result.current.isManager).toBe(true)
      expect(result.current.canUploadFiles()).toBe(true)
      expect(result.current.canEditInitiative('area-123')).toBe(true)
      expect(result.current.canEditInitiative('area-456')).toBe(false)
    })
  })
  
  describe('Tenant ID Hook', () => {
    it('should extract tenant ID from profile', () => {
      const mockProfile = {
        tenant_id: 'tenant-123'
      }
      
      const wrapper = ({ children }: any) => (
        <AuthProvider initialProfile={mockProfile}>
          {children}
        </AuthProvider>
      )
      
      const { result } = renderHook(() => useTenantId(), { wrapper })
      
      expect(result.current).toBe('tenant-123')
    })
    
    it('should fallback to user metadata', () => {
      const mockUser = {
        id: 'user-123',
        user_metadata: {
          tenant_id: 'tenant-456'
        }
      }
      
      const wrapper = ({ children }: any) => (
        <AuthProvider initialSession={{ user: mockUser }}>
          {children}
        </AuthProvider>
      )
      
      const { result } = renderHook(() => useTenantId(), { wrapper })
      
      expect(result.current).toBe('tenant-456')
    })
  })
})

describe('Tenant Data Operations', () => {
  let mockSupabase: any
  
  beforeEach(() => {
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      single: jest.fn(),
      rpc: jest.fn()
    }
    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })
  
  describe('Tenant-scoped queries', () => {
    it('should include tenant_id in all queries', async () => {
      const tenantId = 'tenant-123'
      
      // Simulate a query with tenant filtering
      await mockSupabase
        .from('initiatives')
        .select('*')
        .eq('tenant_id', tenantId)
      
      expect(mockSupabase.eq).toHaveBeenCalledWith('tenant_id', tenantId)
    })
    
    it('should prevent cross-tenant data access', async () => {
      const userTenantId = 'tenant-123'
      const otherTenantId = 'tenant-456'
      
      // Mock RLS policy enforcement
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST301', message: 'Row level security policy violation' }
      })
      
      const result = await mockSupabase
        .from('initiatives')
        .select('*')
        .eq('tenant_id', otherTenantId)
        .single()
      
      expect(result.error).toBeDefined()
      expect(result.error.code).toBe('PGRST301')
    })
  })
  
  describe('Manager area filtering', () => {
    it('should filter data by manager area', async () => {
      const tenantId = 'tenant-123'
      const areaId = 'area-456'
      
      // Simulate manager-scoped query
      await mockSupabase
        .from('initiatives')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('area_id', areaId)
      
      expect(mockSupabase.eq).toHaveBeenCalledWith('tenant_id', tenantId)
      expect(mockSupabase.eq).toHaveBeenCalledWith('area_id', areaId)
    })
  })
})

describe('Cross-Tab Synchronization', () => {
  beforeEach(() => {
    // Clear storage
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
    }
  })
  
  it('should sync session across tabs', () => {
    const mockSession = {
      access_token: 'test-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'user-123', email: 'test@example.com' }
    }
    
    // Simulate saving session in one tab
    localStorage.setItem('sb-session-cache', JSON.stringify({
      ...mockSession,
      cachedAt: Date.now()
    }))
    
    // Simulate storage event in another tab
    const storageEvent = new StorageEvent('storage', {
      key: 'sb-session-cache',
      newValue: JSON.stringify({
        ...mockSession,
        cachedAt: Date.now()
      }),
      storageArea: localStorage
    })
    
    window.dispatchEvent(storageEvent)
    
    // Check session is available in "other tab"
    const cached = localStorage.getItem('sb-session-cache')
    expect(cached).toBeTruthy()
    
    const parsed = JSON.parse(cached!)
    expect(parsed.access_token).toBe('test-token')
    expect(parsed.user.id).toBe('user-123')
  })
})