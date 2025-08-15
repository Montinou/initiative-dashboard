"use client"

import React, { useState, useMemo, lazy, Suspense } from "react"
import useSWR from "swr"
import { motion, AnimatePresence } from "framer-motion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { 
  Target, 
  TrendingUp, 
  Activity, 
  Users,
  BarChart3,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  AlertCircle,
  Eye,
  ChevronRight,
  Brain
} from "lucide-react"
import { useAuth, useAreaDataFilter } from "@/lib/auth-context"
import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { DashboardLoadingStates } from "@/components/dashboard/DashboardLoadingStates"
import { AIInsightsPanel } from "@/components/dashboard/AIInsightsPanel"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

// Lazy load performance-critical components
const EnhancedKPICard = lazy(() => 
  import("@/components/dashboard/KPIOverviewCard").then(module => ({ 
    default: module.KPIOverviewCard 
  }))
)

// ===================================================================================
// TYPES
// ===================================================================================

type UserRole = 'CEO' | 'Admin' | 'Manager' | 'Analyst'
type TimeRange = 'week' | 'month' | 'quarter' | 'year'
type ViewType = 'overview' | 'detailed'

interface EnhancedKPIDashboardProps {
  userRole: UserRole
  userAreaId?: string
  timeRange?: TimeRange
  viewType?: ViewType
  className?: string
}

interface KPICardData {
  id: string
  title: string
  value: number
  previousValue?: number
  trend?: {
    value: number
    isPositive: boolean
    period: string
  }
  icon: React.ElementType
  color: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  unit?: string
  prefix?: string
  suffix?: string
  description?: string
  areaId?: string
  category: 'strategic' | 'operational' | 'financial' | 'quality'
  drillDownData?: Array<Record<string, unknown>>
}

interface KPIAnalyticsResponse {
  success: boolean
  summary: {
    total_initiatives?: number
    previous_initiatives?: number
    avg_progress?: number
    previous_avg_progress?: number
    active_areas?: number
    completion_rate?: number
    previous_completion_rate?: number
  }
  area_metrics?: Array<{
    id: string
    name: string
    progress: number
  }>
  strategic_metrics?: Record<string, unknown>
  trends?: Array<{
    average_progress_change: number
    date: string
  }>
  insights?: string[]
  aiInsights?: {
    keyInsights: string[]
    recommendations: string[]
    risks: string[]
    opportunities: string[]
    summary: string
  }
  metadata: {
    user_role: string
    time_range: string
    last_updated: string
    cache_duration?: number
    aiInsightsEnabled?: boolean
  }
}

// ===================================================================================
// ANIMATED COUNTER COMPONENT
// ===================================================================================

function AnimatedCounter({ 
  value, 
  prefix = "", 
  suffix = "",
  duration = 1500
}: { 
  value: number
  prefix?: string
  suffix?: string
  duration?: number
}) {
  const [displayValue, setDisplayValue] = useState(0)

  React.useEffect(() => {
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
  }, [value, duration])

  return (
    <span className="tabular-nums">
      {prefix}{displayValue.toLocaleString()}{suffix}
    </span>
  )
}

// ===================================================================================
// KPI OVERVIEW CARD COMPONENT
// ===================================================================================

interface KPIOverviewCardProps {
  kpi: KPICardData
  onClick?: () => void
  isSelected?: boolean
  viewType: ViewType
}

function KPIOverviewCard({ kpi, onClick, isSelected, viewType }: KPIOverviewCardProps) {
  // Map the color scheme to our new component's color scheme
  const colorSchemeMap = {
    primary: 'info' as const,
    secondary: 'info' as const,
    success: 'success' as const,
    warning: 'warning' as const,
    danger: 'danger' as const,
  }

  // Convert trend data
  const trend = kpi.trend ? (kpi.trend.isPositive ? 'up' : 'down') as const : 'stable' as const
  const trendPercentage = kpi.trend ? kpi.trend.value : undefined

  // Generate some sample sparkline data based on the trend (mock data for now)
  const generateSparklineData = (currentValue: number, trendValue?: number): number[] => {
    const dataPoints = 8
    const baseValue = currentValue * 0.8
    const variance = currentValue * 0.2
    
    return Array.from({ length: dataPoints }, (_, i) => {
      const progress = i / (dataPoints - 1)
      const trendEffect = trendValue ? (trendValue / 100) * progress * currentValue * 0.1 : 0
      const randomVariance = (Math.random() - 0.5) * variance * 0.3
      return Math.max(0, baseValue + (progress * variance) + trendEffect + randomVariance)
    })
  }

  const sparklineData = generateSparklineData(kpi.value, kpi.trend?.value)

  // Create the unit string
  const unit = kpi.unit || (kpi.suffix ? kpi.suffix : '')

  const Icon = kpi.icon

  return (
    <Suspense fallback={
      <Card className="bg-card border-border animate-pulse">
        <CardContent className="p-4">
          <div className="h-20 bg-muted/20 rounded" />
        </CardContent>
      </Card>
    }>
      <EnhancedKPICard
        title={kpi.title}
        value={kpi.value}
        previousValue={kpi.previousValue}
        trend={trend}
        trendPercentage={trendPercentage}
        sparklineData={sparklineData}
        onClick={onClick}
        loading={false}
        colorScheme={colorSchemeMap[kpi.color]}
        unit={unit}
        description={viewType === 'detailed' ? kpi.description : undefined}
        showProgressRing={viewType === 'detailed' && kpi.category === 'operational'}
        maxValue={kpi.previousValue ? kpi.value + kpi.previousValue : undefined}
        animated={true}
        className={cn(
          isSelected && "ring-2 ring-ring border-ring/40"
        )}
        icon={<Icon className="h-4 w-4" />}
      />
    </Suspense>
  )
}

