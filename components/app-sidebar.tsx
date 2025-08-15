"use client"

import * as React from "react"
import {
  LayoutDashboard,
  Target,
  Zap,
  Activity,
  Users,
  BarChart3,
  Layers,
  PieChart,
  TrendingUp,
  Upload,
  Mail,
  Settings,
  HelpCircle,
  Search,
  Building2,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavObjectives } from "@/components/nav-objectives"
import { NavAnalytics } from "@/components/nav-analytics"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { useAuth } from "@/lib/auth-context"
import { useTranslations } from "next-intl"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupAction,
} from "@/components/ui/sidebar"

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { profile } = useAuth()
  const t = useTranslations('navigation')
  
  // Get tenant name for display
  const tenantName = React.useMemo(() => {
    if (!profile?.tenant_id) return "Dashboard"
    
    const tenantMap: Record<string, string> = {
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': 'SIGA Turismo',
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12': 'FEMA',
      'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13': 'Stratix'
    }
    
    return tenantMap[profile.tenant_id] || 'Dashboard'
  }, [profile?.tenant_id])

  const data = {
  user: {
    name: profile?.full_name || "User",
    email: profile?.email || "user@example.com",
    avatar: profile?.avatar_url || "",
    role: profile?.role || "User",
  },
  navMain: [
    ...(profile?.role && ["CEO", "Admin"].includes(profile.role) ? [
      {
        title: "Executive Dashboard",
        url: "/ceo",
        icon: Building2,
      }
    ] : []),
    {
      title: t('overview'),
      url: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: t('areas'),
      url: "/dashboard/areas",
      icon: Users,
    },
    {
      title: t('fileManagement'),
      url: "/dashboard/upload",
      icon: Upload,
    },
    ...(profile?.role && ["CEO", "Admin"].includes(profile.role) ? [
      {
        title: t('invitations'),
        url: "/dashboard/invitations",
        icon: Mail,
      }
    ] : []),
  ].filter(Boolean),
  navObjectives: {
    title: t('objectives'),
    icon: Target,
    url: "/dashboard/objectives",
    isActive: false,
    items: [
      {
        title: t('initiatives'),
        url: "/dashboard/initiatives",
      },
      {
        title: t('activities'),
        url: "/dashboard/activities",
      },
    ],
  },
  navAnalytics: {
    title: t('analytics'),
    icon: BarChart3,
    url: "/dashboard/analytics",
    isActive: false,
    items: [
      {
        title: t('areaComparison'),
        url: "/dashboard/analytics/area-comparison",
      },
      {
        title: t('progressDistribution'),
        url: "/dashboard/analytics/progress-distribution",
      },
      {
        title: t('statusDistribution'),
        url: "/dashboard/analytics/status-distribution",
      },
      {
        title: t('trendAnalytics'),
        url: "/dashboard/analytics/trend-analytics",
      },
    ],
  },
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "/dashboard/help",
      icon: HelpCircle,
    },
  ],
  }
  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b border-border/50">
        <div className="px-4 py-6">
          <a href="/dashboard" className="group block">
            <div className="flex flex-col items-center gap-2 text-center">
              {/* Logo */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 rounded-full blur-xl group-hover:blur-2xl transition-all" />
                <div className="relative w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all">
                  <Building2 className="h-8 w-8 text-white" />
                </div>
              </div>
              
              {/* Company Name - Line 1 */}
              <div className="relative">
                <span className="text-2xl font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
                  SIGA
                </span>
              </div>
              
              {/* Company Name - Line 2 */}
              <div className="relative -mt-1">
                <span className="text-lg font-semibold text-muted-foreground">
                  Turismo
                </span>
              </div>
            </div>
          </a>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavObjectives item={data.navObjectives} />
        <NavAnalytics item={data.navAnalytics} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
