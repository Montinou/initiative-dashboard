'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getThemeFromDomain, getThemeFromTenant } from '@/lib/theme-config'
import { useTenantId } from '@/lib/auth-context'

interface ThemeWrapperProps {
  children: React.ReactNode
}

export function ThemeWrapper({ children }: ThemeWrapperProps) {
  const pathname = usePathname()
  const tenantId = useTenantId()

  useEffect(() => {
    // Determine if we're on an auth page or inside the app
    const isAuthPage = pathname?.startsWith('/auth/login') || pathname === '/auth/reset-password'
    
    let themeKey: string
    
    if (isAuthPage) {
      // For auth pages, use domain-based theming
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
      const theme = getThemeFromDomain(hostname)
      
      // Map company names to theme keys
      if (theme.companyName === 'SIGA Turismo') {
        themeKey = 'siga-turismo'
      } else if (theme.companyName === 'FEMA Electricidad') {
        themeKey = 'fema-electricidad'
      } else {
        themeKey = 'default'
      }
      
      console.log('🌐 ThemeWrapper: Using domain-based theme for auth page:', themeKey)
    } else {
      // For app pages, use tenant-based theming
      if (tenantId) {
        const theme = getThemeFromTenant(tenantId)
        
        // Map company names to theme keys
        if (theme.companyName === 'SIGA Turismo') {
          themeKey = 'siga-turismo'
        } else if (theme.companyName === 'FEMA Electricidad') {
          themeKey = 'fema-electricidad'
        } else {
          themeKey = 'default'
        }
        
        console.log('🎨 ThemeWrapper: Using tenant-based theme for app page:', themeKey, 'tenantId:', tenantId)
      } else {
        // Fallback to domain-based if no tenant ID
        const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
        const theme = getThemeFromDomain(hostname)
        themeKey = theme.companyName === 'SIGA Turismo' ? 'siga-turismo' : 
                   theme.companyName === 'FEMA Electricidad' ? 'fema-electricidad' :
                   theme.companyName === 'Stratix Platform' ? 'stratix-platform' :
                   'default'
        
        console.log('🌐 ThemeWrapper: Fallback to domain-based theme:', themeKey)
      }
    }

    // Apply theme to document body
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-theme', themeKey)
      console.log('✅ ThemeWrapper: Applied theme attribute:', themeKey)
    }
  }, [pathname, tenantId])

  return <>{children}</>
}