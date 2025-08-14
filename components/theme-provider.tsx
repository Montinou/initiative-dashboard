'use client'

import * as React from 'react'
import {
  ThemeProvider as NextThemesProvider,
  type ThemeProviderProps,
} from 'next-themes'
import { initializeTenantTheme } from '@/lib/utils/tenant-theme'

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
    
    // Add theme-transition class to root after mount
    const root = document.documentElement
    root.classList.add('theme-transition')
    
    // Initialize tenant theme detection
    initializeTenantTheme()
    
    // Enable light/dark mode theme persistence
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
      root.classList.add(savedTheme)
    }
  }, [])

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="theme-transition">
        {children}
      </div>
    )
  }

  return (
    <NextThemesProvider
      {...props}
      enableSystem
      defaultTheme="system"
      storageKey="theme"
      attribute="class"
    >
      {children}
    </NextThemesProvider>
  )
}
