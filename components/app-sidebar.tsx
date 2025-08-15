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
  Plus,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavObjectives } from "@/components/nav-objectives"
import { NavAnalytics } from "@/components/nav-analytics"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { useAuth } from "@/lib/auth-context"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
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
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-2 hover:bg-transparent"
            >
              <a href="/dashboard" className="group">
                <div className="relative flex items-center gap-3 w-full">
                  {/* Icon with subtle glow */}
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg blur-md group-hover:blur-lg transition-all" />
                    <Building2 className="h-5 w-5 relative z-10 text-primary" />
                  </div>
                  
                  {/* Company name with subtle gradient and glassmorphism */}
                  <div className="relative flex-1">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-md" />
                    <div className="relative backdrop-blur-sm">
                      <span className="text-lg font-bold bg-gradient-to-r from-primary via-primary/90 to-primary/80 bg-clip-text text-transparent">
                        {tenantName}
                      </span>
                    </div>
                  </div>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        
        {/* Create New Button - More subtle integration */}
        <div className="px-3 mt-4">
          <Button 
            className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-sm transition-all duration-200"
            size="sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create New
          </Button>
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
