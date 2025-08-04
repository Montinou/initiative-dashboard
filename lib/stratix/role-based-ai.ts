import { stratixAPI, StratixKPI, StratixInsight, StratixActionPlan } from './api-client'
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
      // TODO: Filter based on user's assigned area
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

  // Main method to process role-based AI queries
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
      
      // Generate role-specific prompt
      const roleBasedPrompt = this.generateRoleBasedPrompt({
        ...query,
        context: filteredContext
      })
      
      // Make AI request with role-based prompt
      const aiResponse = await stratixAPI.chat(userId, roleBasedPrompt, [])
      
      if (!aiResponse.success) {
        throw new Error(aiResponse.error || 'AI request failed')
      }
      
      // Filter response based on role
      const filteredResponse = this.filterResponseByRole(aiResponse.data, query.role)
      
      console.log('✅ Role-based AI query processed successfully')
      
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

  // Get suggested queries for a role
  getSuggestedQueries(role: UserRole): string[] {
    switch (role) {
      case 'CEO':
        return [
          '¿Cuáles son las oportunidades de crecimiento más prometedoras?',
          '¿Qué áreas requieren inversión estratégica?',
          '¿Cómo podemos optimizar el ROI general?',
          '¿Cuáles son los riesgos competitivos principales?',
          '¿Qué iniciativas tienen mayor potencial de impacto?'
        ]
      
      case 'Admin':
        return [
          '¿Cómo podemos mejorar la eficiencia operacional?',
          '¿Qué procesos necesitan automatización?',
          '¿Cuáles son los cuellos de botella principales?',
          '¿Cómo optimizar la asignación de recursos?',
          '¿Qué métricas operacionales necesitan atención?'
        ]
      
      case 'Manager':
        return [
          '¿Cómo está el rendimiento de mi área?',
          '¿Qué iniciativas de mi área necesitan atención?',
          '¿Cómo puedo mejorar la productividad del equipo?',
          '¿Cuáles son las prioridades de mi área?',
          '¿Qué obstáculos enfrentan mis iniciativas?'
        ]
      
      case 'Analyst':
        return [
          '¿Cuáles son las tendencias en los datos operacionales?',
          '¿Qué patrones puedo identificar en el rendimiento?',
          '¿Cómo puedo mejorar la calidad de los reportes?',
          '¿Qué métricas son más relevantes para el análisis?',
          '¿Qué datos necesito para el próximo reporte?'
        ]
      
      default:
        return [
          '¿Cuál es el estado general de la empresa?',
          '¿Cómo puedo contribuir mejor a los objetivos?',
          '¿Qué información está disponible para mí?'
        ]
    }
  }
}

// Export singleton instance
export const roleBasedAI = new RoleBasedAIService()