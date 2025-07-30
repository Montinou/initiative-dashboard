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
  X
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProfileDropdown } from "@/components/profile-dropdown"
import { hasPermission, type UserRole, type RolePermissions } from "@/lib/role-utils"
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
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes slideInFromLeft {
            from {
              opacity: 0;
              transform: translateX(-20px);
            }
            to {
              opacity: 1;
              transform: translateX(0);
            }
          }
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `
      }} />
      
      {/* Fixed Navigation Container */}
      <div className={cn("fixed top-0 left-0 right-0 z-50 w-full bg-slate-900/95 backdrop-blur-xl border-b border-white/10", className)}>
        
        {/* Mobile Navigation */}
        <div className="md:hidden">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 transition-all duration-200 hover:scale-110"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <div className="relative w-6 h-6">
                  <Menu 
                    className={`h-6 w-6 absolute transition-all duration-300 ${
                      isMobileMenuOpen ? 'rotate-90 opacity-0 scale-75' : 'rotate-0 opacity-100 scale-100'
                    }`} 
                  />
                  <X 
                    className={`h-6 w-6 absolute transition-all duration-300 ${
                      isMobileMenuOpen ? 'rotate-0 opacity-100 scale-100' : '-rotate-90 opacity-0 scale-75'
                    }`} 
                  />
                </div>
              </Button>
              <div className="w-8 h-8 bg-gradient-to-r from-primary to-secondary rounded-lg flex items-center justify-center shadow-lg">
                <LayoutDashboard className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-lg font-bold text-white">
                {theme ? theme.companyName : 'Dashboard'}
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 transition-all duration-200">
                <Bell className="h-4 w-4" />
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

          {/* Mobile Navigation Menu - Sliding Panel */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out transform ${
            isMobileMenuOpen ? 'max-h-96 opacity-100 translate-y-0' : 'max-h-0 opacity-0 -translate-y-2'
          }`}>
            <div className="bg-slate-800/90 backdrop-blur-md border-t border-white/5 shadow-lg">
              <nav className="p-4 space-y-1">
                {visibleItems.map((item, index) => {
                  const Icon = item.icon
                  const isActive = activeTab === item.id
                  
                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start space-x-3 h-12 transition-all duration-200 rounded-lg",
                        "hover:bg-white/10 hover:translate-x-1 hover:shadow-md",
                        isActive
                          ? `bg-white/15 ${getThemeAccentClass()} border-l-4 ${getThemeBorderClass()} shadow-md`
                          : "text-white/80 hover:text-white"
                      )}
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animation: isMobileMenuOpen ? `slideInFromLeft 0.3s ease-out ${index * 50}ms both` : 'none'
                      }}
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
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center justify-between px-6 py-3">
          <div className="flex items-center space-x-6">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
                <LayoutDashboard className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  {theme ? theme.companyName : 'Dashboard Ejecutivo'}
                </h1>
                <p className="text-xs text-white/60">Sistema de Gestión</p>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center space-x-2 bg-white/5 rounded-xl p-1 backdrop-blur-sm">
              {visibleItems.map((item) => {
                const Icon = item.icon
                const isActive = activeTab === item.id
                
                return (
                  <Button
                    key={item.id}
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "relative flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200",
                      "hover:bg-white/10 hover:scale-105 hover:shadow-md",
                      isActive
                        ? `bg-white/15 ${getThemeAccentClass()} shadow-lg scale-105`
                        : "text-white/80 hover:text-white"
                    )}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="font-medium text-sm">{item.label}</span>
                    {isActive && (
                      <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-current rounded-full" />
                    )}
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 transition-all duration-200 hover:scale-110">
              <Bell className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-white hover:bg-white/10 transition-all duration-200 hover:scale-110">
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
      
      {/* Spacer for fixed navigation */}
      <div className="h-16 md:h-20" />
    </>
  )
}
