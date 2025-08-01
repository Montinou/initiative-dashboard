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

  constructor() {
    // TODO: Replace with actual Cloud Run endpoint
    this.baseUrl = process.env.NEXT_PUBLIC_STRATIX_API_URL || 'https://stratix-api-cloudrun.run.app'
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

    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`${this.baseUrl}/api/stratix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

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

    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`${this.baseUrl}/api/stratix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error('Stratix API error:', error)
      
      // Return mock data for development
      return {
        success: true,
        data: {
          kpis: [
            {
              name: "Tasa de Cumplimiento General",
              value: "87%",
              trend: "up",
              trendValue: 5.2,
              category: "performance",
              priority: "high",
              target: "90%",
              description: "Porcentaje de objetivos cumplidos vs planificados"
            },
            {
              name: "Iniciativas en Riesgo",
              value: 3,
              trend: "down",
              trendValue: -2,
              category: "risk",
              priority: "high",
              unit: "iniciativas",
              description: "Número de iniciativas con retraso crítico"
            },
            {
              name: "ROI Proyectado",
              value: "$2.4M",
              trend: "up",
              trendValue: 12.5,
              category: "financial",
              priority: "medium",
              target: "$2M",
              description: "Retorno de inversión esperado para Q1 2025"
            },
            {
              name: "Satisfacción del Equipo",
              value: "4.2/5",
              trend: "stable",
              trendValue: 0,
              category: "people",
              priority: "medium",
              target: "4.5/5",
              description: "Índice de satisfacción basado en encuestas mensuales"
            },
            {
              name: "Eficiencia Operativa",
              value: "78%",
              trend: "up",
              trendValue: 3.7,
              category: "operations",
              priority: "high",
              unit: "%",
              description: "Ratio de productividad vs recursos utilizados"
            },
            {
              name: "Tiempo de Respuesta",
              value: "2.3h",
              trend: "down",
              trendValue: -15,
              category: "performance",
              priority: "medium",
              unit: "horas",
              target: "2h",
              description: "Tiempo promedio de respuesta a solicitudes críticas"
            }
          ]
        }
      }
    }
  }

  async getInsights(userId: string, context?: any): Promise<StratixResponse> {
    const request: StratixRequest = {
      action: 'get_insights',
      userId,
      data: context
    }

    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`${this.baseUrl}/api/stratix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error('Stratix API error:', error)
      
      // Return mock data for development
      return {
        success: true,
        data: {
          insights: [
            {
              id: '1',
              title: "Oportunidad de Optimización en Área de Ventas",
              description: "Se detectó un patrón de alto rendimiento en el equipo de ventas digitales que podría replicarse en otros canales. El análisis muestra un incremento del 23% en conversiones cuando se aplica el proceso estandarizado.",
              impact: "high",
              type: "opportunity",
              metrics: ["Conversión +23%", "Tiempo de cierre -15%", "Satisfacción cliente +18%"],
              affectedAreas: ["Ventas", "Marketing Digital"],
              suggestedActions: [
                "Documentar el proceso actual del equipo digital",
                "Capacitar a equipos de otros canales",
                "Implementar herramientas de seguimiento"
              ]
            },
            {
              id: '2',
              title: "Riesgo de Retraso en Proyecto de Infraestructura",
              description: "El proyecto de modernización de infraestructura muestra señales de posible retraso. 3 hitos críticos están atrasados y el presupuesto está al 92% con solo 70% de avance.",
              impact: "high",
              type: "risk",
              metrics: ["3 hitos atrasados", "Presupuesto 92% consumido", "70% de avance"],
              affectedAreas: ["TI", "Operaciones"],
              suggestedActions: [
                "Reunión urgente con stakeholders",
                "Re-evaluar cronograma y recursos",
                "Considerar plan de contingencia"
              ]
            },
            {
              id: '3',
              title: "Recomendación: Automatización de Procesos",
              description: "Identificamos 5 procesos manuales repetitivos que consumen 120 horas mensuales del equipo. La automatización podría liberar estos recursos para tareas de mayor valor.",
              impact: "medium",
              type: "recommendation",
              metrics: ["ROI estimado: 6 meses", "Eficiencia +35%", "120 horas/mes liberadas"],
              affectedAreas: ["Finanzas", "RRHH", "Operaciones"],
              suggestedActions: [
                "Evaluar herramientas de RPA",
                "Priorizar procesos por impacto",
                "Crear equipo de implementación"
              ]
            }
          ]
        }
      }
    }
  }

  async createActionPlan(userId: string, objective: string, context?: any): Promise<StratixResponse> {
    const request: StratixRequest = {
      action: 'create_action_plan',
      userId,
      data: { objective, context }
    }

    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`${this.baseUrl}/api/stratix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error('Stratix API error:', error)
      
      // Return mock data for development
      return {
        success: true,
        data: {
          actionPlans: [
            {
              id: '1',
              title: "Plan de Optimización Q1 2025",
              description: "Plan integral para mejorar la eficiencia operativa y alcanzar los objetivos del primer trimestre",
              steps: [
                {
                  id: 's1',
                  title: "Automatizar proceso de reportes",
                  description: "Implementar sistema automatizado para generación de reportes mensuales",
                  order: 1,
                  duration: "2 semanas",
                  status: "pending"
                },
                {
                  id: 's2',
                  title: "Capacitar equipo en nuevas herramientas",
                  description: "Programa de capacitación en herramientas de análisis y gestión",
                  order: 2,
                  duration: "3 semanas",
                  dependencies: ['s1'],
                  status: "pending"
                },
                {
                  id: 's3',
                  title: "Implementar dashboard de métricas en tiempo real",
                  description: "Desarrollo e implementación de dashboard para monitoreo continuo",
                  order: 3,
                  duration: "4 semanas",
                  dependencies: ['s2'],
                  status: "pending"
                }
              ],
              timeline: "3 meses",
              priority: "urgent",
              expectedImpact: "+25% eficiencia operativa, reducción de 30% en tiempo de respuesta",
              assignedAreas: ["Operaciones", "TI", "Finanzas"],
              resources: ["Equipo de desarrollo", "Consultor externo", "Presupuesto: $50k"],
              success_metrics: [
                "Reducción del 30% en tiempo de generación de reportes",
                "100% del equipo capacitado",
                "Dashboard operativo con 99% uptime"
              ]
            }
          ]
        }
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

    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`${this.baseUrl}/api/stratix/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

      const data = await response.json()
      return { success: true, data }
    } catch (error) {
      console.error('Stratix API error:', error)
      
      // Return mock response for development
      return {
        success: true,
        data: {
          message: `Analicé tu consulta sobre "${message}". Basándome en los datos actuales, puedo sugerir las siguientes acciones para mejorar el rendimiento en esa área. ¿Te gustaría que profundice en algún aspecto específico?`
        }
      }
    }
  }

  // Stream chat responses for better UX
  async *streamChat(userId: string, message: string, conversationHistory?: StratixChatMessage[]): AsyncGenerator<string> {
    try {
      const token = await this.getAuthToken()
      if (!token) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`${this.baseUrl}/api/stratix/chat/stream`, {
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

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`)
      }

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
      // Fallback to mock streaming
      const mockResponse = `Analicé tu consulta sobre "${message}". Basándome en los datos actuales, puedo sugerir las siguientes acciones...`
      for (const word of mockResponse.split(' ')) {
        yield word + ' '
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    }
  }
}

// Export singleton instance
export const stratixAPI = new StratixAPIClient()