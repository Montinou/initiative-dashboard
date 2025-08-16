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
  Activity,
  RefreshCw
} from "lucide-react"
// import { ErrorBoundary } from "@/components/dashboard/ErrorBoundary"
import { DashboardLoadingState } from "@/components/dashboard/DashboardLoadingStates"
import { EmptyState } from "@/components/dashboard/EmptyState"
import { staggerContainer, staggerItem } from "@/components/dashboard/PageTransition"
import { AIInsightsPanel } from "@/components/dashboard/AIInsightsPanel"
import { SkipLinks, AccessibilityProvider, LoadingAnnouncer, useAccessibility } from "@/components/ui/accessibility"
import { useAuth, useUserRole } from "@/lib/auth-context"
import { cn } from "@/lib/utils"
import { useTranslations } from 'next-intl'

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

// Function to generate AI insights from dashboard data
function generateInsights(data: {
  initiatives: any[],
  objectives: any[],
  areas: any[],
  totalInitiatives: number,
  completedCount: number,
  averageProgress: number
}) {
  const insights = {
    keyInsights: [],
    recommendations: [],
    risks: [],
    opportunities: [],
    summary: '',
    performanceHighlights: [],
    areaAnalysis: [],
    trendsAndPatterns: []
  }

  // Generate key insights based on actual data
  if (data.totalInitiatives > 0) {
    insights.keyInsights.push(
      `Actualmente tienes ${data.totalInitiatives} iniciativas activas con un progreso promedio del ${data.averageProgress}%`
    )
    
    if (data.completedCount > 0) {
      const completionRate = Math.round((data.completedCount / data.totalInitiatives) * 100)
      insights.keyInsights.push(
        `Se han completado ${data.completedCount} iniciativas (${completionRate}% de completitud)`
      )
    }
  }

  // Performance highlights
  if (data.averageProgress > 70) {
    insights.performanceHighlights.push(
      "Excelente progreso general: las iniciativas están avanzando por encima del 70%"
    )
  } else if (data.averageProgress < 40) {
    insights.risks.push(
      "El progreso promedio está por debajo del 40%, se requiere atención inmediata"
    )
  }

  // Area analysis
  if (data.areas && data.areas.length > 0) {
    insights.areaAnalysis.push(
      `${data.areas.length} áreas activas están gestionando las iniciativas actuales`
    )
    
    // Find top performing areas
    const topAreas = data.areas
      .filter((area: any) => area.averageProgress > 70)
      .map((area: any) => area.name)
    
    if (topAreas.length > 0) {
      insights.performanceHighlights.push(
        `Áreas destacadas: ${topAreas.slice(0, 3).join(', ')}`
      )
    }
  }

  // Recommendations based on data
  if (data.averageProgress < 50) {
    insights.recommendations.push(
      "Considera revisar los recursos asignados a las iniciativas con menor progreso"
    )
  }
  
  if (data.totalInitiatives > 20) {
    insights.recommendations.push(
      "Con más de 20 iniciativas activas, considera priorizar las más estratégicas"
    )
  }

  // Opportunities
  if (data.completedCount > 5) {
    insights.opportunities.push(
      "Alto número de iniciativas completadas - buen momento para lanzar nuevos proyectos estratégicos"
    )
  }

  // Risks
  const atRiskInitiatives = data.initiatives.filter(
    (i: any) => i.progress < 30 && i.status === 'in_progress'
  ).length
  
  if (atRiskInitiatives > 0) {
    insights.risks.push(
      `${atRiskInitiatives} iniciativas están en riesgo con menos del 30% de progreso`
    )
  }

  // Generate summary
  insights.summary = `Dashboard actualizado con ${data.totalInitiatives} iniciativas activas, ` +
    `${data.objectives.length} objetivos estratégicos y ${data.areas.length} áreas operativas. ` +
    `El progreso promedio es del ${data.averageProgress}%.`

  return insights
}

function DashboardContent() {
  const { profile, loading, user } = useAuth()
  const userRole = useUserRole()
  const { announceToScreenReader } = useAccessibility()
  const t = useTranslations('dashboard')
  
  // Only fetch when auth is complete and we have a valid user
  const shouldFetch = !loading && user && profile

  // Don't render until auth is initialized
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">{t('loadingDashboard')}</p>
        </div>
      </div>
    )
  }

  // Redirect if not authenticated (shouldn't happen with layout protection, but just in case)
  if (!user || !profile) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
    return null
  }
  
  // Fetch multiple data endpoints using SWR with global config - Only when auth is ready
  const { data: progressData, error: progressError } = useSWR(
    shouldFetch ? `/api/dashboard/progress-distribution` : null
  )
  
  const { data: statusData, error: statusError } = useSWR(
    shouldFetch ? `/api/dashboard/status-distribution` : null
  )
  
  const { data: areaData, error: areaError } = useSWR(
    shouldFetch ? `/api/dashboard/area-comparison` : null
  )

  const { data: objectivesData, error: objectivesError } = useSWR(
    shouldFetch ? `/api/dashboard/objectives?include_initiatives=true` : null
  )

  const isLoading = shouldFetch && (!progressData || !statusData || !areaData || !objectivesData)
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

  // Get data from API responses
  const filteredProgressData = progressData?.data || []
  const filteredStatusData = statusData?.data || []
  const filteredAreaData = areaData?.data || []
  
  // Handle both data formats from objectives endpoint first
  const objectives = objectivesData?.objectives || objectivesData?.data || []
  const filteredObjectives = objectives || []
  
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

        {/* Key Metrics Overview */}
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

        {/* AI Insights Panel - Main Focus */}
        <motion.div
          variants={staggerItem}
          initial="hidden"
          animate="show"
          className="mt-6"
        >
          <AIInsightsPanel 
            insights={generateInsights({
              initiatives: filteredProgressData,
              objectives: filteredObjectives,
              areas: filteredAreaData,
              totalInitiatives,
              completedCount,
              averageProgress
            })}
            timeRange="month"
            className=""
          />
        </motion.div>

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
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3" role="list" aria-label="Recent activity items">
                <div className="flex items-center gap-3" role="listitem">
                  <div className="h-2 w-2 bg-muted rounded-full" aria-hidden="true" />
                  <p className="text-sm text-muted-foreground">
                    No hay actividad reciente disponible
                  </p>
                </div>
                <div className="text-xs text-muted-foreground mt-4">
                  El seguimiento de actividad mostrará actualizaciones en tiempo real cuando se modifiquen las iniciativas
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