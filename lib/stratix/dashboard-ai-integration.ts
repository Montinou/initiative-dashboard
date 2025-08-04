import { stratixAPI } from './api-client'
import { stratixDataService } from './data-service'
import { roleBasedAI } from './role-based-ai'
import type { CompanyContext } from './data-service'
import type { UserRole } from './role-based-ai'
import type { StratixKPI, StratixInsight, StratixActionPlan } from './api-client'

export type DashboardView = 'overview' | 'initiatives' | 'areas' | 'analytics'

export interface DashboardAIEnhancement {
  view: DashboardView
  insights: StratixInsight[]
  kpis: StratixKPI[]
  recommendations: string[]
  alerts: DashboardAlert[]
  predictions: DashboardPrediction[]
  contextualHelp: string[]
  smartActions: SmartAction[]
}

export interface DashboardAlert {
  id: string
  type: 'warning' | 'info' | 'success' | 'error'
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  actionRequired: boolean
  relatedItems: string[]
  dismissible: boolean
}

export interface DashboardPrediction {
  id: string
  title: string
  description: string
  confidence: number
  timeline: 'next_week' | 'next_month' | 'next_quarter'
  impact: 'positive' | 'negative' | 'neutral'
  relatedMetrics: string[]
}

export interface SmartAction {
  id: string
  title: string
  description: string
  type: 'automation' | 'optimization' | 'alert' | 'report'
  estimatedImpact: string
  difficulty: 'easy' | 'medium' | 'hard'
  timeRequired: string
}

class DashboardAIIntegrationService {
  
  // Generate AI enhancements for overview dashboard
  async enhanceOverviewDashboard(
    userId: string,
    userRole: UserRole,
    context: CompanyContext
  ): Promise<DashboardAIEnhancement> {
    console.log('🎯 Enhancing overview dashboard with AI for role:', userRole)
    
    try {
      // Generate role-based insights for overview
      const roleBasedResponse = await roleBasedAI.processRoleBasedQuery(userId, {
        role: userRole,
        query: 'Proporciona un análisis general del estado de la empresa, identificando las métricas más importantes, alertas críticas y oportunidades de mejora inmediatas',
        context,
        analysisType: 'strategic'
      })

      // Generate context-based insights
      const contextInsights = stratixDataService.generateInsightsFromContext(context)
      const contextKPIs = stratixDataService.generateKPIsFromContext(context)

      // Generate dashboard-specific alerts
      const alerts = this.generateOverviewAlerts(context, userRole)
      const predictions = this.generateOverviewPredictions(context, userRole)
      const smartActions = this.generateOverviewSmartActions(context, userRole)

      const enhancement: DashboardAIEnhancement = {
        view: 'overview',
        insights: [...(roleBasedResponse.insights || []), ...contextInsights],
        kpis: [...(roleBasedResponse.kpis || []), ...contextKPIs],
        recommendations: [
          ...roleBasedResponse.recommendations,
          'Revisa las iniciativas con mayor retraso para tomar acciones correctivas',
          'Considera optimizar los procesos en áreas con menor rendimiento',
          'Evalúa la reasignación de recursos hacia iniciativas de alto impacto'
        ],
        alerts,
        predictions,
        contextualHelp: [
          'El dashboard de resumen muestra las métricas más críticas de tu organización',
          'Los KPIs se actualizan en tiempo real basados en el progreso de las iniciativas',
          'Las alertas te notifican sobre situaciones que requieren atención inmediata',
          'Usa el chat de IA para hacer consultas específicas sobre cualquier métrica'
        ],
        smartActions
      }

      return enhancement

    } catch (error) {
      console.error('❌ Error enhancing overview dashboard:', error)
      return this.getDefaultEnhancement('overview')
    }
  }

