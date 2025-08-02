"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useManagerContext } from './ManagerAreaProvider';
import { useManagerMetrics } from '@/hooks/useManagerMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { createClient } from '@/utils/supabase/client';
import { 
  Building2, 
  Users, 
  FileText, 
  BarChart3, 
  Upload, 
  Settings, 
  LogOut,
  Menu,
  X,
  Home,
  Target,
  Activity,
  Clock,
  Bell,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ManagerDashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  showBreadcrumb?: boolean;
  breadcrumbItems?: Array<{ label: string; href?: string }>;
}

export function ManagerDashboardLayout({
  children,
  title,
  subtitle,
  showBreadcrumb = true,
  breadcrumbItems = []
}: ManagerDashboardLayoutProps) {
  const router = useRouter();
  const { user, area, tenant, loading } = useManagerContext();
  const { metrics: managerMetrics } = useManagerMetrics();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const supabase = createClient();

  const navigationItems = [
    {
      label: 'Overview',
      icon: Home,
      href: '/manager-dashboard',
      active: false
    },
    {
      label: 'Initiatives',
      icon: Target,
      href: '/manager-dashboard/initiatives',
      active: false
    },
    {
      label: 'Activity Feed',
      icon: Activity,
      href: '/manager-dashboard/activity',
      active: false
    },
    {
      label: 'File Uploads',
      icon: Upload,
      href: '/manager-dashboard/uploads',
      active: false
    },
    {
      label: 'Analytics',
      icon: BarChart3,
      href: '/manager-dashboard/analytics',
      active: false
    },
    {
      label: 'Settings',
      icon: Settings,
      href: '/manager-dashboard/settings',
      active: false
    }
  ];

  const handleNavigation = (href: string) => {
    router.push(href);
    setSidebarOpen(false);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/auth/signin');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user || !area) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle className="text-center">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground mb-4">
              You don't have permission to access the manager dashboard.
            </p>
            <Button onClick={() => router.push('/')} className="w-full">
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b">
          <div className="flex items-center space-x-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-semibold text-lg">Manager Portal</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Area Information */}
        <div className="p-4 border-b bg-muted/20">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-xs">
                {area.name}
              </Badge>
              {tenant && (
                <Badge variant="secondary" className="text-xs">
                  {tenant.name}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {area.description || 'Managing area operations and initiatives'}
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item, index) => {
            const Icon = item.icon;
            return (
              <Button
                key={index}
                variant={item.active ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleNavigation(item.href)}
              >
                <Icon className="h-4 w-4 mr-3" />
                {item.label}
              </Button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t">
          <div className="flex items-center space-x-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.avatar_url || ''} />
              <AvatarFallback>
                {user.full_name?.split(' ').map(n => n[0]).join('') || 'M'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user.full_name || 'Manager'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Top Header */}
        <header className="h-16 bg-card border-b flex items-center justify-between px-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="h-4 w-4" />
            </Button>
            
            {/* Breadcrumb */}
            {showBreadcrumb && (
              <nav className="hidden md:flex items-center space-x-2 text-sm">
                <Button variant="ghost" size="sm" onClick={() => router.push('/manager-dashboard')}>
                  Dashboard
                </Button>
                {breadcrumbItems.map((item, index) => (
                  <React.Fragment key={index}>
                    <span className="text-muted-foreground">/</span>
                    {item.href ? (
                      <Button variant="ghost" size="sm" onClick={() => router.push(item.href!)}>
                        {item.label}
                      </Button>
                    ) : (
                      <span className="font-medium">{item.label}</span>
                    )}
                  </React.Fragment>
                ))}
              </nav>
            )}
          </div>

          {/* Header Actions */}
          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full text-xs"></span>
            </Button>

            {/* Quick Stats */}
            <div className="hidden lg:flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-1">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{managerMetrics?.activeInitiatives || 0}</span>
                <span className="text-muted-foreground">Active</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{managerMetrics?.upcomingDeadlines || 0}</span>
                <span className="text-muted-foreground">Due Soon</span>
              </div>
            </div>

            <Separator orientation="vertical" className="h-6" />

            {/* Profile Dropdown */}
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center space-x-2"
              >
                <Avatar className="h-6 w-6">
                  <AvatarImage src={user.avatar_url || ''} />
                  <AvatarFallback className="text-xs">
                    {user.full_name?.split(' ').map(n => n[0]).join('') || 'M'}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3" />
              </Button>

              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-popover border rounded-md shadow-lg z-50">
                  <div className="p-3 border-b">
                    <p className="font-medium text-sm">{user.full_name}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {user.role}
                    </Badge>
                  </div>
                  <div className="p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        router.push('/manager-dashboard/profile');
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Profile
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        router.push('/manager-dashboard/settings');
                      }}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                    <Separator className="my-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-red-600"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        handleLogout();
                      }}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          {/* Page Header */}
          {(title || subtitle) && (
            <div className="bg-card border-b px-6 py-4">
              <div className="max-w-7xl mx-auto">
                {title && (
                  <h1 className="text-2xl font-bold text-foreground">{title}</h1>
                )}
                {subtitle && (
                  <p className="text-muted-foreground mt-1">{subtitle}</p>
                )}
              </div>
            </div>
          )}

          {/* Main Content Area */}
          <div className="p-6">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Profile Dropdown Overlay */}
      {profileDropdownOpen && (
        <div
          className="fixed inset-0 z-30"
          onClick={() => setProfileDropdownOpen(false)}
        />
      )}
    </div>
  );
}