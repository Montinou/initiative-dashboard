import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { stratixAPI, StratixKPI, StratixInsight, StratixActionPlan, StratixChatMessage } from '@/lib/stratix/api-client'
import { stratixDataService, type CompanyContext } from '@/lib/stratix/data-service'

export interface UseStratixAssistantReturn {
  // Data
  kpis: StratixKPI[]
  insights: StratixInsight[]
  actionPlans: StratixActionPlan[]
  companyContext: CompanyContext | null
  
  // Loading states
  isLoadingKPIs: boolean
  isLoadingInsights: boolean
  isLoadingActionPlans: boolean
  isAnalyzing: boolean
  isLoadingContext: boolean
  
  // Errors
  error: string | null
  
  // Actions
  refreshKPIs: (filters?: any) => Promise<void>
  refreshInsights: (context?: any) => Promise<void>
  createActionPlan: (objective: string, context?: any) => Promise<void>
  analyzeUserData: () => Promise<void>
  refreshContext: () => Promise<void>
  chat: (message: string, history?: StratixChatMessage[]) => Promise<string>
  streamChat: (message: string, history: StratixChatMessage[] | undefined, onChunk: (chunk: string) => void) => Promise<void>
  clearError: () => void
}

export function useStratixAssistant(): UseStratixAssistantReturn {
  const { session } = useAuth()
  const userId = session?.user?.id || ''
  
  // State
  const [kpis, setKpis] = useState<StratixKPI[]>([])
  const [insights, setInsights] = useState<StratixInsight[]>([])
  const [actionPlans, setActionPlans] = useState<StratixActionPlan[]>([])
  const [companyContext, setCompanyContext] = useState<CompanyContext | null>(null)
  
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(false)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [isLoadingActionPlans, setIsLoadingActionPlans] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isLoadingContext, setIsLoadingContext] = useState(false)
  
  const [error, setError] = useState<string | null>(null)

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Refresh company context
  const refreshContext = useCallback(async () => {
    if (!userId) return
    
    setIsLoadingContext(true)
    setError(null)
    
    try {
      const context = await stratixDataService.gatherCompanyContext(userId)
      setCompanyContext(context)
      
      // Generate KPIs and insights from real data
      const generatedKPIs = stratixDataService.generateKPIsFromContext(context)
      const generatedInsights = stratixDataService.generateInsightsFromContext(context)
      
      setKpis(generatedKPIs)
      setInsights(generatedInsights)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh context'
      setError(errorMessage)
      console.error('Error refreshing context:', err)
    } finally {
      setIsLoadingContext(false)
    }
  }, [userId])

  // Analyze user data
  const analyzeUserData = useCallback(async () => {
    if (!userId) return
    
    setIsAnalyzing(true)
    setError(null)
    
    try {
      const response = await stratixAPI.analyzeUserData(userId)
      
      if (response.success && response.data) {
        if (response.data.kpis) setKpis(response.data.kpis)
        if (response.data.insights) setInsights(response.data.insights)
        if (response.data.actionPlans) setActionPlans(response.data.actionPlans)
      } else {
        setError(response.error || 'Failed to analyze user data')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsAnalyzing(false)
    }
  }, [userId])

  // Refresh KPIs
  const refreshKPIs = useCallback(async (filters?: any) => {
    if (!userId) return
    
    setIsLoadingKPIs(true)
    setError(null)
    
    try {
      // Try to use real data first
      if (companyContext) {
        const generatedKPIs = stratixDataService.generateKPIsFromContext(companyContext)
        setKpis(generatedKPIs)
      } else {
        // If no context, try to gather it first
        const context = await stratixDataService.gatherCompanyContext(userId)
        setCompanyContext(context)
        const generatedKPIs = stratixDataService.generateKPIsFromContext(context)
        setKpis(generatedKPIs)
      }
    } catch (err) {
      console.error('Error generating KPIs from real data, falling back to API:', err)
      
      // Fallback to API call
      try {
        const response = await stratixAPI.generateKPIs(userId, filters)
        
        if (response.success && response.data?.kpis) {
          setKpis(response.data.kpis)
        } else {
          setError(response.error || 'Failed to generate KPIs')
        }
      } catch (apiErr) {
        setError(apiErr instanceof Error ? apiErr.message : 'An error occurred')
      }
    } finally {
      setIsLoadingKPIs(false)
    }
  }, [userId, companyContext])

  // Refresh insights
  const refreshInsights = useCallback(async (context?: any) => {
    if (!userId) return
    
    setIsLoadingInsights(true)
    setError(null)
    
    try {
      // Try to use real data first
      if (companyContext) {
        const generatedInsights = stratixDataService.generateInsightsFromContext(companyContext)
        setInsights(generatedInsights)
      } else {
        // If no context, try to gather it first
        const contextData = await stratixDataService.gatherCompanyContext(userId)
        setCompanyContext(contextData)
        const generatedInsights = stratixDataService.generateInsightsFromContext(contextData)
        setInsights(generatedInsights)
      }
    } catch (err) {
      console.error('Error generating insights from real data, falling back to API:', err)
      
      // Fallback to API call
      try {
        const response = await stratixAPI.getInsights(userId, context)
        
        if (response.success && response.data?.insights) {
          setInsights(response.data.insights)
        } else {
          setError(response.error || 'Failed to get insights')
        }
      } catch (apiErr) {
        setError(apiErr instanceof Error ? apiErr.message : 'An error occurred')
      }
    } finally {
      setIsLoadingInsights(false)
    }
  }, [userId, companyContext])

  // Create action plan
  const createActionPlan = useCallback(async (objective: string, context?: any) => {
    if (!userId) return
    
    setIsLoadingActionPlans(true)
    setError(null)
    
    try {
      const response = await stratixAPI.createActionPlan(userId, objective, context)
      
      if (response.success && response.data?.actionPlans) {
        setActionPlans(prevPlans => [...prevPlans, ...response.data!.actionPlans!])
      } else {
        setError(response.error || 'Failed to create action plan')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoadingActionPlans(false)
    }
  }, [userId])

  // Chat function
  const chat = useCallback(async (message: string, history?: StratixChatMessage[]): Promise<string> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }
    
    try {
      // Enhance the message with company context
      const contextualHistory = history ? [...history] : []
      
      // Add context information to the conversation if we have it
      if (companyContext) {
        const contextPrompt = `Contexto de la empresa: 
        - Usuario: ${companyContext.profile.fullName} (${companyContext.profile.email})
        - Iniciativas totales: ${companyContext.company.totalInitiatives}
        - Iniciativas activas: ${companyContext.company.activeInitiatives}
        - Iniciativas completadas: ${companyContext.company.completedInitiatives}
        - Áreas: ${companyContext.company.totalAreas}
        - Presupuesto activo: $${companyContext.company.activeBudget.toLocaleString()}
        
        Pregunta del usuario: ${message}`
        
        contextualHistory.unshift({
          role: 'user',
          content: contextPrompt,
          context: companyContext
        })
      }
      
      const response = await stratixAPI.chat(userId, message, contextualHistory)
      
      if (response.success && response.data?.message) {
        return response.data.message
      } else {
        throw new Error(response.error || 'Failed to get chat response')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw err
    }
  }, [userId, companyContext])

  // Stream chat function
  const streamChat = useCallback(async (
    message: string, 
    history?: StratixChatMessage[], 
    onChunk?: (chunk: string) => void
  ): Promise<void> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }
    
    try {
      // Enhance the message with company context
      const contextualHistory = history ? [...history] : []
      
      // Add context information to the conversation if we have it
      if (companyContext) {
        const contextPrompt = `Contexto de la empresa: 
        - Usuario: ${companyContext.profile.fullName} (${companyContext.profile.email})
        - Iniciativas totales: ${companyContext.company.totalInitiatives}
        - Iniciativas activas: ${companyContext.company.activeInitiatives}
        - Iniciativas completadas: ${companyContext.company.completedInitiatives}
        - Áreas: ${companyContext.company.totalAreas}
        - Presupuesto activo: $${companyContext.company.activeBudget.toLocaleString()}
        
        Pregunta del usuario: ${message}`
        
        contextualHistory.unshift({
          role: 'user',
          content: contextPrompt,
          context: companyContext
        })
      }
      
      const stream = stratixAPI.streamChat(userId, message, contextualHistory)
      
      for await (const chunk of stream) {
        onChunk?.(chunk)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw err
    }
  }, [userId, companyContext])

  // Initial load
  useEffect(() => {
    if (userId) {
      // Load company context first, then generate KPIs and insights
      refreshContext()
    }
  }, [userId, refreshContext])

  return {
    // Data
    kpis,
    insights,
    actionPlans,
    companyContext,
    
    // Loading states
    isLoadingKPIs,
    isLoadingInsights,
    isLoadingActionPlans,
    isAnalyzing,
    isLoadingContext,
    
    // Errors
    error,
    
    // Actions
    refreshKPIs,
    refreshInsights,
    createActionPlan,
    analyzeUserData,
    refreshContext,
    chat,
    streamChat,
    clearError
  }
}