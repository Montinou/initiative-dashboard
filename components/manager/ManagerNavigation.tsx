"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAreaDisplay } from './ManagerAreaProvider';
import { useManagerMetrics } from '@/hooks/useManagerMetrics';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  FileUp, 
  History, 
  Home, 
  Target, 
  Users,
  AlertCircle,
  TrendingUp
} from 'lucide-react';

interface NavigationItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: {
    content: string | number;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  description?: string;
}

interface ManagerNavigationProps {
  className?: string;
}

/**
 * ManagerNavigation Component
 * 
 * Features:
 * - Glassmorphism design with animated hover effects
 * - Real-time badge indicators from database metrics
 * - Responsive navigation with mobile/desktop layouts
 * - Active route highlighting
 * - Area-specific navigation context
 */
export function ManagerNavigation({ className = '' }: ManagerNavigationProps) {
  const pathname = usePathname();
  const { displayName, loading: areaLoading } = useAreaDisplay();
  const { metrics, loading: metricsLoading } = useManagerMetrics();

  // Navigation items with real-time metrics
  const navigationItems: NavigationItem[] = [
    {
      label: 'Overview',
      href: '/manager-dashboard',
      icon: Home,
      description: 'Dashboard overview and key metrics'
    },
    {
      label: 'My Initiatives',
      href: '/manager-dashboard/initiatives',
      icon: Target,
      badge: metrics?.initiativesCount && metrics.initiativesCount > 0 
        ? { content: metrics.initiativesCount, variant: 'default' }
        : undefined,
      description: 'Manage area initiatives and track progress'
    },
    {
      label: 'File Management',
      href: '/manager-dashboard/files',
      icon: FileUp,
      badge: metrics?.pendingUploads && metrics.pendingUploads > 0
        ? { content: metrics.pendingUploads, variant: 'destructive' }
        : metrics?.recentUploads && metrics.recentUploads > 0
        ? { content: metrics.recentUploads, variant: 'secondary' }
        : undefined,
      description: 'Upload OKR files and manage upload history'
    },
    {
      label: 'Team Activities',
      href: '/manager-dashboard/team',
      icon: Users,
      badge: metrics?.recentActivities && metrics.recentActivities > 0
        ? { content: metrics.recentActivities, variant: 'outline' }
        : undefined,
      description: 'Monitor team member activities'
    },
    {
      label: 'Analytics',
      href: '/manager-dashboard/analytics',
      icon: BarChart3,
      badge: metrics?.trendsDetected && metrics.trendsDetected > 0
        ? { content: 'New', variant: 'default' }
        : undefined,
      description: 'Detailed analytics and reporting'
    }
  ];

  const isActive = (href: string) => {
    if (href === '/manager-dashboard') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className={cn("w-full space-y-2", className)}>
      {/* Area Context Header */}
      <div className="px-3 py-2 mb-4">
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm font-medium text-primary">
              {areaLoading ? 'Loading area...' : displayName}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Manager Dashboard
          </p>
        </div>
      </div>

      {/* Navigation Items */}
      <div className="space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                // Base styles
                "group relative flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200",
                // Hover effect
                "hover:bg-accent/10 hover:backdrop-blur-sm hover:border hover:border-accent/30",
                // Active state
                active && [
                  "bg-primary/10",
                  "border border-primary/30",
                  "backdrop-blur-sm",
                  "text-primary"
                ],
                // Default state
                !active && "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="flex items-center space-x-3">
                <Icon className={cn(
                  "h-4 w-4 transition-colors",
                  active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                )} />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {item.label}
                  </span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground line-clamp-1">
                      {item.description}
                    </span>
                  )}
                </div>
              </div>

              {/* Badges for metrics */}
              {item.badge && !metricsLoading && (
                <Badge 
                  variant={item.badge.variant || 'default'} 
                  className={cn(
                    "ml-auto text-xs",
                    // Glassmorphism badge effect
                    "backdrop-blur-sm",
                    item.badge.variant === 'destructive' && "animate-pulse"
                  )}
                >
                  {item.badge.content}
                </Badge>
              )}

              {/* Active indicator */}
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
              )}

              {/* Hover effect */}
              <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-accent/5 pointer-events-none" />
            </Link>
          );
        })}
      </div>

      {/* Area Status Indicator */}
      <div className="mt-6 px-3">
        <div className={cn(
          "p-3 rounded-lg border backdrop-blur-sm",
          metrics?.healthScore && metrics.healthScore < 70 
            ? 'border-orange-500/30 bg-orange-500/5' 
            : 'border-green-500/30 bg-green-500/5'
        )}>
          <div className="flex items-center space-x-2">
            {metrics?.healthScore && metrics.healthScore < 70 ? (
              <AlertCircle className="h-4 w-4 text-orange-500" />
            ) : (
              <TrendingUp className="h-4 w-4 text-green-500" />
            )}
            <span className="text-sm font-medium">
              Area Health
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Overall Score
              </span>
              <span className={cn(
                "font-medium",
                metrics?.healthScore && metrics.healthScore < 70 
                  ? 'text-orange-500' 
                  : 'text-green-500'
              )}>
                {metricsLoading ? '...' : `${metrics?.healthScore || 0}%`}
              </span>
            </div>
            <div className="mt-1 w-full bg-secondary/20 rounded-full h-1.5">
              <div 
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500",
                  metrics?.healthScore && metrics.healthScore < 70 
                    ? 'bg-orange-500' 
                    : 'bg-green-500'
                )}
                style={{ 
                  width: `${metrics?.healthScore || 0}%` 
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}