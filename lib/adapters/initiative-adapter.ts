/**
 * Initiative Data Adapter
 * Transforms raw initiative data from Supabase for shadcn blocks consumption
 * Handles date-based filtering and tenant isolation
 */

import { format, parseISO, isAfter, isBefore, isWithinInterval } from 'date-fns'

export interface RawInitiativeData {
  id: string
  tenant_id: string
  area_id: string
  title: string
  description: string | null
  progress: number
  created_by: string
  due_date: string | null
  start_date: string | null
  completion_date: string | null
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold'
  created_at: string
  updated_at: string
  // Relations
  area?: {
    id: string
    name: string
    description?: string
  }
  created_by_profile?: {
    id: string
    full_name: string
    email: string
  }
  activities?: Array<{
    id: string
    title: string
    is_completed: boolean
    assigned_to?: string
  }>
  objectives?: Array<{
    id: string
    title: string
    description?: string
  }>
}

export interface AdaptedInitiativeData {
  id: string
  title: string
  description: string
  progress: number
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold'
  priority: 'low' | 'medium' | 'high'
  startDate: Date | null
  dueDate: Date | null
  completionDate: Date | null
  area: {
    id: string
    name: string
    description?: string
  }
  owner: {
    id: string
    name: string
    email: string
  }
  metrics: {
    totalActivities: number
    completedActivities: number
    completionRate: number
    daysRemaining: number | null
    isOverdue: boolean
    isAtRisk: boolean
  }
  activities: Array<{
    id: string
    title: string
    completed: boolean
    assigneeId?: string
  }>
  objectives: Array<{
    id: string
    title: string
    description?: string
  }>
  timestamps: {
    created: Date
    updated: Date
  }
}

export interface DateFilterOptions {
  startDateFrom?: Date
  startDateTo?: Date
  dueDateFrom?: Date
  dueDateTo?: Date
  completionDateFrom?: Date
  completionDateTo?: Date
  dateRange?: {
    start: Date
    end: Date
  }
}

export class InitiativeAdapter {
  /**
   * Transform raw initiative data to adapted format
   */
  static adapt(raw: RawInitiativeData): AdaptedInitiativeData {
    const startDate = raw.start_date ? parseISO(raw.start_date) : null
    const dueDate = raw.due_date ? parseISO(raw.due_date) : null
    const completionDate = raw.completion_date ? parseISO(raw.completion_date) : null
    
    const totalActivities = raw.activities?.length || 0
    const completedActivities = raw.activities?.filter(a => a.is_completed).length || 0
    const completionRate = totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0
    
    const daysRemaining = dueDate ? this.calculateDaysRemaining(dueDate) : null
    const isOverdue = dueDate ? isAfter(new Date(), dueDate) && raw.status !== 'completed' : false
    const isAtRisk = this.calculateRiskStatus(raw.progress, daysRemaining, raw.status)

    return {
      id: raw.id,
      title: raw.title,
      description: raw.description || '',
      progress: raw.progress,
      status: raw.status,
      priority: this.derivePriority(raw.progress, daysRemaining, isOverdue),
      startDate,
      dueDate,
      completionDate,
      area: {
        id: raw.area_id,
        name: raw.area?.name || 'Unknown Area',
        description: raw.area?.description
      },
      owner: {
        id: raw.created_by,
        name: raw.created_by_profile?.full_name || 'Unknown User',
        email: raw.created_by_profile?.email || ''
      },
      metrics: {
        totalActivities,
        completedActivities,
        completionRate,
        daysRemaining,
        isOverdue,
        isAtRisk
      },
      activities: raw.activities?.map(activity => ({
        id: activity.id,
        title: activity.title,
        completed: activity.is_completed,
        assigneeId: activity.assigned_to
      })) || [],
      objectives: raw.objectives?.map(objective => ({
        id: objective.id,
        title: objective.title,
        description: objective.description
      })) || [],
      timestamps: {
        created: parseISO(raw.created_at),
        updated: parseISO(raw.updated_at)
      }
    }
  }

  /**
   * Batch adapt multiple initiatives
   */
  static adaptMany(rawItems: RawInitiativeData[]): AdaptedInitiativeData[] {
    return rawItems.map(item => this.adapt(item))
  }

  /**
   * Filter initiatives by date ranges
   */
  static filterByDates(
    initiatives: AdaptedInitiativeData[], 
    filters: DateFilterOptions
  ): AdaptedInitiativeData[] {
    return initiatives.filter(initiative => {
      // Filter by start date range
      if (filters.startDateFrom && initiative.startDate && 
          isBefore(initiative.startDate, filters.startDateFrom)) {
        return false
      }
      if (filters.startDateTo && initiative.startDate && 
          isAfter(initiative.startDate, filters.startDateTo)) {
        return false
      }

      // Filter by due date range
      if (filters.dueDateFrom && initiative.dueDate && 
          isBefore(initiative.dueDate, filters.dueDateFrom)) {
        return false
      }
      if (filters.dueDateTo && initiative.dueDate && 
          isAfter(initiative.dueDate, filters.dueDateTo)) {
        return false
      }

      // Filter by completion date range
      if (filters.completionDateFrom && initiative.completionDate && 
          isBefore(initiative.completionDate, filters.completionDateFrom)) {
        return false
      }
      if (filters.completionDateTo && initiative.completionDate && 
          isAfter(initiative.completionDate, filters.completionDateTo)) {
        return false
      }

      // Filter by general date range (any date within range)
      if (filters.dateRange) {
        const hasDateInRange = [
          initiative.startDate,
          initiative.dueDate,
          initiative.completionDate
        ].some(date => date && isWithinInterval(date, filters.dateRange!))
        
        if (!hasDateInRange) return false
      }

      return true
    })
  }

