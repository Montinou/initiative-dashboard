"use client"

import * as React from "react"
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
  Mail,
  ChevronRight,
  Building2,
  Settings,
  HelpCircle,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useAuth } from "@/lib/auth-context"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  children?: NavItem[]
  roles?: string[]
}

export function AppSidebar() {
  const pathname = usePathname()
  const { profile, signOut } = useAuth()
  const t = useTranslations('navigation')
  const { state } = useSidebar()

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
      roles: ["CEO", "Admin"],
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
      if (!item.roles || item.roles.length === 0) {
        return true
      }
      return profile?.role && item.roles.includes(profile.role)
    })
  }, [allNavItems, profile?.role])

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

  const userInitials = React.useMemo(() => {
    if (!profile?.full_name) return "U"
    const names = profile.full_name.split(" ")
    return names.map(n => n[0]).join("").toUpperCase().slice(0, 2)
  }, [profile?.full_name])

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Building2 className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">{tenantName}</span>
                  <span className="text-xs text-muted-foreground">Management Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = isActiveRoute(item.href)
                const hasChildren = item.children && item.children.length > 0

                if (hasChildren) {
                  const isExpanded = pathname.startsWith(item.href)
                  
                  return (
                    <Collapsible
                      key={item.href}
                      defaultOpen={isExpanded}
                      className="group/collapsible"
                    >
                      <SidebarMenuItem>
                        <CollapsibleTrigger asChild>
                          <SidebarMenuButton
                            tooltip={item.label}
                            className={cn(
                              isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                            )}
                          >
                            <Icon className="size-4" />
                            <span>{item.label}</span>
                            <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                          </SidebarMenuButton>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                          <SidebarMenuSub>
                            {item.children?.map((child) => {
                              const ChildIcon = child.icon
                              const childIsActive = pathname === child.href
                              
                              return (
                                <SidebarMenuSubItem key={child.href}>
                                  <SidebarMenuSubButton
                                    asChild
                                    className={cn(
                                      childIsActive && "bg-accent text-accent-foreground"
                                    )}
                                  >
                                    <Link href={child.href}>
                                      <ChildIcon className="size-3" />
                                      <span>{child.label}</span>
                                    </Link>
                                  </SidebarMenuSubButton>
                                </SidebarMenuSubItem>
                              )
                            })}
                          </SidebarMenuSub>
                        </CollapsibleContent>
                      </SidebarMenuItem>
                    </Collapsible>
                  )
                }

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.label}
                      className={cn(
                        isActive && "bg-primary/10 text-primary hover:bg-primary/20"
                      )}
                    >
                      <Link href={item.href}>
                        <Icon className="size-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/help">
                    <HelpCircle className="size-4" />
                    <span>Help & Support</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="size-4" />
                    <span>Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                    <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{profile?.full_name || "User"}</span>
                    <span className="truncate text-xs text-muted-foreground">{profile?.email}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg bg-gray-900 border border-gray-700"
                side={state === "collapsed" ? "right" : "top"}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-3 py-2 text-left text-sm">
                    <Avatar className="h-8 w-8 rounded-lg">
                      <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                      <AvatarFallback className="rounded-lg bg-gray-700 text-white">{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold text-white">{profile?.full_name}</span>
                      <span className="truncate text-xs text-gray-400">{profile?.email}</span>
                      <span className="truncate text-xs text-gray-400 capitalize">{profile?.role}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem asChild className="text-gray-300 hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white cursor-pointer">
                  <Link href="/profile" className="flex items-center px-3 py-2">
                    <Users className="mr-2 size-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="text-gray-300 hover:bg-gray-800 hover:text-white focus:bg-gray-800 focus:text-white cursor-pointer">
                  <Link href="/dashboard/settings" className="flex items-center px-3 py-2">
                    <Settings className="mr-2 size-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem 
                  onClick={signOut} 
                  className="text-red-400 hover:bg-red-900/30 hover:text-red-300 focus:bg-red-900/30 focus:text-red-300 cursor-pointer px-3 py-2"
                >
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}