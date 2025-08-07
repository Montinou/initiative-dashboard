'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useTenant } from '@/hooks/useTenant'
import { Loader2, ShieldAlert, Building } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  redirectTo?: string
  requiredRole?: string[]
  requireTenant?: boolean
  allowedTenants?: string[]
  checkResourceTenant?: (tenantId: string) => boolean
}

export function ProtectedRoute({ 
  children, 
  fallback, 
  redirectTo = '/auth/login',
  requiredRole,
  requireTenant = true,
  allowedTenants,
  checkResourceTenant
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, profile, loading: authLoading, isAuthenticated, tenantId } = useAuth()
  const { validateTenantAccess, isLoading: tenantLoading } = useTenant()
  const [authorized, setAuthorized] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuthorization = async () => {
      console.log('🛡️ ProtectedRoute: Checking authorization...')
      
      // Reset state
      setAuthorized(false)
      setAuthError(null)

      // Wait for auth to load
      if (authLoading || tenantLoading) {
        return
      }

      // Check if user is authenticated
      if (!isAuthenticated || !user) {
        console.log('🚫 ProtectedRoute: Not authenticated, redirecting to login')
        router.replace(`${redirectTo}?redirectTo=${encodeURIComponent(window.location.pathname)}`)
        return
      }

      // Check if profile is loaded (required for role checking)
      if (!profile) {
        console.log('⏳ ProtectedRoute: Waiting for profile to load...')
        return
      }

      // Check if user is active
      if (!profile.is_active) {
        console.log('🚫 ProtectedRoute: User account is inactive')
        setAuthError('Tu cuenta está inactiva. Contacta al administrador.')
        router.replace('/auth/inactive')
        return
      }

      // Check role requirements
      if (requiredRole && requiredRole.length > 0) {
        if (!requiredRole.includes(profile.role)) {
          console.log(`🚫 ProtectedRoute: Role mismatch. Required: ${requiredRole.join(', ')}, User has: ${profile.role}`)
          setAuthError('No tienes permisos para acceder a esta página.')
          router.replace('/unauthorized')
          return
        }
      }

      // Check tenant requirements
      if (requireTenant && !tenantId) {
        console.log('🚫 ProtectedRoute: Tenant ID required but not found')
        setAuthError('No se pudo determinar tu organización.')
        router.replace('/auth/no-tenant')
        return
      }

      // Check allowed tenants list
      if (allowedTenants && allowedTenants.length > 0 && tenantId) {
        if (!allowedTenants.includes(tenantId)) {
          console.log(`🚫 ProtectedRoute: Tenant not allowed. Required: ${allowedTenants.join(', ')}, User has: ${tenantId}`)
          setAuthError('Tu organización no tiene acceso a esta sección.')
          router.replace('/unauthorized')
          return
        }
      }

      // Check custom resource tenant validation
      if (checkResourceTenant && tenantId) {
        const hasAccess = checkResourceTenant(tenantId)
        if (!hasAccess) {
          console.log('🚫 ProtectedRoute: Custom tenant validation failed')
          setAuthError('No tienes acceso a este recurso.')
          router.replace('/unauthorized')
          return
        }
      }

      // All checks passed
      console.log('✅ ProtectedRoute: Authorization successful')
      setAuthorized(true)
    }

    checkAuthorization()
  }, [
    authLoading, 
    tenantLoading, 
    isAuthenticated, 
    user, 
    profile, 
    tenantId,
    router, 
    redirectTo, 
    requiredRole, 
    requireTenant,
    allowedTenants,
    checkResourceTenant
  ])

  // Loading state
  if (authLoading || tenantLoading) {
    return (
      fallback || (
        <div className="min-h-screen glassmorphic-scrollbar bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
          <div className="glassmorphic-card p-8 max-w-sm mx-auto text-center">
            <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Verificando acceso...</h2>
            <p className="text-white/60">Por favor espera mientras validamos tus permisos.</p>
          </div>
        </div>
      )
    )
  }

  // Error state
  if (authError) {
    return (
      <div className="min-h-screen glassmorphic-scrollbar bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="glassmorphic-card p-8 max-w-md mx-auto text-center">
          <ShieldAlert className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Acceso Denegado</h2>
          <p className="text-white/70 mb-6">{authError}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Not authorized yet (still checking)
  if (!authorized) {
    return null
  }

  // Authorized - render children
  return <>{children}</>
}

// Higher-order component for easier usage
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<ProtectedRouteProps, 'children'>
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}

// Specialized protected route for managers
export function ManagerProtectedRoute({ 
  children,
  areaId,
  ...props 
}: ProtectedRouteProps & { areaId?: string }) {
  const { profile } = useAuth()
  
  // Custom tenant/area validation for managers
  const checkManagerAccess = (tenantId: string): boolean => {
    if (!profile || profile.role !== 'Manager') return false
    if (areaId && profile.area_id !== areaId) return false
    return true
  }

  return (
    <ProtectedRoute 
      {...props}
      requiredRole={['Manager', 'Admin', 'CEO']}
      checkResourceTenant={areaId ? checkManagerAccess : undefined}
    >
      {children}
    </ProtectedRoute>
  )
}

// Specialized protected route for admins
export function AdminProtectedRoute({ 
  children,
  ...props 
}: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute 
      {...props}
      requiredRole={['Admin', 'CEO']}
    >
      {children}
    </ProtectedRoute>
  )
}

// Specialized protected route for CEOs only
export function CEOProtectedRoute({ 
  children,
  ...props 
}: Omit<ProtectedRouteProps, 'requiredRole'>) {
  return (
    <ProtectedRoute 
      {...props}
      requiredRole={['CEO']}
    >
      {children}
    </ProtectedRoute>
  )
}

// Component to display tenant information (useful for debugging)
export function TenantInfo() {
  const { tenantId } = useAuth()
  const { tenant, isLoading } = useTenant()
  
  if (isLoading) return null
  
  return (
    <div className="glassmorphic-card p-4 text-white/80">
      <div className="flex items-center gap-2 mb-2">
        <Building className="w-4 h-4" />
        <span className="font-semibold">Organización:</span>
      </div>
      <p className="text-sm">{tenant.name}</p>
      {process.env.NODE_ENV === 'development' && (
        <p className="text-xs text-white/50 mt-1">ID: {tenantId}</p>
      )}
    </div>
  )
}