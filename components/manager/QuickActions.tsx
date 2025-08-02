"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAreaDisplay } from './ManagerAreaProvider';
import { useManagerMetrics } from '@/hooks/useManagerMetrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Plus, 
  FileUp, 
  Target, 
  Users, 
  BarChart3, 
  Download,
  Calendar,
  AlertTriangle,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ActionButtonProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  onClick: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

function ActionButton({ 
  icon: Icon, 
  title, 
  description, 
  badge, 
  onClick, 
  loading = false, 
  disabled = false,
  className = '' 
}: ActionButtonProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "h-auto p-6 flex flex-col items-start text-left space-y-3 group",
        "bg-gradient-to-br from-card/80 via-card/60 to-card/80",
        "backdrop-blur-sm border border-border/50",
        "hover:border-primary/30 hover:from-primary/5 hover:via-card/60 hover:to-primary/5",
        "transition-all duration-300 hover:shadow-lg",
        "relative overflow-hidden",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <div className="relative z-10 w-full">
        {/* Header with icon and badge */}
        <div className="flex items-center justify-between w-full mb-2">
          <Icon className="h-6 w-6 text-primary group-hover:text-primary/80 transition-colors" />
          {badge && (
            <Badge variant={badge.variant} className="text-xs">
              {badge.text}
            </Badge>
          )}
        </div>
        
        {/* Title and description */}
        <div className="space-y-1">
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>
        </div>
      </div>
    </Button>
  );
}

interface QuickActionsProps {
  className?: string;
}

/**
 * QuickActions Component
 * 
 * Features:
 * - Primary manager actions with real-time context
 * - Dynamic badges showing relevant metrics
 * - Glassmorphism design with hover effects
 * - Navigation integration with Next.js router
 * - Area-specific action availability
 * - Loading states and error handling
 */
export function QuickActions({ className = '' }: QuickActionsProps) {
  const router = useRouter();
  const { displayName, isActive } = useAreaDisplay();
  const { metrics, loading: metricsLoading } = useManagerMetrics();
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleNavigation = async (path: string, actionId: string) => {
    setActionLoading(actionId);
    try {
      router.push(path);
    } catch (error) {
      console.error('Navigation error:', error);
    } finally {
      // Reset loading state after a short delay
      setTimeout(() => setActionLoading(null), 1000);
    }
  };

  const actions: Omit<ActionButtonProps, 'onClick' | 'loading'>[] = [
    {
      icon: Plus,
      title: 'Create Initiative',
      description: 'Start a new initiative for your area with clear objectives and timeline',
      badge: metrics?.initiativesCount !== undefined ? {
        text: `${metrics.initiativesCount} Active`,
        variant: 'outline'
      } : undefined,
      disabled: !isActive
    },
    {
      icon: FileUp,
      title: 'Upload OKRs',
      description: 'Upload Excel file to create multiple initiatives and track progress',
      badge: metrics?.pendingUploads > 0 ? {
        text: `${metrics.pendingUploads} Pending`,
        variant: 'destructive'
      } : {
        text: 'Ready',
        variant: 'default'
      }
    },
    {
      icon: Target,
      title: 'My Initiatives',
      description: 'View and manage all initiatives in your area with detailed progress tracking',
      badge: metrics?.overdueCount > 0 ? {
        text: `${metrics.overdueCount} Overdue`,
        variant: 'destructive'
      } : undefined
    },
    {
      icon: BarChart3,
      title: 'Analytics',
      description: 'Deep dive into area performance metrics and generate detailed reports',
      badge: metrics?.trendsDetected > 0 ? {
        text: 'New Trends',
        variant: 'default'
      } : undefined
    },
    {
      icon: Users,
      title: 'Team Activities',
      description: 'Monitor team member activities and collaboration across initiatives',
      badge: metrics?.recentActivities > 0 ? {
        text: `${metrics.recentActivities} Recent`,
        variant: 'secondary'
      } : undefined
    },
    {
      icon: Download,
      title: 'Export Data',
      description: 'Download progress reports and data exports for stakeholder reviews',
      badge: {
        text: 'Generate',
        variant: 'outline'
      }
    }
  ];

  const actionPaths: Record<string, string> = {
    'Create Initiative': '/manager-dashboard/initiatives/new',
    'Upload OKRs': '/manager-dashboard/upload',
    'My Initiatives': '/manager-dashboard/initiatives',
    'Analytics': '/manager-dashboard/analytics',
    'Team Activities': '/manager-dashboard/team',
    'Export Data': '/manager-dashboard/export'
  };

  return (
    <Card className={cn(
      "bg-gradient-to-br from-card/80 via-card/60 to-card/80",
      "backdrop-blur-sm border-border/50",
      className
    )}>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5" />
            <span>Quick Actions</span>
          </div>
          {!isActive && (
            <Badge variant="destructive" className="text-xs">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Area Inactive
            </Badge>
          )}
        </CardTitle>
        {displayName && (
          <p className="text-sm text-muted-foreground">
            Manage {displayName} efficiently with these shortcuts
          </p>
        )}
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {actions.map((action) => (
            <ActionButton
              key={action.title}
              {...action}
              loading={actionLoading === action.title}
              onClick={() => handleNavigation(actionPaths[action.title], action.title)}
            />
          ))}
        </div>

        {/* Additional context for inactive areas */}
        {!isActive && (
          <div className="mt-6 p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
              <div>
                <h4 className="font-medium text-destructive">Area Not Active</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Some actions may be limited because this area is currently inactive. 
                  Contact your administrator to reactivate the area.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Loading state overlay */}
        {metricsLoading && (
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center rounded-lg">
            <div className="flex items-center space-x-2 text-muted-foreground">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
              <span className="text-sm">Loading actions...</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}