/**
 * Areas Data Adapter
 * Transforms raw areas data from Supabase for shadcn blocks consumption
 */

import { format, parseISO } from 'date-fns'

export interface RawAreaData {
  id: string
  tenant_id: string
  name: string
  description: string | null
  manager_id: string | null
  created_at: string
  updated_at: string
  is_active: boolean
  // Relations
  manager?: {
    id: string
    full_name: string
    email: string
    avatar_url?: string
  }
  initiatives?: Array<{
    id: string
    title: string
    progress: number
    status: string
    start_date?: string
    due_date?: string
  }>
  objectives?: Array<{
    id: string
    title: string
    progress: number
    status: string
  }>
  user_profiles?: Array<{
    id: string
    full_name: string
    role: string
    is_active: boolean
  }>
}

export interface AdaptedAreaData {
  id: string
  name: string
  description: string
  isActive: boolean
  manager: {
    id: string
    name: string
    email: string
    avatar?: string
  } | null
  metrics: {
    totalInitiatives: number
    completedInitiatives: number
    inProgressInitiatives: number
    avgInitiativeProgress: number
    totalObjectives: number
    completedObjectives: number
    avgObjectiveProgress: number
    totalTeamMembers: number
    activeTeamMembers: number
    overallHealth: 'excellent' | 'good' | 'needs-attention' | 'critical'
    productivity: number // 0-100 score
  }
  initiatives: Array<{
    id: string
    title: string
    progress: number
    status: string
    startDate?: Date
    dueDate?: Date
  }>
  objectives: Array<{
    id: string
    title: string
    progress: number
    status: string
  }>
  team: Array<{
    id: string
    name: string
    role: string
    isActive: boolean
  }>
  performance: {
    completionRate: number
    onTimeDelivery: number
    teamUtilization: number
    riskScore: number
  }
  timestamps: {
    created: Date
    updated: Date
  }
}

export interface AreaFilterOptions {
  isActive?: boolean
  hasManager?: boolean
  minTeamSize?: number
  healthStatus?: 'excellent' | 'good' | 'needs-attention' | 'critical'
  hasActiveInitiatives?: boolean
}

export class AreasAdapter {
  /**
   * Transform raw area data to adapted format
   */
  static adapt(raw: RawAreaData): AdaptedAreaData {
    const initiatives = raw.initiatives || []
    const objectives = raw.objectives || []
    const teamMembers = raw.user_profiles || []

    const metrics = this.calculateMetrics(initiatives, objectives, teamMembers)
    const performance = this.calculatePerformance(initiatives, objectives)
    const overallHealth = this.assessOverallHealth(metrics, performance)

    return {
      id: raw.id,
      name: raw.name,
      description: raw.description || '',
      isActive: raw.is_active,
      manager: raw.manager ? {
        id: raw.manager.id,
        name: raw.manager.full_name,
        email: raw.manager.email,
        avatar: raw.manager.avatar_url
      } : null,
      metrics: {
        ...metrics,
        overallHealth,
        productivity: this.calculateProductivityScore(metrics, performance)
      },
      initiatives: initiatives.map(initiative => ({
        id: initiative.id,
        title: initiative.title,
        progress: initiative.progress,
        status: initiative.status,
        startDate: initiative.start_date ? parseISO(initiative.start_date) : undefined,
        dueDate: initiative.due_date ? parseISO(initiative.due_date) : undefined
      })),
      objectives: objectives.map(objective => ({
        id: objective.id,
        title: objective.title,
        progress: objective.progress,
        status: objective.status
      })),
      team: teamMembers.map(member => ({
        id: member.id,
        name: member.full_name,
        role: member.role,
        isActive: member.is_active
      })),
      performance,
      timestamps: {
        created: parseISO(raw.created_at),
        updated: parseISO(raw.updated_at)
      }
    }
  }

