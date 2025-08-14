'use client'

import * as React from 'react'

interface TenantThemeProps {
  tenantId?: string | null
}

// Map tenant IDs to theme names for data-theme attribute (matches CSS selectors)
const TENANT_THEME_MAPPING = {
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': 'siga',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12': 'fema', 
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13': 'stratix'
} as const

export function TenantTheme({ tenantId }: TenantThemeProps) {
  React.useEffect(() => {
    if (typeof window === 'undefined') return

    // Get theme name for data attribute - fallback to default
    const themeName = tenantId ? TENANT_THEME_MAPPING[tenantId as keyof typeof TENANT_THEME_MAPPING] : null
    
    // Apply data-theme attribute using shadcn blocks pattern
    if (themeName) {
      document.documentElement.setAttribute('data-theme', themeName)
    } else {
      // Set default theme if no tenant-specific theme
      document.documentElement.setAttribute('data-theme', 'siga')
    }

  }, [tenantId])

  return null
}