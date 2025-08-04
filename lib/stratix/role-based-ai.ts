import { stratixAPI, StratixKPI, StratixInsight, StratixActionPlan } from './api-client'
import { stratixKPIDataService, AIKPIData } from './kpi-data-service'
import type { CompanyContext } from './data-service'

export type UserRole = 'CEO' | 'Admin' | 'Manager' | 'Analyst'

export interface RoleCapabilities {
  canAccessFinancialData: boolean
  canViewAllAreas: boolean
  canCreateInitiatives: boolean
  canModifyBudgets: boolean
  canViewSensitiveMetrics: boolean
  canGenerateReports: boolean
  canAccessPredictiveAnalytics: boolean
  maxInsightDepth: 'basic' | 'intermediate' | 'advanced' | 'executive'
  allowedAnalysisTypes: ('operational' | 'strategic' | 'financial' | 'predictive' | 'competitive')[]
}

export interface RoleBasedQuery {
  role: UserRole
  query: string
  context: CompanyContext
  analysisType?: 'operational' | 'strategic' | 'financial' | 'predictive' | 'competitive'
  confidentialityLevel?: 'public' | 'internal' | 'confidential' | 'restricted'
}

export interface RoleBasedResponse {
  response: string
  insights: StratixInsight[]
  kpis: StratixKPI[]
  actionPlans: StratixActionPlan[]
  recommendations: string[]
  confidentialityLevel: 'public' | 'internal' | 'confidential' | 'restricted'
  limitedView?: boolean
  restrictedFields?: string[]
}

class RoleBasedAIService {
  
  // Define capabilities by role
  private getRoleCapabilities(role: UserRole): RoleCapabilities {
    switch (role) {
      case 'CEO':
        return {
          canAccessFinancialData: true,
          canViewAllAreas: true,
          canCreateInitiatives: true,
          canModifyBudgets: true,
          canViewSensitiveMetrics: true,
          canGenerateReports: true,
          canAccessPredictiveAnalytics: true,
          maxInsightDepth: 'executive',
          allowedAnalysisTypes: ['operational', 'strategic', 'financial', 'predictive', 'competitive']
        }
      
      case 'Admin':
        return {
          canAccessFinancialData: true,
          canViewAllAreas: true,
          canCreateInitiatives: true,
          canModifyBudgets: false,
          canViewSensitiveMetrics: true,
          canGenerateReports: true,
          canAccessPredictiveAnalytics: true,
          maxInsightDepth: 'advanced',
          allowedAnalysisTypes: ['operational', 'strategic', 'financial', 'predictive']
        }
      
      case 'Manager':
        return {
          canAccessFinancialData: false,
          canViewAllAreas: false, // Limited to their area
          canCreateInitiatives: true,
          canModifyBudgets: false,
          canViewSensitiveMetrics: false,
          canGenerateReports: true,
          canAccessPredictiveAnalytics: false,
          maxInsightDepth: 'intermediate',
          allowedAnalysisTypes: ['operational', 'strategic']
        }
      
      case 'Analyst':
        return {
          canAccessFinancialData: false,
          canViewAllAreas: false,
          canCreateInitiatives: false,
          canModifyBudgets: false,
          canViewSensitiveMetrics: false,
          canGenerateReports: true,
          canAccessPredictiveAnalytics: false,
          maxInsightDepth: 'basic',
          allowedAnalysisTypes: ['operational']
        }
      
      default:
        return {
          canAccessFinancialData: false,
          canViewAllAreas: false,
          canCreateInitiatives: false,
          canModifyBudgets: false,
          canViewSensitiveMetrics: false,
          canGenerateReports: false,
          canAccessPredictiveAnalytics: false,
          maxInsightDepth: 'basic',
          allowedAnalysisTypes: ['operational']
        }
    }
  }

