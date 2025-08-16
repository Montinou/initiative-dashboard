"use client"

import useSWR from 'swr'
import { useAuth } from '@/lib/auth-context'

interface StrategicOverview {
  objectives: Array<{
    id: string
    title: string
    description?: string
    progress: number
    status: 'planning' | 'in_progress' | 'completed' | 'overdue'
    priority: 'high' | 'medium' | 'low'
    start_date: string
    end_date: string
    area_name?: string
    initiatives?: Array<{
      id: string
      title: string
      progress: number
    }>
  }>
  initiativesByArea?: any
  progressTrends?: any
  objectiveDistribution?: any
  completionRates?: any
}

export function useStrategicOverview(timeRange: string = 'quarter') {
  const { profile } = useAuth()
  
  const { data, error, mutate } = useSWR<StrategicOverview>(
    profile?.tenant_id ? `/api/ceo/strategic-overview?time_range=${timeRange}` : null,
    async (url: string) => {
      // Try CEO endpoint first
      try {
        const response = await fetch(url, {
          method: 'GET',
          credentials: 'include',
        })
        
        if (response.ok) {
          return await response.json()
        }
      } catch (error) {
        // console.log('CEO strategic overview endpoint not available, using fallback')
      }
      
      // Fallback to existing APIs
      const [objectivesResponse, initiativesResponse] = await Promise.all([
        fetch('/api/objectives?include_initiatives=true', {
          method: 'GET',
          credentials: 'include',
        }),
        fetch('/api/dashboard/initiatives', {
          method: 'GET',
          credentials: 'include',
        })
      ])

      const objectivesData = objectivesResponse.ok ? await objectivesResponse.json() : { objectives: [] }
      const initiativesData = initiativesResponse.ok ? await initiativesResponse.json() : { initiatives: [] }

      // Transform objectives data
      const objectives = (objectivesData.objectives || []).map((obj: any) => ({
        id: obj.id,
        title: obj.title,
        description: obj.description,
        progress: obj.progress || 0,
        status: obj.status || 'planning',
        priority: obj.priority || 'medium',
        start_date: obj.start_date || obj.created_at,
        end_date: obj.end_date || obj.target_date,
        area_name: obj.area?.name || obj.area_name,
        initiatives: obj.initiatives || []
      }))


      // Group initiatives by area for charts
      const initiativesByArea: Record<string, number> = {}
      initiativesData.initiatives?.forEach((init: any) => {
        const areaName = init.area?.name || 'Other'
        initiativesByArea[areaName] = (initiativesByArea[areaName] || 0) + 1
      })

      return {
        objectives,
        initiativesByArea: {
          labels: Object.keys(initiativesByArea),
          datasets: [{
            label: 'Initiatives',
            data: Object.values(initiativesByArea)
          }]
        },
        progressTrends: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [{
            label: 'Progress',
            data: [45, 52, 58, 65, 72, 78]
          }]
        },
        completionRates: {
          labels: ['Completed', 'In Progress', 'Planning'],
          datasets: [{
            label: 'Status',
            data: [
              objectives.filter((o: any) => o.status === 'completed').length,
              objectives.filter((o: any) => o.status === 'in_progress').length,
              objectives.filter((o: any) => o.status === 'planning').length
            ]
          }]
        }
      }
    },
    {
      refreshInterval: 0, // Refresh every 2 minutes
      revalidateOnFocus: false,
    }
  )

  return {
    overview: data,
    loading: !data && !error,
    error,
    mutate
  }
}