"use client";

import { 
  LazyAreaSummaryCards,
  LazyManagerActivityFeed,
  LazyAreaProgressVisualization,
  LazyQuickActions,
  ProgressiveDashboardLoader,
  LazyLoadOnScroll,
  SummaryCardsSkeleton
} from '@/components/manager/LazyComponents';
import { useAreaDisplay } from '@/components/manager/ManagerAreaProvider';
import { useIntelligentLoading } from '@/hooks/useIntelligentLoading';

/**
 * Manager Dashboard Home Page
 * 
 * Features:
 * - Comprehensive overview of area performance
 * - Real-time metrics and activity feeds
 * - Interactive charts and visualizations
 * - Quick actions for common manager tasks
 * - Responsive layout with glassmorphism design
 * - Area-scoped data isolation
 */
export default function ManagerDashboardPage() {
  const { displayName, loading, error } = useAreaDisplay();
  const { trackComponentInteraction, deviceCapabilities } = useIntelligentLoading();

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-2"></div>
          <div className="h-4 bg-muted rounded w-96"></div>
        </div>
        <div className="grid gap-6">
          <div className="h-48 bg-muted rounded"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-muted rounded"></div>
            <div className="h-96 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <svg className="w-12 h-12 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Unable to Load Dashboard
          </h2>
          <p className="text-muted-foreground mb-6">
            {error}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      {/* Dashboard Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          {displayName} Dashboard
        </h1>
        <p className="text-muted-foreground">
          Comprehensive overview of your area's initiatives, progress, and team activities
        </p>
      </div>

      {/* Summary Cards - Highest Priority */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Key Metrics</h2>
        <ProgressiveDashboardLoader priority="high">
          <LazyAreaSummaryCards />
        </ProgressiveDashboardLoader>
      </section>

      {/* Quick Actions - High Priority */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Quick Actions</h2>
        <ProgressiveDashboardLoader priority="high" delay={100}>
          <LazyQuickActions />
        </ProgressiveDashboardLoader>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Progress Visualization - Takes 2 columns on XL screens */}
        <section className="xl:col-span-2 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Progress Analytics</h2>
          <LazyLoadOnScroll 
            rootMargin={deviceCapabilities.connectionSpeed === 'fast' ? "200px" : "50px"}
            threshold={0.1}
          >
            <ProgressiveDashboardLoader priority="normal" delay={200}>
              <LazyAreaProgressVisualization />
            </ProgressiveDashboardLoader>
          </LazyLoadOnScroll>
        </section>

        {/* Activity Feed - Takes 1 column on XL screens */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Recent Activity</h2>
          <LazyLoadOnScroll 
            rootMargin={deviceCapabilities.connectionSpeed === 'fast' ? "300px" : "100px"}
            threshold={0.1}
          >
            <ProgressiveDashboardLoader priority="normal" delay={300}>
              <LazyManagerActivityFeed />
            </ProgressiveDashboardLoader>
          </LazyLoadOnScroll>
        </section>
      </div>

      {/* Additional Insights */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Area Health</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">Completion Rate</h3>
              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-green-600 mb-2">High</p>
            <p className="text-sm text-muted-foreground">Initiatives are completing on schedule</p>
          </div>

          <div className="p-6 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">Team Engagement</h3>
              <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-blue-600 mb-2">Active</p>
            <p className="text-sm text-muted-foreground">Team members are actively contributing</p>
          </div>

          <div className="p-6 rounded-lg bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-foreground">Resource Utilization</h3>
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-2xl font-bold text-purple-600 mb-2">Optimal</p>
            <p className="text-sm text-muted-foreground">Resources are being used efficiently</p>
          </div>
        </div>
      </section>
    </div>
  );
}