'use client'

import React, { useEffect, ReactNode } from 'react'
import { usePathname } from 'next/navigation'

interface SigaThemeProviderProps {
  children: ReactNode
  forceTheme?: boolean
}

/**
 * Provider que activa automáticamente el tema SIGA basado en el tenant o la ruta
 */
export function SigaThemeProvider({ children, forceTheme = false }: SigaThemeProviderProps) {
  const pathname = usePathname()
  
  useEffect(() => {
    // Determinar si debemos activar el tema SIGA
    const shouldActivateSiga = () => {
      // Forzar tema si está habilitado
      if (forceTheme) return true
      
      // Verificar si estamos en rutas de SIGA
      if (pathname?.includes('/siga')) return true
      
      // Verificar si el tenant es SIGA (podrías obtener esto del contexto de usuario)
      const tenant = localStorage.getItem('tenant')
      if (tenant === 'siga_turismo') return true
      
      // Verificar si hay un parámetro de URL
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.get('theme') === 'siga') return true
      
      return false
    }
    
    if (shouldActivateSiga()) {
      document.documentElement.setAttribute('data-theme', 'siga')
      document.body.setAttribute('data-theme', 'siga')
    } else {
      // Remover el tema si no corresponde
      document.documentElement.removeAttribute('data-theme')
      document.body.removeAttribute('data-theme')
    }
    
    return () => {
      // Cleanup opcional
      if (!forceTheme) {
        document.documentElement.removeAttribute('data-theme')
        document.body.removeAttribute('data-theme')
      }
    }
  }, [pathname, forceTheme])
  
  return <>{children}</>
}

/**
 * Hook para verificar si el tema SIGA está activo
 */
export function useIsSigaTheme(): boolean {
  const [isSiga, setIsSiga] = React.useState(false)
  
  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme')
      setIsSiga(theme === 'siga')
    }
    
    checkTheme()
    
    // Observar cambios en el atributo
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    })
    
    return () => observer.disconnect()
  }, [])
  
  return isSiga
}