  /**
   * Group initiatives by time periods (month, quarter, year)
   */
  static groupByTimePeriod(
    initiatives: AdaptedInitiativeData[],
    period: 'month' | 'quarter' | 'year' = 'month',
    dateField: 'startDate' | 'dueDate' | 'completionDate' = 'startDate'
  ): Record<string, AdaptedInitiativeData[]> {
    const groups: Record<string, AdaptedInitiativeData[]> = {}

    initiatives.forEach(initiative => {
      const date = initiative[dateField]
      if (!date) return

      let key: string
      switch (period) {
        case 'month':
          key = format(date, 'yyyy-MM')
          break
        case 'quarter':
          const quarter = Math.floor(date.getMonth() / 3) + 1
          key = `${date.getFullYear()}-Q${quarter}`
          break
        case 'year':
          key = format(date, 'yyyy')
          break
      }

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(initiative)
    })

    return groups
  }

  /**
   * Calculate metrics for a collection of initiatives
   */
  static calculateCollectionMetrics(initiatives: AdaptedInitiativeData[]) {
    const total = initiatives.length
    const completed = initiatives.filter(i => i.status === 'completed').length
    const inProgress = initiatives.filter(i => i.status === 'in_progress').length
    const overdue = initiatives.filter(i => i.metrics.isOverdue).length
    const atRisk = initiatives.filter(i => i.metrics.isAtRisk).length
    
    const avgProgress = total > 0 
      ? initiatives.reduce((sum, i) => sum + i.progress, 0) / total 
      : 0

    const totalActivities = initiatives.reduce((sum, i) => sum + i.metrics.totalActivities, 0)
    const completedActivities = initiatives.reduce((sum, i) => sum + i.metrics.completedActivities, 0)
    const activityCompletionRate = totalActivities > 0 
      ? (completedActivities / totalActivities) * 100 
      : 0

    return {
      total,
      completed,
      inProgress,
      overdue,
      atRisk,
      avgProgress: Math.round(avgProgress),
      completionRate: Math.round((completed / total) * 100),
      activityMetrics: {
        total: totalActivities,
        completed: completedActivities,
        completionRate: Math.round(activityCompletionRate)
      }
    }
  }

  /**
   * Transform for different view formats
   */
  static transformForView(
    initiatives: AdaptedInitiativeData[],
    viewType: 'card' | 'table' | 'timeline' | 'kanban'
  ) {
    switch (viewType) {
      case 'card':
        return initiatives.map(initiative => ({
          id: initiative.id,
          title: initiative.title,
          description: initiative.description,
          progress: initiative.progress,
          status: initiative.status,
          priority: initiative.priority,
          dueDate: initiative.dueDate,
          area: initiative.area.name,
          metrics: initiative.metrics
        }))

      case 'table':
        return initiatives.map(initiative => ({
          id: initiative.id,
          title: initiative.title,
          area: initiative.area.name,
          owner: initiative.owner.name,
          progress: initiative.progress,
          status: initiative.status,
          startDate: initiative.startDate ? format(initiative.startDate, 'MMM dd, yyyy') : null,
          dueDate: initiative.dueDate ? format(initiative.dueDate, 'MMM dd, yyyy') : null,
          activities: `${initiative.metrics.completedActivities}/${initiative.metrics.totalActivities}`,
          isOverdue: initiative.metrics.isOverdue,
          isAtRisk: initiative.metrics.isAtRisk
        }))

      case 'timeline':
        return initiatives
          .filter(i => i.startDate || i.dueDate)
          .map(initiative => ({
            id: initiative.id,
            title: initiative.title,
            start: initiative.startDate,
            end: initiative.dueDate,
            progress: initiative.progress,
            status: initiative.status,
            area: initiative.area.name
          }))

      case 'kanban':
        const columns = {
          planning: initiatives.filter(i => i.status === 'planning'),
          'in_progress': initiatives.filter(i => i.status === 'in_progress'),
          completed: initiatives.filter(i => i.status === 'completed'),
          'on_hold': initiatives.filter(i => i.status === 'on_hold')
        }

        return Object.entries(columns).map(([status, items]) => ({
          id: status,
          title: status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
          items: items.map(initiative => ({
            id: initiative.id,
            title: initiative.title,
            progress: initiative.progress,
            priority: initiative.priority,
            area: initiative.area.name,
            dueDate: initiative.dueDate,
            metrics: initiative.metrics
          }))
        }))

      default:
        return initiatives
    }
  }

  // Private helper methods
  private static calculateDaysRemaining(dueDate: Date): number {
    const now = new Date()
    const timeDiff = dueDate.getTime() - now.getTime()
    return Math.ceil(timeDiff / (1000 * 3600 * 24))
  }

  private static calculateRiskStatus(
    progress: number, 
    daysRemaining: number | null, 
    status: string
  ): boolean {
    if (status === 'completed') return false
    if (daysRemaining !== null && daysRemaining <= 7 && progress < 80) return true
    if (daysRemaining !== null && daysRemaining <= 3) return true
    if (progress < 25 && status === 'in_progress') return true
    return false
  }

  private static derivePriority(
    progress: number, 
    daysRemaining: number | null, 
    isOverdue: boolean
  ): 'low' | 'medium' | 'high' {
    if (isOverdue) return 'high'
    if (daysRemaining !== null && daysRemaining <= 7) return 'high'
    if (daysRemaining !== null && daysRemaining <= 14 && progress < 50) return 'medium'
    return 'low'
  }
}

export default InitiativeAdapter