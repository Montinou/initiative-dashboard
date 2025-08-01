import { createClient } from '@/utils/supabase/client'
import { StratixKPI, StratixInsight, StratixActionPlan } from './api-client'
import type { InitiativeSummary } from '@/hooks/useInitiativesSummary'

export interface CompanyContext {
  userId: string
  tenantId: string
  profile: {
    fullName: string
    email: string
    role?: string
  }
  company: {
    totalInitiatives: number
    activeInitiatives: number
    completedInitiatives: number
    totalAreas: number
    activeBudget: number
    totalUsers: number
  }
  initiatives: InitiativeSummary[]
  areas: Array<{
    id: string
    name: string
    description?: string | null
    manager?: {
      full_name: string | null
      email: string
    }
    initiatives_count: number
    completion_rate: number
  }>
  recentActivity: Array<{
    type: 'initiative_created' | 'initiative_completed' | 'milestone_reached' | 'budget_alert'
    title: string
    description: string
    date: string
    metadata?: any
  }>
}

export class StratixDataService {
  private supabase = createClient()

  async gatherCompanyContext(userId: string): Promise<CompanyContext> {
    try {
      // Get user profile
      const { data: profile } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (!profile) {
        throw new Error('User profile not found')
      }

      // Get initiatives with full details
      const { data: initiatives } = await this.supabase
        .from('initiatives')
        .select(`
          *,
          areas(
            id,
            name,
            description
          ),
          created_by_user:user_profiles!initiatives_created_by_fkey(
            id,
            full_name,
            email
          ),
          owner_user:user_profiles!initiatives_owner_id_fkey(
            id,
            email
          ),
          subtasks(*)
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('updated_at', { ascending: false })

      // Transform initiatives to match InitiativeSummary interface
      const transformedInitiatives: InitiativeSummary[] = (initiatives || []).map(initiative => {
        const subtasks = initiative.subtasks || []
        const completedSubtasks = subtasks.filter((st: any) => st.completed)
        
        return {
          id: initiative.id,
          tenant_id: initiative.tenant_id,
          area_id: initiative.area_id,
          created_by: initiative.created_by,
          owner_id: initiative.owner_id,
          title: initiative.title,
          description: initiative.description,
          status: initiative.status,
          priority: initiative.priority,
          initiative_progress: initiative.progress || 0,
          target_date: initiative.target_date,
          completion_date: initiative.completion_date,
          budget: initiative.budget,
          actual_cost: initiative.actual_cost,
          created_at: initiative.created_at,
          updated_at: initiative.updated_at,
          subtask_count: subtasks.length,
          completed_subtask_count: completedSubtasks.length,
          subtask_completion_rate: subtasks.length > 0 ? Math.round((completedSubtasks.length / subtasks.length) * 100) : 0,
          areas: initiative.areas,
          created_by_user: initiative.created_by_user,
          owner_user: initiative.owner_user
        }
      })

      // Get areas with statistics
      const { data: areas } = await this.supabase
        .from('areas')
        .select(`
          *,
          user_profiles!areas_manager_id_fkey(
            full_name,
            email
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('is_active', true)

      // Calculate area statistics
      const areasWithStats = (areas || []).map(area => {
        const areaInitiatives = transformedInitiatives.filter(i => i.area_id === area.id)
        const completedInitiatives = areaInitiatives.filter(i => i.status === 'completed')
        
        return {
          id: area.id,
          name: area.name,
          description: area.description,
          manager: area.user_profiles,
          initiatives_count: areaInitiatives.length,
          completion_rate: areaInitiatives.length > 0 
            ? Math.round((completedInitiatives.length / areaInitiatives.length) * 100)
            : 0
        }
      })

      // Get user count for the tenant
      const { count: totalUsers } = await this.supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', profile.tenant_id)

      // Calculate company metrics
      const activeInitiatives = transformedInitiatives.filter(i => 
        i.status === 'in_progress' || i.status === 'planning'
      ).length
      const completedInitiatives = transformedInitiatives.filter(i => 
        i.status === 'completed'
      ).length
      const totalBudget = transformedInitiatives.reduce((sum, i) => sum + (i.budget || 0), 0)

      // Generate recent activity (simplified for now)
      const recentActivity = this.generateRecentActivity(transformedInitiatives)

      const context: CompanyContext = {
        userId,
        tenantId: profile.tenant_id,
        profile: {
          fullName: profile.full_name || 'User',
          email: profile.email,
          role: profile.role
        },
        company: {
          totalInitiatives: transformedInitiatives.length,
          activeInitiatives,
          completedInitiatives,
          totalAreas: areasWithStats.length,
          activeBudget: totalBudget,
          totalUsers: totalUsers || 0
        },
        initiatives: transformedInitiatives,
        areas: areasWithStats,
        recentActivity
      }

      return context
    } catch (error) {
      console.error('Error gathering company context:', error)
      throw error
    }
  }

  generateKPIsFromContext(context: CompanyContext): StratixKPI[] {
    const { company, initiatives } = context
    
    // Calculate performance metrics
    const completionRate = company.totalInitiatives > 0 
      ? Math.round((company.completedInitiatives / company.totalInitiatives) * 100)
      : 0

    const averageProgress = initiatives.length > 0 
      ? Math.round(initiatives.reduce((sum, i) => sum + i.initiative_progress, 0) / initiatives.length)
      : 0

    const overdueInitiatives = initiatives.filter(i => 
      i.target_date && 
      new Date(i.target_date) < new Date() && 
      i.status !== 'completed'
    ).length

    // Calculate budget efficiency
    const totalCost = initiatives.reduce((sum, i) => sum + (i.actual_cost || 0), 0)
    const budgetEfficiency = company.activeBudget > 0 
      ? Math.round(((company.activeBudget - totalCost) / company.activeBudget) * 100)
      : 100

    const inProgressInitiatives = initiatives.filter(i => i.status === 'in_progress').length

    return [
      {
        name: "Tasa de Cumplimiento General",
        value: `${completionRate}%`,
        trend: completionRate >= 80 ? 'up' : completionRate >= 60 ? 'stable' : 'down',
        trendValue: completionRate >= 80 ? 5.2 : completionRate >= 60 ? 0 : -3.1,
        category: "performance",
        priority: completionRate < 70 ? "high" : "medium",
        target: "85%",
        description: "Porcentaje de iniciativas completadas exitosamente"
      },
      {
        name: "Progreso Promedio",
        value: `${averageProgress}%`,
        trend: averageProgress >= 75 ? 'up' : averageProgress >= 50 ? 'stable' : 'down',
        trendValue: averageProgress >= 75 ? 8.3 : averageProgress >= 50 ? 0 : -4.7,
        category: "performance", 
        priority: averageProgress < 60 ? "high" : "medium",
        target: "80%",
        description: "Progreso promedio de todas las iniciativas activas"
      },
      {
        name: "Iniciativas en Riesgo",
        value: overdueInitiatives,
        trend: overdueInitiatives <= 2 ? 'up' : overdueInitiatives <= 5 ? 'stable' : 'down',
        trendValue: overdueInitiatives <= 2 ? -2 : overdueInitiatives <= 5 ? 0 : overdueInitiatives,
        category: "risk",
        priority: overdueInitiatives > 3 ? "high" : "medium",
        unit: "iniciativas",
        description: "Número de iniciativas con retraso crítico"
      },
      {
        name: "Eficiencia Presupuestaria",
        value: `${budgetEfficiency}%`,
        trend: budgetEfficiency >= 85 ? 'up' : budgetEfficiency >= 70 ? 'stable' : 'down',
        trendValue: budgetEfficiency >= 85 ? 12.5 : budgetEfficiency >= 70 ? 0 : -8.2,
        category: "financial",
        priority: budgetEfficiency < 70 ? "high" : "medium",
        target: "90%",
        description: "Eficiencia en el uso del presupuesto asignado"
      },
      {
        name: "Iniciativas Activas",
        value: inProgressInitiatives,
        trend: 'stable',
        trendValue: 0,
        category: "operations",
        priority: "medium",
        unit: "iniciativas",
        description: "Número total de iniciativas en progreso"
      },
      {
        name: "Áreas Involucradas",
        value: context.areas.length,
        trend: 'stable',
        trendValue: 0,
        category: "organization",
        priority: "low",
        unit: "áreas",
        description: "Número de áreas organizacionales activas"
      }
    ]
  }

  generateInsightsFromContext(context: CompanyContext): StratixInsight[] {
    const insights: StratixInsight[] = []
    const { initiatives, areas, company } = context

    // Identify high-performing areas
    const topPerformingArea = areas.reduce((best, area) => 
      area.completion_rate > best.completion_rate ? area : best, 
      areas[0] || { completion_rate: 0, name: '' }
    )

    if (topPerformingArea && topPerformingArea.completion_rate > 80) {
      insights.push({
        id: `insight-top-area-${Date.now()}`,
        title: `Área de Alto Rendimiento: ${topPerformingArea.name}`,
        description: `El área "${topPerformingArea.name}" destaca con un ${topPerformingArea.completion_rate}% de tasa de finalización. Este éxito podría replicarse en otras áreas.`,
        impact: "high",
        type: "opportunity",
        metrics: [`Completación ${topPerformingArea.completion_rate}%`, `${topPerformingArea.initiatives_count} iniciativas`],
        affectedAreas: [topPerformingArea.name],
        suggestedActions: [
          "Documentar las mejores prácticas del área",
          "Realizar sesiones de intercambio de conocimientos",
          "Aplicar metodologías exitosas a otras áreas"
        ]
      })
    }

    // Identify overdue initiatives risk
    const overdueInitiatives = initiatives.filter(i => 
      i.target_date && 
      new Date(i.target_date) < new Date() && 
      i.status !== 'completed'
    )

    if (overdueInitiatives.length > 2) {
      insights.push({
        id: `insight-overdue-${Date.now()}`,
        title: "Riesgo: Múltiples Iniciativas Retrasadas",
        description: `Se detectaron ${overdueInitiatives.length} iniciativas con fechas vencidas. Esto podría impactar los objetivos estratégicos del período.`,
        impact: "high",
        type: "risk",
        metrics: [`${overdueInitiatives.length} iniciativas retrasadas`, "Impacto en cronograma general"],
        affectedAreas: [...new Set(overdueInitiatives.map(i => i.areas?.name).filter(Boolean))] as string[],
        suggestedActions: [
          "Revisar cronogramas y recursos asignados",
          "Priorizar iniciativas críticas",
          "Implementar seguimiento semanal"
        ]
      })
    }

    // Budget efficiency insight
    const budgetUtilization = initiatives.reduce((sum, i) => sum + (i.actual_cost || 0), 0)
    const budgetEfficiency = company.activeBudget > 0 
      ? (budgetUtilization / company.activeBudget) * 100 
      : 0

    if (budgetEfficiency > 90) {
      insights.push({
        id: `insight-budget-${Date.now()}`,
        title: "Alerta: Alto Consumo Presupuestario",
        description: `El consumo presupuestario está al ${Math.round(budgetEfficiency)}%, acercándose al límite establecido. Se recomienda revisión y ajustes.`,
        impact: "medium",
        type: "risk",
        metrics: [`${Math.round(budgetEfficiency)}% del presupuesto utilizado`],
        affectedAreas: ["Finanzas"],
        suggestedActions: [
          "Revisar gastos por iniciativa",
          "Renegociar presupuestos si es necesario",
          "Implementar controles de gasto más estrictos"
        ]
      })
    }

    // Recommend automation opportunities
    const manualTasks = initiatives.filter(i => 
      i.description?.toLowerCase().includes('manual') ||
      i.title.toLowerCase().includes('manual') ||
      i.description?.toLowerCase().includes('proceso') 
    )

    if (manualTasks.length > 3) {
      insights.push({
        id: `insight-automation-${Date.now()}`,
        title: "Oportunidad: Automatización de Procesos",
        description: `Se identificaron ${manualTasks.length} iniciativas que involucran procesos manuales. La automatización podría mejorar significativamente la eficiencia.`,
        impact: "medium",
        type: "recommendation",
        metrics: [`${manualTasks.length} procesos manuales identificados`, "ROI estimado: 6-12 meses"],
        affectedAreas: [...new Set(manualTasks.map(i => i.areas?.name).filter(Boolean))] as string[],
        suggestedActions: [
          "Evaluar herramientas de automatización",
          "Priorizar procesos por frecuencia e impacto",
          "Crear plan de implementación gradual"
        ]
      })
    }

    return insights
  }

  private generateRecentActivity(initiatives: InitiativeSummary[]): Array<{
    type: 'initiative_created' | 'initiative_completed' | 'milestone_reached' | 'budget_alert'
    title: string
    description: string
    date: string
    metadata?: any
  }> {
    const activity: Array<{
      type: 'initiative_created' | 'initiative_completed' | 'milestone_reached' | 'budget_alert'
      title: string
      description: string
      date: string
      metadata?: any
    }> = []
    
    // Recent completions
    const recentCompletions = initiatives
      .filter(i => i.status === 'completed' && i.completion_date)
      .sort((a, b) => new Date(b.completion_date!).getTime() - new Date(a.completion_date!).getTime())
      .slice(0, 3)

    recentCompletions.forEach(initiative => {
      activity.push({
        type: 'initiative_completed' as const,
        title: `Iniciativa Completada: ${initiative.title}`,
        description: `Se completó exitosamente la iniciativa en el área ${initiative.areas?.name || 'No asignada'}`,
        date: initiative.completion_date!,
        metadata: { initiativeId: initiative.id, progress: initiative.initiative_progress }
      })
    })

    // Recent creations
    const recentCreations = initiatives
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 2)

    recentCreations.forEach(initiative => {
      activity.push({
        type: 'initiative_created' as const,
        title: `Nueva Iniciativa: ${initiative.title}`,
        description: `Se creó una nueva iniciativa con prioridad ${initiative.priority}`,
        date: initiative.created_at,
        metadata: { initiativeId: initiative.id, priority: initiative.priority }
      })
    })

    return activity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5)
  }
}

// Export singleton instance  
export const stratixDataService = new StratixDataService()