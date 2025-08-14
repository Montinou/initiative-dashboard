/**
 * Objective Data Adapter
 * Transforms raw objective data from Supabase for shadcn blocks consumption
 * Uses date-based filtering (start_date/end_date) instead of quarters
 */

import { format, parseISO, isAfter, isBefore, isWithinInterval, addMonths } from 'date-fns'

export interface RawObjectiveData {
  id: string
  tenant_id: string
  area_id: string | null
  title: string
  description: string | null
  created_by: string
  created_at: string
  updated_at: string
  priority: 'high' | 'medium' | 'low'
  status: 'planning' | 'in_progress' | 'completed' | 'overdue'
  progress: number
  target_date: string | null
  metrics: any[] // jsonb
  start_date: string | null
  end_date: string | null
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
  initiatives?: Array<{
    id: string
    title: string
    progress: number
    status: string
  }>
}

export interface AdaptedObjectiveData {
  id: string
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  status: 'planning' | 'in_progress' | 'completed' | 'overdue'
  progress: number
  startDate: Date | null
  endDate: Date | null
  targetDate: Date | null
  area: {
    id: string
    name: string
    description?: string
  } | null
  owner: {
    id: string
    name: string
    email: string
  }
  metrics: {
    keyResults: Array<{
      id: string
      title: string
      target: number
      current: number
      unit: string
    }>
    initiativesCount: number
    completedInitiatives: number
    avgInitiativeProgress: number
    daysRemaining: number | null
    isOnTrack: boolean
    riskLevel: 'low' | 'medium' | 'high'
  }
  initiatives: Array<{
    id: string
    title: string
    progress: number
    status: string
  }>
  timePeriod: {
    duration: number // days
    elapsed: number // days
    remaining: number // days
    percentElapsed: number
  }
  timestamps: {
    created: Date
    updated: Date
  }
}

export interface ObjectiveDateFilterOptions {
  startDateFrom?: Date
  startDateTo?: Date
  endDateFrom?: Date
  endDateTo?: Date
  targetDateFrom?: Date
  targetDateTo?: Date
  activeDuringPeriod?: {
    start: Date
    end: Date
  }
  completedInPeriod?: {
    start: Date
    end: Date
  }
}

export class ObjectiveAdapter {
  /**
   * Transform raw objective data to adapted format
   */
  static adapt(raw: RawObjectiveData): AdaptedObjectiveData {
    const startDate = raw.start_date ? parseISO(raw.start_date) : null
    const endDate = raw.end_date ? parseISO(raw.end_date) : null
    const targetDate = raw.target_date ? parseISO(raw.target_date) : null
    
    const initiativesCount = raw.initiatives?.length || 0
    const completedInitiatives = raw.initiatives?.filter(i => i.status === 'completed').length || 0
    const avgInitiativeProgress = initiativesCount > 0 
      ? raw.initiatives!.reduce((sum, i) => sum + i.progress, 0) / initiativesCount 
      : 0

    const timePeriod = this.calculateTimePeriod(startDate, endDate || targetDate)
    const daysRemaining = this.calculateDaysRemaining(endDate || targetDate)
    const isOnTrack = this.assessOnTrackStatus(raw.progress, timePeriod.percentElapsed, raw.status)
    const riskLevel = this.assessRiskLevel(raw.progress, daysRemaining, isOnTrack, raw.status)

    return {
      id: raw.id,
      title: raw.title,
      description: raw.description || '',
      priority: raw.priority,
      status: raw.status,
      progress: raw.progress,
      startDate,
      endDate,
      targetDate,
      area: raw.area ? {
        id: raw.area.id,
        name: raw.area.name,
        description: raw.area.description
      } : null,
      owner: {
        id: raw.created_by,
        name: raw.created_by_profile?.full_name || 'Unknown User',
        email: raw.created_by_profile?.email || ''
      },
      metrics: {
        keyResults: this.parseKeyResults(raw.metrics),
        initiativesCount,
        completedInitiatives,
        avgInitiativeProgress: Math.round(avgInitiativeProgress),
        daysRemaining,
        isOnTrack,
        riskLevel
      },
      initiatives: raw.initiatives?.map(initiative => ({
        id: initiative.id,
        title: initiative.title,
        progress: initiative.progress,
        status: initiative.status
      })) || [],
      timePeriod,
      timestamps: {
        created: parseISO(raw.created_at),
        updated: parseISO(raw.updated_at)
      }
    }
  }

  /**
   * Batch adapt multiple objectives
   */
  static adaptMany(rawItems: RawObjectiveData[]): AdaptedObjectiveData[] {
    return rawItems.map(item => this.adapt(item))
  }

