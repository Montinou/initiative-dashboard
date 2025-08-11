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
  Upload
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  children?: NavItem[]
}

const navItems: NavItem[] = [
  {
    label: "Overview",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Objectives",
    href: "/dashboard/objectives",
    icon: Target,
    children: [
      {
        label: "All Objectives",
        href: "/dashboard/objectives",
        icon: Target,
      },
      {
        label: "Initiatives",
        href: "/dashboard/initiatives",
        icon: Zap,
      },
      {
        label: "Activities",
        href: "/dashboard/activities",
        icon: Activity,
      },
    ],
  },
  {
    label: "Areas",
    href: "/dashboard/areas",
    icon: Users,
  },
  {
    label: "Analytics",
    href: "/dashboard/analytics",
    icon: BarChart3,
    children: [
      {
        label: "Area Comparison",
        href: "/dashboard/analytics/area-comparison",
        icon: Layers,
      },
      {
        label: "Progress Distribution",
        href: "/dashboard/analytics/progress-distribution",
        icon: PieChart,
      },
      {
        label: "Status Distribution",
        href: "/dashboard/analytics/status-distribution",
        icon: Activity,
      },
      {
        label: "Trend Analytics",
        href: "/dashboard/analytics/trend-analytics",
        icon: TrendingUp,
      },
    ],
  },
  {
    label: "File Management",
    href: "/dashboard/upload",
    icon: Upload,
  },
]

interface EnhancedDashboardNavigationProps {
  className?: string
}

export function EnhancedDashboardNavigation({ className }: EnhancedDashboardNavigationProps) {
  const pathname = usePathname()

  const isActiveRoute = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

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