  // Filter company context based on role
  private filterContextByRole(context: CompanyContext, role: UserRole): CompanyContext {
    const capabilities = this.getRoleCapabilities(role)
    
    // Create filtered context
    const filteredContext: CompanyContext = { ...context }
    
    // Filter financial data
    if (!capabilities.canAccessFinancialData) {
      filteredContext.company = {
        ...filteredContext.company,
        activeBudget: 0,
        totalActualCost: 0
      }
      
      // Remove budget information from initiatives
      filteredContext.initiatives = filteredContext.initiatives.map(initiative => ({
        ...initiative,
        budget: 0,
        actual_cost: 0
      }))
    }
    
    // Filter areas (Manager only sees their area)
    if (!capabilities.canViewAllAreas && role === 'Manager') {
      // Area filtering will be implemented when role-based access control is fully defined
      // For now, we'll assume the first area is theirs
      filteredContext.areas = filteredContext.areas.slice(0, 1)
      
      // Filter initiatives to only their area
      const userAreaId = filteredContext.areas[0]?.id
      if (userAreaId) {
        filteredContext.initiatives = filteredContext.initiatives.filter(
          initiative => initiative.area_id === userAreaId
        )
      }
    }
    
    // Filter sensitive metrics
    if (!capabilities.canViewSensitiveMetrics) {
      // Remove sensitive activity information
      filteredContext.recentActivity = filteredContext.recentActivity.filter(
        activity => activity.type !== 'budget_alert'
      )
    }
    
    return filteredContext
  }

  // Generate role-specific prompts for AI
  private generateRoleBasedPrompt(query: RoleBasedQuery): string {
    const capabilities = this.getRoleCapabilities(query.role)
    const roleContext = this.getRoleContext(query.role)
    
    let prompt = `Como asistente de IA para un usuario con rol de ${query.role}, responde con el nivel de detalle apropiado para ${capabilities.maxInsightDepth}.\n\n`
    
    // Add role-specific context
    prompt += roleContext + '\n\n'
    
    // Add analysis type context
    if (query.analysisType) {
      prompt += `Tipo de análisis solicitado: ${query.analysisType}\n`
    }
    
    // Add restrictions
    if (!capabilities.canAccessFinancialData) {
      prompt += 'RESTRICCIÓN: No incluir información financiera detallada o sensible.\n'
    }
    
    if (!capabilities.canViewAllAreas) {
      prompt += 'RESTRICCIÓN: Limitar información solo al área asignada del usuario.\n'
    }
    
    if (!capabilities.canAccessPredictiveAnalytics) {
      prompt += 'RESTRICCIÓN: No incluir análisis predictivos o proyecciones futuras.\n'
    }
    
    prompt += `\nConsulta del usuario: ${query.query}\n\n`
    
    // Add context data
    prompt += `Contexto de la empresa:\n${JSON.stringify(query.context, null, 2)}`
    
    return prompt
  }