  /**
   * Batch adapt multiple areas
   */
  static adaptMany(rawItems: RawAreaData[]): AdaptedAreaData[] {
    return rawItems.map(item => this.adapt(item))
  }

  /**
   * Filter areas based on various criteria
   */
  static filter(
    areas: AdaptedAreaData[], 
    filters: AreaFilterOptions
  ): AdaptedAreaData[] {
    return areas.filter(area => {
      if (filters.isActive !== undefined && area.isActive !== filters.isActive) {
        return false
      }

      if (filters.hasManager !== undefined) {
        const hasManager = !!area.manager
        if (hasManager !== filters.hasManager) {
          return false
        }
      }

      if (filters.minTeamSize !== undefined && 
          area.metrics.totalTeamMembers < filters.minTeamSize) {
        return false
      }

      if (filters.healthStatus && area.metrics.overallHealth !== filters.healthStatus) {
        return false
      }

      if (filters.hasActiveInitiatives !== undefined) {
        const hasActive = area.metrics.inProgressInitiatives > 0
        if (hasActive !== filters.hasActiveInitiatives) {
          return false
        }
      }

      return true
    })
  }

  /**
   * Group areas by different criteria
   */
  static groupBy(
    areas: AdaptedAreaData[],
    groupBy: 'status' | 'health' | 'size' | 'manager-status'
  ): Record<string, AdaptedAreaData[]> {
    const groups: Record<string, AdaptedAreaData[]> = {}

    areas.forEach(area => {
      let key: string

      switch (groupBy) {
        case 'status':
          key = area.isActive ? 'Active' : 'Inactive'
          break
        case 'health':
          key = area.metrics.overallHealth
          break
        case 'size':
          const teamSize = area.metrics.totalTeamMembers
          if (teamSize <= 5) key = 'Small (≤5)'
          else if (teamSize <= 15) key = 'Medium (6-15)'
          else key = 'Large (>15)'
          break
        case 'manager-status':
          key = area.manager ? 'Has Manager' : 'No Manager'
          break
        default:
          key = 'Other'
      }

      if (!groups[key]) {
        groups[key] = []
      }
      groups[key].push(area)
    })

    return groups
  }

  /**
   * Calculate organization-wide metrics from areas
   */
  static calculateOrganizationMetrics(areas: AdaptedAreaData[]) {
    const activeAreas = areas.filter(a => a.isActive)
    const total = activeAreas.length

    if (total === 0) {
      return {
        totalAreas: 0,
        areasWithManagers: 0,
        avgTeamSize: 0,
        totalTeamMembers: 0,
        totalInitiatives: 0,
        totalObjectives: 0,
        overallProgress: 0,
        healthDistribution: {
          excellent: 0,
          good: 0,
          'needs-attention': 0,
          critical: 0
        },
        avgProductivity: 0
      }
    }

    const areasWithManagers = activeAreas.filter(a => a.manager).length
    const totalTeamMembers = activeAreas.reduce((sum, a) => sum + a.metrics.totalTeamMembers, 0)
    const totalInitiatives = activeAreas.reduce((sum, a) => sum + a.metrics.totalInitiatives, 0)
    const totalObjectives = activeAreas.reduce((sum, a) => sum + a.metrics.totalObjectives, 0)
    
    const avgInitiativeProgress = total > 0 
      ? activeAreas.reduce((sum, a) => sum + a.metrics.avgInitiativeProgress, 0) / total 
      : 0
    
    const avgObjectiveProgress = total > 0 
      ? activeAreas.reduce((sum, a) => sum + a.metrics.avgObjectiveProgress, 0) / total 
      : 0

    const overallProgress = (avgInitiativeProgress + avgObjectiveProgress) / 2

    const healthDistribution = activeAreas.reduce((dist, area) => {
      dist[area.metrics.overallHealth]++
      return dist
    }, { excellent: 0, good: 0, 'needs-attention': 0, critical: 0 } as Record<string, number>)

    const avgProductivity = total > 0 
      ? activeAreas.reduce((sum, a) => sum + a.metrics.productivity, 0) / total 
      : 0

    return {
      totalAreas: total,
      areasWithManagers,
      managerCoverage: Math.round((areasWithManagers / total) * 100),
      avgTeamSize: Math.round(totalTeamMembers / total),
      totalTeamMembers,
      totalInitiatives,
      totalObjectives,
      overallProgress: Math.round(overallProgress),
      healthDistribution,
      avgProductivity: Math.round(avgProductivity)
    }
  }

