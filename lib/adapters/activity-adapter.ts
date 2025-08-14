/**
 * Activity Data Adapter
 * Transforms raw activity data from Supabase for shadcn blocks consumption
 */

import { format, parseISO, isAfter, isBefore, differenceInDays } from 'date-fns'

export interface RawActivityData {
  id: string
  initiative_id: string
  title: string
  description: string | null
  is_completed: boolean
  assigned_to: string | null
  created_at: string
  updated_at: string
  // Relations
  initiative?: {
    id: string
    title: string
    area_id: string
    due_date: string | null
    status: string
  }
  assignee?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
}

export interface AdaptedActivityData {
  id: string
  title: string
  description: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  initiative: {
    id: string
    title: string
    areaId: string
    dueDate: Date | null
    status: string
  }
  assignee: {
    id: string
    name: string
    email: string
    avatar?: string
  } | null
  metrics: {
    daysToInitiativeDue: number | null
    isBlocking: boolean
    estimatedHours: number
    completionImpact: number // percentage impact on initiative progress
  }
  timestamps: {
    created: Date
    updated: Date
  }
}

export interface ActivityFilterOptions {
  completed?: boolean
  assigneeId?: string
  initiativeId?: string
  priority?: 'low' | 'medium' | 'high'
  dueWithinDays?: number
  isBlocking?: boolean
}

export class ActivityAdapter {
  /**
   * Transform raw activity data to adapted format
   */
  static adapt(raw: RawActivityData, totalActivitiesInInitiative: number = 1): AdaptedActivityData {
    const initiativeDueDate = raw.initiative?.due_date ? parseISO(raw.initiative.due_date) : null
    const daysToInitiativeDue = initiativeDueDate ? differenceInDays(initiativeDueDate, new Date()) : null
    
    const priority = this.derivePriority(raw.is_completed, daysToInitiativeDue, raw.initiative?.status)
    const isBlocking = this.assessBlockingStatus(raw.title, raw.description)
    const completionImpact = Math.round(100 / totalActivitiesInInitiative)

    return {
      id: raw.id,
      title: raw.title,
      description: raw.description || '',
      completed: raw.is_completed,
      priority,
      initiative: {
        id: raw.initiative_id,
        title: raw.initiative?.title || 'Unknown Initiative',
        areaId: raw.initiative?.area_id || '',
        dueDate: initiativeDueDate,
        status: raw.initiative?.status || 'unknown'
      },
      assignee: raw.assignee ? {
        id: raw.assignee.id,
        name: raw.assignee.full_name,
        email: raw.assignee.email,
        avatar: raw.assignee.avatar_url
      } : null,
      metrics: {
        daysToInitiativeDue,
        isBlocking,
        estimatedHours: this.estimateHours(raw.title, raw.description),
        completionImpact
      },
      timestamps: {
        created: parseISO(raw.created_at),
        updated: parseISO(raw.updated_at)
      }
    }
  }

  /**
   * Batch adapt multiple activities with proper initiative context
   */
  static adaptMany(rawItems: RawActivityData[]): AdaptedActivityData[] {
    // Group by initiative to calculate proper completion impact
    const initiativeGroups = rawItems.reduce((groups, activity) => {
      const initiativeId = activity.initiative_id
      if (!groups[initiativeId]) {
        groups[initiativeId] = []
      }
      groups[initiativeId].push(activity)
      return groups
    }, {} as Record<string, RawActivityData[]>)

    // Adapt each activity with proper context
    return rawItems.map(activity => {
      const totalInInitiative = initiativeGroups[activity.initiative_id]?.length || 1
      return this.adapt(activity, totalInInitiative)
    })
  }

  /**
   * Filter activities based on various criteria
   */
  static filter(
    activities: AdaptedActivityData[], 
    filters: ActivityFilterOptions
  ): AdaptedActivityData[] {
    return activities.filter(activity => {
      if (filters.completed !== undefined && activity.completed !== filters.completed) {
        return false
      }

      if (filters.assigneeId && activity.assignee?.id !== filters.assigneeId) {
        return false
      }

      if (filters.initiativeId && activity.initiative.id !== filters.initiativeId) {
        return false
      }

      if (filters.priority && activity.priority !== filters.priority) {
        return false
      }

      if (filters.dueWithinDays !== undefined && activity.metrics.daysToInitiativeDue !== null) {
        if (activity.metrics.daysToInitiativeDue > filters.dueWithinDays) {
          return false
        }
      }

      if (filters.isBlocking !== undefined && activity.metrics.isBlocking !== filters.isBlocking) {
        return false
      }

      return true
    })
  }