  // Generate AI enhancements for initiatives dashboard
  async enhanceInitiativesDashboard(
    userId: string,
    userRole: UserRole,
    context: CompanyContext
  ): Promise<DashboardAIEnhancement> {
    console.log('🎯 Enhancing initiatives dashboard with AI for role:', userRole)
    
    try {
      const roleBasedResponse = await roleBasedAI.processRoleBasedQuery(userId, {
        role: userRole,
        query: 'Analiza el portafolio de iniciativas actual, identifica cuellos de botella, iniciativas en riesgo y oportunidades de optimización. Proporciona recomendaciones específicas para mejorar la ejecución.',
        context,
        analysisType: 'operational'
      })

      const alerts = this.generateInitiativesAlerts(context, userRole)
      const predictions = this.generateInitiativesPredictions(context, userRole)
      const smartActions = this.generateInitiativesSmartActions(context, userRole)

      const enhancement: DashboardAIEnhancement = {
        view: 'initiatives',
        insights: roleBasedResponse.insights || [],
        kpis: roleBasedResponse.kpis || [],
        recommendations: [
          ...roleBasedResponse.recommendations,
          'Prioriza iniciativas con mayor impacto estratégico',
          'Identifica dependencias críticas entre iniciativas',
          'Considera consolidar iniciativas con objetivos similares'
        ],
        alerts,
        predictions,
        contextualHelp: [
          'El dashboard de iniciativas te permite gestionar todo el portafolio de proyectos',
          'Filtra por estado, área o prioridad para enfocarte en lo más importante',
          'Las métricas de progreso se calculan automáticamente desde las subtareas',
          'Usa las predicciones de IA para anticipar problemas potenciales'
        ],
        smartActions
      }

      return enhancement

    } catch (error) {
      console.error('❌ Error enhancing initiatives dashboard:', error)
      return this.getDefaultEnhancement('initiatives')
    }
  }

  // Generate AI enhancements for areas dashboard
  async enhanceAreasDashboard(
    userId: string,
    userRole: UserRole,
    context: CompanyContext
  ): Promise<DashboardAIEnhancement> {
    console.log('🎯 Enhancing areas dashboard with AI for role:', userRole)
    
    try {
      const roleBasedResponse = await roleBasedAI.processRoleBasedQuery(userId, {
        role: userRole,
        query: 'Evalúa el rendimiento por áreas organizacionales, identifica desbalances de carga de trabajo, oportunidades de colaboración entre áreas y necesidades de fortalecimiento específicas.',
        context,
        analysisType: 'operational'
      })

      const alerts = this.generateAreasAlerts(context, userRole)
      const predictions = this.generateAreasPredictions(context, userRole)
      const smartActions = this.generateAreasSmartActions(context, userRole)

      const enhancement: DashboardAIEnhancement = {
        view: 'areas',
        insights: roleBasedResponse.insights || [],
        kpis: roleBasedResponse.kpis || [],
        recommendations: [
          ...roleBasedResponse.recommendations,
          'Equilibra la carga de trabajo entre áreas con diferentes niveles de ocupación',
          'Facilita la colaboración entre áreas con objetivos complementarios',
          'Identifica oportunidades de intercambio de mejores prácticas'
        ],
        alerts,
        predictions,
        contextualHelp: [
          'El dashboard de áreas muestra el rendimiento organizacional por departamentos',
          'Compara métricas entre áreas para identificar oportunidades de mejora',
          'Los managers pueden ver detalles específicos de su área asignada',
          'Usa los insights de IA para optimizar la distribución de recursos'
        ],
        smartActions
      }

      return enhancement

    } catch (error) {
      console.error('❌ Error enhancing areas dashboard:', error)
      return this.getDefaultEnhancement('areas')
    }
  }

  // Generate AI enhancements for analytics dashboard
  async enhanceAnalyticsDashboard(
    userId: string,
    userRole: UserRole,
    context: CompanyContext
  ): Promise<DashboardAIEnhancement> {
    console.log('🎯 Enhancing analytics dashboard with AI for role:', userRole)
    
    try {
      const roleBasedResponse = await roleBasedAI.processRoleBasedQuery(userId, {
        role: userRole,
        query: 'Realiza un análisis profundo de tendencias, patrones de rendimiento, correlaciones entre métricas y proyecciones futuras. Identifica oportunidades de optimización basadas en datos históricos.',
        context,
        analysisType: 'predictive'
      })

      const alerts = this.generateAnalyticsAlerts(context, userRole)
      const predictions = this.generateAnalyticsPredictions(context, userRole)
      const smartActions = this.generateAnalyticsSmartActions(context, userRole)

      const enhancement: DashboardAIEnhancement = {
        view: 'analytics',
        insights: roleBasedResponse.insights || [],
        kpis: roleBasedResponse.kpis || [],
        recommendations: [
          ...roleBasedResponse.recommendations,
          'Monitorea las tendencias de rendimiento para detectar patrones emergentes',
          'Utiliza correlaciones identificadas para optimizar la toma de decisiones',
          'Establece alertas automáticas basadas en desviaciones significativas'
        ],
        alerts,
        predictions,
        contextualHelp: [
          'El dashboard de analítica proporciona insights profundos sobre tendencias y patrones',
          'Los gráficos interactivos te permiten explorar datos desde diferentes perspectivas',
          'Las correlaciones de IA revelan relaciones ocultas entre métricas',
          'Usa las proyecciones para planificar estrategias futuras'
        ],
        smartActions
      }

      return enhancement

    } catch (error) {
      console.error('❌ Error enhancing analytics dashboard:', error)
      return this.getDefaultEnhancement('analytics')
    }
  }

