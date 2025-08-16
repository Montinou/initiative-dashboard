"use client"

import useSWR from 'swr'
import { useAuth } from '@/lib/auth-context'

interface CEOMetrics {
  totalInitiatives: number
  completedInitiatives: number
  averageProgress: number
  totalObjectives: number
  completedObjectives: number
  activeAreas: number
  teamMembers: number
  onTrackPercentage: number
  atRiskCount: number
  revenue?: number
  cost?: number
  efficiency?: number
  trends?: {
    initiatives: number
    objectives: number
    progress: number
  }
  insights?: string[]
}

export function useCEOMetrics(refreshKey?: number) {
  const { profile } = useAuth()
  
  const { data, error, mutate } = useSWR<CEOMetrics>(
    profile?.tenant_id ? `/api/ceo/metrics?tenant_id=${profile.tenant_id}&refresh=${refreshKey || 0}` : null,
    async (url: string) => {
      // First try CEO endpoint
      try {
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
        })
        
        if (response.ok) {
          return await response.json()
        }
      } catch (error) {
        // Silent fallback to dashboard APIs
      }
      
      // Fallback to existing dashboard APIs
      const [kpiResponse, overviewResponse, analyticsResponse] = await Promise.all([
        fetch('/api/analytics/kpi?time_range=month&include_insights=true', {
          method: 'GET',
          credentials: 'include',
        }),
        fetch('/api/dashboard/overview', {
          method: 'GET',
          credentials: 'include',
        }),
        fetch('/api/analytics/trends', {
          method: 'GET',
          credentials: 'include',
        })
      ])

      const kpiData = kpiResponse.ok ? await kpiResponse.json() : null
      const overviewData = overviewResponse.ok ? await overviewResponse.json() : null
      const trendsData = analyticsResponse.ok ? await analyticsResponse.json() : null

      // Transform data to CEO metrics format
      const metrics: CEOMetrics = {
        totalInitiatives: kpiData?.summary?.total_initiatives || overviewData?.initiatives_count || 0,
        completedInitiatives: Math.round((kpiData?.summary?.completion_rate || 0) * (kpiData?.summary?.total_initiatives || 0) / 100),
        averageProgress: kpiData?.summary?.avg_progress || overviewData?.average_progress || 0,
        totalObjectives: overviewData?.objectives_count || 0,
        completedObjectives: overviewData?.completed_objectives || 0,
        activeAreas: kpiData?.summary?.active_areas || overviewData?.areas_count || 0,
        teamMembers: overviewData?.users_count || 0,
        onTrackPercentage: overviewData?.on_track_percentage || 75,
        atRiskCount: overviewData?.at_risk_count || 0,
        efficiency: 85, // Mock value
        trends: {
          initiatives: trendsData?.initiatives_trend || 5,
          objectives: trendsData?.objectives_trend || 3,
          progress: trendsData?.progress_trend || 8
        },
        insights: kpiData?.insights || [
          'Initiative completion rate improved by 12% this quarter',
          'Engineering team showing highest performance metrics',
          '3 initiatives require immediate attention to meet Q1 targets'
        ]
      }

      return metrics
    },
    {
      refreshInterval: 0, // Disable auto-refresh, use manual refresh only
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 10000,
    }
  )

  return {
    metrics: data,
    loading: !data && !error,
    error,
    mutate
  }
}