  /**
   * Group activities by different criteria
   */
  static groupBy(
    activities: AdaptedActivityData[],
    groupBy: 'assignee' | 'initiative' | 'priority' | 'status' | 'completion'
  ): Record<string, AdaptedActivityData[]> {
    const groups: Record<string, AdaptedActivityData[]> = {}

    activities.forEach(activity => {
      let key: string

      switch (groupBy) {
        case 'assignee':
          key = activity.assignee?.name || 'Unassigned'
          break
        case 'initiative':
          key = activity.initiative.title
          break
        case 'priority':
          key = activity.priority
          break
        case 'status':
          key = activity.initiative.status
          break
        case 'completion':
          key = activity.completed ? 'Completed' : 'Pending'
          break
        default:
          key = 'Other'
      }

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(activity)
    })

    return groups
  }

  /**
   * Calculate metrics for a collection of activities
   */
  static calculateCollectionMetrics(activities: AdaptedActivityData[]) {
    const total = activities.length
    const completed = activities.filter(a => a.completed).length
    const pending = total - completed
    const highPriority = activities.filter(a => a.priority === 'high').length
    const blocking = activities.filter(a => a.metrics.isBlocking).length
    const unassigned = activities.filter(a => !a.assignee).length
    
    const avgEstimatedHours = total > 0 
      ? activities.reduce((sum, a) => sum + a.metrics.estimatedHours, 0) / total 
      : 0

    const workloadByAssignee = activities
      .filter(a => a.assignee && !a.completed)
      .reduce((workload, activity) => {
        const assigneeId = activity.assignee!.id
        if (!workload[assigneeId]) {
          workload[assigneeId] = {
            name: activity.assignee!.name,
            activities: 0,
            estimatedHours: 0,
            highPriorityCount: 0
          }
        }
        workload[assigneeId].activities++
        workload[assigneeId].estimatedHours += activity.metrics.estimatedHours
        if (activity.priority === 'high') {
          workload[assigneeId].highPriorityCount++
        }
        return workload
      }, {} as Record<string, any>)

    return {
      total,
      completed,
      pending,
      completionRate: Math.round((completed / total) * 100),
      highPriority,
      blocking,
      unassigned,
      avgEstimatedHours: Math.round(avgEstimatedHours),
      workloadByAssignee: Object.values(workloadByAssignee)
    }
  }

  /**
   * Get activities that need attention (overdue, high priority, blocking)
   */
  static getActivitiesNeedingAttention(activities: AdaptedActivityData[]) {
    const overdue = activities.filter(a => 
      !a.completed && 
      a.metrics.daysToInitiativeDue !== null && 
      a.metrics.daysToInitiativeDue < 0
    )

    const dueSoon = activities.filter(a => 
      !a.completed && 
      a.metrics.daysToInitiativeDue !== null && 
      a.metrics.daysToInitiativeDue >= 0 && 
      a.metrics.daysToInitiativeDue <= 3
    )

    const highPriorityPending = activities.filter(a => 
      !a.completed && a.priority === 'high'
    )

    const blockingPending = activities.filter(a => 
      !a.completed && a.metrics.isBlocking
    )

    const unassigned = activities.filter(a => 
      !a.completed && !a.assignee
    )

    return {
      overdue,
      dueSoon,
      highPriorityPending,
      blockingPending,
      unassigned,
      totalNeedingAttention: new Set([
        ...overdue,
        ...dueSoon,
        ...highPriorityPending,
        ...blockingPending,
        ...unassigned
      ]).size
    }
  }