// ===================================================================================
// TIME RANGE SELECTOR COMPONENT
// ===================================================================================

interface TimeRangeSelectorProps {
  value: TimeRange
  onChange: (value: TimeRange) => void
  className?: string
}

function TimeRangeSelector({ value, onChange, className }: TimeRangeSelectorProps) {
  const timeRangeOptions = [
    { value: 'week' as TimeRange, label: 'Last Week' },
    { value: 'month' as TimeRange, label: 'Last Month' },
    { value: 'quarter' as TimeRange, label: 'Last Quarter' },
    { value: 'year' as TimeRange, label: 'Last Year' },
  ]

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn(
        "bg-background border-input w-40",
        className
      )}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border">
        {timeRangeOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ===================================================================================
// MAIN ENHANCED KPI DASHBOARD COMPONENT
// ===================================================================================

export function EnhancedKPIDashboard({
  userRole,
  userAreaId,
  timeRange: initialTimeRange = 'month',
  viewType: initialViewType = 'overview',
  className
}: EnhancedKPIDashboardProps) {
  const { profile } = useAuth()
  const { isAreaRestricted } = useAreaDataFilter()
  const t = useTranslations('dashboard')
  
  // State management
  const [timeRange, setTimeRange] = useState<TimeRange>(initialTimeRange)
  const [viewType, setViewType] = useState<ViewType>(initialViewType)
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null)
  // Removed refreshKey to prevent infinite loops

  // Build API URL with filters
  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      time_range: timeRange,
      include_insights: 'true',
      include_trends: 'true',
    })
    
    if (userAreaId && isAreaRestricted) {
      params.append('area_id', userAreaId)
    }
    
    return `/api/analytics/kpi?${params.toString()}`
  }, [timeRange, userAreaId, isAreaRestricted])

  // Fetch KPI data with SWR with enhanced caching and performance optimizations
  const { data, error, isLoading, mutate } = useSWR<KPIAnalyticsResponse>(
    apiUrl,
    {
      refreshInterval: 300000, // 5 minutes
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      revalidateIfStale: true,
      // Performance optimization: dedupe requests within 10s
      dedupingInterval: 10000,
      // Keep previous data while revalidating for better UX
      keepPreviousData: true,
      // Enable cache optimization for better performance
      suspense: false,
      // Remove complex compare function that might cause issues
    }
  )

  // Transform API data to KPI cards
  const kpiCards = useMemo(() => {
    if (!data?.success) return []

    const cards: KPICardData[] = []

    // Add summary cards
    if (data.summary) {
      if (data.summary.total_initiatives !== undefined) {
        cards.push({
          id: 'total_initiatives',
          title: t('metrics.totalInitiatives'),
          value: data.summary.total_initiatives,
          previousValue: data.summary.previous_initiatives,
          icon: Target,
          color: 'primary',
          category: 'strategic',
          description: t('metrics.activeInitiativesDescription')
        })
      }

      if (data.summary.avg_progress !== undefined) {
        cards.push({
          id: 'avg_progress',
          title: t('metrics.averageProgress'),
          value: Math.round(data.summary.avg_progress),
          previousValue: data.summary.previous_avg_progress,
          icon: TrendingUp,
          color: 'success',
          suffix: '%',
          category: 'operational',
          description: t('metrics.overallProgressDescription')
        })
      }

      if (data.summary.active_areas !== undefined) {
        cards.push({
          id: 'active_areas',
          title: t('metrics.activeAreas'),
          value: data.summary.active_areas,
          icon: Users,
          color: 'secondary',
          category: 'strategic',
          description: t('metrics.areasWithActivitiesDescription')
        })
      }

      if (data.summary.completion_rate !== undefined) {
        cards.push({
          id: 'completion_rate',
          title: t('metrics.completionRate'),
          value: Math.round(data.summary.completion_rate),
          previousValue: data.summary.previous_completion_rate,
          icon: Activity,
          color: 'warning',
          suffix: '%',
          category: 'quality',
          description: t('metrics.completedInitiativesDescription')
        })
      }
    }

    // Add area-specific metrics if available
    if (data.area_metrics && ['CEO', 'Admin'].includes(userRole)) {
      data.area_metrics.forEach((area, index) => {
        if (area.progress !== undefined) {
          cards.push({
            id: `area_${area.id}_progress`,
            title: `${area.name} Progress`,
            value: Math.round(area.progress),
            icon: BarChart3,
            color: index % 2 === 0 ? 'primary' : 'secondary',
            suffix: '%',
            category: 'operational',
            areaId: area.id,
            description: `Progress for ${area.name} area`
          })
        }
      })
    }

    // Add trend data as KPIs
    if (data.trends) {
      const trends = data.trends.slice(-1)[0] // Get latest trend
      if (trends?.average_progress_change) {
        cards.push({
          id: 'progress_trend',
          title: 'Progress Trend',
          value: Math.round(Math.abs(trends.average_progress_change)),
          trend: {
            value: Math.round(Math.abs(trends.average_progress_change)),
            isPositive: trends.average_progress_change > 0,
            period: 'last period'
          },
          icon: TrendingUp,
          color: trends.average_progress_change > 0 ? 'success' : 'danger',
          suffix: '%',
          category: 'operational',
          description: 'Average progress change trend'
        })
      }
    }

    return cards
  }, [data, userRole])

  // Filter KPIs based on role and view type
  const filteredKPIs = useMemo(() => {
    if (!kpiCards.length) return []

    let filtered = kpiCards

    // Role-based filtering
    if (userRole === 'Manager' && userAreaId) {
      filtered = filtered.filter(kpi => 
        !kpi.areaId || kpi.areaId === userAreaId || kpi.category === 'strategic'
      )
    }

    // View type filtering
    if (viewType === 'overview') {
      filtered = filtered.slice(0, 8) // Limit to top 8 KPIs
    }

    return filtered
  }, [kpiCards, userRole, userAreaId, viewType])

  // Handle refresh - memoized to prevent re-renders
  const handleRefresh = React.useCallback(() => {
    mutate()
  }, [mutate])

  // Handle KPI card click for drill-down - memoized to prevent re-renders
  const handleKPIClick = React.useCallback((kpiId: string) => {
    setSelectedKPI(prev => prev === kpiId ? null : kpiId)
  }, [])

  // Error state
  if (error) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h3 className="text-lg font-semibold text-foreground">
              Failed to load KPI data
            </h3>
            <p className="text-muted-foreground text-sm">
              {error.message || 'An error occurred while fetching KPI data'}
            </p>
            <Button 
              onClick={handleRefresh}
              variant="outline"
              className="bg-background border-border"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <ErrorBoundary>
      <div className={cn("space-y-6", className)}>
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-1">
              {t('title')}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t('subtitle')}
              {isAreaRestricted && profile?.area?.name && ` for ${profile.area.name}`}
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {/* View Type Toggle */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/20">
              <Button
                size="sm"
                variant={viewType === 'overview' ? 'default' : 'ghost'}
                onClick={() => setViewType('overview')}
                className="h-8 px-3 text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                {t('overview')}
              </Button>
              <Button
                size="sm"
                variant={viewType === 'detailed' ? 'default' : 'ghost'}
                onClick={() => setViewType('detailed')}
                className="h-8 px-3 text-xs"
              >
                <BarChart3 className="h-3 w-3 mr-1" />
                {t('detailed')}
              </Button>
            </div>

            {/* Time Range Selector */}
            <TimeRangeSelector 
              value={timeRange} 
              onChange={setTimeRange}
            />

            {/* Refresh Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
              className="bg-background border-border"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* KPI Cards Grid */}
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DashboardLoadingStates.DashboardLoadingState />
            </motion.div>
          ) : filteredKPIs.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Card className="bg-card border-border">
                <CardContent className="flex items-center justify-center p-12">
                  <div className="text-center space-y-3">
                    <Target className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                    <h3 className="text-lg font-semibold text-foreground">
                      No KPI data available
                    </h3>
                    <p className="text-muted-foreground text-sm max-w-md">
                      KPI data will appear here once initiatives and activities are created.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="kpis"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={cn(
                "grid gap-4",
                viewType === 'overview' 
                  ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4" 
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
              )}
            >
              {filteredKPIs.map((kpi, index) => (
                <motion.div
                  key={kpi.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <KPIOverviewCard
                    kpi={kpi}
                    onClick={() => handleKPIClick(kpi.id)}
                    isSelected={selectedKPI === kpi.id}
                    viewType={viewType}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* AI Insights Section - Replaces old insights */}
        {(data?.aiInsights || (data?.insights && data.insights.length > 0)) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <AIInsightsPanel
              insights={data.aiInsights || (data.insights ? {
                keyInsights: data.insights.slice(0, 5),
                recommendations: [],
                risks: [],
                opportunities: [],
                summary: ''
              } : undefined)}
              loading={isLoading}
              onRefresh={handleRefresh}
              timeRange={timeRange}
              lastUpdated={data?.metadata?.last_updated}
            />
          </motion.div>
        )}

        {/* Metadata Footer */}
        {data?.metadata && (
          <div className="text-center text-xs text-muted-foreground">
            Last updated: {new Date(data.metadata.last_updated).toLocaleString()} •{' '}
            Role: {data.metadata.user_role} •{' '}
            Period: {data.metadata.time_range}
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}

// Performance-optimized lazy loading wrapper
const LazyEnhancedKPIDashboard = React.memo(EnhancedKPIDashboard);

// Default export with performance optimizations
export default LazyEnhancedKPIDashboard;