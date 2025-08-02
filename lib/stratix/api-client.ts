import { createClient } from '@/utils/supabase/client'

// Types for Stratix API - Dialogflow Tool Format
export interface DialogflowToolRequest {
  tool: string // Format: projects/{project}/agents/{agent}/tools/{tool_id}
  tool_parameters: {
    nombre_iniciativa?: string
    nombre_area?: string
    user_query?: string
    user_id: string
  }
}

export interface DialogflowToolResponse {
  tool_output: Array<{
    tool: string
    output: {
      progreso?: string
      link?: string
      resumen?: string
      kpi_valor?: string
      error?: string
      [key: string]: any
    }
  }>
}

export interface StratixKPI {
  name: string
  value: string | number
  trend: 'up' | 'down' | 'stable'
  trendValue: number
  category: string
  priority: 'high' | 'medium' | 'low'
  unit?: string
  target?: string | number
  description?: string
}

export interface StratixInsight {
  id: string
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  type: 'opportunity' | 'risk' | 'recommendation'
  metrics?: string[]
  affectedAreas?: string[]
  suggestedActions?: string[]
}

export interface StratixActionPlan {
  id: string
  title: string
  description: string
  steps: ActionStep[]
  timeline: string
  priority: 'urgent' | 'high' | 'medium' | 'low'
  expectedImpact: string
  assignedAreas?: string[]
  resources?: string[]
  success_metrics?: string[]
}

export interface ActionStep {
  id: string
  title: string
  description: string
  order: number
  duration: string
  dependencies?: string[]
  status?: 'pending' | 'in_progress' | 'completed'
}

export interface StratixResponse {
  success: boolean
  data?: {
    kpis?: StratixKPI[]
    insights?: StratixInsight[]
    actionPlans?: StratixActionPlan[]
    message?: string
    analysis?: any
  }
  error?: string
}

export interface StratixChatMessage {
  role: 'user' | 'assistant'
  content: string
  context?: any
}

class StratixAPIClient {
  private baseUrl: string
  private projectId: string = 'insaight-backend'
  private agentId: string = 'stratix-agent' // TODO: Get actual agent ID from config
  private toolId: string = 'stratix-tool' // TODO: Get actual tool ID from config

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_STRATIX_API_URL || 'https://us-central1-insaight-backend.cloudfunctions.net/bot-stratix-backend-generative'
    
