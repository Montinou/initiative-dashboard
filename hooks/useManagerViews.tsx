"use client"

import { useState, useEffect, useCallback } from 'react'
import type { 
  Area, 
  Initiative, 
  Activity, 
  Objective,
  UserProfile 
} from '@/lib/types/database'
import { useAuth } from '@/lib/auth-context'
import { useTenantContext } from './useTenantContext'

// Manager dashboard data types
export interface ManagerDashboardData {
  area: Area
  team_members: TeamMember[]
  initiatives: InitiativeWithProgress[]
  objectives: ObjectiveWithProgress[]
  activities: ActivityWithAssignment[]
  statistics: ManagerStatistics
  recent_updates: RecentUpdate[]
}

export interface TeamMember extends UserProfile {
  assigned_activities: number
  completed_activities: number
  active_initiatives: number
  performance_score?: number
}

export interface InitiativeWithProgress extends Initiative {
  objective_title?: string
  activities_count: number
  completed_activities: number
  team_members_involved: string[]
  days_remaining?: number
  is_at_risk: boolean
  last_update?: string
}

export interface ObjectiveWithProgress extends Objective {
  initiatives_count: number
  overall_progress: number
  is_on_track: boolean
}

export interface ActivityWithAssignment extends Activity {
  assigned_to_name?: string
  initiative_title?: string
  days_overdue?: number
  priority?: 'high' | 'medium' | 'low'
}


export interface ManagerStatistics {
  total_team_members: number
  total_initiatives: number
  total_activities: number
  completed_activities: number
  overdue_activities: number
  average_progress: number
  team_utilization: number
  initiatives_at_risk: number
  upcoming_deadlines: number
}

export interface RecentUpdate {
  id: string
  type: 'initiative' | 'activity' | 'objective' | 'team'
  title: string
  description: string
  timestamp: string
  user_name?: string
  impact?: 'high' | 'medium' | 'low'
}

interface UseManagerViewsParams {
  area_id?: string
  date_range?: { start_date: string; end_date: string }
  include_team_details?: boolean
  include_recent_updates?: boolean
}

export function useManagerViews(params: UseManagerViewsParams = {}) {
  const [dashboardData, setDashboardData] = useState<ManagerDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const { profile, session } = useAuth()
  const { permissions } = useTenantContext()

  const fetchManagerDashboard = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Determine area ID to use
      const areaId = params.area_id || profile?.area_id
      
      if (!areaId) {
        console.log('useManagerViews: No area ID available')
        setDashboardData(null)
        return
      }

      // Check permissions
      if (!permissions.is_area_manager && !permissions.can_view_all_areas) {
        console.log('useManagerViews: User does not have manager permissions')
        setDashboardData(null)
        return
      }

      if (!profile?.tenant_id || !session?.access_token) {
        console.log('useManagerViews: No tenant or session context')
        setDashboardData(null)
        return
      }

      // Build query params
      const queryParams = new URLSearchParams({
        area_id: areaId,
        tenant_id: profile.tenant_id
      })

      if (params.date_range) {
        queryParams.append('start_date', params.date_range.start_date)
        queryParams.append('end_date', params.date_range.end_date)
      }
      if (params.include_team_details) {
        queryParams.append('include_team', 'true')
      }
      if (params.include_recent_updates) {
        queryParams.append('include_updates', 'true')
      }

      const response = await fetch(`/api/manager-dashboard?${queryParams}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch manager dashboard: ${response.status}`)
      }

      const data = await response.json()
      
      // Process and enrich the dashboard data
      const processedData: ManagerDashboardData = {
        area: data.area,
        team_members: processTeamMembers(data.team_members || []),
        initiatives: processInitiatives(data.initiatives || []),
        objectives: processObjectives(data.objectives || []),
        activities: processActivities(data.activities || []),
        statistics: calculateStatistics(data),
        recent_updates: data.recent_updates || []
      }

      setDashboardData(processedData)
      console.log('useManagerViews: Dashboard data loaded successfully')
    } catch (err) {
      console.error('Error fetching manager dashboard:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch manager dashboard'))
      setDashboardData(null)
    } finally {
      setLoading(false)
    }
  }, [profile, session, permissions, params])

  // Get team performance metrics
  const getTeamPerformance = async (period: 'week' | 'month' | 'quarter' = 'month') => {
    try {
      if (!profile?.area_id || !session?.user) {
        throw new Error('No area or session context')
      }

      const response = await fetch(`/api/manager-dashboard/team-performance?area_id=${profile.area_id}&period=${period}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch team performance')
      }

      return await response.json()
    } catch (err) {
      console.error('Error fetching team performance:', err)
      throw err
    }
  }

  // Assign activity to team member
  const assignActivity = async (activityId: string, userId: string) => {
    try {
      if (!session?.user) {
        throw new Error('No session available')
      }

      const response = await fetch(`/api/activities/${activityId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ assigned_to: userId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to assign activity')
      }

      const result = await response.json()
      
      // Refresh dashboard
      await fetchManagerDashboard()
      
      return result
    } catch (err) {
      console.error('Error assigning activity:', err)
      throw err
    }
  }

  // Bulk assign activities
  const bulkAssignActivities = async (assignments: Array<{ activity_id: string; user_id: string }>) => {
    try {
      if (!session?.user) {
        throw new Error('No session available')
      }

      const response = await fetch('/api/activities/bulk-assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ assignments }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to bulk assign activities')
      }

      const results = await response.json()
      
      // Refresh dashboard
      await fetchManagerDashboard()
      
      return results
    } catch (err) {
      console.error('Error bulk assigning activities:', err)
      throw err
    }
  }

  // Get workload analysis for team
  const getWorkloadAnalysis = (): Record<string, number> => {
    if (!dashboardData) return {}
    
    const workload: Record<string, number> = {}
    
    dashboardData.team_members.forEach(member => {
      workload[member.id] = member.assigned_activities - member.completed_activities
    })
    
    return workload
  }

  // Identify at-risk initiatives
  const getAtRiskInitiatives = (): InitiativeWithProgress[] => {
    if (!dashboardData) return []
    
    return dashboardData.initiatives.filter(initiative => {
      // Check various risk factors
      const isOverdue = initiative.due_date && new Date(initiative.due_date) < new Date()
      const lowProgress = initiative.progress < 30 && initiative.days_remaining && initiative.days_remaining < 30
      const noRecentUpdate = initiative.last_update && 
        (new Date().getTime() - new Date(initiative.last_update).getTime()) > 14 * 24 * 60 * 60 * 1000 // 14 days
      
      return initiative.is_at_risk || isOverdue || lowProgress || noRecentUpdate
    })
  }

  // Generate team report
  const generateTeamReport = async (format: 'pdf' | 'csv' = 'pdf') => {
    try {
      if (!profile?.area_id || !session?.user) {
        throw new Error('No area or session context')
      }

      const response = await fetch(`/api/manager-dashboard/report?area_id=${profile.area_id}&format=${format}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to generate team report')
      }

      // Download the report
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `team-report-${new Date().toISOString().split('T')[0]}.${format}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Error generating team report:', err)
      throw err
    }
  }

  useEffect(() => {
    fetchManagerDashboard()
  }, [fetchManagerDashboard])

  return {
    dashboardData,
    loading,
    error,
    refetch: fetchManagerDashboard,
    getTeamPerformance,
    assignActivity,
    bulkAssignActivities,
    getWorkloadAnalysis,
    getAtRiskInitiatives,
    generateTeamReport
  }
}