  // Generate view-specific alerts
  private generateOverviewAlerts(context: CompanyContext, userRole: UserRole): DashboardAlert[] {
    const alerts: DashboardAlert[] = []

    // Critical initiatives alert
    if (context.company.overdueInitiatives > 3) {
      alerts.push({
        id: 'overdue-initiatives',
        type: 'warning',
        title: 'Múltiples Iniciativas Retrasadas',
        description: `${context.company.overdueInitiatives} iniciativas han superado su fecha objetivo`,
        priority: 'high',
        actionRequired: true,
        relatedItems: ['initiatives'],
        dismissible: false
      })
    }

    // Low completion rate alert
    const completionRate = (context.company.completedInitiatives / context.company.totalInitiatives) * 100
    if (completionRate < 40) {
      alerts.push({
        id: 'low-completion',
        type: 'error',
        title: 'Baja Tasa de Completación',
        description: `Solo el ${Math.round(completionRate)}% de iniciativas han sido completadas`,
        priority: 'high',
        actionRequired: true,
        relatedItems: ['initiatives', 'areas'],
        dismissible: false
      })
    }

    return alerts
  }

  private generateInitiativesAlerts(context: CompanyContext, userRole: UserRole): DashboardAlert[] {
    const alerts: DashboardAlert[] = []
    
    // Stalled initiatives
    const stalledCount = context.initiatives.filter(i => 
      i.initiative_progress < 25 && 
      new Date(i.created_at).getTime() < Date.now() - (30 * 24 * 60 * 60 * 1000)
    ).length

    if (stalledCount > 0) {
      alerts.push({
        id: 'stalled-initiatives',
        type: 'warning',
        title: 'Iniciativas Estancadas',
        description: `${stalledCount} iniciativas con menos del 25% de progreso después de 30 días`,
        priority: 'medium',
        actionRequired: true,
        relatedItems: ['initiatives'],
        dismissible: true
      })
    }

    return alerts
  }

  private generateAreasAlerts(context: CompanyContext, userRole: UserRole): DashboardAlert[] {
    const alerts: DashboardAlert[] = []
    
    // Unbalanced workload
    const areaWorkloads = context.areas.map(area => area.initiatives_count)
    const maxWorkload = Math.max(...areaWorkloads)
    const minWorkload = Math.min(...areaWorkloads)
    
    if (maxWorkload > minWorkload * 3) {
      alerts.push({
        id: 'workload-imbalance',
        type: 'info',
        title: 'Desbalance de Carga de Trabajo',
        description: 'Algunas áreas tienen significativamente más iniciativas que otras',
        priority: 'medium',
        actionRequired: false,
        relatedItems: ['areas'],
        dismissible: true
      })
    }

    return alerts
  }

  private generateAnalyticsAlerts(context: CompanyContext, userRole: UserRole): DashboardAlert[] {
    const alerts: DashboardAlert[] = []
    
    // Performance trend alert
    if (context.company.averageProgress < 50) {
      alerts.push({
        id: 'declining-performance',
        type: 'warning',
        title: 'Tendencia de Rendimiento Preocupante',
        description: 'El progreso promedio está por debajo del 50%',
        priority: 'high',
        actionRequired: true,
        relatedItems: ['analytics', 'initiatives'],
        dismissible: false
      })
    }

    return alerts
  }

  // Generate predictions
  private generateOverviewPredictions(context: CompanyContext, userRole: UserRole): DashboardPrediction[] {
    const predictions: DashboardPrediction[] = []
    
    // Overall completion prediction
    const avgProgress = context.company.averageProgress
    let completionTimeframe: 'next_week' | 'next_month' | 'next_quarter' = 'next_quarter'
    let impact: 'positive' | 'negative' | 'neutral' = 'neutral'
    
    if (avgProgress > 75) {
      completionTimeframe = 'next_month'
      impact = 'positive'
    } else if (avgProgress < 40) {
      completionTimeframe = 'next_quarter'
      impact = 'negative'
    }

    predictions.push({
      id: 'completion-forecast',
      title: 'Proyección de Completación',
      description: `Basado en el progreso actual, se espera completar el 80% de iniciativas en ${completionTimeframe}`,
      confidence: 75,
      timeline: completionTimeframe,
      impact,
      relatedMetrics: ['completion_rate', 'average_progress']
    })

    return predictions
  }