    if (typeof window !== 'undefined') {
      console.log('🔧 Stratix API Client initialized with Google Cloud Run URL:', this.baseUrl)
    }
  }

  private async getAuthToken(): Promise<string | null> {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  private getToolPath(): string {
    return `projects/${this.projectId}/agents/${this.agentId}/tools/${this.toolId}`
  }

  private async makeDialogflowToolRequest(request: DialogflowToolRequest): Promise<DialogflowToolResponse> {
    const token = await this.getAuthToken()
    if (!token) {
      throw new Error('Authentication required. Please log in.')
    }

    console.log('🔗 Making Dialogflow tool request to:', this.baseUrl)
    console.log('📤 Tool request:', JSON.stringify(request, null, 2))

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-ID': request.tool_parameters.user_id,
          'X-API-Key': process.env.GOOGLE_AI_API_KEY || '',
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json() as DialogflowToolResponse
      console.log('📥 Received tool response:', JSON.stringify(data, null, 2))
      
      // Validate response format
      if (!data.tool_output || !Array.isArray(data.tool_output) || data.tool_output.length === 0) {
        throw new Error('Invalid response format from Dialogflow tool service')
      }

      // Check for error in response
      const output = data.tool_output[0].output
      if (output.error) {
        throw new Error(`Tool service error: ${output.error}`)
      }

      return data
    } catch (error) {
      console.error('❌ Error in makeDialogflowToolRequest:', error)
      throw error
    }
  }

  async analyzeUserData(userId: string): Promise<StratixResponse> {
    try {
      // This method is not directly supported by the current backend tool format
      // The backend expects specific queries for initiatives or areas
      throw new Error('General data analysis not supported. Use specific initiative or area queries.')
    } catch (error) {
      console.error('Stratix Analysis API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze data via AI'
      }
    }
  }

  async generateKPIs(userId: string, filters?: any): Promise<StratixResponse> {
    try {
      // This method is not directly supported by the current backend tool format
      // The backend expects specific queries for initiatives or areas
      throw new Error('General KPI generation not supported. Use specific initiative or area queries.')
    } catch (error) {
      console.error('Stratix KPI API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate KPIs via AI'
      }
    }
  }

  async getInsights(userId: string, context?: any): Promise<StratixResponse> {
    try {
      // This method is not directly supported by the current backend tool format
      // The backend expects specific queries for initiatives or areas
      throw new Error('General insights not supported. Use specific initiative or area queries.')
    } catch (error) {
      console.error('Stratix Insights API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get insights via AI'
      }
    }
  }

  async createActionPlan(userId: string, objective: string, context?: any): Promise<StratixResponse> {
    try {
      // This method is not directly supported by the current backend tool format
      // The backend expects specific queries for initiatives or areas
      throw new Error('Action plan creation not supported. Use specific initiative or area queries.')
    } catch (error) {
      console.error('Stratix Action Plan API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create action plan via AI'
      }
    }
  }

  // New methods that use the proper Dialogflow tool format
  async getInitiativeProgress(userId: string, nombreIniciativa: string): Promise<StratixResponse> {
    try {
      const request: DialogflowToolRequest = {
        tool: this.getToolPath(),
        tool_parameters: {
          nombre_iniciativa: nombreIniciativa,
          user_id: userId
        }
      }

      const response = await this.makeDialogflowToolRequest(request)
      const output = response.tool_output[0].output

      return {
        success: true,
        data: {
          message: output.resumen || `Progreso de ${nombreIniciativa}: ${output.progreso}`,
          analysis: {
            progreso: output.progreso,
            link: output.link,
            resumen: output.resumen
          }
        }
      }
    } catch (error) {
      console.error('Stratix Initiative Progress API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get initiative progress'
      }
    }
  }

  async getAreaKPIs(userId: string, nombreArea: string): Promise<StratixResponse> {
    try {
      const request: DialogflowToolRequest = {
        tool: this.getToolPath(),
        tool_parameters: {
          nombre_area: nombreArea,
          user_id: userId
        }
      }

      const response = await this.makeDialogflowToolRequest(request)
      const output = response.tool_output[0].output

      return {
        success: true,
        data: {
          message: output.resumen || `KPI del área ${nombreArea}: ${output.kpi_valor}`,
          analysis: {
            kpi_valor: output.kpi_valor,
            link: output.link,
            resumen: output.resumen
          }
        }
      }
    } catch (error) {
      console.error('Stratix Area KPIs API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get area KPIs'
      }
    }
  }

  async chat(userId: string, message: string, conversationHistory?: StratixChatMessage[]): Promise<StratixResponse> {
    try {
      // For chat, we need to parse the user message to determine if they're asking about:
      // 1. A specific initiative (nombre_iniciativa)
      // 2. A specific area (nombre_area)
      // 3. General query (user_query)
      
      // Simple heuristics to determine query type
      const isInitiativeQuery = message.toLowerCase().includes('iniciativa') || 
                               message.toLowerCase().includes('proyecto') ||
                               message.toLowerCase().includes('progreso')
      const isAreaQuery = message.toLowerCase().includes('área') || 
                         message.toLowerCase().includes('area') ||
                         message.toLowerCase().includes('departamento')

      const request: DialogflowToolRequest = {
        tool: this.getToolPath(),
        tool_parameters: {
          user_query: message,
          user_id: userId
        }
      }

      // Add context if this is a specific type of query
      if (isInitiativeQuery) {
        // TODO: Extract initiative name from message
        // For now, pass as general query
      } else if (isAreaQuery) {
        // TODO: Extract area name from message
        // For now, pass as general query
      }

      const response = await this.makeDialogflowToolRequest(request)
      const output = response.tool_output[0].output

      return {
        success: true,
        data: {
          message: output.resumen || output.message || JSON.stringify(output)
        }
      }
    } catch (error) {
      console.error('Stratix Chat API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get AI response'
      }
    }
  }

  // Stream chat responses - simplified without fallbacks
  async *streamChat(userId: string, message: string, conversationHistory?: StratixChatMessage[]): AsyncGenerator<string> {
    try {
      console.log('🔄 Starting stream chat with Dialogflow tool API')
      
      const chatResponse = await this.chat(userId, message, conversationHistory)
      
      if (chatResponse.success && chatResponse.data?.message) {
        const fullResponse = chatResponse.data.message
        
        // Simple streaming by words
        const words = fullResponse.split(' ')
        for (const word of words) {
          yield word + ' '
          await new Promise(resolve => setTimeout(resolve, 50))
        }
      } else {
        throw new Error(chatResponse.error || 'Failed to get AI response')
      }
    } catch (error) {
      console.error('Stream error:', error)
      throw error // No fallbacks - let the error bubble up
    }
  }
}

// Export singleton instance
export const stratixAPI = new StratixAPIClient()