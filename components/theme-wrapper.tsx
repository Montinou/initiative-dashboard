'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { getThemeFromDomain, getThemeFromTenantUUID } from '@/lib/theme-config'

interface ThemeWrapperProps {
  children: React.ReactNode
}

export function ThemeWrapper({ children }: ThemeWrapperProps) {
  const pathname = usePathname()

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
      } else if (theme.companyName === 'Stratix Platform') {
        themeKey = 'stratix-platform'
      } else {
        themeKey = 'default'
      }
      
      console.log('🌐 ThemeWrapper: Using domain-based theme for auth page:', themeKey)
    } else {
      // For app pages, ONLY fetch from localStorage
      let tenantIdFromStorage: string | null = null
      
      if (typeof window !== 'undefined') {
        try {
          const cached = localStorage.getItem('user_profile_v2')
          if (cached) {
            const parsed = JSON.parse(cached)
            tenantIdFromStorage = parsed.profile?.tenant_id
            console.log('🔍 ThemeWrapper: Got tenant_id from localStorage:', tenantIdFromStorage)
          }
        } catch (error) {
          console.warn('ThemeWrapper: Failed to parse cached profile:', error)
        }
      }
      
      if (tenantIdFromStorage) {
        const theme = getThemeFromTenantUUID(tenantIdFromStorage)
        
        // Map company names to theme keys
        if (theme.companyName === 'SIGA Turismo') {
          themeKey = 'siga-turismo'
        } else if (theme.companyName === 'FEMA Electricidad') {
          themeKey = 'fema-electricidad'
        } else if (theme.companyName === 'Stratix Platform') {
          themeKey = 'stratix-platform'
        } else {
          themeKey = 'default'
        }
        
        console.log('🎨 ThemeWrapper: Using localStorage tenant_id theme:', themeKey, 'tenant_id:', tenantIdFromStorage)
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
  }, [pathname])

  return <>{children}</>
}