// Helper functions for data processing
function processTeamMembers(members: any[]): TeamMember[] {
  return members.map(member => ({
    ...member,
    performance_score: calculatePerformanceScore(member)
  }))
}

function processInitiatives(initiatives: any[]): InitiativeWithProgress[] {
  return initiatives.map(initiative => {
    const daysRemaining = initiative.due_date 
      ? Math.floor((new Date(initiative.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : undefined
    
    const isAtRisk = (daysRemaining && daysRemaining < 7 && initiative.progress < 80) ||
                     (initiative.progress < 30 && daysRemaining && daysRemaining < 30)
    
    return {
      ...initiative,
      days_remaining: daysRemaining,
      is_at_risk: isAtRisk
    }
  })
}

function processObjectives(objectives: any[]): ObjectiveWithProgress[] {
  return objectives.map(objective => {
    const overallProgress = objective.initiatives?.length > 0
      ? objective.initiatives.reduce((sum: number, init: any) => sum + (init.progress || 0), 0) / objective.initiatives.length
      : 0
    
    return {
      ...objective,
      overall_progress: Math.round(overallProgress),
      is_on_track: overallProgress >= 60 // Simple threshold
    }
  })
}

function processActivities(activities: any[]): ActivityWithAssignment[] {
  return activities.map(activity => {
    const daysOverdue = activity.due_date && !activity.is_completed
      ? Math.max(0, Math.floor((new Date().getTime() - new Date(activity.due_date).getTime()) / (1000 * 60 * 60 * 24)))
      : undefined
    
    const priority = daysOverdue && daysOverdue > 0 ? 'high' :
                    daysOverdue === 0 ? 'medium' : 'low'
    
    return {
      ...activity,
      days_overdue: daysOverdue,
      priority
    }
  })
}


function calculateStatistics(data: any): ManagerStatistics {
  const initiatives = data.initiatives || []
  const activities = data.activities || []
  const teamMembers = data.team_members || []
  
  const completedActivities = activities.filter((a: any) => a.is_completed).length
  const overdueActivities = activities.filter((a: any) => {
    return a.due_date && !a.is_completed && new Date(a.due_date) < new Date()
  }).length
  
  const averageProgress = initiatives.length > 0
    ? initiatives.reduce((sum: number, init: any) => sum + (init.progress || 0), 0) / initiatives.length
    : 0
  
  const assignedActivities = activities.filter((a: any) => a.assigned_to).length
  const teamUtilization = activities.length > 0 ? (assignedActivities / activities.length) * 100 : 0
  
  const initiativesAtRisk = initiatives.filter((init: any) => {
    const daysRemaining = init.due_date 
      ? Math.floor((new Date(init.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : Infinity
    return (daysRemaining < 7 && init.progress < 80) || (init.progress < 30 && daysRemaining < 30)
  }).length
  
  const upcomingDeadlines = activities.filter((a: any) => {
    if (!a.due_date || a.is_completed) return false
    const daysUntil = Math.floor((new Date(a.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil >= 0 && daysUntil <= 7
  }).length
  
  return {
    total_team_members: teamMembers.length,
    total_initiatives: initiatives.length,
    total_activities: activities.length,
    completed_activities: completedActivities,
    overdue_activities: overdueActivities,
    average_progress: Math.round(averageProgress),
    team_utilization: Math.round(teamUtilization),
    initiatives_at_risk: initiativesAtRisk,
    upcoming_deadlines: upcomingDeadlines
  }
}

function calculatePerformanceScore(member: any): number {
  const completionRate = member.assigned_activities > 0 
    ? (member.completed_activities / member.assigned_activities) * 100
    : 0
  
  // Simple performance score calculation
  return Math.round(completionRate * 0.7 + (member.active_initiatives || 0) * 3)
}