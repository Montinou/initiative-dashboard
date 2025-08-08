'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProfile } from '@/lib/profile-context'
import { cn } from '@/lib/utils'
import { 
  Building2, 
  Users, 
  Target, 
  UserPlus, 
  Settings,
  BarChart3,
  Shield,
  Home
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
  const { profile, loading, error } = useProfile()
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!profile) {
        router.push('/auth/login')
        return
      }

      // Check if user has CEO or Admin role
      if (!['CEO', 'Admin'].includes(profile.role)) {
        router.push('/dashboard')
        return
      }

      setIsAuthorized(true)
    }
  }, [profile, loading, router])

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Show unauthorized state
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
        <Card className="p-8 bg-red-900/20 border-red-500/20 text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-300 mb-6">You don't have permission to access the Organization Admin panel.</p>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Return to Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="flex">
        {/* Sidebar Navigation */}
        <div className="fixed inset-y-0 left-0 w-64 bg-black/50 backdrop-blur-xl border-r border-white/10 p-6 overflow-y-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-2 bg-primary/20 rounded-lg">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Org Admin</h1>
                <p className="text-sm text-gray-400">Organization Management</p>
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
                        ? "bg-primary/20 text-primary border border-primary/30" 
                        : "text-gray-300 hover:bg-white/10 hover:text-white"
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
          <div className="mt-auto pt-6 border-t border-white/10">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
              <div>
                <div className="text-sm font-medium text-white">{profile?.full_name}</div>
                <div className="text-xs text-gray-400">{profile?.role} Admin</div>
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