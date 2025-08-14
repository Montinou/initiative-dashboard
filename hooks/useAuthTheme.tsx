'use client'

import { useMemo } from 'react'
import { useTenantId } from '@/lib/auth-context'

// Simple tenant name mapping - no complex data fetching
const TENANT_NAMES = {
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': 'SIGA Turismo',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12': 'FEMA Electricidad', 
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13': 'Stratix Platform'
};

/**
 * Simplified hook that returns tenant name using shadcn pattern
 * No complex theme management - CSS handles all styling via data-theme attributes
 */
export function useAuthTheme() {
  const tenantId = useTenantId()
  
  const tenantName = useMemo(() => {
    return tenantId ? TENANT_NAMES[tenantId as keyof typeof TENANT_NAMES] : 'SIGA Turismo'
  }, [tenantId])
  
  return {
    tenantName,
    isLoading: false
  }
}

/**
 * Hook for getting theme-aware logo configuration
 */
export function useThemeLogo() {
  const { tenantName } = useAuthTheme()
  
  const logo = useMemo(() => {
    // Map theme to logo configuration
    const logoMap: Record<string, { text: string; icon?: string }> = {
      'SIGA Turismo': { text: 'SIGA', icon: 'map' },
      'FEMA Electricidad': { text: 'FEMA', icon: 'zap' },
      'Stratix Platform': { text: 'STRATIX', icon: 'building' },
      'default': { text: 'APP', icon: 'building-2' }
    }
    
    return logoMap[tenantName] || logoMap['default']
  }, [tenantName])
  
  return {
    ...logo,
    tenantName
  }
}

/**
 * Hook for checking if the current theme matches a specific tenant
 */
export function useIsTheme(tenantNameToCheck: string): boolean {
  const { tenantName } = useAuthTheme()
  return tenantName.toLowerCase() === tenantNameToCheck.toLowerCase()
}