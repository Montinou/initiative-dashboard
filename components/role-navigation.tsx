'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
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
  ChevronDown 
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
  const [userRole, setUserRole] = useState<UserRole | null>(null)
  const [userName, setUserName] = useState('')
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