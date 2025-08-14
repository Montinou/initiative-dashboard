'use client'

import { useEffect, useState } from 'react'
import { useAuth, useTenantId } from '@/lib/auth-context'
import { cn } from '@/lib/utils'
import { 
  Building2, 
  Users, 
  Target, 
  UserPlus, 
  Settings,
  BarChart3,
  Shield,
  Home,
  Loader2,
  ArrowLeft,
  Menu,
  X
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface NavItem {
  label: string
  labelEs: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  descriptionEs: string
}

const navItems: NavItem[] = [
  {
    label: 'Overview',
    labelEs: 'Resumen',
    href: '/org-admin',
    icon: Home,
    description: 'Dashboard overview',
    descriptionEs: 'Vista general del panel'
  },
  {
    label: 'Areas',
    labelEs: 'Áreas',
    href: '/org-admin/areas',
    icon: Building2,
    description: 'Manage organizational areas',
    descriptionEs: 'Gestionar áreas organizacionales'
  },
  {
    label: 'Users',
    labelEs: 'Usuarios',
    href: '/org-admin/users', 
    icon: Users,
    description: 'Manage users and assignments',
    descriptionEs: 'Gestionar usuarios y asignaciones'
  },
  {
    label: 'Objectives',
    labelEs: 'Objetivos',
    href: '/org-admin/objectives',
    icon: Target,
    description: 'Manage objectives by area',
    descriptionEs: 'Gestionar objetivos por área'
  },
  {
    label: 'Invitations',
    labelEs: 'Invitaciones',
    href: '/org-admin/invitations',
    icon: UserPlus,
    description: 'Invite new users',
    descriptionEs: 'Invitar nuevos usuarios'
  },
  {
    label: 'Settings',
    labelEs: 'Configuración',
    href: '/org-admin/settings',
    icon: Settings,
    description: 'Organization configuration',
    descriptionEs: 'Configuración de la organización'
  },
  {
    label: 'Reports',
    labelEs: 'Reportes',
    href: '/org-admin/reports',
    icon: BarChart3,
    description: 'Analytics and reports',
    descriptionEs: 'Análisis y reportes'
  }
]

export default function OrgAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, loading, error, user } = useAuth()
  const isAuthenticating = loading
  const tenantId = useTenantId()
  const pathname = usePathname()
  
  // Simple tenant name mapping - no complex data fetching
  const TENANT_NAMES = {
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': 'SIGA Turismo',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12': 'FEMA Electricidad', 
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13': 'Stratix Platform'
  };
  
  const tenantName = tenantId ? TENANT_NAMES[tenantId as keyof typeof TENANT_NAMES] : 'Org'
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  // Get locale from cookie or default to 'es'
  const [locale, setLocale] = useState('es')
  
  useEffect(() => {
    const cookieLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1]
    if (cookieLocale) {
      setLocale(cookieLocale)
    }
  }, [])

  // Add a timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isInitializing) {
        console.warn('Org-admin: Loading timeout - forcing initialization complete')
        setIsInitializing(false)
        setHasCheckedAuth(true)
        
        // If we have a profile with the right role, authorize
        if (profile && profile.role && ['CEO', 'Admin'].includes(profile.role)) {
          setIsAuthorized(true)
        }
      }
    }, 3000) // 3 second timeout

    return () => clearTimeout(timeout)
  }, [isInitializing, profile])

  useEffect(() => {
    // Prevent multiple checks
    if (hasCheckedAuth) return
    
    // Check if we have enough data to make a decision
    // Don't wait for loading states to be false - check if we have the data we need
    if (user !== undefined && profile !== undefined) {
      setIsInitializing(false)
      setHasCheckedAuth(true)
      
      // Only redirect if we're sure there's no user
      if (!user && !profile) {
        // Use window.location for navigation to avoid re-render issues
        window.location.href = '/auth/login'
        return
      }

      // Check authorization only when profile is loaded
      if (profile) {
        // Check if user has CEO or Admin role
        if (!profile.role || !['CEO', 'Admin'].includes(profile.role)) {
          // Use window.location for navigation to avoid re-render issues
          window.location.href = '/dashboard'
          return
        }
        setIsAuthorized(true)
      }
    } else if (!isAuthenticating && !loading) {
      // If loading is done but we still don't have data, mark as initialized
      setIsInitializing(false)
      setHasCheckedAuth(true)
      
      if (!user) {
        window.location.href = '/auth/login'
      }
    }
  }, [profile, loading, user, isAuthenticating, hasCheckedAuth])

  // Show loading state only while truly initializing
  if (isInitializing && (loading || isAuthenticating)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {locale === 'es' ? 'Cargando panel de administración...' : 'Loading admin panel...'}
          </p>
        </div>
      </div>
    )
  }

  // Show unauthorized state only after we're sure about authorization
  if (!isInitializing && !isAuthorized && profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Card className="p-8 backdrop-blur-xl bg-gray-900/50 border-red-500/20 text-center max-w-md">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2 text-white">
            {locale === 'es' ? 'Acceso Denegado' : 'Access Denied'}
          </h2>
          <p className="text-gray-400 mb-6">
            {locale === 'es' 
              ? 'No tienes permisos para acceder al panel de Administración de la Organización.'
              : "You don't have permission to access the Organization Admin panel."
            }
          </p>
          <Button 
            onClick={() => window.location.href = '/dashboard'} 
            className="bg-primary hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {locale === 'es' ? 'Volver al Dashboard' : 'Return to Dashboard'}
          </Button>
        </Card>
      </div>
    )
  }

  // Don't render anything if still checking authorization
  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="flex">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900/90 backdrop-blur-xl border border-white/10 rounded-lg"
        >
          {sidebarOpen ? <X className="h-6 w-6 text-white" /> : <Menu className="h-6 w-6 text-white" />}
        </button>

        {/* Sidebar Navigation */}
        <div className={cn(
          "fixed inset-y-0 left-0 w-72 bg-gray-900/95 backdrop-blur-xl border-r border-white/10 p-6 overflow-y-auto transition-transform duration-300 z-40",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}>
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-cyan-400 rounded-lg">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {tenantName} Admin
                </h1>
                <p className="text-sm text-gray-400">
                  {locale === 'es' ? 'Gestión Organizacional' : 'Organization Management'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              
              return (
                <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}>
                  <div
                    className={cn(
                      "flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200",
                      isActive 
                        ? "bg-gradient-to-r from-purple-500/20 to-cyan-400/20 text-white border border-white/20 shadow-lg" 
                        : "text-gray-400 hover:bg-white/5 hover:text-white hover:border-white/10 border border-transparent"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium">
                        {locale === 'es' ? item.labelEs : item.label}
                      </div>
                      <div className="text-xs opacity-75">
                        {locale === 'es' ? item.descriptionEs : item.description}
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* Bottom Section */}
          <div className="mt-auto pt-6 border-t border-white/10">
            {/* Back to Dashboard */}
            <Link href="/dashboard">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-gray-400 hover:text-white hover:bg-white/5 mb-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {locale === 'es' ? 'Volver al Dashboard' : 'Back to Dashboard'}
              </Button>
            </Link>

            {/* User Info */}
            <div className="flex items-center space-x-3 p-3 bg-white/5 rounded-lg">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-cyan-400 rounded-full flex items-center justify-center">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-white">
                  {profile?.full_name || 'User'}
                </div>
                <div className="text-xs text-gray-400">
                  {profile?.role} {locale === 'es' ? 'Administrador' : 'Administrator'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 lg:ml-72">
          <div className="p-6 lg:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}