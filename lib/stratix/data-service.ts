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
    overdueInitiatives: number
    totalAreas: number
    activeBudget: number
    totalActualCost: number
    averageProgress: number
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
    active_initiatives?: number
    average_progress?: number
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
      console.log('📊 Gathering comprehensive company context for user:', userId)
      
      // Get user profile with enhanced details
      const { data: profile, error: profileError } = await this.supabase
        .from('user_profiles')
        .select(`
          *,
          areas!user_profiles_area_id_fkey(
            id,
            name,
            description
          )
        `)
        .eq('id', userId)
        .single()

      if (profileError || !profile) {
        console.error('Error fetching user profile:', profileError)
        throw new Error('User profile not found')
      }

      console.log('👤 User profile loaded:', profile.full_name, '| Tenant:', profile.tenant_id)

      // Get initiatives with comprehensive details using the summary view
      const { data: initiatives, error: initiativesError } = await this.supabase
        .from('initiatives_with_subtasks_summary')
        .select('*')
        
        .order('updated_at', { ascending: false })

      if (initiativesError) {
        console.error('Error fetching initiatives:', initiativesError)
        throw new Error('Failed to fetch initiatives data')
      }

      console.log('🎯 Initiatives loaded:', initiatives?.length || 0)

      // Transform initiatives to match InitiativeSummary interface
      const transformedInitiatives: InitiativeSummary[] = (initiatives || []).map(initiative => {
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
          initiative_progress: initiative.initiative_progress || 0,
          target_date: initiative.target_date,
          completion_date: initiative.completion_date,
          budget: initiative.budget,
          actual_cost: initiative.actual_cost,
          created_at: initiative.created_at,
          updated_at: initiative.updated_at,
          subtask_count: initiative.subtask_count || 0,
          completed_subtask_count: initiative.completed_subtask_count || 0,
          subtask_completion_rate: initiative.subtask_completion_rate || 0,
          areas: undefined, // Will be populated later if needed
          created_by_user: undefined, // Will be populated later if needed
          owner_user: undefined // Will be populated later if needed
        }
      })

      // Get areas with comprehensive statistics
      const { data: areas, error: areasError } = await this.supabase
        .from('areas')
        .select(`
          *,
          user_profiles!areas_manager_id_fkey(
            full_name,
            email
          )
        `)
        
        .eq('is_active', true)

      if (areasError) {
        console.error('Error fetching areas:', areasError)
        throw new Error('Failed to fetch areas data')
      }

      console.log('🏢 Areas loaded:', areas?.length || 0)

      // Calculate comprehensive area statistics
      const areasWithStats = (areas || []).map(area => {
        const areaInitiatives = transformedInitiatives.filter(i => i.area_id === area.id)
        const completedInitiatives = areaInitiatives.filter(i => i.status === 'completed')
        const inProgressInitiatives = areaInitiatives.filter(i => i.status === 'in_progress')
        const averageProgress = areaInitiatives.length > 0 
          ? Math.round(areaInitiatives.reduce((sum, i) => sum + i.initiative_progress, 0) / areaInitiatives.length)
          : 0
        
        return {
          id: area.id,
          name: area.name,
          description: area.description,
          manager: area.user_profiles,
          initiatives_count: areaInitiatives.length,
          completion_rate: areaInitiatives.length > 0 
            ? Math.round((completedInitiatives.length / areaInitiatives.length) * 100)
            : 0,
          active_initiatives: inProgressInitiatives.length,
          average_progress: averageProgress
        }
      })

      // Get user count for the tenant
      const { count: totalUsers, error: usersError } = await this.supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true })
        

      if (usersError) {
        console.warn('Error fetching user count:', usersError)
      }

      console.log('👥 Total users:', totalUsers || 0)

      // Calculate comprehensive company metrics
      const activeInitiatives = transformedInitiatives.filter(i => 
        i.status === 'in_progress' || i.status === 'planning'
      ).length
      const completedInitiatives = transformedInitiatives.filter(i => 
        i.status === 'completed'
      ).length
      const overdueInitiatives = transformedInitiatives.filter(i => 
        i.target_date && 
        new Date(i.target_date) < new Date() && 
        i.status !== 'completed'
      ).length
      
      const totalBudget = transformedInitiatives.reduce((sum, i) => sum + (i.budget || 0), 0)
      const totalActualCost = transformedInitiatives.reduce((sum, i) => sum + (i.actual_cost || 0), 0)
      const averageProgress = transformedInitiatives.length > 0 
        ? Math.round(transformedInitiatives.reduce((sum, i) => sum + i.initiative_progress, 0) / transformedInitiatives.length)
        : 0

      // Generate enhanced recent activity
      const recentActivity = this.generateRecentActivity(transformedInitiatives)

      console.log('📈 Company metrics calculated:', {
        total: transformedInitiatives.length,
        active: activeInitiatives,
        completed: completedInitiatives,
        overdue: overdueInitiatives,
        avgProgress: averageProgress
      })

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
          overdueInitiatives,
          totalAreas: areasWithStats.length,
          activeBudget: totalBudget,
          totalActualCost,
          averageProgress,
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
    
    console.log('🎯 Generating KPIs from real company data...')
    
    // Calculate performance metrics from real data
    const completionRate = company.totalInitiatives > 0 
      ? Math.round((company.completedInitiatives / company.totalInitiatives) * 100)
      : 0

    const averageProgress = company.averageProgress

    // Budget efficiency calculation
    const budgetEfficiency = company.activeBudget > 0 
      ? Math.round(((company.activeBudget - company.totalActualCost) / company.activeBudget) * 100)
      : 100

    // Risk assessment metrics
    const riskLevel = company.overdueInitiatives > 0 ? 'high' : 
                     averageProgress < 50 ? 'medium' : 'low'

    // Performance trends (simplified calculation)
    const completionTrend: 'up' | 'down' | 'stable' = completionRate >= 80 ? 'up' : completionRate >= 60 ? 'stable' : 'down'
    const budgetTrend: 'up' | 'down' | 'stable' = budgetEfficiency >= 85 ? 'up' : budgetEfficiency >= 70 ? 'stable' : 'down'
    const progressTrend: 'up' | 'down' | 'stable' = averageProgress >= 75 ? 'up' : averageProgress >= 50 ? 'stable' : 'down'

    const kpis = [
      {
        name: "Tasa de Cumplimiento General",
        value: `${completionRate}%`,
        trend: completionTrend,
        trendValue: completionRate >= 80 ? 5.2 : completionRate >= 60 ? 0 : -3.1,
        category: "performance",
        priority: completionRate < 70 ? "high" : "medium",
        target: "85%",
        description: `${company.completedInitiatives} de ${company.totalInitiatives} iniciativas completadas`
      },
      {
        name: "Progreso Promedio",
        value: `${averageProgress}%`,
        trend: progressTrend,
        trendValue: averageProgress >= 75 ? 8.3 : averageProgress >= 50 ? 0 : -4.7,
        category: "performance", 
        priority: averageProgress < 60 ? "high" : "medium",
        target: "80%",
        description: "Progreso promedio de todas las iniciativas activas"
      },
      {
        name: "Iniciativas en Riesgo",
        value: company.overdueInitiatives,
        trend: company.overdueInitiatives <= 2 ? 'up' : company.overdueInitiatives <= 5 ? 'stable' : 'down',
        trendValue: company.overdueInitiatives <= 2 ? -2 : company.overdueInitiatives <= 5 ? 0 : company.overdueInitiatives,
        category: "risk",
        priority: company.overdueInitiatives > 3 ? "high" : "medium",
        unit: "iniciativas",
        description: "Iniciativas con fechas vencidas que requieren atención"
      },
      {
        name: "Eficiencia Presupuestaria",
        value: `${budgetEfficiency}%`,
        trend: budgetTrend,
        trendValue: budgetEfficiency >= 85 ? 12.5 : budgetEfficiency >= 70 ? 0 : -8.2,
        category: "financial",
        priority: budgetEfficiency < 70 ? "high" : "medium",
        target: "90%",
        description: `$${company.totalActualCost.toLocaleString()} gastado de $${company.activeBudget.toLocaleString()}`
      },
      {
        name: "Iniciativas Activas",
        value: company.activeInitiatives,
        trend: 'stable',
        trendValue: 0,
        category: "operations",
        priority: "medium",
        unit: "iniciativas",
        description: "Iniciativas en progreso y planificación"
      },
      {
        name: "Cobertura Organizacional",
        value: `${context.areas.length}`,
        trend: 'stable',
        trendValue: 0,
        category: "organization",
        priority: "low",
        unit: "áreas",
        description: `${company.totalUsers} usuarios distribuidos en ${context.areas.length} áreas`
      }
    ]

    console.log('✅ Generated', kpis.length, 'KPIs from real data')
    return kpis
  }

  generateInsightsFromContext(context: CompanyContext): StratixInsight[] {
    const insights: StratixInsight[] = []
    const { initiatives, areas, company } = context

    console.log('🧠 Generating insights from real company data...')

    // Identify high-performing areas with enhanced metrics
    const topPerformingArea = areas.reduce((best, area) => 
      (area.completion_rate > best.completion_rate || 
       (area.completion_rate === best.completion_rate && area.average_progress > best.average_progress)) 
      ? area : best, 
      areas[0] || { completion_rate: 0, name: '', average_progress: 0 }
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