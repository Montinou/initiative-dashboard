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
    primary: "from-primary/30 to-primary/15 border-primary/30",
    secondary: "from-secondary/30 to-secondary/15 border-secondary/30",
    success: "from-green-600/30 to-green-800/20 border-green-500/30",
    warning: "from-yellow-600/30 to-yellow-800/20 border-yellow-500/30",
  }

  const trendDescription = trend ? 
    `${trend.isPositive ? 'Increased' : 'Decreased'} by ${Math.abs(trend.value)}% vs last month` : 
    undefined

  return (
    <Card 
      className={cn(
        "bg-gradient-to-br backdrop-blur-sm border focus-within:ring-2 focus-within:ring-primary/50",
        colorClasses[color]
      )}
      role="region"
      aria-labelledby={`metric-${title.replace(/\s+/g, '-').toLowerCase()}`}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle 
          id={`metric-${title.replace(/\s+/g, '-').toLowerCase()}`}
          className="text-sm font-medium text-gray-200"
        >
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-gray-400" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <div 
          className="text-2xl font-bold text-white"
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
            <span className="text-sm text-gray-400">vs last month</span>
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
  
  // Fetch multiple data endpoints using SWR with global config
  const { data: progressData, error: progressError } = useSWR(
    "/api/dashboard/progress-distribution"
  )
  
  const { data: statusData, error: statusError } = useSWR(
    "/api/dashboard/status-distribution"
  )
  
  const { data: areaData, error: areaError } = useSWR(
    "/api/dashboard/area-comparison"
  )

  const { data: objectivesData, error: objectivesError } = useSWR(
    "/api/dashboard/objectives"
  )

  const isLoading = !progressData || !statusData || !areaData || !objectivesData
  const hasError = progressError || statusError || areaError || objectivesError

  // Announce loading state changes
  React.useEffect(() => {
    if (hasError) {
      announceToScreenReader('Error loading dashboard data', 'assertive')
    } else if (!isLoading && progressData) {
      announceToScreenReader('Dashboard data loaded successfully', 'polite')
    }
  }, [isLoading, hasError, announceToScreenReader, progressData])

  if (hasError) {
    return (
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-white/10">
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
          loadingMessage="Loading dashboard data"
          successMessage="Dashboard loaded successfully"
        />
        <DashboardLoadingState />
      </>
    )
  }

  // Calculate overview metrics from the data
  const totalInitiatives = progressData?.data?.length || 0
  const totalAreas = areaData?.data?.length || 0
  const totalObjectives = objectivesData?.data?.length || 0
  
  // Calculate average progress with proper null handling
  const averageProgress = progressData?.data?.length > 0
    ? Math.round(
        progressData.data.reduce((acc: number, item: any) => {
          const progress = typeof item.progress === 'number' ? item.progress : 0
          return acc + progress
        }, 0) / progressData.data.length
      )
    : 0

  // Calculate status counts
  const activeCount = statusData?.data?.filter((item: any) => item.status === "Active").length || 0
  const completedCount = statusData?.data?.filter((item: any) => item.status === "Completed").length || 0

  return (
    <div>
      {/* Skip Links */}
      <SkipLinks />
      
      <div className="space-y-6">
        {/* Page Header */}
        <header id="main-content">
          <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-gray-400 mt-2">
            Monitor your strategic initiatives and key performance metrics
          </p>
        </header>

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
              title="Total Initiatives"
              value={totalInitiatives}
              icon={Zap}
              color="primary"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <MetricCard
              title="Active Areas"
              value={totalAreas}
              icon={Users}
              color="secondary"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <MetricCard
              title="Average Progress"
              value={averageProgress}
              icon={TrendingUp}
              suffix="%"
              color="success"
            />
          </motion.div>
          <motion.div variants={staggerItem}>
            <MetricCard
              title="Total Objectives"
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
            className="bg-gray-900/50 backdrop-blur-sm border border-white/10"
            role="region"
            aria-labelledby="status-summary-title"
          >
            <CardHeader>
              <CardTitle id="status-summary-title" className="text-white">
                Status Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Active Initiatives</span>
                  <span 
                    className="text-2xl font-bold text-white"
                    aria-label={`${activeCount} active initiatives`}
                  >
                    {activeCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Completed</span>
                  <span 
                    className="text-2xl font-bold text-green-500"
                    aria-label={`${completedCount} completed initiatives`}
                  >
                    {completedCount}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Completion Rate</span>
                  <span 
                    className="text-2xl font-bold text-white"
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
            className="bg-gray-900/50 backdrop-blur-sm border border-white/10"
            role="region"
            aria-labelledby="recent-activity-title"
          >
            <CardHeader>
              <CardTitle id="recent-activity-title" className="text-white">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3" role="list" aria-label="Recent activity items">
                <div className="flex items-center gap-3" role="listitem">
                  <div className="h-2 w-2 bg-gray-500 rounded-full" aria-hidden="true" />
                  <p className="text-sm text-gray-300">
                    No recent activity available
                  </p>
                </div>
                <div className="text-xs text-gray-500 mt-4">
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