  private generateInitiativesPredictions(context: CompanyContext, userRole: UserRole): DashboardPrediction[] {
    return [{
      id: 'bottleneck-prediction',
      title: 'Identificación de Cuellos de Botella',
      description: 'Se prevé que las iniciativas dependientes de recursos externos tendrán retrasos',
      confidence: 68,
      timeline: 'next_month',
      impact: 'negative',
      relatedMetrics: ['initiative_dependencies', 'resource_allocation']
    }]
  }

  private generateAreasPredictions(context: CompanyContext, userRole: UserRole): DashboardPrediction[] {
    return [{
      id: 'collaboration-opportunity',
      title: 'Oportunidad de Colaboración',
      description: 'Las áreas con objetivos complementarios podrían beneficiarse de mayor colaboración',
      confidence: 82,
      timeline: 'next_month',
      impact: 'positive',
      relatedMetrics: ['cross_area_initiatives', 'resource_sharing']
    }]
  }

  private generateAnalyticsPredictions(context: CompanyContext, userRole: UserRole): DashboardPrediction[] {
    return [{
      id: 'performance-trend',
      title: 'Tendencia de Rendimiento',
      description: 'El rendimiento general se estabilizará en los próximos 2 meses con las acciones actuales',
      confidence: 73,
      timeline: 'next_quarter',
      impact: 'neutral',
      relatedMetrics: ['overall_performance', 'initiative_velocity']
    }]
  }

  // Generate smart actions
  private generateOverviewSmartActions(context: CompanyContext, userRole: UserRole): SmartAction[] {
    const actions: SmartAction[] = []
    
    if (context.company.overdueInitiatives > 2) {
      actions.push({
        id: 'prioritize-overdue',
        title: 'Priorizar Iniciativas Retrasadas',
        description: 'Crear un plan de recuperación para las iniciativas con mayor retraso',
        type: 'optimization',
        estimatedImpact: 'Reducción del 30% en tiempo de recuperación',
        difficulty: 'medium',
        timeRequired: '2-3 días'
      })
    }

    return actions
  }

  private generateInitiativesSmartActions(context: CompanyContext, userRole: UserRole): SmartAction[] {
    return [{
      id: 'automate-reporting',
      title: 'Automatizar Reportes de Progreso',
      description: 'Configurar reportes automáticos semanales de progreso de iniciativas',
      type: 'automation',
      estimatedImpact: 'Ahorro de 5 horas semanales en reportes manuales',
      difficulty: 'easy',
      timeRequired: '1 día'
    }]
  }

  private generateAreasSmartActions(context: CompanyContext, userRole: UserRole): SmartAction[] {
    return [{
      id: 'balance-workload',
      title: 'Equilibrar Carga de Trabajo',
      description: 'Redistribuir iniciativas entre áreas para optimizar capacidad',
      type: 'optimization',
      estimatedImpact: 'Mejora del 20% en eficiencia general',
      difficulty: 'medium',
      timeRequired: '1 semana'
    }]
  }

  private generateAnalyticsSmartActions(context: CompanyContext, userRole: UserRole): SmartAction[] {
    return [{
      id: 'setup-alerts',
      title: 'Configurar Alertas Inteligentes',
      description: 'Establecer alertas automáticas basadas en desviaciones de tendencias',
      type: 'alert',
      estimatedImpact: 'Detección 50% más rápida de problemas',
      difficulty: 'easy',
      timeRequired: '2 horas'
    }]
  }

  // Default enhancement fallback
  private getDefaultEnhancement(view: DashboardView): DashboardAIEnhancement {
    return {
      view,
      insights: [],
      kpis: [],
      recommendations: [
        'Conecta con el asistente de IA para obtener insights personalizados',
        'Revisa los datos regularmente para identificar tendencias',
        'Utiliza los filtros para enfocarte en información relevante'
      ],
      alerts: [],
      predictions: [],
      contextualHelp: [
        'Este dashboard se beneficia de análisis de IA avanzado',
        'Usa el chat para hacer preguntas específicas sobre los datos',
        'Los insights se actualizan automáticamente con nuevos datos'
      ],
      smartActions: []
    }
  }
}

// Export singleton instance
export const dashboardAI = new DashboardAIIntegrationService()