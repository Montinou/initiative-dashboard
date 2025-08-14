"use client"

import React, { createContext, useContext, useEffect, useState } from 'react'
import { detectTenant, type TenantTheme } from '@/lib/theme-config-simple'

type SimpleTenantTheme = 'default' | 'siga-turismo' | 'fema-electricidad' | 'stratix-platform'

interface ThemeContextValue {
  theme: SimpleTenantTheme
  setTheme: (theme: SimpleTenantTheme) => void
  isDark: boolean
  toggleDarkMode: () => void
  glassmorphism: boolean
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

export function ThemeProvider({ 
  children,
  defaultTheme = 'default'
}: { 
  children: React.ReactNode
  defaultTheme?: SimpleTenantTheme
}) {
  const [theme, setThemeState] = useState<SimpleTenantTheme>(defaultTheme)
  const [isDark, setIsDark] = useState(false)
  const [glassmorphism, setGlassmorphism] = useState(false)

  // Auto-detect theme on mount
  useEffect(() => {
    const hostname = window.location.hostname
    let detectedTheme: SimpleTenantTheme = 'default'
    
    if (hostname.includes('siga')) detectedTheme = 'siga-turismo'
    else if (hostname.includes('fema')) detectedTheme = 'fema-electricidad'
    else if (hostname.includes('stratix')) detectedTheme = 'stratix-platform'
    
    setThemeState(detectedTheme)
    
    // Check for dark mode preference
    const isDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches
    setIsDark(isDarkMode || ['siga-turismo', 'fema-electricidad', 'stratix-platform'].includes(detectedTheme))
    
    // Enable glassmorphism for tenant themes
    setGlassmorphism(['siga-turismo', 'fema-electricidad', 'stratix-platform'].includes(detectedTheme))
  }, [])

  // Apply theme changes to document
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme)
    }
  }, [theme])

  // Apply dark mode changes
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDark])

  const setTheme = (newTheme: SimpleTenantTheme) => {
    setThemeState(newTheme)
    
    // Update dark mode and glassmorphism based on theme
    const tenantThemes = ['siga-turismo', 'fema-electricidad', 'stratix-platform']
    setIsDark(tenantThemes.includes(newTheme))
    setGlassmorphism(tenantThemes.includes(newTheme))
  }

  const toggleDarkMode = () => {
    setIsDark(prev => !prev)
  }

  return (
    <ThemeContext.Provider 
      value={{ 
        theme, 
        setTheme, 
        isDark, 
        toggleDarkMode,
        glassmorphism
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}