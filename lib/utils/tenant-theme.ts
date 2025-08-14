/**
 * Tenant Theme Utilities
 * Manages tenant theme application based on tenant ID
 */

import * as React from 'react'
import { getTenantFromId } from '@/lib/auth/tenant-detection'

/**
 * Map of tenant IDs to theme names
 */
const TENANT_THEME_MAP: Record<string, string> = {
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': 'siga',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12': 'fema',
  'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13': 'stratix'
}

/**
 * Apply tenant theme to the document
 * Sets the data-tenant attribute on the HTML element
 */
export function applyTenantTheme(tenantId?: string): void {
  if (typeof window === 'undefined') return

  // Use provided tenant ID or default
  const id = tenantId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  
  // Map tenant ID to theme name
  const themeName = TENANT_THEME_MAP[id] || 'default'
  
  // Apply theme to HTML element
  document.documentElement.setAttribute('data-tenant', themeName)
  
  // Store in localStorage for persistence
  localStorage.setItem('tenant-theme', themeName)
  
  // Dispatch custom event for components to react to theme change
  window.dispatchEvent(new CustomEvent('tenant-theme-change', { 
    detail: { tenant: themeName } 
  }))
}

/**
 * Get current tenant theme
 */
export function getCurrentTenantTheme(): string {
  if (typeof window === 'undefined') return 'default'
  
  return document.documentElement.getAttribute('data-tenant') || 'default'
}

/**
 * Initialize tenant theme on page load
 * Should be called as early as possible in the app lifecycle
 */
export function initializeTenantTheme(tenantId?: string): void {
  if (typeof window === 'undefined') return
  
  // Check for stored theme first (for faster load)
  const storedTheme = localStorage.getItem('tenant-theme')
  
  // Use provided tenant ID or default
  const id = tenantId || 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'
  const themeName = TENANT_THEME_MAP[id] || 'default'
  
  // Apply theme (prefer detected over stored for accuracy)
  if (themeName !== storedTheme) {
    applyTenantTheme(id)
  } else if (storedTheme) {
    document.documentElement.setAttribute('data-tenant', storedTheme)
  } else {
    applyTenantTheme(id)
  }
}

/**
 * React hook for tenant theme
 */
export function useTenantTheme() {
  const [theme, setTheme] = React.useState<string>('default')
  
  React.useEffect(() => {
    // Initialize theme
    setTheme(getCurrentTenantTheme())
    
    // Listen for theme changes
    const handleThemeChange = (event: CustomEvent) => {
      setTheme(event.detail.tenant)
    }
    
    window.addEventListener('tenant-theme-change', handleThemeChange as EventListener)
    
    return () => {
      window.removeEventListener('tenant-theme-change', handleThemeChange as EventListener)
    }
  }, [])
  
  return {
    theme,
    applyTheme: applyTenantTheme,
    isDefault: theme === 'default',
    isSiga: theme === 'siga',
    isFema: theme === 'fema',
    isStratix: theme === 'stratix'
  }
}

/**
 * Get theme colors for a specific tenant
 */
export function getTenantColors(tenant?: string) {
  const themeName = tenant || getCurrentTenantTheme()
  
  const themes = {
    default: {
      name: 'Default',
      primary: 'hsl(215, 25%, 27%)',
      secondary: 'hsl(220, 13%, 91%)',
      accent: 'hsl(168, 76%, 36%)',
      background: 'hsl(0, 0%, 99.6%)',
      foreground: 'hsl(222, 84%, 5%)'
    },
    siga: {
      name: 'SIGA Turismo',
      primary: 'hsl(211, 100%, 35%)',
      secondary: 'hsl(217, 20%, 85%)',
      accent: 'hsl(199, 89%, 48%)',
      background: 'hsl(210, 25%, 97%)',
      foreground: 'hsl(222, 47%, 16%)'
    },
    fema: {
      name: 'FEMA Electricidad',
      primary: 'hsl(142, 71%, 35%)',
      secondary: 'hsl(50, 98%, 64%)',
      accent: 'hsl(162, 63%, 46%)',
      background: 'hsl(143, 8%, 97%)',
      foreground: 'hsl(155, 20%, 15%)'
    },
    stratix: {
      name: 'Stratix Platform',
      primary: 'hsl(271, 91%, 65%)',
      secondary: 'hsl(333, 71%, 71%)',
      accent: 'hsl(280, 68%, 60%)',
      background: 'hsl(271, 20%, 96%)',
      foreground: 'hsl(271, 50%, 15%)'
    }
  }
  
  return themes[themeName as keyof typeof themes] || themes.default
}