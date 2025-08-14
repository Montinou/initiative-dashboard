"use client"

import React, { useState, useMemo, useEffect } from "react"
import { motion } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"
import { 
  TrendingUp, 
  Target, 
  Users, 
  DollarSign,
  AlertTriangle,
  Activity,
  BarChart3,
  Calendar,
  Download,
  Plus,
  RefreshCw,
  Send,
  ChevronRight,
  Building2,
  CheckCircle,
  Clock,
  AlertCircle,
  TrendingDown
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { MetricsGrid } from "@/components/blocks/dashboards"
import { DataTable } from "@/components/blocks/tables"
import { 
  AreaChartBlock, 
  BarChartBlock, 
  LineChartBlock, 
  PieChartBlock,
  MultiLineChartBlock 
} from "@/components/blocks/charts"
import { useCEOMetrics } from "@/hooks/ceo/useCEOMetrics"
import { useStrategicOverview } from "@/hooks/ceo/useStrategicOverview"
import { useTeamPerformance } from "@/hooks/ceo/useTeamPerformance"
import { useRiskAnalysis } from "@/hooks/ceo/useRiskAnalysis"
import { InitiativeSubscriptions } from "@/lib/realtime/initiative-subscriptions"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import { LoadingWrapper, MetricsGridSkeleton, ChartSkeleton, TableSkeleton } from "@/components/ui/loading-states"
import { cn } from "@/lib/utils"

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const staggerItem = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 }
}

