"use client";

import { useManagerMetrics } from '@/hooks/useManagerMetrics';
import { useManagerAreaData } from '@/hooks/useManagerAreaData';
import { useAreaDisplay } from './ManagerAreaProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { SummaryCardSkeleton, LoadingSpinner } from './LoadingComponents';
import { 
  Target, 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  FileText,
  Activity
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  progress?: number;
  badge?: {
    text: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  loading?: boolean;
  className?: string;
}

function MetricCard({ 
  icon: Icon, 
  title, 
  value, 
  subtitle, 
  trend, 
  progress, 
  badge, 
  loading = false,
  className = '' 
}: MetricCardProps) {
  if (loading) {
    return (
      <Card className={cn("relative overflow-hidden", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg group",
      "bg-gradient-to-br from-card/80 via-card/60 to-card/80",
      "backdrop-blur-sm border-border/50",
      "hover:border-primary/30 hover:from-primary/5 hover:via-card/60 hover:to-primary/5",
      className
    )}>
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span className="text-muted-foreground">{title}</span>
          <div className="flex items-center space-x-2">
            {badge && (
              <Badge variant={badge.variant} className="text-xs">
                {badge.text}
              </Badge>
            )}
            <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-2">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-foreground">{value}</span>
            {trend && (
              <div className={cn(
                "flex items-center text-sm font-medium",
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}>
                <TrendingUp className={cn(
                  "h-3 w-3 mr-1",
                  !trend.isPositive && "rotate-180"
                )} />
                {trend.value}% {trend.label}
              </div>
            )}
          </div>
          
          {subtitle && (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          )}
          
          {progress !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AreaSummaryCardsProps {
  className?: string;
}

/**
 * AreaSummaryCards Component
 * 
 * Features:
 * - Real-time metrics from database using useManagerMetrics hook
 * - Glassmorphism design with hover effects
 * - Progress indicators and trend analysis
 * - Responsive grid layout
 * - Area-specific data filtering
 * - Live data subscriptions
 */
export function AreaSummaryCards({ className = '' }: AreaSummaryCardsProps) {
  const { metrics, loading: metricsLoading, error: metricsError, progress: metricsProgress } = useManagerMetrics();
  const { data: areaData, loading: areaLoading, progress: areaProgress } = useManagerAreaData();
  const { displayName, isActive } = useAreaDisplay();

  const loading = metricsLoading || areaLoading;
  const overallProgress = Math.max(metricsProgress || 0, areaProgress || 0);

  // Calculate derived metrics
  const completionRate = metrics?.initiativesCount > 0 
    ? Math.round((metrics.completedCount / metrics.initiativesCount) * 100)
    : 0;
    
  const activeInitiativesCount = (metrics?.initiativesCount || 0) - (metrics?.completedCount || 0);
  
  const overallProgress = metrics?.averageProgress || 0;

  const cards: Omit<MetricCardProps, 'loading'>[] = [
    {
      icon: Target,
      title: 'Total Initiatives',
      value: metrics?.initiativesCount || 0,
      subtitle: `${activeInitiativesCount} active, ${metrics?.completedCount || 0} completed`,
      trend: metrics?.trends?.initiatives ? {
        value: Math.abs(metrics.trends.initiatives),
        label: 'vs last month',
        isPositive: metrics.trends.initiatives > 0
      } : undefined,
      badge: isActive ? { text: 'Active Area', variant: 'default' } : { text: 'Inactive', variant: 'secondary' }
    },
    {
      icon: CheckCircle2,
      title: 'Completion Rate',
      value: `${completionRate}%`,
      subtitle: `${metrics?.completedCount || 0} of ${metrics?.initiativesCount || 0} completed`,
      progress: completionRate,
      trend: metrics?.trends?.completion ? {
        value: Math.abs(metrics.trends.completion),
        label: 'vs last month',
        isPositive: metrics.trends.completion > 0
      } : undefined,
      badge: completionRate >= 80 ? { text: 'Excellent', variant: 'default' } : 
             completionRate >= 60 ? { text: 'Good', variant: 'outline' } : 
             { text: 'Needs Attention', variant: 'destructive' }
    },
    {
      icon: Activity,
      title: 'Overall Progress',
      value: `${Math.round(overallProgress)}%`,
      subtitle: 'Average across all initiatives',
      progress: overallProgress,
      trend: metrics?.trends?.progress ? {
        value: Math.abs(metrics.trends.progress),
        label: 'vs last month', 
        isPositive: metrics.trends.progress > 0
      } : undefined,
      badge: overallProgress >= 75 ? { text: 'On Track', variant: 'default' } : 
             overallProgress >= 50 ? { text: 'At Risk', variant: 'outline' } : 
             { text: 'Behind', variant: 'destructive' }
    },
    {
      icon: Users,
      title: 'Team Members',
      value: areaData?.teamMembersCount || 0,
      subtitle: `Active in ${displayName}`,
      badge: { text: 'Team Size', variant: 'outline' }
    },
    {
      icon: Clock,
      title: 'Overdue Items',
      value: metrics?.overdueCount || 0,
      subtitle: metrics?.overdueCount ? 'Require immediate attention' : 'All on schedule',
      badge: metrics?.overdueCount > 0 
        ? { text: 'Action Needed', variant: 'destructive' }
        : { text: 'On Schedule', variant: 'default' }
    },
    {
      icon: FileText,
      title: 'Recent Uploads',
      value: metrics?.recentUploads || 0,
      subtitle: 'Files uploaded this month',
      badge: metrics?.pendingUploads > 0 
        ? { text: `${metrics.pendingUploads} Pending`, variant: 'destructive' }
        : { text: 'All Processed', variant: 'default' }
    }
  ];

  if (metricsError) {
    return (
      <div className={cn("grid gap-4", className)}>
        <Card className="col-span-full">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Failed to load area metrics. Please try again.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={cn(
        "grid gap-4 md:gap-6",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
        className
      )}>
        {Array.from({ length: 6 }).map((_, index) => (
          <SummaryCardSkeleton 
            key={index}
            className={cn(
              index === 0 && "sm:col-span-2 lg:col-span-2",
              index === 1 && "sm:col-span-2 lg:col-span-2", 
              index === 2 && "sm:col-span-2 lg:col-span-2",
              index >= 3 && "sm:col-span-1 lg:col-span-1"
            )}
          />
        ))}
        {overallProgress > 0 && (
          <div className="col-span-full mt-2">
            <div className="flex items-center space-x-2 text-sm text-white/70">
              <LoadingSpinner size="sm" />
              <span>Loading metrics... {Math.round(overallProgress)}%</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      "grid gap-4 md:gap-6",
      "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6",
      className
    )}>
      {cards.map((card, index) => (
        <MetricCard
          key={card.title}
          {...card}
          loading={loading}
          className={cn(
            // Responsive column spans
            index === 0 && "sm:col-span-2 lg:col-span-2", // Total Initiatives - larger
            index === 1 && "sm:col-span-2 lg:col-span-2", // Completion Rate - larger  
            index === 2 && "sm:col-span-2 lg:col-span-2", // Overall Progress - larger
            index >= 3 && "sm:col-span-1 lg:col-span-1" // Smaller cards
          )}
        />
      ))}
    </div>
  );
}