'use client'

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Zap,
  Users,
  BarChart3,
  Target,
  Upload,
  Settings,
  User,
  Shield,
  Bell,
  Menu,
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { hasPermission, type UserRole, type RolePermissions } from "@/lib/role-permissions"
import { useState } from "react"
import { CompanyTheme } from "@/lib/theme-config"

interface NavigationItem {
  id: string
  label: string
  icon: React.ComponentType<any>
  href: string
  requiredPermission?: keyof RolePermissions
  children?: {
    title: string
    href: string
    description: string
  }[]
}

interface DashboardNavigationProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  userRole: UserRole | null
  userProfile: any
  theme: CompanyTheme | null
  className?: string
}

const navigationItems: NavigationItem[] = [
  {
    id: "overview",
    label: "Resumen General",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    id: "initiatives",
    label: "Iniciativas",
    icon: Zap,
    href: "/initiatives",
    children: [
      {
        title: "Todas las Iniciativas",
        href: "/initiatives",
        description: "Ver todas las iniciativas activas"
      },
      {
        title: "Crear Iniciativa",
        href: "/initiatives/create",
        description: "Crear una nueva iniciativa"
      },
      {
        title: "Reportes",
        href: "/initiatives/reports",
        description: "Reportes y métricas de iniciativas"
      }
    ]
  },
  {
    id: "areas",
    label: "Por Área",
    icon: Users,
    href: "/areas",
    children: [
      {
        title: "Vista por Área",
        href: "/areas",
        description: "Organización por departamentos"
      },
      {
        title: "Gestión de Áreas",
        href: "/areas/manage",
        description: "Crear y editar áreas"
      }
    ]
  },
  {
    id: "okrs",
    label: "OKRs",
    icon: Target,
    href: "/okrs",
    requiredPermission: "viewOKRs",
    children: [
      {
        title: "Departamentos OKRs",
        href: "/okrs",
        description: "Objetivos y resultados clave"
      },
      {
        title: "Seguimiento",
        href: "/okrs/tracking",
        description: "Seguimiento de progreso"
      }
    ]
  },
  {
    id: "analytics",
    label: "Analíticas",
    icon: BarChart3,
    href: "/analytics",
    children: [
      {
        title: "Dashboard Analítico",
        href: "/analytics",
        description: "Métricas y KPIs principales"
      },
      {
        title: "Reportes Avanzados",
        href: "/analytics/reports",
        description: "Reportes detallados y análisis"
      }
    ]
  },
  {
    id: "upload",
    label: "Gestión Archivos",
    icon: Upload,
    href: "/upload",
  },
]

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { title: string; theme?: CompanyTheme | null }
>(({ className, title, children, theme, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors",
            "hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white",
            "bg-white/5 backdrop-blur-sm border border-white/10",
            className
          )}
          {...props}
        >
          <div className="text-sm font-medium leading-none text-white">{title}</div>
          <p className="line-clamp-2 text-sm leading-snug text-white/70">
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  )
})
ListItem.displayName = "ListItem"

