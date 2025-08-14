"use client"

import React from "react"
import { motion } from "framer-motion"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Zap, 
  Users, 
  Target, 
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Activity
} from "lucide-react"
// import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingStates"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { staggerContainer, staggerItem } from "@/components/dashboard/PageTransition"
import { EnhancedKPIDashboard } from "@/components/dashboard/EnhancedKPIDashboard"
import { SkipLinks, AccessibilityProvider, LoadingAnnouncer, useAccessibility } from "@/components/ui/accessibility"
import { useAuth, useUserRole } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { useTranslations } from 'next-intl'
import { FilterContainer } from "@/components/filters/FilterContainer"
import { useEnhancedFilters } from "@/hooks/useFilters"

// Animated counter component
function AnimatedCounter({ value, prefix = "", suffix = "" }: { 
  value: number
  prefix?: string
  suffix?: string 
}) {
  const [displayValue, setDisplayValue] = React.useState(0)

  React.useEffect(() => {
    const duration = 1000
    const steps = 60
    const increment = value / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= value) {
        setDisplayValue(value)
        clearInterval(timer)
      } else {
        setDisplayValue(Math.floor(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [value])

  return (
    <span>
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  )
}

// Overview metric card component
function MetricCard({ 
  title, 
  value, 
  icon: Icon, 
  trend,
  prefix = "",
  suffix = "",
  color = "primary"
}: {
  title: string
  value: number
  icon: React.ElementType
  trend?: { value: number; isPositive: boolean }
  prefix?: string
  suffix?: string
  color?: "primary" | "secondary" | "success" | "warning"
}) {
  const colorClasses = {
    primary: "bg-primary/10 border-primary/30",
    secondary: "bg-secondary/10 border-secondary/30",
    success: "bg-primary/10 border-primary/30",
    warning: "bg-muted/10 border-border",
  }

  const trendDescription = trend ? 
    `${trend.isPositive ? 'Increased' : 'Decreased'} by ${Math.abs(trend.value)}% vs last month` : 
    undefined

  return (
    <Card 
      className={cn(
        "backdrop-blur-sm border focus-within:ring-2 focus-within:ring-ring/50",
        colorClasses[color]
      )}
      role="region"
      aria-labelledby={`metric-${title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle 
          id={`metric-${title.replace(/\s+/g, '-').toLowerCase()}`}
          className="text-sm font-medium text-muted-foreground"
        >
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div 
          className="text-2xl font-bold text-foreground"
          aria-label={`${title}: ${prefix}${value.toLocaleString()}${suffix}`}
        >
          <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2" aria-label={trendDescription}>
            {trend.isPositive ? (
              <ArrowUp className="h-4 w-4 text-green-500" aria-hidden="true" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500" aria-hidden="true" />
            )}
            <span className={cn(
              "text-sm",
              trend.isPositive ? "text-green-500" : "text-red-500"
            )}>
              {Math.abs(trend.value)}%
            </span>
            <span className="text-sm text-muted-foreground">vs last month</span>
            <span className="sr-only">{trendDescription}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DashboardContent() {
  const { profile } = useAuth()
  const userRole = useUserRole()
  const { announceToScreenReader } = useAccessibility()
  const t = useTranslations('dashboard')
  
  // Initialize enhanced filters for dashboard
  const { filters, applyFilters, toQueryParams } = useEnhancedFilters({
    persistToUrl: true,
    persistToLocalStorage: true
  })
  
  // Convert filters to query params for API calls
  const queryParams = toQueryParams()
  const queryString = new URLSearchParams(queryParams as any).toString()
  
  // Fetch multiple data endpoints using SWR with global config - now with filters
  const { data: progressData, error: progressError } = useSWR(
    `/api/dashboard/progress-distribution${queryString ? `?${queryString}` : ''}`
  )
  
  const { data: statusData, error: statusError } = useSWR(
    `/api/dashboard/status-distribution${queryString ? `?${queryString}` : ''}`
  )
  
  const { data: areaData, error: areaError } = useSWR(
    `/api/dashboard/area-comparison${queryString ? `?${queryString}` : ''}`
  )

  const { data: objectivesData, error: objectivesError } = useSWR(
    `/api/dashboard/objectives?include_initiatives=true${queryString ? `&${queryString}` : ''}`
  )

  const isLoading = !progressData || !statusData || !areaData || !objectivesData
  const hasError = progressError || statusError || areaError || objectivesError

  // Announce loading state changes
  React.useEffect(() => {
    if (hasError) {
      announceToScreenReader(t('loadingMessage'), 'assertive')
    } else if (!isLoading && progressData) {
      announceToScreenReader(t('loadedSuccessfully'), 'polite')
    }
  }, [isLoading, hasError, announceToScreenReader, progressData])

  if (hasError) {
    return (
      <div className="bg-card/50 backdrop-blur-sm rounded-2xl p-8 border border-border">
        <EmptyState
          icon={Activity}
          title="Unable to load dashboard data"
          description="There was an error loading the dashboard. Please try refreshing the page."
          action={{
            label: "Refresh",
            onClick: () => window.location.reload()
          }}
        />
      </div>
    )
  }

  if (isLoading) {
    return (
      <>
        <LoadingAnnouncer 
          isLoading={isLoading}
          loadingMessage={t('loadingMessage')}
          successMessage={t('loadedSuccessfully')}
        />
        <DashboardLoadingState />
      </>
    )
  }

  // Apply client-side filtering to data (as fallback if API doesn't support all filters)
  const filteredProgressData = progressData?.data ? applyFilters(progressData.data) : []
  const filteredStatusData = statusData?.data ? applyFilters(statusData.data) : []
  const filteredAreaData = areaData?.data ? applyFilters(areaData.data) : []
  
  // Handle both data formats from objectives endpoint first
  const objectives = objectivesData?.objectives || objectivesData?.data || []
  const filteredObjectives = objectives ? applyFilters(objectives) : []
  
  // Calculate overview metrics from the filtered data
  const totalInitiatives = filteredProgressData.length
  const totalAreas = filteredAreaData.length
  const totalObjectives = filteredObjectives.length
  
  // Calculate average progress with proper null handling
  const averageProgress = filteredProgressData.length > 0
    ? Math.round(
        filteredProgressData.reduce((acc: number, item: any) => {
          const progress = typeof item.progress === 'number' ? item.progress : 0
          return acc + progress
        }, 0) / filteredProgressData.length
      )
    : 0

  // Calculate status counts based on actual database values
  const activeCount = filteredStatusData.filter((item: any) => 
    item.status === "in_progress" || item.status === "planning"
  ).length || 0
  const completedCount = filteredStatusData.filter((item: any) => 
    item.status === "completed"
  ).length || 0

  return (
    <div>
      {/* Skip Links */}
      <SkipLinks />
      
      <div className="space-y-6">
        {/* Page Header */}
        <header id="main-content">
          <h1 className="text-3xl font-bold text-foreground">{t('overviewTitle')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('overview')}
          </p>
        </header>

        {/* Filter Container - Now at the top of the page */}
        <FilterContainer 
          onFiltersChange={(newFilters) => {
            // Filters are already handled via useEnhancedFilters hook
            // This callback is optional for additional handling if needed
          }}
          className="mb-6"
        />

        {/* Enhanced KPI Dashboard */}
        <motion.div
          variants={staggerItem}
          initial="hidden"
          animate="show"
        >
          <EnhancedKPIDashboard
            userRole={userRole || 'Analyst'}
            userAreaId={profile?.area_id || undefined}
            timeRange="month"
            viewType="overview"
          />
        </motion.div>

        {/* Legacy Metric Cards - Keep for comparison */}
        <motion.section
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          aria-label="Key Performance Metrics"
        >
          <motion.div variants={staggerItem}>
            <MetricCard
              title={t('metrics.totalInitiatives')}
              value={totalInitiatives}
              icon={Zap}
              color="primary"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <MetricCard
              title={t('metrics.activeAreas')}
              value={totalAreas}
              icon={Users}
              color="secondary"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <MetricCard
              title={t('metrics.averageProgress')}
              value={averageProgress}
              icon={TrendingUp}
              suffix="%"
              color="success"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <MetricCard
              title={t('metrics.totalObjectives')}
              value={totalObjectives}
              icon={Target}
              color="warning"
            />
          </motion.div>
        </motion.section>

        {/* Quick Stats */}
        <section 
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          aria-label="Quick Statistics"
        >
          {/* Status Summary */}
          <Card 
            className="bg-card backdrop-blur-sm border border-border"
            role="region"
            aria-labelledby="status-summary-title"
          >
            <CardHeader>
              <CardTitle id="status-summary-title" className="text-card-foreground">
                {t('status.title') || 'Status Summary'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('metrics.activeInitiatives')}</span>
                  <span 
                    className="text-2xl font-bold text-card-foreground"
                    aria-label={`${activeCount} active initiatives`}
                  >
                    {activeCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('status.completed')}</span>
                  <span 
                    className="text-2xl font-bold text-green-500"
                    aria-label={`${completedCount} completed initiatives`}
                  >
                    {completedCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('metrics.completionRate')}</span>
                  <span 
                    className="text-2xl font-bold text-card-foreground"
                    aria-label={`${totalInitiatives > 0 ? Math.round((completedCount / totalInitiatives) * 100) : 0}% completion rate`}
                  >
                    {totalInitiatives > 0 
                      ? Math.round((completedCount / totalInitiatives) * 100) 
                      : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card 
            className="bg-card backdrop-blur-sm border border-border"
            role="region"
            aria-labelledby="recent-activity-title"
          >
            <CardHeader>
              <CardTitle id="recent-activity-title" className="text-card-foreground">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3" role="list" aria-label="Recent activity items">
                <div className="flex items-center gap-3" role="listitem">
                  <div className="h-2 w-2 bg-muted rounded-full" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">
                    No recent activity available
                  </p>
                </div>
                <div className="text-xs text-muted-foreground mt-4">
                  Activity tracking will show real-time updates when initiatives are modified
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

// Main export with accessibility provider
export default function DashboardOverview() {
  return (
    <AccessibilityProvider>
      <DashboardContent />
    </AccessibilityProvider>
  )
}