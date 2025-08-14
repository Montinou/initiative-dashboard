'use client'

import { useTenantId as useAuthTenantId } from '@/lib/auth-context'

// Simple tenant name mapping - no complex data fetching
const TENANT_NAMES = {
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': 'SIGA Turismo',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12': 'FEMA Electricidad', 
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13': 'Stratix Platform'
} as const;

// Simple theme interface for backwards compatibility
interface CompanyTheme {
  companyName: string
  primaryColor: string
  secondaryColor: string
}

interface TenantContextType {
  tenantId: string | null
  theme: CompanyTheme
}

/**
 * Simplified tenant hook that provides backwards compatibility
 * Uses the new shadcn blocks pattern internally
 */
export function useTenant(): TenantContextType {
  const tenantId = useAuthTenantId()
  const tenantName = tenantId ? TENANT_NAMES[tenantId as keyof typeof TENANT_NAMES] : 'SIGA Turismo'
  
  // Simple theme object for backwards compatibility
  const theme: CompanyTheme = {
    companyName: tenantName,
    primaryColor: 'hsl(var(--primary))', // Use CSS variables
    secondaryColor: 'hsl(var(--secondary))'
  }

  return {
    tenantId,
    theme
  }
}

// Helper hook to get just the theme
export function useTenantTheme(): CompanyTheme {
  const { theme } = useTenant()
  return theme
}

// Helper hook to get just the tenant ID - delegates to auth context
export function useTenantId(): string | null {
  return useAuthTenantId()
}

// Deprecated TenantProvider - no longer needed but kept for backwards compatibility
export function TenantProvider({ children }: { children: React.ReactNode }) {
  // No longer provides context - children will use hooks directly
  return <>{children}</>
}