  /**
   * Get areas that need attention
   */
  static getAreasNeedingAttention(areas: AdaptedAreaData[]) {
    const withoutManager = areas.filter(a => a.isActive && !a.manager)
    const lowPerformance = areas.filter(a => a.metrics.productivity < 50)
    const criticalHealth = areas.filter(a => a.metrics.overallHealth === 'critical')
    const needsAttentionHealth = areas.filter(a => a.metrics.overallHealth === 'needs-attention')
    const noActiveInitiatives = areas.filter(a => 
      a.isActive && a.metrics.inProgressInitiatives === 0
    )

    return {
      withoutManager,
      lowPerformance,
      criticalHealth,
      needsAttentionHealth,
      noActiveInitiatives,
      totalNeedingAttention: new Set([
        ...withoutManager,
        ...lowPerformance,
        ...criticalHealth,
        ...needsAttentionHealth,
        ...noActiveInitiatives
      ]).size
    }
  }

  /**
   * Transform for different view formats
   */
  static transformForView(
    areas: AdaptedAreaData[],
    viewType: 'card' | 'table' | 'grid' | 'org-chart'
  ) {
    switch (viewType) {
      case 'card':
        return areas.map(area => ({
          id: area.id,
          name: area.name,
          description: area.description,
          manager: area.manager?.name || 'No Manager',
          teamSize: area.metrics.totalTeamMembers,
          initiatives: area.metrics.totalInitiatives,
          objectives: area.metrics.totalObjectives,
          avgProgress: Math.round(
            (area.metrics.avgInitiativeProgress + area.metrics.avgObjectiveProgress) / 2
          ),
          health: area.metrics.overallHealth,
          productivity: area.metrics.productivity
        }))

      case 'table':
        return areas.map(area => ({
          id: area.id,
          name: area.name,
          manager: area.manager?.name || 'Unassigned',
          teamMembers: area.metrics.totalTeamMembers,
          initiatives: `${area.metrics.completedInitiatives}/${area.metrics.totalInitiatives}`,
          objectives: `${area.metrics.completedObjectives}/${area.metrics.totalObjectives}`,
          avgProgress: Math.round(
            (area.metrics.avgInitiativeProgress + area.metrics.avgObjectiveProgress) / 2
          ),
          health: area.metrics.overallHealth,
          productivity: area.metrics.productivity,
          isActive: area.isActive
        }))

      case 'grid':
        return areas.map(area => ({
          id: area.id,
          name: area.name,
          description: area.description,
          manager: area.manager,
          metrics: {
            teamSize: area.metrics.totalTeamMembers,
            initiatives: area.metrics.totalInitiatives,
            objectives: area.metrics.totalObjectives,
            health: area.metrics.overallHealth,
            productivity: area.metrics.productivity
          },
          performance: area.performance
        }))

      case 'org-chart':
        return areas
          .filter(a => a.isActive)
          .map(area => ({
            id: area.id,
            name: area.name,
            manager: area.manager ? {
              id: area.manager.id,
              name: area.manager.name,
              email: area.manager.email,
              avatar: area.manager.avatar
            } : null,
            team: area.team.filter(member => member.isActive),
            metrics: {
              teamSize: area.metrics.activeTeamMembers,
              productivity: area.metrics.productivity,
              health: area.metrics.overallHealth
            }
          }))

      default:
        return areas
    }
  }

