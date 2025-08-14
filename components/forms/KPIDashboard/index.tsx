/**
 * Enhanced KPI Dashboard Component
 * 
 * Real-time KPI dashboard with metrics from Phase 1 APIs,
 * role-based filtering, and glassmorphism design
 * 
 * @author Claude Code Assistant
 * @date 2025-08-04
 */

'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  Users, 
  DollarSign,
  BarChart3,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Eye,
  Calendar
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUserProfile } from '@/hooks/useUserProfile'
import { getTenantIdFromLocalStorage } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { KPIMetrics } from './KPIMetrics'
import { TrendCharts } from './TrendCharts'
import { RoleBasedFilters } from './RoleBasedFilters'

// ===================================================================================
// TYPES AND INTERFACES
// ===================================================================================

interface KPISummary {
  total_initiatives: number
  strategic_initiatives: number
  completed_initiatives: number
  in_progress_initiatives: number
  average_progress: number
  total_budget: number
  actual_cost: number
  average_weight_factor: number
  completion_rate: number
  on_time_delivery_rate: number
  budget_adherence_rate: number
  strategic_completion_rate: number
}

interface StrategicMetrics {
  strategic_value_score: number
  portfolio_health_score: number
  resource_utilization: number
  risk_assessment: 'low' | 'medium' | 'high'
  strategic_alignment: number
}

interface TrendData {
  date: string
  total_progress: number
  completed_count: number
  strategic_count: number
  budget_utilization: number
}

interface KPIFilters {
  area_id?: string
  status?: string
  is_strategic?: boolean
  kpi_category?: string
  date_range?: {
    start: string
    end: string
  }
}

interface KPIDashboardProps {
  className?: string
  autoRefresh?: boolean
  refreshInterval?: number
}

// ===================================================================================
// MAIN DASHBOARD COMPONENT
// ===================================================================================

