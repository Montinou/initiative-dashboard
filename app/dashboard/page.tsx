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
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingStates"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { staggerContainer, staggerItem } from "@/components/dashboard/PageTransition"
import { swrConfig } from "@/lib/swr-config"
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
    primary: "from-primary/20 to-primary/5 border-primary/20",
    secondary: "from-secondary/20 to-secondary/5 border-secondary/20",
    success: "from-green-500/20 to-green-500/5 border-green-500/20",
    warning: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/20",
  }

  return (
    <Card className={cn(
      "bg-gradient-to-br backdrop-blur-sm border",
      colorClasses[color]
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-gray-200">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-gray-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-white">
          <AnimatedCounter value={value} prefix={prefix} suffix={suffix} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend.isPositive ? (
              <ArrowUp className="h-4 w-4 text-green-500" />
            ) : (
              <ArrowDown className="h-4 w-4 text-red-500" />
            )}
            <span className={cn(
              "text-sm",
              trend.isPositive ? "text-green-500" : "text-red-500"
            )}>
              {Math.abs(trend.value)}%
            </span>
            <span className="text-sm text-gray-400">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function DashboardOverview() {
  // Fetch multiple data endpoints
  const { data: progressData, error: progressError } = useSWR(
    "/api/dashboard/progress-distribution",
    swrConfig.fetcher
  )
  
  const { data: statusData, error: statusError } = useSWR(
    "/api/dashboard/status-distribution", 
    swrConfig.fetcher
  )
  
  const { data: areaData, error: areaError } = useSWR(
    "/api/dashboard/area-comparison",
    swrConfig.fetcher
  )

  const { data: objectivesData, error: objectivesError } = useSWR(
    "/api/dashboard/objectives",
    swrConfig.fetcher
  )

  const isLoading = !progressData || !statusData || !areaData || !objectivesData
  const hasError = progressError || statusError || areaError || objectivesError

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
    return <DashboardLoadingState />
  }

  // Calculate overview metrics from the data
  const totalInitiatives = progressData?.data?.length || 0
  const totalAreas = areaData?.data?.length || 0
  const totalObjectives = objectivesData?.data?.length || 0
  
  // Calculate average progress
  const averageProgress = progressData?.data?.length > 0
    ? Math.round(progressData.data.reduce((acc: number, item: any) => acc + item.progress, 0) / progressData.data.length)
    : 0

  // Calculate status counts
  const activeCount = statusData?.data?.filter((item: any) => item.status === "Active").length || 0
  const completedCount = statusData?.data?.filter((item: any) => item.status === "Completed").length || 0

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard Overview</h1>
          <p className="text-gray-400 mt-2">
            Monitor your strategic initiatives and key performance metrics
          </p>
        </div>

        {/* Metric Cards */}
        <motion.div 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={staggerItem}>
            <MetricCard
              title="Total Initiatives"
              value={totalInitiatives}
              icon={Zap}
              color="primary"
              trend={{ value: 12, isPositive: true }}
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
              trend={{ value: 8, isPositive: true }}
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
        </motion.div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Status Summary */}
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Status Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Active Initiatives</span>
                  <span className="text-2xl font-bold text-white">{activeCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Completed</span>
                  <span className="text-2xl font-bold text-green-500">{completedCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Completion Rate</span>
                  <span className="text-2xl font-bold text-white">
                    {totalInitiatives > 0 
                      ? Math.round((completedCount / totalInitiatives) * 100) 
                      : 0}%
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full" />
                  <p className="text-sm text-gray-300">
                    New initiative "Digital Transformation" created
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 bg-blue-500 rounded-full" />
                  <p className="text-sm text-gray-300">
                    Progress updated for "Customer Experience Enhancement"
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 bg-yellow-500 rounded-full" />
                  <p className="text-sm text-gray-300">
                    New objective added to Technology area
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  )
}