export default function CEODashboard() {
  const { profile } = useAuth()
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedTab, setSelectedTab] = useState("overview")
  const [timeRange, setTimeRange] = useState("month")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [subscriptionIds, setSubscriptionIds] = useState<string[]>([])

  // Fetch data using custom hooks with enhanced parameters
  const queryParams = useMemo(() => {
    const params = new URLSearchParams()
    if (dateRange?.from) params.set('start_date', dateRange.from.toISOString().split('T')[0])
    if (dateRange?.to) params.set('end_date', dateRange.to.toISOString().split('T')[0])
    if (!dateRange?.from && !dateRange?.to) params.set('time_range', timeRange)
    params.set('refresh', refreshKey.toString())
    return params.toString()
  }, [dateRange, timeRange, refreshKey])

  const { metrics, loading: metricsLoading, mutate: mutateMetrics } = useCEOMetrics(refreshKey)
  const { overview, loading: overviewLoading, mutate: mutateOverview } = useStrategicOverview(timeRange)
  const { teamData, loading: teamLoading, mutate: mutateTeam } = useTeamPerformance()
  const { risks, loading: risksLoading, mutate: mutateRisks } = useRiskAnalysis()

  const isLoading = metricsLoading || overviewLoading || teamLoading || risksLoading

  // Real-time subscriptions setup
  useEffect(() => {
    if (!profile?.tenant_id) return

    // Subscribe to initiative and activity changes for real-time updates
    const subscriptions = InitiativeSubscriptions.subscribeToInitiativeEcosystem(
      profile.tenant_id,
      undefined, // All areas for CEO view
      {
        onInitiativeChange: (event) => {
          console.log('Initiative changed:', event)
          // Refresh metrics when initiatives change
          mutateMetrics()
          mutateOverview()
        },
        onActivityChange: (event) => {
          console.log('Activity changed:', event)
          // Debounced refresh for activity changes
          setTimeout(() => {
            mutateMetrics()
          }, 1000)
        },
        onError: (error) => {
          console.error('Real-time subscription error:', error)
        }
      }
    )

    setSubscriptionIds(subscriptions)

    // Cleanup subscriptions on unmount
    return () => {
      InitiativeSubscriptions.unsubscribeMultiple(subscriptions)
    }
  }, [profile?.tenant_id, mutateMetrics, mutateOverview])

  // Transform metrics data for shadcn blocks
  const metricsData = useMemo(() => {
    if (!metrics) return []

    return [
      {
        id: 'total-initiatives',
        title: 'Total Initiatives',
        value: metrics.totalInitiatives || 0,
        description: 'Active and completed initiatives',
        icon: Target,
        trend: {
          value: metrics.trends?.initiatives || 0,
          isPositive: (metrics.trends?.initiatives || 0) >= 0,
          period: 'vs last period'
        },
        status: metrics.totalInitiatives > 10 ? 'success' : 'warning' as const
      },
      {
        id: 'completion-rate',
        title: 'Completion Rate',
        value: `${metrics.completionRate || 0}%`,
        description: 'Initiatives completed successfully',
        icon: CheckCircle,
        progress: metrics.completionRate || 0,
        status: (metrics.completionRate || 0) > 70 ? 'success' : (metrics.completionRate || 0) > 40 ? 'warning' : 'error' as const
      },
      {
        id: 'average-progress',
        title: 'Average Progress',
        value: `${metrics.averageProgress || 0}%`,
        description: 'Overall initiative progress',
        icon: TrendingUp,
        progress: metrics.averageProgress || 0,
        trend: {
          value: metrics.trends?.progress || 0,
          isPositive: (metrics.trends?.progress || 0) >= 0,
          period: 'this period'
        },
        status: (metrics.averageProgress || 0) > 70 ? 'success' : 'warning' as const
      },
      {
        id: 'objectives',
        title: 'Strategic Objectives',
        value: metrics.totalObjectives || 0,
        description: `${metrics.onTrackObjectives || 0} on track`,
        icon: Building2,
        progress: metrics.onTrackPercentage || 0,
        status: (metrics.onTrackPercentage || 0) > 75 ? 'success' : 'warning' as const
      },
      {
        id: 'team-members',
        title: 'Team Members',
        value: metrics.teamMembers || 0,
        description: `Across ${metrics.activeAreas || 0} areas`,
        icon: Users,
        status: 'info' as const
      },
      {
        id: 'at-risk',
        title: 'At Risk',
        value: metrics.atRiskCount || 0,
        description: 'Initiatives needing attention',
        icon: AlertTriangle,
        status: (metrics.atRiskCount || 0) === 0 ? 'success' : (metrics.atRiskCount || 0) < 3 ? 'warning' : 'error' as const
      }
    ]
  }, [metrics])

  // Transform area breakdown for data table
  const areaTableData = useMemo(() => {
    if (!metrics?.areaBreakdown) return []

    return metrics.areaBreakdown.map(area => ({
      id: area.id,
      area: area.name,
      manager: area.manager,
      initiatives: area.totalInitiatives,
      completed: area.completedInitiatives,
      progress: `${area.averageProgress}%`,
      objectives: area.totalObjectives,
      team: area.teamMembers,
      status: area.atRisk === 0 ? 'On Track' : area.atRisk < 3 ? 'At Risk' : 'Critical',
      risk: area.atRisk
    }))
  }, [metrics?.areaBreakdown])

  const areaTableColumns = [
    { key: 'area', header: 'Area', sortable: true },
    { key: 'manager', header: 'Manager', sortable: true },
    { key: 'initiatives', header: 'Initiatives', sortable: true },
    { key: 'completed', header: 'Completed', sortable: true },
    { key: 'progress', header: 'Avg Progress', sortable: true },
    { key: 'objectives', header: 'Objectives', sortable: true },
    { key: 'team', header: 'Team Size', sortable: true },
    { 
      key: 'status', 
      header: 'Status', 
      sortable: true,
      render: (value: string) => (
        <Badge 
          variant={value === 'On Track' ? 'default' : value === 'At Risk' ? 'secondary' : 'destructive'}
        >
          {value}
        </Badge>
      )
    }
  ]

  // Chart configurations
  const progressChartConfig = {
    progress: {
      label: "Progress",
      color: "hsl(var(--chart-1))",
    },
  }

  const areaPerformanceChartConfig = {
    completed: {
      label: "Completed",
      color: "hsl(var(--chart-1))",
    },
    pending: {
      label: "Pending", 
      color: "hsl(var(--chart-2))",
    },
  }

  // Chart data transformations
  const progressTrendData = useMemo(() => {
    if (!metrics?.timelineData) return []
    
    return metrics.timelineData.map(item => ({
      date: item.date,
      progress: item.progress,
      area: item.area
    }))
  }, [metrics?.timelineData])

  const areaPerformanceData = useMemo(() => {
    if (!metrics?.areaBreakdown) return []

    return metrics.areaBreakdown.map(area => ({
      area: area.name,
      completed: area.completedInitiatives,
      pending: area.totalInitiatives - area.completedInitiatives,
      total: area.totalInitiatives
    }))
  }, [metrics?.areaBreakdown])

  const statusDistributionData = useMemo(() => {
    if (!metrics) return []

    return [
      { name: 'Completed', value: metrics.completedInitiatives, fill: 'hsl(var(--chart-1))' },
      { name: 'In Progress', value: metrics.inProgressInitiatives, fill: 'hsl(var(--chart-2))' },
      { name: 'Overdue', value: metrics.overDueInitiatives, fill: 'hsl(var(--chart-3))' }
    ]
  }, [metrics])

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1)
    mutateMetrics()
    mutateOverview()
    mutateTeam()
    mutateRisks()
  }

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      const response = await fetch(`/api/ceo/export?format=${format}&${queryParams}`, {
        method: 'GET',
        credentials: 'include',
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `ceo-dashboard-${new Date().toISOString().split('T')[0]}.${format}`
        link.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Export failed:', error)
    }
  }

  // Quick action handlers
  const handleCreateObjective = () => {
    window.location.href = '/dashboard/objectives?action=create'
  }

  const handleTeamAnnouncement = () => {
    window.location.href = '/dashboard/announcements?action=create'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900/20 to-gray-900">
      {/* Header */}
      <div className="glassmorphic-card rounded-none border-x-0 border-t-0 mb-6">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                Executive Dashboard
              </h1>
              <p className="text-gray-400">
                Welcome back, {profile?.full_name || 'CEO'} • Real-time strategic insights
              </p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Range Picker */}
              <DateRangePicker
                date={dateRange}
                onDateChange={setDateRange}
                placeholder="Select date range"
                className="glassmorphic-card"
              />

              {/* Time Range Selector (when no date range selected) */}
              {!dateRange?.from && !dateRange?.to && (
                <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 backdrop-blur-xl">
                  {['week', 'month', 'quarter', 'year'].map((range) => (
                    <Button
                      key={range}
                      size="sm"
                      variant={timeRange === range ? 'default' : 'ghost'}
                      onClick={() => setTimeRange(range)}
                      className="h-8 px-3 text-xs capitalize"
                    >
                      {range}
                    </Button>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
                className="glassmorphic-button-ghost"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                Refresh
              </Button>
              
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport('pdf')}
                  className="glassmorphic-button-ghost"
                >
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport('excel')}
                  className="glassmorphic-button-ghost"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* KPI Metrics Grid using shadcn block */}
          <motion.div variants={staggerItem}>
            <ErrorBoundary>
              <LoadingWrapper 
                loading={metricsLoading} 
                skeleton={MetricsGridSkeleton}
              >
                <MetricsGrid 
                  metrics={metricsData}
                  columns={3}
                  className="glassmorphic-card"
                />
              </LoadingWrapper>
            </ErrorBoundary>
          </motion.div>

          {/* Main Dashboard Tabs */}
          <motion.div variants={staggerItem}>
            <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
              <TabsList className="glassmorphic-card p-1 w-full lg:w-auto">
                <TabsTrigger value="overview" className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Strategic Overview
                </TabsTrigger>
                <TabsTrigger value="performance" className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Performance
                </TabsTrigger>
                <TabsTrigger value="areas" className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Area Breakdown
                </TabsTrigger>
                <TabsTrigger value="risks" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Risk Analysis
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <ErrorBoundary>
                    <LoadingWrapper loading={overviewLoading} skeleton={ChartSkeleton}>
                      <LineChartBlock
                        title="Progress Trend"
                        description="Initiative progress over time"
                        data={progressTrendData}
                        xKey="date"
                        yKey="progress"
                        config={progressChartConfig}
                        className="glassmorphic-card"
                      />
                    </LoadingWrapper>
                  </ErrorBoundary>
                  
                  <ErrorBoundary>
                    <LoadingWrapper loading={overviewLoading} skeleton={ChartSkeleton}>
                      <PieChartBlock
                        title="Initiative Status Distribution"
                        description="Current status breakdown"
                        data={statusDistributionData}
                        dataKey="value"
                        nameKey="name"
                        config={{
                          completed: { label: "Completed", color: "hsl(var(--chart-1))" },
                          inProgress: { label: "In Progress", color: "hsl(var(--chart-2))" },
                          overdue: { label: "Overdue", color: "hsl(var(--chart-3))" }
                        }}
                        className="glassmorphic-card"
                      />
                    </LoadingWrapper>
                  </ErrorBoundary>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-6">
                <ErrorBoundary>
                  <LoadingWrapper loading={overviewLoading} skeleton={ChartSkeleton}>
                    <BarChartBlock
                      title="Area Performance Comparison"
                      description="Initiative completion by area"
                      data={areaPerformanceData}
                      xKey="area"
                      yKey="completed"
                      config={areaPerformanceChartConfig}
                      className="glassmorphic-card"
                    />
                  </LoadingWrapper>
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="areas" className="space-y-6">
                <ErrorBoundary>
                  <LoadingWrapper loading={metricsLoading} skeleton={TableSkeleton}>
                    <DataTable
                      title="Area Performance Overview"
                      description="Detailed breakdown by organizational area"
                      data={areaTableData}
                      columns={areaTableColumns}
                      searchable={true}
                      searchPlaceholder="Search areas..."
                      className="glassmorphic-card"
                    />
                  </LoadingWrapper>
                </ErrorBoundary>
              </TabsContent>

              <TabsContent value="risks" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Risk indicators */}
                  <Card className="glassmorphic-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2 text-white">
                        <AlertTriangle className="h-5 w-5 text-orange-500" />
                        At Risk Initiatives
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-orange-500 mb-2">
                        {metrics?.atRiskCount || 0}
                      </div>
                      <p className="text-sm text-gray-400">
                        Require immediate attention
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="glassmorphic-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2 text-white">
                        <Clock className="h-5 w-5 text-red-500" />
                        Overdue
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-500 mb-2">
                        {metrics?.overDueInitiatives || 0}
                      </div>
                      <p className="text-sm text-gray-400">
                        Past due date
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="glassmorphic-card">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center gap-2 text-white">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        Performance Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-500 mb-2">
                        {metrics?.performanceScore || 0}
                      </div>
                      <p className="text-sm text-gray-400">
                        Overall health metric
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Quick Actions Section */}
          <motion.div variants={staggerItem}>
            <Card className="glassmorphic-card">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button
                    variant="outline"
                    className="glassmorphic-button justify-start"
                    onClick={handleCreateObjective}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New Objective
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="glassmorphic-button justify-start"
                    onClick={() => window.location.href = '/dashboard/initiatives?action=assign'}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Assign Initiative
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="glassmorphic-button justify-start"
                    onClick={() => window.location.href = '/dashboard/analytics'}
                  >
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Reports
                  </Button>
                  
                  <Button
                    variant="outline"
                    className="glassmorphic-button justify-start"
                    onClick={handleTeamAnnouncement}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Team Announcement
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Executive Insights */}
          {metrics?.insights && metrics.insights.length > 0 && (
            <motion.div variants={staggerItem}>
              <Card className="glassmorphic-card">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Executive Insights
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {metrics.insights.map((insight: string, index: number) => (
                      <div 
                        key={index}
                        className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-white/80 text-sm leading-relaxed">
                          {insight}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Recent Activity Feed */}
          {metrics?.recentActivity && metrics.recentActivity.length > 0 && (
            <motion.div variants={staggerItem}>
              <Card className="glassmorphic-card">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {metrics.recentActivity.map((activity: any, index: number) => (
                      <div 
                        key={activity.id || index}
                        className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                      >
                        <div className="flex-shrink-0 w-2 h-2 bg-primary rounded-full mt-2"></div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-white text-sm font-medium">{activity.title}</h4>
                            <span className="text-xs text-gray-400">
                              {new Date(activity.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-gray-400 text-xs mt-1">{activity.description}</p>
                          {activity.area && (
                            <Badge variant="outline" className="mt-2 text-xs">
                              {activity.area}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  )
}