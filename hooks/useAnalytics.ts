import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'

interface AnalyticsOverview {
  totalInitiatives: number
  totalAreas: number
  totalUsers: number
  totalActivities: number
  initiativesByStatus: {
    planning: number
    in_progress: number
    completed: number
    on_hold: number
  }
  averageProgress: number
  usersByRole: {
    CEO: number
    Admin: number
    Manager: number
    Analyst: number
  }
}

interface TrendData {
  month: string
  count?: number
  progress?: number
  activeUsers?: number
}

interface AnalyticsTrends {
  initiativeCreationTrend: TrendData[]
  progressTrend: TrendData[]
  userActivityTrend: Array<{
    date: string
    activeUsers: number
  }>
}

interface AreaPerformance {
  areaId: string
  areaName: string
  totalInitiatives: number
  completedInitiatives: number
  completionRate: number
  averageProgress: number
}

interface AnalyticsPerformance {
  completionRate: number
  onTimeCompletionRate: number
  averageTimeToCompletion: number
  areaPerformance: AreaPerformance[]
}

interface AnalyticsData {
  overview: AnalyticsOverview
  trends: AnalyticsTrends
  performance: AnalyticsPerformance
}

interface UseAnalyticsParams {
  timeframe?: string // '7', '30', '90', '365'
  metric?: 'overview' | 'trends' | 'performance'
}

export function useAnalytics(params: UseAnalyticsParams = {}) {
  const { profile, loading: authLoading } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    // Wait for auth to complete
    if (authLoading) {
      console.log('useAnalytics: Auth still loading, waiting...')
      return
    }

    if (!profile?.tenant_id) {
      console.log('useAnalytics: No tenant_id available yet')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      
      // Build query parameters
      const searchParams = new URLSearchParams()
      if (params.timeframe) searchParams.set('timeframe', params.timeframe)
      if (params.metric) searchParams.set('metric', params.metric)
      // Add tenant_id to query params
      searchParams.set('tenant_id', profile.tenant_id)

      const response = await fetch(`/api/analytics?${searchParams.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch analytics')
      }

      const data = await response.json()
      setData(data)
      setError(null)
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [profile?.tenant_id, authLoading, params.timeframe, params.metric])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const refetch = useCallback(() => {
    return fetchAnalytics()
  }, [fetchAnalytics])

  return {
    data,
    overview: data?.overview,
    trends: data?.trends,
    performance: data?.performance,
    loading,
    error,
    refetch
  }
}

// Specialized hooks for specific analytics sections
export function useAnalyticsOverview(timeframe?: string) {
  return useAnalytics({ timeframe, metric: 'overview' })
}

export function useAnalyticsTrends(timeframe?: string) {
  return useAnalytics({ timeframe, metric: 'trends' })
}

export function useAnalyticsPerformance(timeframe?: string) {
  return useAnalytics({ timeframe, metric: 'performance' })
}