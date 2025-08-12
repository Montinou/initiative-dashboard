"use client"

import React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  LayoutDashboard, 
  Zap, 
  Users, 
  BarChart3,
  Target,
  TrendingUp,
  PieChart,
  Activity,
  Layers,
  Upload,
  Mail
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/lib/auth-context"
import { useTranslations } from "next-intl"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  children?: NavItem[]
  roles?: string[] // Optional: restrict to specific roles
}

// Move navigation items inside component to use translations

interface EnhancedDashboardNavigationProps {
  className?: string
}

export function EnhancedDashboardNavigation({ className }: EnhancedDashboardNavigationProps) {
  const pathname = usePathname()
  const { profile } = useAuth()
  const t = useTranslations('navigation')
  
  const allNavItems: NavItem[] = React.useMemo(() => [
    {
      label: t('overview'),
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: t('objectives'),
      href: "/dashboard/objectives",
      icon: Target,
      children: [
        {
          label: t('allObjectives'),
          href: "/dashboard/objectives",
          icon: Target,
        },
        {
          label: t('initiatives'),
          href: "/dashboard/initiatives",
          icon: Zap,
        },
        {
          label: t('activities'),
          href: "/dashboard/activities",
          icon: Activity,
        },
      ],
    },
    {
      label: t('areas'),
      href: "/dashboard/areas",
      icon: Users,
    },
    {
      label: t('analytics'),
      href: "/dashboard/analytics",
      icon: BarChart3,
      children: [
        {
          label: t('areaComparison'),
          href: "/dashboard/analytics/area-comparison",
          icon: Layers,
        },
        {
          label: t('progressDistribution'),
          href: "/dashboard/analytics/progress-distribution",
          icon: PieChart,
        },
        {
          label: t('statusDistribution'),
          href: "/dashboard/analytics/status-distribution",
          icon: Activity,
        },
        {
          label: t('trendAnalytics'),
          href: "/dashboard/analytics/trend-analytics",
          icon: TrendingUp,
        },
      ],
    },
    {
      label: t('fileManagement'),
      href: "/dashboard/upload",
      icon: Upload,
    },
    {
      label: t('invitations'),
      href: "/dashboard/invitations",
      icon: Mail,
      roles: ["CEO", "Admin"], // Only visible to CEO and Admin
    },
  ], [t])

  const isActiveRoute = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  // Filter navigation items based on user role
  const navItems = React.useMemo(() => {
    return allNavItems.filter(item => {
      // If no roles specified, item is visible to all
      if (!item.roles || item.roles.length === 0) {
        return true
      }
      // Check if user's role is in the allowed roles
      return profile?.role && item.roles.includes(profile.role)
    })
  }, [profile?.role])

  return (
    <nav className={cn("space-y-2", className)}>
      {navItems.map((item) => {
        const isActive = isActiveRoute(item.href)
        const Icon = item.icon
        const hasChildren = item.children && item.children.length > 0
        const isExpanded = hasChildren && pathname.startsWith(item.href)

        return (
          <div key={item.href}>
            <Link href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 px-3 py-2 h-auto font-medium transition-all text-white",
                  "hover:bg-white/10 hover:backdrop-blur-xl",
                  isActive && "bg-gradient-to-r from-primary/20 to-secondary/20 text-white backdrop-blur-xl border border-white/10"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Button>
            </Link>

            {hasChildren && isExpanded && (
              <div className="ml-7 mt-1 space-y-1">
                {item.children!.map((child) => {
                  const childIsActive = pathname === child.href
                  const ChildIcon = child.icon

                  return (
                    <Link key={child.href} href={child.href}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "w-full justify-start gap-2 px-3 py-1.5 h-auto text-sm font-medium transition-all text-gray-300",
                          "hover:bg-white/10 hover:backdrop-blur-xl hover:text-white",
                          childIsActive && "bg-white/10 text-white backdrop-blur-xl"
                        )}
                      >
                        <ChildIcon className="h-3.5 w-3.5" />
                        <span>{child.label}</span>
                      </Button>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </nav>
  )
}