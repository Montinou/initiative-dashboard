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
    return !!(stratixUrl && stratixUrl !== 'http://localhost:3000' && !stratixUrl.includes('localhost'))
  }

  async analyzeUserData(userId: string): Promise<StratixResponse> {
    const request: StratixRequest = {
      action: 'analyze_user_data',
      userId
    }

    const cacheKey = this.getCacheKey(request)
    const cached = this.getFromCache(cacheKey)
    if (cached) {
      return { success: true, data: cached }
    }

    // If Cloud Run is not available, return a descriptive error instead of mock data
    if (!this.isCloudRunAvailable()) {
      console.info('🔄 Stratix Cloud Run service not available, data analysis will be handled locally')
      return {
        success: false,
        error: 'Cloud Run service not configured. Analysis will be performed using local data.'
      }
    }

    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await this.makeRequest(`${this.baseUrl}/api/stratix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      })

      const data = await response.json()
      this.setCache(cacheKey, data)
      return { success: true, data }
    } catch (error) {
      console.error('Stratix API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  async generateKPIs(userId: string, filters?: any): Promise<StratixResponse> {
    const request: StratixRequest = {
      action: 'generate_kpis',
      userId,
      data: filters
    }

    // If Cloud Run is not available, return error to let local data service handle it
    if (!this.isCloudRunAvailable()) {
      console.info('🔄 Stratix Cloud Run service not available, KPI generation will be handled locally')
      return {
        success: false,
        error: 'Cloud Run service not configured. KPIs will be generated from local data.'
      }
    }

    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await this.makeRequest(`${this.baseUrl}/api/stratix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      })

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error('Stratix API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate KPIs'
      }
    }
  }

  async getInsights(userId: string, context?: any): Promise<StratixResponse> {
    const request: StratixRequest = {
      action: 'get_insights',
      userId,
      data: context
    }

    // If Cloud Run is not available, return error to let local data service handle it
    if (!this.isCloudRunAvailable()) {
      console.info('🔄 Stratix Cloud Run service not available, insights will be generated locally')
      return {
        success: false,
        error: 'Cloud Run service not configured. Insights will be generated from local data.'
      }
    }

    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await this.makeRequest(`${this.baseUrl}/api/stratix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      })

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error('Stratix API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get insights'
      }
    }
  }

  async createActionPlan(userId: string, objective: string, context?: any): Promise<StratixResponse> {
    const request: StratixRequest = {
      action: 'create_action_plan',
      userId,
      data: { objective, context }
    }

    // If Cloud Run is not available, return error 
    if (!this.isCloudRunAvailable()) {
      console.info('🔄 Stratix Cloud Run service not available for action plan creation')
      return {
        success: false,
        error: 'Cloud Run service not configured. Action plan creation requires AI service.'
      }
    }

    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await this.makeRequest(`${this.baseUrl}/api/stratix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      })

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error('Stratix API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create action plan'
      }
    }
  }

  async chat(userId: string, message: string, conversationHistory?: StratixChatMessage[]): Promise<StratixResponse> {
    const request: StratixRequest = {
      action: 'chat',
      userId,
      message,
      data: { conversationHistory }
    }

    // If Cloud Run is not available, provide a helpful response
    if (!this.isCloudRunAvailable()) {
      console.info('🔄 Stratix Cloud Run service not available, providing local response')
      return {
        success: true,
        data: {
          message: `Hola! Soy tu Asistente Stratix. He recibido tu consulta sobre "${message}". 

Actualmente estoy funcionando en modo local, analizando los datos de tu empresa que tengo disponibles. Puedo ayudarte con:

• Análisis de KPIs y métricas de tus iniciativas
• Identificación de áreas de oportunidad
• Revisión del progreso de proyectos
• Recomendaciones basadas en los datos actuales

¿Te gustaría que analice algún aspecto específico de tus datos?`
        }
      }
    }

    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await this.makeRequest(`${this.baseUrl}/api/stratix/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      })

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error('Stratix API error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get chat response'
      }
    }
  }

  // Stream chat responses for better UX
  async *streamChat(userId: string, message: string, conversationHistory?: StratixChatMessage[]): AsyncGenerator<string> {
    // If Cloud Run is not available, simulate streaming with local response
    if (!this.isCloudRunAvailable()) {
      console.info('🔄 Stratix Cloud Run service not available, simulating stream response')
      const localResponse = `Hola! Soy tu Asistente Stratix. He recibido tu consulta sobre "${message}". 

Actualmente estoy funcionando en modo local, analizando los datos de tu empresa que tengo disponibles. Puedo ayudarte con:

• Análisis de KPIs y métricas de tus iniciativas
• Identificación de áreas de oportunidad  
• Revisión del progreso de proyectos
• Recomendaciones basadas en los datos actuales

¿Te gustaría que analice algún aspecto específico de tus datos?`

      for (const word of localResponse.split(' ')) {
        yield word + ' '
        await new Promise(resolve => setTimeout(resolve, 30))
      }
      return
    }

    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await this.makeRequest(`${this.baseUrl}/api/stratix/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'chat',
          userId,
          message,
          data: { conversationHistory, stream: true }
        })
      })

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') return
            try {
              const parsed = JSON.parse(data)
              if (parsed.content) {
                yield parsed.content
              }
            } catch (e) {
              console.error('Error parsing stream data:', e)
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error)
      // Fallback error response
      const errorResponse = `Lo siento, hubo un problema al procesar tu consulta. Esto puede deberse a que el servicio de IA no está disponible en este momento. Por favor, intenta de nuevo más tarde.`
      for (const word of errorResponse.split(' ')) {
        yield word + ' '
        await new Promise(resolve => setTimeout(resolve, 40))
      }
    }
  }
}

// Export singleton instance
export const stratixAPI = new StratixAPIClient()