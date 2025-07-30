'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { UserRole, hasPermission } from '@/lib/role-permissions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
}

export function RoleNavigation({ className }: RoleNavigationProps) {
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

  return (
    <>
      <div className={cn("relative h-screen bg-slate-900/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex-shrink-0",
        isMobileMenuOpen ? "w-64" : "w-16 md:w-64",
        className
      )}>
      {/* Sidebar Content */}
      <div className="flex flex-col h-full">
        {/* Logo Section */}
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-white hover:bg-white/10 transition-all duration-300"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-primary" />
              <h1 className={cn(
                "text-xl font-bold text-white transition-all duration-300",
                isMobileMenuOpen ? "opacity-100" : "opacity-0 md:opacity-100"
              )}>
                Dashboard
              </h1>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {visibleItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-300 text-white/80 hover:text-white hover:bg-white/10 group relative"
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className={cn(
                  "font-medium transition-all duration-300",
                  isMobileMenuOpen ? "opacity-100" : "opacity-0 md:opacity-100"
                )}>
                  {item.label}
                </span>
                
                {/* Tooltip for collapsed state */}
                {!isMobileMenuOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap hidden md:block">
                    {item.label}
                  </div>
                )}
              </Link>
            )
          })}
        </nav>

        {/* User Section */}
        <div className="p-4 border-t border-white/10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start text-white/80 hover:text-white hover:bg-white/10">
                <User className="h-5 w-5" />
                <span className={cn(
                  "ml-3 transition-all duration-300",
                  isMobileMenuOpen ? "opacity-100" : "opacity-0 md:opacity-100"
                )}>
                  {userName || 'User'}
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 ml-auto transition-all duration-300",
                  isMobileMenuOpen ? "opacity-100" : "opacity-0 md:opacity-100"
                )} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="right" className="w-56 bg-white/10 backdrop-blur-md border-white/20">
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
      </div>
      
      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}