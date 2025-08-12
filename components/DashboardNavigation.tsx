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
import { useTranslations } from 'next-intl'
import { LanguageSwitcher } from '@/components/language-switcher'

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
  const t = useTranslations('navigation')
  const tCommon = useTranslations('common')
  
  // Define navigation items with translations
  const navigationItems: NavigationItem[] = React.useMemo(() => [
    {
      id: "overview",
      label: t('dashboard'),
      icon: LayoutDashboard,
      href: "/dashboard",
    },
    {
      id: "initiatives",
      label: t('initiatives'),
      icon: Zap,
      href: "/initiatives",
      children: [
        {
          title: t('initiatives'),
          href: "/initiatives",
          description: t('initiatives')
        },
        {
          title: tCommon('create'),
          href: "/initiatives/create",
          description: t('initiatives')
        },
        {
          title: t('reports'),
          href: "/initiatives/reports",
          description: t('reports')
        }
      ]
    },
    {
      id: "areas",
      label: t('areas'),
      icon: Users,
      href: "/areas",
      children: [
        {
          title: t('areas'),
          href: "/areas",
          description: t('areas')
        },
        {
          title: t('areas'),
          href: "/areas/manage",
          description: t('areas')
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
          title: "OKRs",
          href: "/okrs",
          description: t('objectives')
        },
        {
          title: t('dashboard'),
          href: "/okrs/tracking",
          description: t('dashboard')
        }
      ]
    },
    {
      id: "analytics",
      label: t('analytics'),
      icon: BarChart3,
      href: "/analytics",
      children: [
        {
          title: t('analytics'),
          href: "/analytics",
          description: t('analytics')
        },
        {
          title: t('reports'),
          href: "/analytics/reports",
          description: t('reports')
        }
      ]
    },
    // Stratix Assistant - Feature flagged
    ...(process.env.NEXT_PUBLIC_ENABLE_STRATIX === 'true' ? [{
      id: "stratix",
      label: "Stratix",
      icon: Bot,
      href: "/stratix-assistant",
      children: [
        {
          title: "Stratix",
          href: "/stratix-assistant",
          description: "Stratix AI"
        },
        {
          title: "Files",
          href: "/stratix-assistant/files",
          description: "Analyze files"
        }
      ]
    }] : []),
    {
      id: "upload",
      label: "Upload",
      icon: Upload,
      href: "/dashboard/upload",
      requiredPermission: "uploadFiles"
    },
    {
      id: "admin",
      label: t('settings'),
      icon: Shield,
      href: "/org-admin",
      requiredPermission: "viewAdmin"
    }
  ], [t, tCommon])

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
    if (!theme) return 'border-primary/20'
    
    if (theme.tenantSlug === 'fema-electricidad') {
      return 'border-fema-blue/20'
    } else if (theme.tenantSlug === 'siga-turismo') {
      return 'border-siga-green/20'
    }
    return 'border-primary/20'
  }

  const isItemActive = (item: NavigationItem) => {
    if (item.href === '/dashboard' && pathname === '/dashboard') {
      return true
    }
    if (item.href !== '/dashboard' && pathname.startsWith(item.href)) {
      return true
    }
    if (item.children?.some(child => pathname === child.href)) {
      return true
    }
    return false
  }

  return (
    <>
      {/* Mobile overlay */}
      {isSidebarExpanded && isMobile && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarExpanded(false)}
          aria-hidden="true"
        />
      )}

      {/* Top Navigation Bar */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-gray-900/95 backdrop-blur-sm border-b border-white/10 flex items-center justify-between px-4 z-50">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          {/* Mobile Menu Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-white hover:bg-white/10"
            onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
            aria-label="Toggle menu"
          >
            {isSidebarExpanded ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              theme?.tenantSlug === 'fema-electricidad' ? 'bg-fema-blue' :
              theme?.tenantSlug === 'siga-turismo' ? 'bg-siga-green' :
              'bg-gradient-to-r from-purple-500 to-cyan-400'
            )}>
              <span className="text-white font-bold">
                {theme?.tenantSlug === 'fema-electricidad' ? 'F' :
                 theme?.tenantSlug === 'siga-turismo' ? 'S' :
                 'S'}
              </span>
            </div>
            <span className="text-white font-semibold hidden sm:block">
              {theme?.tenantSlug === 'fema-electricidad' ? 'FEMA' :
               theme?.tenantSlug === 'siga-turismo' ? 'SIGA' :
               'Stratix'}
            </span>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <LanguageSwitcher 
            variant="dropdown" 
            showLabel={!isMobile}
            className="text-white"
          />

          {/* Notifications */}
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/10 relative"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>

          {/* Profile Dropdown */}
          <ProfileDropdown 
            userProfile={userProfile}
            showName={!isMobile}
          />
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside
        data-sidebar
        className={cn(
          "fixed left-0 top-16 bottom-0 z-40 transition-all duration-200 bg-gray-900/95 backdrop-blur-sm border-r border-white/10",
          isSidebarExpanded ? "w-64" : "w-20",
          isMobile && !isSidebarExpanded && "-translate-x-full",
          className
        )}
      >
        <nav className="flex flex-col h-full">
          {/* Navigation Items */}
          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-1 px-3">
              {visibleItems.map((item) => {
                const isActive = isItemActive(item)
                const IconComponent = item.icon
                
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    onClick={() => {
                      setActiveTab(item.id)
                      if (isMobile) {
                        setIsSidebarExpanded(false)
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group relative",
                      isActive 
                        ? cn("bg-white/10 text-white", getThemeBorderClass(), "border-l-2")
                        : "text-gray-400 hover:text-white hover:bg-white/5"
                    )}
                  >
                    <IconComponent className={cn(
                      "h-5 w-5 flex-shrink-0 transition-colors",
                      isActive && getThemeAccentClass()
                    )} />
                    
                    {isSidebarExpanded && (
                      <span className="font-medium text-sm">
                        {item.label}
                      </span>
                    )}
                    
                    {/* Tooltip for collapsed state */}
                    {!isSidebarExpanded && (
                      <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                        {item.label}
                      </div>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Sidebar Toggle (Desktop Only) */}
          {!isMobile && (
            <div className="border-t border-white/10 p-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-center text-gray-400 hover:text-white hover:bg-white/5"
                onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
              >
                {isSidebarExpanded ? (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    <span>Collapse</span>
                  </>
                ) : (
                  <Menu className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}
        </nav>
      </aside>
    </>
  )
}