  // Generate enhanced role-specific prompts with KPI data
  private generateEnhancedRoleBasedPrompt(query: RoleBasedQuery, aiKPIData: AIKPIData | null): string {
    const capabilities = this.getRoleCapabilities(query.role)
    const roleContext = this.getRoleContext(query.role)
    
    let prompt = `Como asistente de IA avanzado para un usuario con rol de ${query.role}, proporciona análisis contextual con el nivel de detalle apropiado para ${capabilities.maxInsightDepth}.\n\n`
    
    // Add role-specific context
    prompt += roleContext + '\n\n'
    
    // Add analysis type context
    if (query.analysisType) {
      prompt += `Tipo de análisis solicitado: ${query.analysisType}\n`
    }
    
    // Add KPI intelligence context if available
    if (aiKPIData) {
      prompt += `\nINTELIGENCIA KPI AVANZADA:\n`
      prompt += `- Estado general: ${aiKPIData.summary.overall_health} (${aiKPIData.summary.performance_score}% rendimiento)\n`
      prompt += `- Nivel de riesgo: ${aiKPIData.summary.risk_level}\n`
      prompt += `- Tendencia: ${aiKPIData.summary.trend_direction}\n`
      prompt += `- Eficiencia: ${aiKPIData.summary.efficiency_rating}%\n`
      
      if (aiKPIData.area_focus && query.role === 'Manager') {
        prompt += `\nCONTEXTO DE ÁREA (${aiKPIData.area_focus.area_name}):\n`
        prompt += `- Rendimiento vs empresa: ${aiKPIData.area_focus.performance_vs_company}\n`
        prompt += `- Desafíos clave: ${aiKPIData.area_focus.key_challenges.join(', ')}\n`
        prompt += `- Oportunidades: ${aiKPIData.area_focus.opportunities.join(', ')}\n`
      }
      
      if (capabilities.canAccessPredictiveAnalytics) {
        prompt += `\nTENDENCIAS PREDICTIVAS:\n`
        prompt += `- Velocidad de iniciativas: ${aiKPIData.trends.initiatives_velocity}\n`
        prompt += `- Tendencia de completación: ${aiKPIData.trends.completion_rate_trend}\n`
        prompt += `- Eficiencia presupuestaria: ${aiKPIData.trends.budget_efficiency_trend}\n`
      }
      
      prompt += `\nCONTEXTO EMPRESARIAL:\n`
      prompt += `- Etapa empresa: ${aiKPIData.context.company_stage}\n`
      prompt += `- Enfoque principal: ${aiKPIData.context.primary_focus.join(', ')}\n`
      prompt += `- Desafíos actuales: ${aiKPIData.context.current_challenges.join(', ')}\n`
    }
    
    // Add restrictions
    if (!capabilities.canAccessFinancialData) {
      prompt += '\nRESTRICCIÓN: No incluir información financiera detallada o sensible.\n'
    }
    
    if (!capabilities.canViewAllAreas) {
      prompt += 'RESTRICCIÓN: Limitar información solo al área asignada del usuario.\n'
    }
    
    if (!capabilities.canAccessPredictiveAnalytics) {
      prompt += 'RESTRICCIÓN: No incluir análisis predictivos o proyecciones futuras.\n'
    }
    
    prompt += `\nINSTRUCCIONES ESPECÍFICAS:\n`
    prompt += `- Proporciona respuestas contextuales basadas en los datos KPI reales\n`
    prompt += `- Incluye insights accionables específicos para el rol ${query.role}\n`
    prompt += `- Utiliza el contexto de inteligencia KPI para dar recomendaciones precisas\n`
    prompt += `- Formatea la respuesta de manera clara y profesional\n`
    
    prompt += `\nConsulta del usuario: ${query.query}\n\n`
    
    // Add simplified context data (avoiding duplication with KPI data)
    prompt += `DATOS CONTEXTUALES:\n`
    prompt += `- Usuario: ${query.context.profile.fullName} (${query.context.profile.role})\n`
    prompt += `- Empresa: ${query.context.company.totalInitiatives} iniciativas totales, ${query.context.company.activeInitiatives} activas\n`
    prompt += `- Áreas: ${query.context.areas.length} áreas operativas\n`
    
    return prompt
  }

  // Get role-specific context information
  private getRoleContext(role: UserRole): string {
    switch (role) {
      case 'CEO':
        return 'Eres un asistente ejecutivo que proporciona análisis estratégicos de alto nivel, con acceso completo a todos los datos financieros y operacionales. Enfócate en oportunidades de crecimiento, optimización de recursos y decisiones estratégicas.'
      
      case 'Admin':
        return 'Eres un asistente administrativo con acceso a datos operacionales y financieros. Enfócate en la eficiencia operacional, gestión de procesos y soporte a la toma de decisiones administrativas.'
      
      case 'Manager':
        return 'Eres un asistente para gestión de área con acceso limitado a tu área de responsabilidad. Enfócate en la gestión de equipo, seguimiento de iniciativas y mejora de procesos de tu área.'
      
      case 'Analyst':
        return 'Eres un asistente analítico con acceso a datos operacionales básicos. Enfócate en análisis de rendimiento, identificación de patrones y soporte en la preparación de reportes.'
      
      default:
        return 'Eres un asistente básico con acceso limitado a información general de la empresa.'
    }
  }

