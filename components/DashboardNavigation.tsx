'use client'

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
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
  X,
  Bot
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { hasPermission, type UserRole, type RolePermissions } from "@/lib/role-utils"
import { useState, useEffect } from "react"
import { CompanyTheme } from "@/lib/theme-config"
import { useIsMobile } from "@/hooks/use-mobile"

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
  // Stratix Assistant - Feature flagged
  ...(process.env.NEXT_PUBLIC_ENABLE_STRATIX === 'true' ? [{
    id: "stratix",
    label: "Asistente Stratix",
    icon: Bot,
    href: "/stratix-assistant",
    children: [
      {
        title: "Panel Principal",
        href: "/stratix-assistant",
        description: "Análisis inteligente y KPIs personalizados"
      },
      {
        title: "Planes de Acción",
        href: "/stratix-assistant/action-plans",
        description: "Gestión de planes recomendados"
      }
    ]
  }] : []),
  {
    id: "upload",
    label: "Gestión Archivos",
    icon: Upload,
    href: "/upload",
  },
]

export function DashboardNavigation({
  activeTab,
  setActiveTab,
  userRole,
  userProfile,
  theme,
  className
}: DashboardNavigationProps) {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const pathname = usePathname()
  const isMobile = useIsMobile()

  // Collapse sidebar on mobile by default
  useEffect(() => {
    if (isMobile) {
      setIsSidebarExpanded(false)
    }
  }, [isMobile])

  // Close sidebar on mobile when clicking outside or on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSidebarExpanded && isMobile) {
        setIsSidebarExpanded(false)
      }
    }

    const handleClickOutside = (e: Event) => {
      const target = e.target as HTMLElement
      if (isSidebarExpanded && isMobile && !target.closest('[data-sidebar]')) {
        setIsSidebarExpanded(false)
      }
    }

    if (isSidebarExpanded && isMobile) {
      document.addEventListener('keydown', handleEscape)
      document.addEventListener('click', handleClickOutside)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [isSidebarExpanded, isMobile])

  // Filter navigation items based on user permissions
  const visibleItems = navigationItems.filter(item => {
    if (item.requiredPermission && userRole) {
      return hasPermission(userRole, item.requiredPermission as keyof RolePermissions)
    }
    return true
  })

  const getThemeAccentClass = () => {
    if (!theme) return 'text-primary'
    
    if (theme.tenantSlug === 'fema-electricidad') {
      return 'text-fema-blue'
    } else if (theme.tenantSlug === 'siga-turismo') {
      return 'text-siga-green'
    }
    return 'text-primary'
  }

  const getThemeBorderClass = () => {
    if (!theme) return 'border-primary'
    
    if (theme.tenantSlug === 'fema-electricidad') {
      return 'border-fema-blue'
    } else if (theme.tenantSlug === 'siga-turismo') {
      return 'border-siga-green'
    }
    return 'border-primary'
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideInFromLeft {
            from {
              opacity: 0;
              transform: translateX(-30px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateX(0) scale(1);
            }
          }
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-15px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          /* Custom smooth scrolling for mobile menu */
          .mobile-nav-container {
            transition: max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1),
                        opacity 0.3s ease-in-out,
                        transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          }
        `
      }} />
      
      {/* Sidebar Navigation Container */}
      <div 
        data-sidebar
        className={cn("relative h-screen bg-slate-900/95 backdrop-blur-xl border-r border-white/10 transition-all duration-300 flex-shrink-0", 
        isSidebarExpanded ? "w-64" : "w-16",
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
                className="text-white hover:bg-white/10 transition-all duration-300"
                onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                aria-label="Toggle navigation menu"
              >
                <div className="relative w-6 h-6">
                  <Menu 
                    className={`h-6 w-6 absolute transition-all duration-300 ease-in-out ${
                      isSidebarExpanded ? 'rotate-180 opacity-0 scale-50' : 'rotate-0 opacity-100 scale-100'
                    }`} 
                  />
                  <X 
                    className={`h-6 w-6 absolute transition-all duration-300 ease-in-out ${
                      isSidebarExpanded ? 'rotate-0 opacity-100 scale-100' : 'rotate-180 opacity-0 scale-50'
                    }`} 
                  />
                </div>
              </Button>
              <div className={cn(
                "flex items-center transition-all duration-300",
                isSidebarExpanded ? "opacity-100" : "opacity-0 w-0 overflow-hidden"
              )}>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
                    <LayoutDashboard className="h-6 w-6 text-white" />
                  </div>
                  <div className={cn(
                    "transition-all duration-300 whitespace-nowrap",
                    isSidebarExpanded ? "opacity-100" : "opacity-0"
                  )}>
                    <h1 className="text-lg font-bold text-white">
                      {theme ? theme.companyName : 'Dashboard'}
                    </h1>
                    <p className="text-xs text-white/60">Sistema de Gestión</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {visibleItems.map((item, index) => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-3 rounded-lg transition-all duration-300",
                    "hover:bg-white/10 hover:translate-x-1 transform",
                    "group relative",
                    isActive
                      ? `bg-white/15 ${getThemeAccentClass()} shadow-lg`
                      : "text-white/80 hover:text-white"
                  )}
                  onClick={(e) => {
                    // For the dashboard overview, prevent navigation and use tab switching
                    if (item.href === '/dashboard') {
                      e.preventDefault();
                      setActiveTab(item.id);
                    }
                    // For other routes, allow normal navigation to the respective pages
                  }}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className={cn(
                    "font-medium transition-all duration-300 whitespace-nowrap",
                    isSidebarExpanded ? "opacity-100" : "opacity-0 w-0"
                  )}>
                    {item.label}
                  </span>
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-current rounded-r-full" />
                  )}
                  
                  {/* Tooltip for collapsed state */}
                  {!isSidebarExpanded && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-sm rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </Link>
              )
            })}
          </nav>

          {/* Bottom Actions */}
          <div className="p-4 border-t border-white/10 space-y-3">
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-white hover:bg-white/10 transition-all duration-200"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4 flex-shrink-0" />
              <span className={cn(
                "ml-3 transition-all duration-300 whitespace-nowrap",
                isSidebarExpanded ? "opacity-100" : "opacity-0 w-0"
              )}>
                Notificaciones
              </span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-white hover:bg-white/10 transition-all duration-200"
              aria-label="Settings"
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span className={cn(
                "ml-3 transition-all duration-300 whitespace-nowrap",
                isSidebarExpanded ? "opacity-100" : "opacity-0 w-0"
              )}>
                Configuración
              </span>
            </Button>
            <div className={cn(
              "transition-all duration-300",
              isSidebarExpanded ? "w-full overflow-hidden" : "w-auto flex-shrink-0"
            )}>
              <ProfileDropdown 
                userProfile={userProfile ? {
                  name: userProfile.full_name || userProfile.email || 'User',
                  avatar_url: userProfile.avatar_url || undefined,
                  role: userRole || 'User'
                } : undefined}
                showName={isSidebarExpanded}
              />
            </div>
          </div>
        </div>

      </div>
      
      {/* Mobile backdrop - only show on mobile when sidebar is expanded */}
      {isSidebarExpanded && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarExpanded(false)}
        />
      )}
    </>
  )
}
