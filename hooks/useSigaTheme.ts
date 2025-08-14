import { useEffect, useState } from 'react'
import { useUser } from '@/hooks/useUser'

/**
 * Hook personalizado para gestionar el tema SIGA
 */
export function useSigaTheme() {
  const { user } = useUser()
  const [isActive, setIsActive] = useState(false)
  const [tenant, setTenant] = useState<string | null>(null)
  
  useEffect(() => {
    // Verificar el tenant del usuario
    if (user?.organization_id) {
      // Aquí podrías hacer una llamada a la API para obtener el tenant
      // Por ahora, verificamos el subdominio o el localStorage
      const subdomain = window.location.hostname.split('.')[0]
      const storedTenant = localStorage.getItem('tenant')
      
      if (subdomain === 'siga' || storedTenant === 'siga_turismo') {
        setTenant('siga_turismo')
        setIsActive(true)
        document.documentElement.setAttribute('data-theme', 'siga')
      }
    }
  }, [user])
  
  const activateTheme = () => {
    document.documentElement.setAttribute('data-theme', 'siga')
    document.body.setAttribute('data-theme', 'siga')
    localStorage.setItem('theme', 'siga')
    setIsActive(true)
  }
  
  const deactivateTheme = () => {
    document.documentElement.removeAttribute('data-theme')
    document.body.removeAttribute('data-theme')
    localStorage.removeItem('theme')
    setIsActive(false)
  }
  
  const toggleTheme = () => {
    if (isActive) {
      deactivateTheme()
    } else {
      activateTheme()
    }
  }
  
  return {
    isActive,
    tenant,
    activateTheme,
    deactivateTheme,
    toggleTheme,
    colors: {
      primary: '#00B74A',
      primaryDark: '#00D955',
      accent: '#FFC107',
      accentDark: '#FFCA28',
      secondary: '#F8F9FA',
      secondaryDark: '#1F1F1F',
    }
  }
}