  // Filter response based on role
  private filterResponseByRole(response: any, role: UserRole): RoleBasedResponse {
    const capabilities = this.getRoleCapabilities(role)
    
    let filteredResponse: RoleBasedResponse = {
      response: response.message || '',
      insights: response.insights || [],
      kpis: response.kpis || [],
      actionPlans: response.actionPlans || [],
      recommendations: [],
      confidentialityLevel: 'internal',
      limitedView: false,
      restrictedFields: []
    }
    
    // Filter KPIs based on capabilities
    if (!capabilities.canAccessFinancialData) {
      filteredResponse.kpis = filteredResponse.kpis.filter(kpi => 
        !['budget', 'cost', 'revenue', 'profit', 'financial'].some(term => 
          kpi.name.toLowerCase().includes(term) || 
          kpi.category?.toLowerCase().includes(term)
        )
      )
      filteredResponse.restrictedFields?.push('financial_data')
    }
    
    // Filter insights based on depth level
    if (capabilities.maxInsightDepth === 'basic') {
      filteredResponse.insights = filteredResponse.insights.filter(insight => 
        insight.impact !== 'high' || insight.type !== 'competitive'
      )
    }
    
    // Filter action plans based on permissions
    if (!capabilities.canCreateInitiatives) {
      filteredResponse.actionPlans = filteredResponse.actionPlans.map(plan => ({
        ...plan,
        steps: plan.steps?.filter(step => 
          !step.title.toLowerCase().includes('crear') && 
          !step.title.toLowerCase().includes('iniciar')
        ) || []
      }))
    }
    
    // Set confidentiality level
    if (role === 'CEO' || role === 'Admin') {
      filteredResponse.confidentialityLevel = 'confidential'
    } else if (role === 'Manager') {
      filteredResponse.confidentialityLevel = 'internal'
    } else {
      filteredResponse.confidentialityLevel = 'public'
    }
    
    // Mark as limited view if applicable
    if (!capabilities.canViewAllAreas || !capabilities.canAccessFinancialData) {
      filteredResponse.limitedView = true
    }
    
    return filteredResponse
  }

  // Main method to process role-based AI queries with enhanced KPI integration
  async processRoleBasedQuery(
    userId: string,
    query: RoleBasedQuery
  ): Promise<RoleBasedResponse> {
    try {
      console.log('🎭 Processing role-based AI query:', query.role, query.analysisType)
      
      // Check if user has permission for this analysis type
      const capabilities = this.getRoleCapabilities(query.role)
      if (query.analysisType && !capabilities.allowedAnalysisTypes.includes(query.analysisType)) {
        throw new Error(`Access denied: ${query.role} role cannot perform ${query.analysisType} analysis`)
      }
      
      // Filter context based on role
      const filteredContext = this.filterContextByRole(query.context, query.role)
      
      // Get AI-optimized KPI data for enhanced context
      let aiKPIData: AIKPIData | null = null
      try {
        // Get user area ID from context
        const userAreaId = filteredContext.areas.length > 0 ? filteredContext.areas[0]?.id : undefined
        
        aiKPIData = await stratixKPIDataService.getKPIForAI(
          filteredContext.tenantId,
          query.role,
          capabilities.canViewAllAreas ? undefined : userAreaId,
          'current'
        )
        console.log('📊 Enhanced KPI context loaded for AI query')
      } catch (kpiError) {
        console.warn('⚠️ Could not load enhanced KPI data:', kpiError)
      }
      
      // Generate role-specific prompt with enhanced KPI context
      const roleBasedPrompt = this.generateEnhancedRoleBasedPrompt({
        ...query,
        context: filteredContext
      }, aiKPIData)
      
      // Make AI request with enhanced prompt
      const aiResponse = await stratixAPI.chat(userId, roleBasedPrompt, [])
      
      if (!aiResponse.success) {
        throw new Error(aiResponse.error || 'AI request failed')
      }
      
      // Generate enhanced insights using KPI data
      let enhancedInsights: any[] = []
      if (aiKPIData && capabilities.canAccessPredictiveAnalytics) {
        try {
          const kpiInsights = await stratixKPIDataService.generateInsights(aiKPIData)
          enhancedInsights = kpiInsights.map(insight => ({
            id: insight.title.replace(/\s+/g, '-').toLowerCase(),
            title: insight.title,
            description: insight.description,
            impact: insight.priority === 'urgent' ? 'high' : insight.priority,
            type: insight.type,
            metrics: [insight.potential_impact],
            affectedAreas: insight.affected_areas,
            suggestedActions: insight.suggested_actions
          }))
        } catch (insightError) {
          console.warn('⚠️ Could not generate enhanced insights:', insightError)
        }
      }
      
      // Filter response based on role
      const filteredResponse = this.filterResponseByRole({
        ...aiResponse.data,
        insights: enhancedInsights.length > 0 ? enhancedInsights : aiResponse.data.insights
      }, query.role)
      
      console.log('✅ Enhanced role-based AI query processed successfully')
      
      return filteredResponse
      
    } catch (error) {
      console.error('❌ Role-based AI query failed:', error)
      throw error
    }
  }

