'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { UserRole, hasPermission } from '@/lib/role-permissions'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import { 
  User, 
  Settings, 
  Users, 
  BarChart3, 
  Target, 
  Shield, 
  LogOut,
  ChevronDown,
  Menu,
  X
} from 'lucide-react'

interface NavigationItem {
  label: string
  href: string
  icon: React.ComponentType<any>
  permission?: keyof typeof import('@/lib/role-permissions').ROLE_PERMISSIONS.CEO
  roles?: UserRole[]
}

const navigationItems: NavigationItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3
  },
  {
    label: 'Users',
    href: '/users',
    icon: Users,
    permission: 'manageUsers'
  },
  {
    label: 'Areas',
    href: '/areas',
    icon: Target,
    permission: 'manageAreas'
  },
  {
    label: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    permission: 'accessAnalytics'
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User
  },
  {
    label: 'Admin Panel',
    href: '/admin',
    icon: Shield,
    roles: ['CEO', 'Admin']
  }
]

interface RoleNavigationProps {
  className?: string
  collapsible?: boolean
}

export function RoleNavigation({ className, collapsible = false }: RoleNavigationProps) {
  const supabase = createClient()
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [userName, setUserName] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function fetchUserRole() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role, full_name')
            .eq('id', user.id)
            .single()
          
          if (profile) {
            setUserRole(profile.role as UserRole)
            setUserName(profile.full_name || user.email || '')
          }
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
      }
    }

    fetchUserRole()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const canAccessRoute = (item: NavigationItem): boolean => {
    if (!userRole) return false

    if (item.permission) {
      return hasPermission(userRole, item.permission)
    }

    if (item.roles) {
      return item.roles.includes(userRole)
    }

    return true
  }

  const visibleItems = navigationItems.filter(canAccessRoute)

  if (collapsible) {
    return (
      <div className={className}>
        {/* Mobile/Collapsible Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
          </div>
          
          {/* User dropdown - always visible */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
                <User className="h-4 w-4 mr-2" />
                {userName || 'User'}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white/10 backdrop-blur-md border-white/20">
              <div className="px-2 py-1.5 text-sm text-white/70">
                Role: <span className="font-medium text-white">{userRole}</span>
              </div>
              <DropdownMenuSeparator className="bg-white/20" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-300 hover:text-red-200 hover:bg-red-500/10 cursor-pointer"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Collapsible Menu */}
        {isMobileMenuOpen && (
          <div className="mt-4 space-y-2 bg-white/5 backdrop-blur-xl rounded-lg border border-white/10 p-4">
            {visibleItems.map((item) => {
              const Icon = item.icon
              return (
                <Button
                  key={item.href}
                  variant="ghost"
                  className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10"
                  onClick={() => {
                    router.push(item.href)
                    setIsMobileMenuOpen(false)
                  }}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // Original horizontal navigation for desktop
  return (
    <div className={className}>
      <nav className="flex items-center space-x-4">
        {/* Main navigation items */}
        {visibleItems.slice(0, 4).map((item) => {
          const Icon = item.icon
          return (
            <Button
              key={item.href}
              variant="ghost"
              className="text-white/80 hover:text-white hover:bg-white/10"
              onClick={() => router.push(item.href)}
            >
              <Icon className="h-4 w-4 mr-2" />
              {item.label}
            </Button>
          )
        })}

        {/* User dropdown menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="text-white/80 hover:text-white hover:bg-white/10">
              <User className="h-4 w-4 mr-2" />
              {userName || 'User'}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-white/10 backdrop-blur-md border-white/20">
            <div className="px-2 py-1.5 text-sm text-white/70">
              Role: <span className="font-medium text-white">{userRole}</span>
            </div>
            <DropdownMenuSeparator className="bg-white/20" />
            
            {/* Additional navigation items in dropdown */}
            {visibleItems.slice(4).map((item) => {
              const Icon = item.icon
              return (
                <DropdownMenuItem
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className="text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {item.label}
                </DropdownMenuItem>
              )
            })}
            
            <DropdownMenuSeparator className="bg-white/20" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-300 hover:text-red-200 hover:bg-red-500/10 cursor-pointer"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </nav>
    </div>
  )
}