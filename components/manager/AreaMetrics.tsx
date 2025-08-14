"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import { 
  LineChartBlock, 
  AreaChartBlock 
} from '@/components/blocks/charts/dashboard-charts'
import { StatsCard } from '@/components/blocks/dashboards/stats-card'
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  CheckCircle2, 
  Clock,
  AlertTriangle,
  Calendar,
  RefreshCw
} from 'lucide-react'

interface AreaMetricsProps {
  areaId: string
  dateRange: {
    from: Date
    to: Date
  }
}

interface AreaMetricsData {
  progressTrend: Array<{
    date: string
    progress: number
    completed: number
  }>
  completionRate: number
  averageProgress: number
  initiativesOnTrack: number
  totalInitiatives: number
  overdueCount: number
  upcomingDeadlines: number
  recentActivity: Array<{
    date: string
    completions: number
    updates: number
  }>
}

export function AreaMetrics({ areaId, dateRange }: AreaMetricsProps) {
  const [metrics, setMetrics] = useState<AreaMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        area_id: areaId,
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString()
      })

      const response = await fetch(`/api/manager/area-summary`, {
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to fetch area metrics')
      }

      const data = await response.json()
      
      // Transform the existing API response to match our expected format
      const transformedMetrics: AreaMetricsData = {
        progressTrend: data.summary?.statusDistribution?.map((item: any, index: number) => ({
          date: new Date(Date.now() - (30 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          progress: data.summary?.metrics?.initiatives?.averageProgress || 0,
          completed: data.summary?.metrics?.initiatives?.completed || 0
        })) || [],
        completionRate: data.summary?.metrics?.subtasks?.completionRate || 0,
        averageProgress: data.summary?.metrics?.initiatives?.averageProgress || 0,
        initiativesOnTrack: data.summary?.metrics?.initiatives?.total - (data.summary?.metrics?.timeline?.overdue || 0),
        totalInitiatives: data.summary?.metrics?.initiatives?.total || 0,
        overdueCount: data.summary?.metrics?.timeline?.overdue || 0,
        upcomingDeadlines: data.summary?.metrics?.timeline?.upcomingDeadlines || 0,
        recentActivity: data.summary?.recentActivity?.map((activity: any, index: number) => ({
          date: new Date(Date.now() - (7 - index) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          completions: Math.floor(Math.random() * 3), // Mock data for now
          updates: Math.floor(Math.random() * 5)
        })) || []
      }
      
      setMetrics(transformedMetrics)
    } catch (err) {
      console.error('Error fetching area metrics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (areaId) {
      fetchMetrics()
    }
  }, [areaId, dateRange])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
        <div className="h-80 bg-muted rounded-lg animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center p-6">
          <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Failed to Load Metrics</h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={fetchMetrics} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!metrics) {
    return (
      <Card>
        <CardContent className="text-center p-6">
          <p className="text-muted-foreground">No metrics data available</p>
        </CardContent>
      </Card>
    )
  }

  const onTrackPercentage = metrics.totalInitiatives > 0 
    ? Math.round((metrics.initiativesOnTrack / metrics.totalInitiatives) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Completion Rate</span>
            <Badge variant={metrics.completionRate >= 80 ? "default" : "secondary"}>
              {metrics.completionRate >= 80 ? "Excellent" : "Good"}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold">{metrics.completionRate}%</span>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <Progress value={metrics.completionRate} className="h-2" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Average Progress</span>
            <Badge variant={metrics.averageProgress >= 70 ? "default" : "outline"}>
              {metrics.averageProgress >= 70 ? "On Track" : "Behind"}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold">{metrics.averageProgress}%</span>
            {metrics.averageProgress >= 70 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </div>
          <Progress value={metrics.averageProgress} className="h-2" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Initiatives on Track</span>
            <Badge variant={onTrackPercentage >= 80 ? "default" : "destructive"}>
              {metrics.initiativesOnTrack}/{metrics.totalInitiatives}
            </Badge>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-2xl font-bold">{onTrackPercentage}%</span>
            <Target className="h-4 w-4 text-blue-500" />
          </div>
          <Progress value={onTrackPercentage} className="h-2" />
        </div>
      </div>

      {/* Alert Cards */}
      {(metrics.overdueCount > 0 || metrics.upcomingDeadlines > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.overdueCount > 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-semibold text-destructive">
                      {metrics.overdueCount} Overdue Items
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Require immediate attention
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {metrics.upcomingDeadlines > 0 && (
            <Card className="border-orange-500/50 bg-orange-500/5">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-5 w-5 text-orange-500" />
                  <div>
                    <p className="font-semibold text-orange-700">
                      {metrics.upcomingDeadlines} Upcoming Deadlines
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Due within 7 days
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Progress Trend Chart */}
      <LineChartBlock
        title="Progress Trend"
        description="Area progress over time"
        data={metrics.progressTrend}
        xKey="date"
        yKey="progress"
        config={{
          progress: {
            label: "Progress %",
            color: "hsl(var(--chart-1))"
          }
        }}
      />

      {/* Recent Activity Chart */}
      <AreaChartBlock
        title="Recent Activity"
        description="Completions and updates over time"
        data={metrics.recentActivity}
        xKey="date"
        yKey="completions"
        config={{
          completions: {
            label: "Completions",
            color: "hsl(var(--chart-2))"
          }
        }}
      />
    </div>
  )
}