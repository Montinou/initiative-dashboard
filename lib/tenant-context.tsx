'use client'

import { createContext, useContext, ReactNode } from 'react'
import { CompanyTheme, getThemeFromTenantUUID, getThemeFromDomain } from './theme-config'

interface TenantContextType {
  tenantId: string | null
  theme: CompanyTheme
}

const TenantContext = createContext<TenantContextType | undefined>(undefined)

interface TenantProviderProps {
  children: ReactNode
  initialTenantId?: string | null
}

export function TenantProvider({ children, initialTenantId }: TenantProviderProps) {
  // Get theme based on tenant ID or domain
  const theme = initialTenantId 
    ? getThemeFromTenantUUID(initialTenantId)
    : getThemeFromDomain(typeof window !== 'undefined' ? window.location.hostname : 'localhost')

  const value = {
    tenantId: initialTenantId || null,
    theme
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

// Helper hook to get just the theme
export function useTenantTheme() {
  const { theme } = useTenant()
  return theme
}

// Helper hook to get just the tenant ID
export function useTenantId() {
  const { tenantId } = useTenant()
  return tenantId
}