export function DashboardNavigation({
  activeTab,
  setActiveTab,
  userRole,
  userProfile,
  theme,
  className
}: DashboardNavigationProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const pathname = usePathname()

  // Filter navigation items based on user permissions
  const visibleItems = navigationItems.filter(item => {
    if (item.requiredPermission && userRole) {
      return hasPermission(userRole, item.requiredPermission as keyof RolePermissions)
    }
    return true
  })

  const getThemeAccentClass = () => {
    if (!theme) return 'text-primary'
    
    if (theme.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb') {
      return 'text-fema-blue'
    } else if (theme.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2') {
      return 'text-siga-green'
    }
    return 'text-primary'
  }

  const getThemeBorderClass = () => {
    if (!theme) return 'border-primary'
    
    if (theme.tenantId === 'c5a4dd96-6058-42b3-8268-997728a529bb') {
      return 'border-fema-blue'
    } else if (theme.tenantId === 'd1a3408c-a3d0-487e-a355-a321a07b5ae2') {
      return 'border-siga-green'
    }
    return 'border-primary'
  }

  return (
    <div className={cn("w-full", className)}>
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 backdrop-blur-xl bg-white/5 border-b border-white/10">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent">
            {theme ? `${theme.companyName}` : 'Dashboard'}
          </h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" className="text-foreground hover:bg-white/10">
            <Bell className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-foreground hover:bg-white/10"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden backdrop-blur-xl bg-white/5 border-b border-white/10 p-4">
          <nav className="space-y-2">
            {visibleItems.map((item) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start space-x-3 h-12",
                    isActive
                      ? `bg-white/20 ${getThemeAccentClass()} border-l-4 ${getThemeBorderClass()}`
                      : "text-white/80 hover:text-white hover:bg-white/10"
                  )}
                  onClick={() => {
                    setActiveTab(item.id)
                    setIsMobileMenuOpen(false)
                  }}
                >
                  <Icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </Button>
              )
            })}
          </nav>
          
          <div className="mt-4 pt-4 border-t border-white/10">
            <ProfileDropdown 
              userProfile={userProfile ? {
                name: userProfile.full_name || userProfile.email || 'User',
                avatar_url: userProfile.avatar_url || undefined,
                role: userRole || 'User'
              } : undefined} 
            />
          </div>
        </div>
      )}

      {/* Desktop Navigation */}
      <div className="hidden lg:flex items-center justify-between backdrop-blur-xl bg-white/5 border-b border-white/10 px-6 py-4">
        <div className="flex items-center space-x-8">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center">
              <LayoutDashboard className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-white to-primary-foreground bg-clip-text text-transparent">
              {theme ? `${theme.companyName} Dashboard` : 'Dashboard Ejecutivo'}
            </h1>
          </div>

          {/* Navigation Menu */}
          <NavigationMenu>
            <NavigationMenuList className="space-x-1">
              {visibleItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                
                if (item.children && item.children.length > 0) {
                  return (
                    <NavigationMenuItem key={item.id}>
                      <NavigationMenuTrigger 
                        className={cn(
                          navigationMenuTriggerStyle(),
                          "bg-transparent hover:bg-white/10 focus:bg-white/10 data-[active]:bg-white/10 data-[state=open]:bg-white/10",
                          "text-white/80 hover:text-white focus:text-white",
                          isActive && `${getThemeAccentClass()} bg-white/20`
                        )}
                        onClick={() => setActiveTab(item.id)}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </NavigationMenuTrigger>
                      <NavigationMenuContent>
                        <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px] backdrop-blur-xl bg-white/5 border border-white/10">
                          {item.children.map((child) => (
                            <ListItem
                              key={child.href}
                              title={child.title}
                              href={child.href}
                              theme={theme}
                            >
                              {child.description}
                            </ListItem>
                          ))}
                        </ul>
                      </NavigationMenuContent>
                    </NavigationMenuItem>
                  )
                }

                return (
                  <NavigationMenuItem key={item.id}>
                    <Link href={item.href} legacyBehavior passHref>
                      <NavigationMenuLink 
                        className={cn(
                          navigationMenuTriggerStyle(),
                          "bg-transparent hover:bg-white/10 focus:bg-white/10 data-[active]:bg-white/10",
                          "text-white/80 hover:text-white focus:text-white",
                          isActive && `${getThemeAccentClass()} bg-white/20`
                        )}
                        onClick={() => setActiveTab(item.id)}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </NavigationMenuLink>
                    </Link>
                  </NavigationMenuItem>
                )
              })}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" className="text-foreground hover:bg-white/10">
            <Bell className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="text-foreground hover:bg-white/10">
            <Settings className="h-4 w-4" />
          </Button>
          <ProfileDropdown 
            userProfile={userProfile ? {
              name: userProfile.full_name || userProfile.email || 'User',
              avatar_url: userProfile.avatar_url || undefined,
              role: userRole || 'User'
            } : undefined} 
          />
        </div>
      </div>
    </div>
  )
}
