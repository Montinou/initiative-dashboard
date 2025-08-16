'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
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
  ArrowLeft,
  Menu,
  X
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  {
    label: 'overview',
    href: '/org-admin',
    icon: Home,
  },
  {
    label: 'areas',
    href: '/org-admin/areas',
    icon: Building2,
  },
  {
    label: 'users',
    href: '/org-admin/users', 
    icon: Users,
  },
  {
    label: 'objectives',
    href: '/org-admin/objectives',
    icon: Target,
  },
  {
    label: 'invitations',
    href: '/org-admin/invitations',
    icon: UserPlus,
  },
  {
    label: 'settings',
    href: '/org-admin/settings',
    icon: Settings,
  },
  {
    label: 'reports',
    href: '/org-admin/reports',
    icon: BarChart3,
  }
]

interface OrgAdminLayoutClientProps {
  children: React.ReactNode
  profile: {
    id: string
    full_name: string | null
    role: string
    tenant_id: string
  }
  tenant: {
    id: string
    subdomain: string
    organizations?: {
      name: string
    }
  } | null
}

export default function OrgAdminLayoutClient({
  children,
  profile,
  tenant
}: OrgAdminLayoutClientProps) {
  const tOrgAdmin = useTranslations('org-admin.navigation')
  const tCommon = useTranslations('common')
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  
  const tenantName = tenant?.organizations?.name || 'Organization'

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
                  {tCommon('organizationManagement')}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon
              const itemKey = item.href.split('/').pop() || 'overview'
              
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
                        {tOrgAdmin(`${itemKey}.title`)}
                      </div>
                      <div className="text-xs opacity-75">
                        {tOrgAdmin(`${itemKey}.description`)}
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
                {tCommon('backToDashboard')}
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
                  {profile?.role} {tCommon('administrator')}
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