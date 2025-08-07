'use client'

import { useEffect, useState, useCallback } from 'react'
import { sessionManager, type SessionStatus, formatTimeUntilExpiry } from '@/utils/session-manager'
import { useRouter } from 'next/navigation'
import { toast } from '@/hooks/use-toast'
import { Clock, AlertCircle, RefreshCw } from 'lucide-react'

interface SessionMonitorState {
  status: SessionStatus | null
  isRefreshing: boolean
  showWarning: boolean
}

/**
 * Hook for monitoring session status and displaying warnings
 */
export function useSessionMonitor() {
  const router = useRouter()
  const [state, setState] = useState<SessionMonitorState>({
    status: null,
    isRefreshing: false,
    showWarning: false
  })

  // Handle session status updates
  const handleStatusUpdate = useCallback((status: SessionStatus) => {
    setState(prev => ({
      ...prev,
      status
    }))

    // Show warning if session is expiring
    if (status.isExpiring && !prev.showWarning) {
      setState(prev => ({ ...prev, showWarning: true }))
      
      const timeLeft = formatTimeUntilExpiry(status.timeUntilExpiry)
      toast({
        title: "Sesión por expirar",
        description: `Tu sesión expirará en ${timeLeft}. Se renovará automáticamente.`,
        duration: 10000,
        // @ts-ignore - toast may not have icon prop
        icon: <Clock className="w-4 h-4" />
      })
    }

    // Redirect if session expired
    if (!status.isValid && prev.status?.isValid) {
      toast({
        title: "Sesión expirada",
        description: "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.",
        variant: "destructive",
        // @ts-ignore
        icon: <AlertCircle className="w-4 h-4" />
      })
      
      router.push('/auth/login?reason=session-expired')
    }
  }, [router])

  // Manually refresh session
  const refreshSession = useCallback(async () => {
    setState(prev => ({ ...prev, isRefreshing: true }))
    
    try {
      const session = await sessionManager.refreshSession()
      
      if (session) {
        toast({
          title: "Sesión renovada",
          description: "Tu sesión ha sido renovada exitosamente.",
          // @ts-ignore
          icon: <RefreshCw className="w-4 h-4" />
        })
      } else {
        throw new Error('Failed to refresh session')
      }
    } catch (error) {
      console.error('Error refreshing session:', error)
      toast({
        title: "Error al renovar sesión",
        description: "No se pudo renovar tu sesión. Por favor, inicia sesión nuevamente.",
        variant: "destructive"
      })
    } finally {
      setState(prev => ({ ...prev, isRefreshing: false }))
    }
  }, [])

  // Set up session monitoring
  useEffect(() => {
    const listenerId = `session-monitor-${Date.now()}`
    
    // Add listener for session updates
    sessionManager.addListener(listenerId, handleStatusUpdate)
    
    // Initial check
    sessionManager.checkSession()
    
    // Cleanup
    return () => {
      sessionManager.removeListener(listenerId)
    }
  }, [handleStatusUpdate])

  return {
    sessionStatus: state.status,
    isRefreshing: state.isRefreshing,
    showWarning: state.showWarning,
    refreshSession,
    timeUntilExpiry: state.status?.timeUntilExpiry 
      ? formatTimeUntilExpiry(state.status.timeUntilExpiry) 
      : null
  }
}

/**
 * Component to display session status in UI
 */
export function SessionStatusIndicator() {
  const { sessionStatus, timeUntilExpiry, isRefreshing, refreshSession } = useSessionMonitor()
  
  if (!sessionStatus?.isValid) return null
  
  // Only show if session is expiring soon (less than 30 minutes)
  const shouldShow = sessionStatus.timeUntilExpiry && 
    sessionStatus.timeUntilExpiry < 30 * 60 * 1000
  
  if (!shouldShow) return null
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="glassmorphic-card p-4 flex items-center gap-3 max-w-sm">
        {isRefreshing ? (
          <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
        ) : sessionStatus.isExpiring ? (
          <AlertCircle className="w-5 h-5 text-yellow-400" />
        ) : (
          <Clock className="w-5 h-5 text-white/60" />
        )}
        
        <div className="flex-1">
          <p className="text-sm font-medium text-white">
            {sessionStatus.isExpiring ? 'Sesión por expirar' : 'Sesión activa'}
          </p>
          <p className="text-xs text-white/60">
            {timeUntilExpiry ? `Expira en ${timeUntilExpiry}` : 'Calculando...'}
          </p>
        </div>
        
        {sessionStatus.isExpiring && !isRefreshing && (
          <button
            onClick={refreshSession}
            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
            disabled={isRefreshing}
          >
            Renovar
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Hook for automatic session refresh on route changes
 */
export function useSessionRefreshOnNav() {
  const router = useRouter()
  
  useEffect(() => {
    // Check session on route changes
    const checkOnNav = async () => {
      const status = await sessionManager.checkSession()
      
      // If session is invalid, redirect to login
      if (!status.isValid) {
        router.push('/auth/login?reason=session-invalid')
      }
    }
    
    // Listen for route changes (Next.js specific)
    const handleRouteChange = () => {
      checkOnNav()
    }
    
    // Add event listeners for navigation
    window.addEventListener('popstate', handleRouteChange)
    
    return () => {
      window.removeEventListener('popstate', handleRouteChange)
    }
  }, [router])
}