  /**
   * Filter objectives by date ranges
   */
  static filterByDates(
    objectives: AdaptedObjectiveData[], 
    filters: ObjectiveDateFilterOptions
  ): AdaptedObjectiveData[] {
    return objectives.filter(objective => {
      // Filter by start date range
      if (filters.startDateFrom && objective.startDate && 
          isBefore(objective.startDate, filters.startDateFrom)) {
        return false
      }
      if (filters.startDateTo && objective.startDate && 
          isAfter(objective.startDate, filters.startDateTo)) {
        return false
      }

      // Filter by end date range
      if (filters.endDateFrom && objective.endDate && 
          isBefore(objective.endDate, filters.endDateFrom)) {
        return false
      }
      if (filters.endDateTo && objective.endDate && 
          isAfter(objective.endDate, filters.endDateTo)) {
        return false
      }

      // Filter by target date range
      if (filters.targetDateFrom && objective.targetDate && 
          isBefore(objective.targetDate, filters.targetDateFrom)) {
        return false
      }
      if (filters.targetDateTo && objective.targetDate && 
          isAfter(objective.targetDate, filters.targetDateTo)) {
        return false
      }

      // Filter objectives active during a specific period
      if (filters.activeDuringPeriod) {
        const { start: periodStart, end: periodEnd } = filters.activeDuringPeriod
        const objStart = objective.startDate || new Date(0) // Very old date if no start
        const objEnd = objective.endDate || objective.targetDate || new Date() // Current date if no end
        
        // Check if objective overlaps with the period
        if (!objEnd || isBefore(objEnd, periodStart) || 
            (objective.startDate && isAfter(objStart, periodEnd))) {
          return false
        }
      }

      // Filter objectives completed in a specific period
      if (filters.completedInPeriod && objective.status === 'completed') {
        const completionDate = objective.endDate || objective.targetDate
        if (!completionDate || 
            !isWithinInterval(completionDate, filters.completedInPeriod)) {
          return false
        }
      }

      return true
    })
  }

  /**
   * Group objectives by time periods
   */
  static groupByTimePeriod(
    objectives: AdaptedObjectiveData[],
    period: 'month' | 'quarter' | 'year' = 'quarter',
    dateField: 'startDate' | 'endDate' | 'targetDate' = 'startDate'
  ): Record<string, AdaptedObjectiveData[]> {
    const groups: Record<string, AdaptedObjectiveData[]> = {}

    objectives.forEach(objective => {
      const date = objective[dateField]
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
      groups[key].push(objective)
    })

    return groups
  }

  /**
   * Create standard quarterly view (for backwards compatibility)
   */
  static createQuarterlyView(objectives: AdaptedObjectiveData[], year: number) {
    const quarters = {
      'Q1': { start: new Date(year, 0, 1), end: new Date(year, 2, 31) },
      'Q2': { start: new Date(year, 3, 1), end: new Date(year, 5, 30) },
      'Q3': { start: new Date(year, 6, 1), end: new Date(year, 8, 30) },
      'Q4': { start: new Date(year, 9, 1), end: new Date(year, 11, 31) }
    }

    const quarterlyData: Record<string, AdaptedObjectiveData[]> = {}

    Object.entries(quarters).forEach(([quarter, { start, end }]) => {
      quarterlyData[quarter] = objectives.filter(objective => {
        const objStart = objective.startDate
        const objEnd = objective.endDate || objective.targetDate
        
        if (!objStart && !objEnd) return false
        
        // Check if objective overlaps with quarter
        const checkStart = objStart || new Date(0)
        const checkEnd = objEnd || new Date()
        
        return !(isAfter(checkStart, end) || isBefore(checkEnd, start))
      })
    })

    return quarterlyData
  }

  /**
   * Calculate OKR-style metrics for objectives
   */
  static calculateOKRMetrics(objectives: AdaptedObjectiveData[]) {
    const total = objectives.length
    const completed = objectives.filter(o => o.status === 'completed').length
    const onTrack = objectives.filter(o => o.metrics.isOnTrack).length
    const atRisk = objectives.filter(o => o.metrics.riskLevel === 'high').length
    
    const avgProgress = total > 0 
      ? objectives.reduce((sum, o) => sum + o.progress, 0) / total 
      : 0

    const avgKeyResultsProgress = objectives
      .flatMap(o => o.metrics.keyResults)
      .reduce((acc, kr) => {
        acc.total += kr.target
        acc.current += kr.current
        return acc
      }, { total: 0, current: 0 })

    const keyResultsProgress = avgKeyResultsProgress.total > 0 
      ? (avgKeyResultsProgress.current / avgKeyResultsProgress.total) * 100 
      : 0

    return {
      total,
      completed,
      onTrack,
      atRisk,
      completionRate: Math.round((completed / total) * 100),
      avgProgress: Math.round(avgProgress),
      keyResultsProgress: Math.round(keyResultsProgress),
      riskDistribution: {
        low: objectives.filter(o => o.metrics.riskLevel === 'low').length,
        medium: objectives.filter(o => o.metrics.riskLevel === 'medium').length,
        high: objectives.filter(o => o.metrics.riskLevel === 'high').length
      }
    }
  }