export function KPIDashboard({ 
  className, 
  autoRefresh = true, 
  refreshInterval = 30000 
}: KPIDashboardProps) {
  
  const { userProfile, loading: profileLoading } = useUserProfile()
  
  // State management
  const [kpiSummary, setKpiSummary] = useState<KPISummary | null>(null)
  const [strategicMetrics, setStrategicMetrics] = useState<StrategicMetrics | null>(null)
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [filters, setFilters] = useState<KPIFilters>({})

  // ===================================================================================
  // DATA FETCHING
  // ===================================================================================

  const fetchKPIData = async () => {
    if (!userProfile) return

    try {
      setError(null)
      const tenantId = getTenantIdFromLocalStorage()
      const headers: Record<string, string> = {}
      
      if (tenantId) {
        headers['x-tenant-id'] = tenantId
      }

      // Build query parameters for filtering
      const queryParams = new URLSearchParams()
      if (filters.area_id) queryParams.append('area_id', filters.area_id)
      if (filters.status) queryParams.append('status', filters.status)
      if (filters.is_strategic !== undefined) queryParams.append('is_strategic', filters.is_strategic.toString())
      if (filters.kpi_category) queryParams.append('kpi_category', filters.kpi_category)
      if (filters.date_range) {
        queryParams.append('start_date', filters.date_range.start)
        queryParams.append('end_date', filters.date_range.end)
      }
      queryParams.append('include_kpi_summary', 'true')

      // Fetch initiatives with KPI summary
      const initiativesResponse = await fetch(`/api/initiatives?${queryParams.toString()}`, {
        headers,
        credentials: 'include'
      })

      if (!initiativesResponse.ok) {
        throw new Error(`Failed to fetch initiatives: ${initiativesResponse.status}`)
      }

      const initiativesData = await initiativesResponse.json()

      if (!initiativesData.success) {
        throw new Error(initiativesData.error || 'Failed to fetch KPI data')
      }

      setKpiSummary(initiativesData.kpi_summary)
      setStrategicMetrics(initiativesData.strategic_metrics)

      // Fetch trend data from analytics API
      const trendsResponse = await fetch('/api/analytics/trends', {
        headers,
        credentials: 'include'
      })

      if (trendsResponse.ok) {
        const trendsData = await trendsResponse.json()
        if (trendsData.success) {
          setTrendData(trendsData.trends || [])
        }
      }

      setLastUpdated(new Date())
      
      if (!loading) {
        toast({
          title: 'Dashboard Updated',
          description: 'KPI metrics refreshed successfully'
        })
      }

    } catch (err) {
      console.error('Error fetching KPI data:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to load KPI data'
      setError(errorMessage)
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  // Initial load
  useEffect(() => {
    fetchKPIData()
  }, [userProfile, filters])

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh || loading) return

    const interval = setInterval(fetchKPIData, refreshInterval)
    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, loading, filters])

  // ===================================================================================
  // RENDER HELPERS
  // ===================================================================================

  const renderLoadingState = () => (
    <div className="space-y-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-lg p-6 animate-pulse">
          <div className="h-4 bg-secondary rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-8 bg-secondary rounded w-1/2"></div>
            <div className="h-3 bg-secondary rounded w-3/4"></div>
          </div>
        </div>
      ))}
    </div>
  )

  const renderErrorState = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border rounded-lg p-8 text-center"
    >
      <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-foreground mb-2">Failed to Load Dashboard</h3>
      <p className="text-muted-foreground mb-4">{error}</p>
      <Button
        onClick={fetchKPIData}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Try Again
      </Button>
    </motion.div>
  )

  // ===================================================================================
  // MAIN RENDER
  // ===================================================================================

  if (profileLoading) {
    return renderLoadingState()
  }

  if (error && !kpiSummary) {
    return renderErrorState()
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-lg p-6"
      >
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
              <BarChart3 className="w-7 h-7 text-primary" />
              KPI Dashboard
              {userProfile?.role === 'Manager' && (
                <Badge className="bg-primary text-primary-foreground">
                  <Users className="w-3 h-3 mr-1" />
                  {userProfile.area || 'Area View'}
                </Badge>
              )}
            </h1>
            <p className="text-muted-foreground mt-1">
              Real-time performance metrics and strategic insights
            </p>
          </div>

          <div className="flex items-center gap-3">
            {lastUpdated && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Last updated: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={fetchKPIData}
              disabled={loading}
              className="border-border"
            >
              <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Role-Based Filters */}
      <RoleBasedFilters
        userProfile={userProfile}
        filters={filters}
        onFiltersChange={setFilters}
        loading={loading}
      />

      {/* KPI Metrics Grid */}
      <KPIMetrics
        kpiSummary={kpiSummary}
        strategicMetrics={strategicMetrics}
        userProfile={userProfile}
        loading={loading}
      />

      {/* Trend Charts */}
      <TrendCharts
        trendData={trendData}
        userProfile={userProfile}
        loading={loading}
      />

      {/* Performance Insights */}
      {kpiSummary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-lg p-6"
        >
          <div className="flex items-center gap-2 mb-4">
            <Eye className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-semibold">Performance Insights</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Completion Rate Insight */}
            <div className="p-4 bg-secondary/50 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium">Completion Rate</span>
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {(kpiSummary.completion_rate * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">
                {kpiSummary.completion_rate >= 0.8 ? 'Excellent performance' :
                 kpiSummary.completion_rate >= 0.6 ? 'Good progress' :
                 'Needs attention'}
              </div>
            </div>

            {/* Budget Performance */}
            <div className="p-4 bg-secondary/50 rounded-lg border border-border">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-blue-400" />
                <span className="text-sm font-medium">Budget Adherence</span>
              </div>
              <div className="text-2xl font-bold text-foreground mb-1">
                {(kpiSummary.budget_adherence_rate * 100).toFixed(1)}%
              </div>
              <div className="text-xs text-muted-foreground">
                ${kpiSummary.actual_cost.toLocaleString()} of ${kpiSummary.total_budget.toLocaleString()}
              </div>
            </div>

            {/* Strategic Progress */}
            {strategicMetrics && (
              <div className="p-4 bg-secondary/50 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium">Strategic Health</span>
                </div>
                <div className="text-2xl font-bold text-foreground mb-1">
                  {strategicMetrics.portfolio_health_score.toFixed(1)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Portfolio health score
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default KPIDashboard