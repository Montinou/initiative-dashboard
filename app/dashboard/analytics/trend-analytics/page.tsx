"use client"

import React, { useMemo } from "react"
import useSWR from "swr"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from "recharts"
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Download
} from "lucide-react"
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { ChartLoadingSkeleton } from "@/components/dashboard/DashboardLoadingStates"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { useAuth } from "@/lib/auth-context"
import { AnalyticsFilterSidebar } from "@/components/analytics/AnalyticsFilterSidebar"
import { useAnalyticsFilters } from "@/contexts/AnalyticsFilterContext"

interface TrendDataPoint {
  date: string
  overallProgress: number
  completedInitiatives: number
  newInitiatives: number
  atRiskInitiatives: number
}

function TrendMetricCard({ 
  title, 
  value, 
  change, 
  icon: Icon,
  changeType = "neutral"
}: {
  title: string
  value: string | number
  change?: string
  icon: React.ElementType
  changeType?: "positive" | "negative" | "neutral"
}) {
  const changeColor = {
    positive: "text-green-500",
    negative: "text-red-500", 
    neutral: "text-gray-400"
  }

  const ChangeIcon = changeType === "positive" ? ArrowUp : 
                   changeType === "negative" ? ArrowDown : null

  return (
    <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
            {change && (
              <div className="flex items-center gap-1">
                {ChangeIcon && <ChangeIcon className={cn("h-3 w-3", changeColor[changeType])} />}
                <span className={cn("text-xs", changeColor[changeType])}>
                  {change}
                </span>
              </div>
            )}
          </div>
          <Icon className="h-8 w-8 text-primary" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function TrendAnalyticsPage() {
  const { profile, loading: authLoading, user } = useAuth()
  const t = useTranslations('analytics.trendAnalytics')
  const tCommon = useTranslations('analytics.common')
  const { getFilterParams } = useAnalyticsFilters()
  
  const [timeRange, setTimeRange] = React.useState("3months")
  
  // Don't render until auth is initialized
  if (authLoading) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-foreground">{t('title')}</h1>
        <ChartLoadingSkeleton />
      </div>
    )
  }

  // Redirect if not authenticated
  if (!user || !profile) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
    return null
  }
  
  // Build API URL with filter params
  const apiUrl = useMemo(() => {
    const params = getFilterParams()
    params.period = timeRange
    const queryString = new URLSearchParams(params).toString()
    return `/api/dashboard/trend-analytics${queryString ? `?${queryString}` : ''}`
  }, [getFilterParams, timeRange])
  
  // Only fetch when auth is complete
  const shouldFetch = !authLoading && user && profile
  const { data, error, isLoading, mutate } = useSWR(shouldFetch ? apiUrl : null)

  if (error) {
    return (
      <ErrorBoundary>
        <EmptyState
          icon={TrendingUp}
          title={t('error.title')}
          description={t('error.description')}
          action={{
            label: t('error.refresh'),
            onClick: () => window.location.reload()
          }}
        />
      </ErrorBoundary>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ChartLoadingSkeleton />
          <ChartLoadingSkeleton />
        </div>
      </div>
    )
  }

  const trendData: TrendDataPoint[] = data?.data || []
  
  // Calculate trend changes
  const latest = trendData[trendData.length - 1]
  const previous = trendData[trendData.length - 2]
  
  const progressChange = latest && previous 
    ? ((latest.overallProgress - previous.overallProgress) / previous.overallProgress * 100).toFixed(1)
    : "0"
  
  const completedChange = latest && previous
    ? latest.completedInitiatives - previous.completedInitiatives
    : 0

  const atRiskChange = latest && previous
    ? latest.atRiskInitiatives - previous.atRiskInitiatives
    : 0

  // Prepare combined chart data
  const combinedData = trendData.map(point => ({
    ...point,
    date: new Date(point.date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    })
  }))

  // Export function
  const handleExport = () => {
    const csv = [
      ['Date', 'Overall Progress', 'Completed Initiatives', 'New Initiatives', 'At Risk'],
      ...trendData.map(row => [
        row.date,
        row.overallProgress,
        row.completedInitiatives,
        row.newInitiatives,
        row.atRiskInitiatives
      ])
    ].map(row => row.join(',')).join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `trend-analytics-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <ErrorBoundary>
      <div className="flex gap-6">
        {/* Filter Sidebar */}
        <div className="w-64 flex-shrink-0">
          <AnalyticsFilterSidebar 
            onExport={handleExport}
            showStatusFilter={false}
            showPriorityFilter={false}
          />
        </div>
        
        {/* Main Content */}
        <div className="flex-1 space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{t('title')}</h1>
            <p className="text-gray-400 mt-2">
              {t('subtitle')}
            </p>
          </div>
          
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-48 bg-gray-900/50 border-white/10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1month">{t('timeRange.month')}</SelectItem>
              <SelectItem value="3months">3 {t('timeRange.month')}</SelectItem>
              <SelectItem value="6months">6 {t('timeRange.month')}</SelectItem>
              <SelectItem value="1year">{t('timeRange.year')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <TrendMetricCard
            title={t('metrics.progressTrend')}
            value={`${latest?.overallProgress || 0}%`}
            change={`${progressChange}% vs last period`}
            changeType={parseFloat(progressChange) >= 0 ? "positive" : "negative"}
            icon={TrendingUp}
          />
          
          <TrendMetricCard
            title={t('metrics.completionRate')}
            value={completedChange}
            change={completedChange > 0 ? t('insights.improving') : tCommon('neutral')}
            changeType={completedChange > 0 ? "positive" : "neutral"}
            icon={BarChart3}
          />
          
          <TrendMetricCard
            title={t('status.atRisk')}
            value={latest?.atRiskInitiatives || 0}
            change={`${atRiskChange >= 0 ? '+' : ''}${atRiskChange} vs last period`}
            changeType={atRiskChange <= 0 ? "positive" : "negative"}
            icon={TrendingDown}
          />
          
          <TrendMetricCard
            title={tCommon('period')}
            value={timeRange.replace(/(\d+)(\w+)/, '$1 $2')}
            icon={Calendar}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6">
          {/* Progress Trend */}
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {t('charts.progressOverTime')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.6)"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.6)"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px"
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="overallProgress"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.3}
                    name="Overall Progress %"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Multi-line Trend */}
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-secondary" />
                Initiative Status Trends
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={combinedData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis 
                    dataKey="date" 
                    stroke="rgba(255,255,255,0.6)"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="rgba(255,255,255,0.6)"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(0,0,0,0.8)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px"
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="completedInitiatives"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={{ fill: "#22c55e", strokeWidth: 2, r: 4 }}
                    name="Completed"
                  />
                  <Line
                    type="monotone"
                    dataKey="newInitiatives"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
                    name="New Initiatives"
                  />
                  <Line
                    type="monotone"
                    dataKey="atRiskInitiatives"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ fill: "#ef4444", strokeWidth: 2, r: 4 }}
                    name="At Risk"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Trend Summary */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Trend Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <h4 className="font-medium text-green-500">Positive Trends</h4>
                <ul className="space-y-1 text-sm text-gray-300">
                  {parseFloat(progressChange) > 0 && (
                    <li>• Overall progress increased by {progressChange}%</li>
                  )}
                  {completedChange > 0 && (
                    <li>• {completedChange} new initiatives completed</li>
                  )}
                  {atRiskChange < 0 && (
                    <li>• {Math.abs(atRiskChange)} fewer at-risk initiatives</li>
                  )}
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-500">Areas to Watch</h4>
                <ul className="space-y-1 text-sm text-gray-300">
                  {atRiskChange > 0 && (
                    <li>• {atRiskChange} more initiatives at risk</li>
                  )}
                  {parseFloat(progressChange) < -5 && (
                    <li>• Significant progress decline</li>
                  )}
                  <li>• Monitor completion velocity</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-medium text-blue-500">Key Insights</h4>
                <ul className="space-y-1 text-sm text-gray-300">
                  <li>• Data based on {timeRange.replace(/(\d+)(\w+)/, '$1 $2')}</li>
                  <li>• {trendData.length} data points analyzed</li>
                  <li>• Trends updated in real-time</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </ErrorBoundary>
  )
}