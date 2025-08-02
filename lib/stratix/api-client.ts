import { createClient } from '@/utils/supabase/client'

// Types for Stratix API
export interface StratixRequest {
  action: 'analyze_user_data' | 'generate_kpis' | 'create_action_plan' | 'get_insights' | 'chat' | 'get_recommendations'
  userId: string
  data?: any
  message?: string
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
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes
  private retryCount = 3
  private retryDelay = 1000 // 1 second

  constructor() {
    // Use environment variable or default to local development
    this.baseUrl = process.env.NEXT_PUBLIC_STRATIX_API_URL || 'http://localhost:3000'
    
    if (typeof window !== 'undefined') {
      console.log('🔧 Stratix API Client initialized with URL:', this.baseUrl)
    }
  }

  private async getAuthToken(): Promise<string | null> {
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  private getCacheKey(request: StratixRequest): string {
    return `${request.action}_${request.userId}_${JSON.stringify(request.data || {})}`
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data
    }
    this.cache.delete(key)
    return null
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() })
  }

  private async makeRequest(url: string, options: RequestInit, retries = this.retryCount): Promise<Response> {
    try {
      const response = await fetch(url, options)
      
      if (response.ok) {
        return response
      }
      
      // If it's a 4xx error, don't retry
      if (response.status >= 400 && response.status < 500) {
        throw new Error(`Client error: ${response.status} ${response.statusText}`)
      }
      
      // For 5xx errors, retry
      throw new Error(`Server error: ${response.status} ${response.statusText}`)
    } catch (error) {
      if (retries > 0 && error instanceof Error && !error.message.includes('Client error')) {
        console.warn(`Request failed, retrying... (${retries} attempts left)`, error.message)
        await new Promise(resolve => setTimeout(resolve, this.retryDelay))
        return this.makeRequest(url, options, retries - 1)
      }
      throw error
    }
  }

  private isCloudRunAvailable(): boolean {
    const stratixUrl = process.env.NEXT_PUBLIC_STRATIX_API_URL
    return !!(stratixUrl && stratixUrl !== 'http://localhost:3000' && !stratixUrl.includes('localhost') && 
              (stratixUrl.includes('cloudfunctions.net') || stratixUrl.includes('run.app')))
  }

  async analyzeUserData(userId: string): Promise<StratixResponse> {
    const cacheKey = `analyze_user_data_${userId}`
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return { success: true, data: cached }
    }

    // If Google AI is not available, return a descriptive error instead of mock data
    if (!this.isCloudRunAvailable()) {
      console.info('🔄 Stratix Google AI service not available, data analysis will be handled locally')
      return {
        success: false,
        error: 'Google AI service not configured. Analysis will be performed using local data.'
      }
    }

    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      // Create a comprehensive analysis prompt
      const analysisPrompt = `Como experto en análisis de datos empresariales, analiza comprehensivamente los datos del usuario ${userId}. Proporciona un análisis completo que incluya KPIs clave, insights importantes, y recomendaciones estratégicas. Devuelve la respuesta en formato JSON con la estructura: { "kpis": [...], "insights": [...], "actionPlans": [...], "summary": "..." }`

      const requestBody = {
        contents: [{
          role: 'user',
          parts: [{ text: analysisPrompt }]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096,
        }
      }

      const response = await this.makeRequest(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-ID': userId
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const aiResponse = data.candidates[0].content.parts[0].text
        try {
          const parsedAnalysis = JSON.parse(aiResponse)
          this.setCache(cacheKey, parsedAnalysis)
          return { 
            success: true, 
            data: parsedAnalysis
          }
        } catch (parseError) {
          console.error('Failed to parse analysis response as JSON, falling back to local analysis')
          return {
            success: false,
            error: 'AI response format error. Analysis will be performed using local data.'
          }
        }
      } else {
        throw new Error('Invalid response format from AI service')
      }
    } catch (error) {
      console.error('Stratix Analysis API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to analyze data via AI'
      }
    }
  }

  async generateKPIs(userId: string, filters?: any): Promise<StratixResponse> {
    // If Cloud Run is not available, return error to let local data service handle it
    if (!this.isCloudRunAvailable()) {
      console.info('🔄 Stratix Google AI service not available, KPI generation will be handled locally')
      return {
        success: false,
        error: 'Google AI service not configured. KPIs will be generated from local data.'
      }
    }

    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      // Create a prompt for KPI generation
      const kpiPrompt = `Como asistente de análisis empresarial, genera KPIs relevantes basados en los datos disponibles del usuario ${userId}. Devuelve una respuesta en formato JSON con un array de KPIs que incluya: name, value, trend (up/down/stable), trendValue (número), category, priority (high/medium/low), unit, target, description.`

      const requestBody = {
        contents: [{
          role: 'user',
          parts: [{ text: kpiPrompt + (filters ? ` Filtros aplicados: ${JSON.stringify(filters)}` : '') }]
        }],
        generationConfig: {
          temperature: 0.3,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }

      const response = await this.makeRequest(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-ID': userId
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const aiResponse = data.candidates[0].content.parts[0].text
        try {
          const parsedKPIs = JSON.parse(aiResponse)
          return { 
            success: true, 
            data: { kpis: parsedKPIs }
          }
        } catch (parseError) {
          console.error('Failed to parse KPI response as JSON, falling back to local generation')
          return {
            success: false,
            error: 'AI response format error. KPIs will be generated from local data.'
          }
        }
      } else {
        throw new Error('Invalid response format from AI service')
      }
    } catch (error) {
      console.error('Stratix KPI API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate KPIs via AI'
      }
    }
  }

  async getInsights(userId: string, context?: any): Promise<StratixResponse> {
    // If Cloud Run is not available, return error to let local data service handle it
    if (!this.isCloudRunAvailable()) {
      console.info('🔄 Stratix Google AI service not available, insights will be generated locally')
      return {
        success: false,
        error: 'Google AI service not configured. Insights will be generated from local data.'
      }
    }

    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      // Create a prompt for insights generation
      const insightsPrompt = `Como experto en análisis empresarial, genera insights y recomendaciones basados en los datos de la empresa del usuario ${userId}. Devuelve una respuesta en formato JSON con un array de insights que incluya: id, title, description, impact (high/medium/low), type (opportunity/risk/recommendation), metrics, affectedAreas, suggestedActions.`

      const requestBody = {
        contents: [{
          role: 'user',
          parts: [{ text: insightsPrompt + (context ? ` Contexto adicional: ${JSON.stringify(context)}` : '') }]
        }],
        generationConfig: {
          temperature: 0.4,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }

      const response = await this.makeRequest(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-ID': userId
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const aiResponse = data.candidates[0].content.parts[0].text
        try {
          const parsedInsights = JSON.parse(aiResponse)
          return { 
            success: true, 
            data: { insights: parsedInsights }
          }
        } catch (parseError) {
          console.error('Failed to parse insights response as JSON, falling back to local generation')
          return {
            success: false,
            error: 'AI response format error. Insights will be generated from local data.'
          }
        }
      } else {
        throw new Error('Invalid response format from AI service')
      }
    } catch (error) {
      console.error('Stratix Insights API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get insights via AI'
      }
    }
  }

  async createActionPlan(userId: string, objective: string, context?: any): Promise<StratixResponse> {
    // If Cloud Run is not available, return error 
    if (!this.isCloudRunAvailable()) {
      console.info('🔄 Stratix Google AI service not available for action plan creation')
      return {
        success: false,
        error: 'Google AI service not configured. Action plan creation requires AI service.'
      }
    }

    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      // Create a prompt for action plan creation
      const actionPlanPrompt = `Como consultor estratégico, crea un plan de acción detallado para el objetivo: "${objective}". Devuelve una respuesta en formato JSON con un array de planes de acción que incluya: id, title, description, steps (array con id, title, description, order, duration, dependencies, status), timeline, priority (urgent/high/medium/low), expectedImpact, assignedAreas, resources, success_metrics.`

      const requestBody = {
        contents: [{
          role: 'user',
          parts: [{ text: actionPlanPrompt + (context ? ` Contexto: ${JSON.stringify(context)}` : '') }]
        }],
        generationConfig: {
          temperature: 0.5,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 3072,
        }
      }

      const response = await this.makeRequest(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-ID': userId
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const aiResponse = data.candidates[0].content.parts[0].text
        try {
          const parsedActionPlans = JSON.parse(aiResponse)
          return { 
            success: true, 
            data: { actionPlans: parsedActionPlans }
          }
        } catch (parseError) {
          console.error('Failed to parse action plan response as JSON')
          return {
            success: false,
            error: 'AI response format error. Could not parse action plan.'
          }
        }
      } else {
        throw new Error('Invalid response format from AI service')
      }
    } catch (error) {
      console.error('Stratix Action Plan API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create action plan via AI'
      }
    }
  }

  async chat(userId: string, message: string, conversationHistory?: StratixChatMessage[]): Promise<StratixResponse> {
    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      // Prepare the conversation history for the Google AI API
      const messages = []
      
      // Add conversation history
      if (conversationHistory && conversationHistory.length > 0) {
        conversationHistory.forEach(msg => {
          messages.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: msg.content }]
          })
        })
      }
      
      // Add the current message
      messages.push({
        role: 'user',
        parts: [{ text: message }]
      })

      const requestBody = {
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      }

      console.log('🤖 Sending chat request to Google AI API:', this.baseUrl)

      const response = await this.makeRequest(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-ID': userId
        },
        body: JSON.stringify(requestBody)
      })

      const data = await response.json()
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const aiResponse = data.candidates[0].content.parts[0].text
        return { 
          success: true, 
          data: { message: aiResponse }
        }
      } else {
        throw new Error('Invalid response format from AI service')
      }
    } catch (error) {
      console.error('Stratix AI API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get AI response'
      }
    }
  }

  // Stream chat responses for better UX
  async *streamChat(userId: string, message: string, conversationHistory?: StratixChatMessage[]): AsyncGenerator<string> {
    try {
      // For now, use the regular chat API and simulate streaming
      // TODO: Implement proper streaming when the backend supports it
      const chatResponse = await this.chat(userId, message, conversationHistory)
      
      if (chatResponse.success && chatResponse.data?.message) {
        const fullResponse = chatResponse.data.message
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
      // Fallback error response
      const errorResponse = `Lo siento, hubo un problema al procesar tu consulta. Por favor, intenta de nuevo.`
      const words = errorResponse.split(' ')
      
      for (const word of words) {
        yield word + ' '
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }
  }
}

// Export singleton instance
export const stratixAPI = new StratixAPIClient()