  /**
   * Transform for different view formats
   */
  static transformForView(
    objectives: AdaptedObjectiveData[],
    viewType: 'card' | 'table' | 'timeline' | 'okr'
  ) {
    switch (viewType) {
      case 'card':
        return objectives.map(objective => ({
          id: objective.id,
          title: objective.title,
          description: objective.description,
          progress: objective.progress,
          priority: objective.priority,
          status: objective.status,
          area: objective.area?.name,
          initiativesCount: objective.metrics.initiativesCount,
          daysRemaining: objective.metrics.daysRemaining,
          isOnTrack: objective.metrics.isOnTrack,
          riskLevel: objective.metrics.riskLevel
        }))

      case 'table':
        return objectives.map(objective => ({
          id: objective.id,
          title: objective.title,
          area: objective.area?.name || 'Unassigned',
          owner: objective.owner.name,
          progress: objective.progress,
          status: objective.status,
          priority: objective.priority,
          startDate: objective.startDate ? format(objective.startDate, 'MMM dd, yyyy') : null,
          endDate: objective.endDate ? format(objective.endDate, 'MMM dd, yyyy') : null,
          initiatives: objective.metrics.initiativesCount,
          isOnTrack: objective.metrics.isOnTrack,
          riskLevel: objective.metrics.riskLevel
        }))

      case 'timeline':
        return objectives
          .filter(o => o.startDate || o.endDate || o.targetDate)
          .map(objective => ({
            id: objective.id,
            title: objective.title,
            start: objective.startDate,
            end: objective.endDate || objective.targetDate,
            progress: objective.progress,
            status: objective.status,
            area: objective.area?.name
          }))

      case 'okr':
        return objectives.map(objective => ({
          id: objective.id,
          title: objective.title,
          progress: objective.progress,
          keyResults: objective.metrics.keyResults,
          initiatives: objective.initiatives,
          area: objective.area?.name,
          timePeriod: objective.timePeriod,
          isOnTrack: objective.metrics.isOnTrack
        }))

      default:
        return objectives
    }
  }

  // Private helper methods
  private static parseKeyResults(metrics: any[]): Array<{
    id: string
    title: string
    target: number
    current: number
    unit: string
  }> {
    if (!Array.isArray(metrics)) return []
    
    return metrics.map((metric, index) => ({
      id: metric.id || `kr-${index}`,
      title: metric.title || metric.name || `Key Result ${index + 1}`,
      target: metric.target || metric.targetValue || 100,
      current: metric.current || metric.currentValue || 0,
      unit: metric.unit || metric.unitType || 'units'
    }))
  }

  private static calculateTimePeriod(startDate: Date | null, endDate: Date | null) {
    if (!startDate && !endDate) {
      return { duration: 0, elapsed: 0, remaining: 0, percentElapsed: 0 }
    }

    const now = new Date()
    const start = startDate || addMonths(endDate!, -3) // Default 3 months if no start
    const end = endDate || addMonths(startDate!, 3) // Default 3 months if no end

    const duration = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24)))
    const elapsed = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 3600 * 24)))
    const remaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24)))
    const percentElapsed = Math.min(100, Math.max(0, (elapsed / duration) * 100))

    return { duration, elapsed, remaining, percentElapsed }
  }

  private static calculateDaysRemaining(endDate: Date | null): number | null {
    if (!endDate) return null
    const now = new Date()
    const timeDiff = endDate.getTime() - now.getTime()
    return Math.ceil(timeDiff / (1000 * 3600 * 24))
  }

  private static assessOnTrackStatus(
    progress: number, 
    percentElapsed: number, 
    status: string
  ): boolean {
    if (status === 'completed') return true
    if (status === 'overdue') return false
    
    // On track if progress is within 10% of time elapsed
    return progress >= (percentElapsed - 10)
  }

  private static assessRiskLevel(
    progress: number, 
    daysRemaining: number | null, 
    isOnTrack: boolean, 
    status: string
  ): 'low' | 'medium' | 'high' {
    if (status === 'completed') return 'low'
    if (status === 'overdue') return 'high'
    if (!isOnTrack) return 'high'
    if (daysRemaining !== null && daysRemaining <= 14 && progress < 80) return 'high'
    if (daysRemaining !== null && daysRemaining <= 30 && progress < 60) return 'medium'
    return 'low'
  }
}

export default ObjectiveAdapter