  /**
   * Transform for different view formats
   */
  static transformForView(
    activities: AdaptedActivityData[],
    viewType: 'list' | 'kanban' | 'timeline' | 'assignee-board'
  ) {
    switch (viewType) {
      case 'list':
        return activities.map(activity => ({
          id: activity.id,
          title: activity.title,
          description: activity.description,
          completed: activity.completed,
          priority: activity.priority,
          assignee: activity.assignee?.name || 'Unassigned',
          initiative: activity.initiative.title,
          daysToInitiativeDue: activity.metrics.daysToInitiativeDue,
          estimatedHours: activity.metrics.estimatedHours,
          isBlocking: activity.metrics.isBlocking
        }))

      case 'kanban':
        const statusColumns = {
          'todo': activities.filter(a => !a.completed && (!a.assignee || a.priority === 'low')),
          'in-progress': activities.filter(a => !a.completed && a.assignee && a.priority !== 'low'),
          'completed': activities.filter(a => a.completed)
        }

        return Object.entries(statusColumns).map(([status, items]) => ({
          id: status,
          title: status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          items: items.map(activity => ({
            id: activity.id,
            title: activity.title,
            priority: activity.priority,
            assignee: activity.assignee?.name,
            initiative: activity.initiative.title,
            estimatedHours: activity.metrics.estimatedHours,
            isBlocking: activity.metrics.isBlocking
          }))
        }))

      case 'timeline':
        return activities
          .filter(a => a.initiative.dueDate)
          .map(activity => ({
            id: activity.id,
            title: activity.title,
            start: activity.timestamps.created,
            end: activity.initiative.dueDate,
            completed: activity.completed,
            priority: activity.priority,
            assignee: activity.assignee?.name,
            initiative: activity.initiative.title
          }))

      case 'assignee-board':
        const assigneeGroups = this.groupBy(activities, 'assignee')
        return Object.entries(assigneeGroups).map(([assignee, items]) => ({
          assignee,
          totalActivities: items.length,
          completedActivities: items.filter(a => a.completed).length,
          pendingActivities: items.filter(a => !a.completed).length,
          highPriorityActivities: items.filter(a => a.priority === 'high').length,
          estimatedHours: items.reduce((sum, a) => sum + a.metrics.estimatedHours, 0),
          activities: items.map(activity => ({
            id: activity.id,
            title: activity.title,
            completed: activity.completed,
            priority: activity.priority,
            initiative: activity.initiative.title,
            daysToInitiativeDue: activity.metrics.daysToInitiativeDue
          }))
        }))

      default:
        return activities
    }
  }

  // Private helper methods
  private static derivePriority(
    isCompleted: boolean, 
    daysToInitiativeDue: number | null, 
    initiativeStatus?: string
  ): 'low' | 'medium' | 'high' {
    if (isCompleted) return 'low'
    if (daysToInitiativeDue !== null && daysToInitiativeDue <= 3) return 'high'
    if (daysToInitiativeDue !== null && daysToInitiativeDue <= 7) return 'medium'
    if (initiativeStatus === 'planning') return 'low'
    return 'medium'
  }

  private static assessBlockingStatus(title: string, description?: string | null): boolean {
    const blockingKeywords = [
      'approve', 'approval', 'review', 'sign', 'authorize', 'validate', 
      'verify', 'confirm', 'decision', 'prerequisite', 'dependency',
      'blocking', 'critical', 'urgent', 'required'
    ]
    
    const text = `${title} ${description || ''}`.toLowerCase()
    return blockingKeywords.some(keyword => text.includes(keyword))
  }

  private static estimateHours(title: string, description?: string | null): number {
    // Simple estimation based on activity type keywords
    const text = `${title} ${description || ''}`.toLowerCase()
    
    if (text.includes('research') || text.includes('analysis') || text.includes('planning')) {
      return 8 // Full day
    }
    if (text.includes('meeting') || text.includes('call') || text.includes('review')) {
      return 2 // Couple of hours
    }
    if (text.includes('document') || text.includes('report') || text.includes('presentation')) {
      return 4 // Half day
    }
    if (text.includes('setup') || text.includes('configure') || text.includes('implement')) {
      return 6 // Most of day
    }
    
    // Default estimation
    return 3
  }
}

export default ActivityAdapter