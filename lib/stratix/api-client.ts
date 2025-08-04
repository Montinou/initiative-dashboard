import { createClient } from '@/utils/supabase/client'

// Types for Stratix API - Dialogflow Tool Format
export interface DialogflowToolRequest {
  tool: string // Format: projects/{project}/agents/{agent}/tools/{tool_id}
  tool_parameters: {
    nombre_iniciativa?: string
    nombre_area?: string
    user_query?: string
    user_id: string
    // Enhanced file analysis parameters
    file_content?: string
    file_type?: 'document' | 'spreadsheet' | 'presentation' | 'pdf'
    file_name?: string
    analysis_type?: 'extract_data' | 'generate_insights' | 'create_action_plan' | 'kpi_analysis'
    context_data?: any // Company context for better AI analysis
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
      // Enhanced file analysis outputs
      extracted_data?: any
      file_insights?: StratixInsight[]
      action_plans?: StratixActionPlan[]
      kpis?: StratixKPI[]
      analysis_status?: 'processing' | 'completed' | 'failed'
      processing_progress?: number
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
    // Use proxy endpoint to avoid CORS issues
    this.baseUrl = '/api/stratix/chat'
    
    if (typeof window !== 'undefined') {
      console.log('🔧 Stratix API Client initialized with proxy endpoint:', this.baseUrl)
    }
  }

  // Authentication is now handled by the proxy endpoint

  private getToolPath(): string {
    return `projects/${this.projectId}/agents/${this.agentId}/tools/${this.toolId}`
  }

  private async makeDialogflowToolRequest(request: DialogflowToolRequest): Promise<DialogflowToolResponse> {
    console.log('🔗 Making Dialogflow tool request via proxy to:', this.baseUrl)
    console.log('📤 Tool request:', JSON.stringify(request, null, 2))

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: response.statusText }))
        throw new Error(`HTTP ${response.status}: ${errorData.error || response.statusText}`)
      }

      const data = await response.json() as DialogflowToolResponse
      console.log('📥 Received tool response via proxy:', JSON.stringify(data, null, 2))
      
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

  // Enhanced File Analysis Methods
  async analyzeDocument(
    userId: string, 
    fileContent: string, 
    fileName: string, 
    fileType: 'document' | 'spreadsheet' | 'presentation' | 'pdf',
    companyContext?: any
  ): Promise<StratixResponse> {
    try {
      console.log('📄 Starting document analysis:', fileName, fileType)
      
      const request: DialogflowToolRequest = {
        tool: this.getToolPath(),
        tool_parameters: {
          user_id: userId,
          file_content: fileContent,
          file_name: fileName,
          file_type: fileType,
          analysis_type: 'extract_data',
          context_data: companyContext
        }
      }

      const response = await this.makeDialogflowToolRequest(request)
      const output = response.tool_output[0].output

      return {
        success: true,
        data: {
          message: output.resumen || `Análisis completado de ${fileName}`,
          analysis: {
            extracted_data: output.extracted_data,
            file_insights: output.file_insights,
            kpis: output.kpis,
            processing_progress: output.processing_progress
          }
        }
      }
    } catch (error) {
      console.error('Document analysis error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze document'
      }
    }
  }

  async generateFileInsights(
    userId: string,
    fileContent: string,
    fileName: string,
    fileType: 'document' | 'spreadsheet' | 'presentation' | 'pdf',
    companyContext?: any
  ): Promise<StratixResponse> {
    try {
      console.log('🧠 Generating insights from file:', fileName)
      
      const request: DialogflowToolRequest = {
        tool: this.getToolPath(),
        tool_parameters: {
          user_id: userId,
          file_content: fileContent,
          file_name: fileName,
          file_type: fileType,
          analysis_type: 'generate_insights',
          context_data: companyContext
        }
      }

      const response = await this.makeDialogflowToolRequest(request)
      const output = response.tool_output[0].output

      return {
        success: true,
        data: {
          message: output.resumen || `Insights generados para ${fileName}`,
          insights: output.file_insights,
          kpis: output.kpis,
          analysis: output.extracted_data
        }
      }
    } catch (error) {
      console.error('File insights generation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate file insights'
      }
    }
  }

  async createActionPlanFromFile(
    userId: string,
    fileContent: string,
    fileName: string,
    fileType: 'document' | 'spreadsheet' | 'presentation' | 'pdf',
    objective: string,
    companyContext?: any
  ): Promise<StratixResponse> {
    try {
      console.log('📋 Creating action plan from file:', fileName)
      
      const request: DialogflowToolRequest = {
        tool: this.getToolPath(),
        tool_parameters: {
          user_id: userId,
          file_content: fileContent,
          file_name: fileName,
          file_type: fileType,
          analysis_type: 'create_action_plan',
          user_query: objective,
          context_data: companyContext
        }
      }

      const response = await this.makeDialogflowToolRequest(request)
      const output = response.tool_output[0].output

      return {
        success: true,
        data: {
          message: output.resumen || `Plan de acción creado basado en ${fileName}`,
          actionPlans: output.action_plans,
          insights: output.file_insights,
          analysis: output.extracted_data
        }
      }
    } catch (error) {
      console.error('Action plan creation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create action plan from file'
      }
    }
  }

  async analyzeFileForKPIs(
    userId: string,
    fileContent: string,
    fileName: string,
    fileType: 'document' | 'spreadsheet' | 'presentation' | 'pdf',
    companyContext?: any
  ): Promise<StratixResponse> {
    try {
      console.log('📊 Analyzing file for KPIs:', fileName)
      
      const request: DialogflowToolRequest = {
        tool: this.getToolPath(),
        tool_parameters: {
          user_id: userId,
          file_content: fileContent,
          file_name: fileName,
          file_type: fileType,
          analysis_type: 'kpi_analysis',
          context_data: companyContext
        }
      }

      const response = await this.makeDialogflowToolRequest(request)
      const output = response.tool_output[0].output

      return {
        success: true,
        data: {
          message: output.resumen || `KPIs extraídos de ${fileName}`,
          kpis: output.kpis,
          insights: output.file_insights,
          analysis: output.extracted_data
        }
      }
    } catch (error) {
      console.error('KPI analysis error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze file for KPIs'
      }
    }
  }

  // Enhanced chat with file context support
  async chatWithFileContext(
    userId: string, 
    message: string, 
    fileContext?: {
      fileName: string
      fileType: string
      extractedData: any
    },
    conversationHistory?: StratixChatMessage[]
  ): Promise<StratixResponse> {
    try {
      console.log('💬 Chat with file context:', fileContext?.fileName)
      
      const request: DialogflowToolRequest = {
        tool: this.getToolPath(),
        tool_parameters: {
          user_query: message,
          user_id: userId,
          file_content: JSON.stringify(fileContext?.extractedData),
          file_name: fileContext?.fileName,
          file_type: fileContext?.fileType as any
        }
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
      console.error('Chat with file context error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get AI response with file context'
      }
    }
  }
}

// Export singleton instance
export const stratixAPI = new StratixAPIClient()