  // Private helper methods
  private static calculateMetrics(
    initiatives: any[], 
    objectives: any[], 
    teamMembers: any[]
  ) {
    const totalInitiatives = initiatives.length
    const completedInitiatives = initiatives.filter(i => i.status === 'completed').length
    const inProgressInitiatives = initiatives.filter(i => i.status === 'in_progress').length
    const avgInitiativeProgress = totalInitiatives > 0 
      ? initiatives.reduce((sum, i) => sum + i.progress, 0) / totalInitiatives 
      : 0

    const totalObjectives = objectives.length
    const completedObjectives = objectives.filter(o => o.status === 'completed').length
    const avgObjectiveProgress = totalObjectives > 0 
      ? objectives.reduce((sum, o) => sum + o.progress, 0) / totalObjectives 
      : 0

    const totalTeamMembers = teamMembers.length
    const activeTeamMembers = teamMembers.filter(m => m.is_active).length

    return {
      totalInitiatives,
      completedInitiatives,
      inProgressInitiatives,
      avgInitiativeProgress: Math.round(avgInitiativeProgress),
      totalObjectives,
      completedObjectives,
      avgObjectiveProgress: Math.round(avgObjectiveProgress),
      totalTeamMembers,
      activeTeamMembers
    }
  }

  private static calculatePerformance(initiatives: any[], objectives: any[]) {
    const totalItems = initiatives.length + objectives.length
    const completedItems = 
      initiatives.filter(i => i.status === 'completed').length +
      objectives.filter(o => o.status === 'completed').length

    const completionRate = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

    // Calculate on-time delivery (simplified - would need due dates)
    const onTimeDelivery = 85 // Placeholder - would calculate from actual due dates

    // Team utilization (simplified)
    const teamUtilization = initiatives.length > 0 ? 75 : 0 // Placeholder

    // Risk score based on progress vs time
    const riskScore = this.calculateRiskScore(initiatives, objectives)

    return {
      completionRate: Math.round(completionRate),
      onTimeDelivery,
      teamUtilization,
      riskScore
    }
  }

  private static calculateRiskScore(initiatives: any[], objectives: any[]): number {
    // Simplified risk calculation
    const lowProgressItems = [
      ...initiatives.filter(i => i.progress < 50 && i.status !== 'completed'),
      ...objectives.filter(o => o.progress < 50 && o.status !== 'completed')
    ]

    const totalActiveItems = [
      ...initiatives.filter(i => i.status !== 'completed'),
      ...objectives.filter(o => o.status !== 'completed')
    ].length

    if (totalActiveItems === 0) return 0

    const riskPercentage = (lowProgressItems.length / totalActiveItems) * 100
    return Math.round(riskPercentage)
  }

  private static assessOverallHealth(
    metrics: any, 
    performance: any
  ): 'excellent' | 'good' | 'needs-attention' | 'critical' {
    const avgProgress = (metrics.avgInitiativeProgress + metrics.avgObjectiveProgress) / 2
    const completionRate = performance.completionRate
    const riskScore = performance.riskScore

    if (avgProgress >= 85 && completionRate >= 80 && riskScore <= 20) {
      return 'excellent'
    } else if (avgProgress >= 70 && completionRate >= 60 && riskScore <= 40) {
      return 'good'
    } else if (avgProgress >= 50 && completionRate >= 40 && riskScore <= 60) {
      return 'needs-attention'
    } else {
      return 'critical'
    }
  }

  private static calculateProductivityScore(metrics: any, performance: any): number {
    const factors = [
      performance.completionRate,
      performance.onTimeDelivery,
      performance.teamUtilization,
      100 - performance.riskScore, // Invert risk score
      metrics.avgInitiativeProgress,
      metrics.avgObjectiveProgress
    ]

    const weightedScore = factors.reduce((sum, factor) => sum + factor, 0) / factors.length
    return Math.round(Math.max(0, Math.min(100, weightedScore)))
  }
}

export default AreasAdapter