  // Get available features for a role
  getAvailableFeatures(role: UserRole): {
    features: string[]
    restrictions: string[]
    analysisTypes: string[]
  } {
    const capabilities = this.getRoleCapabilities(role)
    
    const features: string[] = []
    const restrictions: string[] = []
    
    if (capabilities.canAccessFinancialData) features.push('Financial Analysis')
    else restrictions.push('Financial data access restricted')
    
    if (capabilities.canViewAllAreas) features.push('Company-wide View')
    else restrictions.push('Limited to assigned area')
    
    if (capabilities.canCreateInitiatives) features.push('Initiative Creation')
    else restrictions.push('Cannot create initiatives')
    
    if (capabilities.canModifyBudgets) features.push('Budget Management')
    else restrictions.push('Cannot modify budgets')
    
    if (capabilities.canAccessPredictiveAnalytics) features.push('Predictive Analytics')
    else restrictions.push('No predictive analytics access')
    
    if (capabilities.canGenerateReports) features.push('Report Generation')
    else restrictions.push('Cannot generate reports')
    
    return {
      features,
      restrictions,
      analysisTypes: capabilities.allowedAnalysisTypes
    }
  }

  // Get suggested queries for a role with enhanced KPI intelligence
  getSuggestedQueries(role: UserRole): string[] {
    switch (role) {
      case 'CEO':
        return [
          '¿Cuáles son las oportunidades de crecimiento más prometedoras basadas en nuestros KPIs?',
          '¿Qué áreas requieren inversión estratégica según el análisis predictivo?',
          '¿Cómo podemos optimizar el ROI general y la eficiencia organizacional?',
          '¿Cuáles son los riesgos competitivos principales y cómo mitigarlos?',
          '¿Qué iniciativas tienen mayor potencial de impacto según los datos históricos?',
          'Analiza el rendimiento general de la empresa y recomienda acciones estratégicas',
          'Predice el éxito de nuestras iniciativas clave para el próximo trimestre'
        ]
      
      case 'Admin':
        return [
          '¿Cómo podemos mejorar la eficiencia operacional basándose en métricas actuales?',
          '¿Qué procesos necesitan automatización según el análisis de KPIs?',
          '¿Cuáles son los cuellos de botella principales identificados en los datos?',
          '¿Cómo optimizar la asignación de recursos entre áreas?',
          '¿Qué métricas operacionales necesitan atención inmediata?',
          'Analiza las tendencias de progreso y sugiere mejoras de proceso',
          'Identifica patrones de eficiencia en las diferentes áreas'
        ]
      
      case 'Manager':
        return [
          '¿Cómo está el rendimiento de mi área comparado con el resto de la empresa?',
          '¿Qué iniciativas de mi área necesitan atención según los KPIs?',
          '¿Cómo puedo mejorar la productividad del equipo basándome en datos?',
          '¿Cuáles son las prioridades de mi área según el análisis de rendimiento?',
          '¿Qué obstáculos enfrentan mis iniciativas y cómo superarlos?',
          'Analiza el progreso de mis iniciativas y predice su éxito',
          'Compara el rendimiento de mi área con los benchmarks internos'
        ]
      
      case 'Analyst':
        return [
          '¿Cuáles son las tendencias en los datos operacionales de las últimas semanas?',
          '¿Qué patrones puedo identificar en el rendimiento de las iniciativas?',
          '¿Cómo puedo mejorar la calidad de los reportes con nuevos KPIs?',
          '¿Qué métricas son más relevantes para el análisis de tendencias?',
          '¿Qué datos necesito para el próximo reporte de rendimiento?',
          'Identifica correlaciones entre el progreso de iniciativas y recursos',
          'Analiza los patrones de finalización de tareas por área'
        ]
      
      default:
        return [
          '¿Cuál es el estado general de la empresa según los últimos KPIs?',
          '¿Cómo puedo contribuir mejor a los objetivos organizacionales?',
          '¿Qué información de rendimiento está disponible para mí?'
        ]
    }
  }
}

// Export singleton instance
export const roleBasedAI = new RoleBasedAIService()