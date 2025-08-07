'use client'

import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useTenant } from '@/hooks/useTenant'
import { getThemeForTenant, getThemeFromDomain, type TenantTheme } from '@/lib/theme-config'

interface AuthThemeContext {
  theme: TenantTheme
  isLoading: boolean
  tenantName: string
  applyTheme: () => void
  resetTheme: () => void
}

/**
 * Hook that combines authentication state with theme management
 * Automatically applies the correct theme based on user's tenant
 */
export function useAuthTheme(): AuthThemeContext {
  const { isAuthenticated, tenantId, loading: authLoading } = useAuth()
  const { tenant, isLoading: tenantLoading } = useTenant()
  const [appliedTheme, setAppliedTheme] = useState<TenantTheme | null>(null)
  
  // Determine the appropriate theme
  const theme = useMemo(() => {
    if (isAuthenticated && tenantId) {
      // User is authenticated, use their tenant's theme
      return tenant.theme
    } else if (typeof window !== 'undefined') {
      // Not authenticated, use domain-based theme for login page
      const hostname = window.location.hostname
      const domainTheme = getThemeFromDomain(hostname)
      return {
        name: domainTheme.companyName,
        primary: domainTheme.colors.primary,
        secondary: domainTheme.colors.secondary,
        accent: domainTheme.colors.accent,
        background: domainTheme.colors.background,
        gradientFrom: domainTheme.colors.gradientFrom,
        gradientTo: domainTheme.colors.gradientTo,
        gradientVia: domainTheme.colors.gradientVia
      }
    } else {
      // Server-side or fallback
      return getThemeForTenant('default')
    }
  }, [isAuthenticated, tenantId, tenant])
  
  // Apply theme to DOM
  const applyTheme = () => {
    if (typeof window === 'undefined') return
    
    console.log('🎨 useAuthTheme: Applying theme:', theme.name)
    
    // Apply CSS custom properties
    const root = document.documentElement
    root.style.setProperty('--theme-primary', theme.primary)
    root.style.setProperty('--theme-secondary', theme.secondary)
    root.style.setProperty('--theme-accent', theme.accent)
    root.style.setProperty('--theme-background', theme.background)
    
    // Add theme class to body
    document.body.className = document.body.className
      .replace(/theme-\w+/g, '') // Remove any existing theme classes
      .concat(` theme-${theme.name.toLowerCase().replace(/\s+/g, '-')}`)
    
    setAppliedTheme(theme)
  }
  
  // Reset theme to default
  const resetTheme = () => {
    if (typeof window === 'undefined') return
    
    console.log('🔄 useAuthTheme: Resetting theme to default')
    
    const defaultTheme = getThemeForTenant('default')
    
    // Apply default CSS custom properties
    const root = document.documentElement
    root.style.setProperty('--theme-primary', defaultTheme.primary)
    root.style.setProperty('--theme-secondary', defaultTheme.secondary)
    root.style.setProperty('--theme-accent', defaultTheme.accent)
    root.style.setProperty('--theme-background', defaultTheme.background)
    
    // Remove theme classes
    document.body.className = document.body.className.replace(/theme-\w+/g, '')
    
    setAppliedTheme(null)
  }
  
  // Auto-apply theme when it changes
  useEffect(() => {
    if (!authLoading && !tenantLoading) {
      applyTheme()
    }
    
    // Cleanup on unmount
    return () => {
      // Keep theme applied, don't reset on unmount
    }
  }, [theme, authLoading, tenantLoading])
  
  // Log theme changes in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && appliedTheme) {
      console.log('🎨 useAuthTheme: Theme applied:', {
        name: appliedTheme.name,
        primary: appliedTheme.primary,
        isAuthenticated,
        tenantId
      })
    }
  }, [appliedTheme, isAuthenticated, tenantId])
  
  return {
    theme,
    isLoading: authLoading || tenantLoading,
    tenantName: tenant.name,
    applyTheme,
    resetTheme
  }
}

/**
 * Hook for dynamically applying theme styles to components
 */
export function useThemeStyles() {
  const { theme } = useAuthTheme()
  
  // Generate dynamic style object
  const styles = useMemo(() => ({
    primary: {
      backgroundColor: theme.primary,
      color: '#FFFFFF'
    },
    secondary: {
      backgroundColor: theme.secondary,
      color: theme.name === 'FEMA Electricidad' || theme.name === 'SIGA Turismo' ? '#212529' : '#FFFFFF'
    },
    accent: {
      backgroundColor: theme.accent,
      color: '#212529'
    },
    gradient: {
      background: `linear-gradient(135deg, ${theme.primary}22, ${theme.secondary}22, ${theme.accent}22)`
    },
    glass: {
      background: 'rgba(255, 255, 255, 0.05)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    },
    glassDarker: {
      background: 'rgba(0, 0, 0, 0.2)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      border: '1px solid rgba(255, 255, 255, 0.1)'
    }
  }), [theme])
  
  // Generate dynamic className helpers
  const classNames = useMemo(() => ({
    primary: 'theme-button-primary',
    secondary: 'theme-button-secondary',
    tertiary: 'theme-button-tertiary',
    textPrimary: 'theme-text-primary',
    textSecondary: 'theme-text-secondary',
    bgPrimary: 'theme-bg-primary',
    borderPrimary: 'theme-border-primary',
    glass: 'theme-glass',
    glassDarker: 'theme-glass-darker',
    gradient: 'theme-gradient'
  }), [])
  
  return {
    styles,
    classNames,
    theme
  }
}

/**
 * Hook for checking if the current theme matches a specific tenant
 */
export function useIsTheme(tenantName: string): boolean {
  const { theme } = useAuthTheme()
  return theme.name.toLowerCase() === tenantName.toLowerCase()
}

/**
 * Hook for getting theme-aware logo configuration
 */
export function useThemeLogo() {
  const { theme, tenantName } = useAuthTheme()
  
  const logo = useMemo(() => {
    // Map theme to logo configuration
    const logoMap: Record<string, { text: string; icon?: string }> = {
      'SIGA Turismo': { text: 'SIGA', icon: 'map' },
      'FEMA Electricidad': { text: 'FEMA', icon: 'zap' },
      'Stratix Platform': { text: 'STRATIX', icon: 'building' },
      'default': { text: 'APP', icon: 'building-2' }
    }
    
    return logoMap[theme.name] || logoMap['default']
  }, [theme])
  
  return {
    ...logo,
    tenantName,
    primaryColor: theme.primary,
    secondaryColor: theme.secondary
  }
}