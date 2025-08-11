'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useTenant } from '@/lib/tenant-context'
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
  Loader2
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description: string
}

const navItems: NavItem[] = [
  {
    label: 'Overview',
    href: '/org-admin',
    icon: Home,
    description: 'Dashboard overview'
  },
  {
    label: 'Areas',
    href: '/org-admin/areas',
    icon: Building2,
    description: 'Manage organizational areas'
  },
  {
    label: 'Users',
    href: '/org-admin/users', 
    icon: Users,
    description: 'Manage users and assignments'
  },
  {
    label: 'Objectives',
    href: '/org-admin/objectives',
    icon: Target,
    description: 'Manage objectives by area'
  },
  {
    label: 'Invitations',
    href: '/org-admin/invitations',
    icon: UserPlus,
    description: 'Invite new users'
  },
  {
    label: 'Settings',
    href: '/org-admin/settings',
    icon: Settings,
    description: 'Organization configuration'
  },
  {
    label: 'Reports',
    href: '/org-admin/reports',
    icon: BarChart3,
    description: 'Analytics and reports'
  }
]

export default function OrgAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile, loading, error, user } = useAuth()
  const isAuthenticating = loading
  const { theme } = useTenant()
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [isInitializing, setIsInitializing] = useState(true)
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false)

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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  // Show unauthorized state only after we're sure about authorization
  if (!isInitializing && !isAuthorized && profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 bg-destructive/10 border-destructive/20 text-center max-w-md">
          <Shield className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground mb-6">
            You don't have permission to access the Organization Admin panel.
          </p>
          <Button onClick={() => window.location.href = '/dashboard'} variant="outline">
            Return to Dashboard
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
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  {theme?.companyName || 'Org'} Admin
                </h1>
                <p className="text-sm text-muted-foreground">Organization Management</p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors",
                      isActive 
                        ? "bg-primary/10 text-primary border border-primary/20" 
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className="text-xs opacity-75">{item.description}</div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </nav>

          {/* User Info */}
          <div className="mt-auto pt-6 border-t border-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <div className="text-sm font-medium text-foreground">
                  {profile?.full_name || 'User'}
                </div>
                <div className="text-xs text-muted-foreground">{profile?.role} Admin</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 ml-64">
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}