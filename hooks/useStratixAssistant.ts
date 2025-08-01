import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { stratixAPI, StratixKPI, StratixInsight, StratixActionPlan, StratixChatMessage } from '@/lib/stratix/api-client'

export interface UseStratixAssistantReturn {
  // Data
  kpis: StratixKPI[]
  insights: StratixInsight[]
  actionPlans: StratixActionPlan[]
  
  // Loading states
  isLoadingKPIs: boolean
  isLoadingInsights: boolean
  isLoadingActionPlans: boolean
  isAnalyzing: boolean
  
  // Errors
  error: string | null
  
  // Actions
  refreshKPIs: (filters?: any) => Promise<void>
  refreshInsights: (context?: any) => Promise<void>
  createActionPlan: (objective: string, context?: any) => Promise<void>
  analyzeUserData: () => Promise<void>
  chat: (message: string, history?: StratixChatMessage[]) => Promise<string>
  streamChat: (message: string, history?: StratixChatMessage[], onChunk: (chunk: string) => void) => Promise<void>
  clearError: () => void
}

export function useStratixAssistant(): UseStratixAssistantReturn {
  const { session } = useAuth()
  const userId = session?.user?.id || ''
  
  // State
  const [kpis, setKpis] = useState<StratixKPI[]>([])
  const [insights, setInsights] = useState<StratixInsight[]>([])
  const [actionPlans, setActionPlans] = useState<StratixActionPlan[]>([])
  
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(false)
  const [isLoadingInsights, setIsLoadingInsights] = useState(false)
  const [isLoadingActionPlans, setIsLoadingActionPlans] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  
  const [error, setError] = useState<string | null>(null)

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

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
      const response = await stratixAPI.generateKPIs(userId, filters)
      
      if (response.success && response.data?.kpis) {
        setKpis(response.data.kpis)
      } else {
        setError(response.error || 'Failed to generate KPIs')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoadingKPIs(false)
    }
  }, [userId])

  // Refresh insights
  const refreshInsights = useCallback(async (context?: any) => {
    if (!userId) return
    
    setIsLoadingInsights(true)
    setError(null)
    
    try {
      const response = await stratixAPI.getInsights(userId, context)
      
      if (response.success && response.data?.insights) {
        setInsights(response.data.insights)
      } else {
        setError(response.error || 'Failed to get insights')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoadingInsights(false)
    }
  }, [userId])

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
      const response = await stratixAPI.chat(userId, message, history)
      
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
  }, [userId])

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
      const stream = stratixAPI.streamChat(userId, message, history)
      
      for await (const chunk of stream) {
        onChunk?.(chunk)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      throw err
    }
  }, [userId])

  // Initial load
  useEffect(() => {
    if (userId) {
      // Load initial data
      refreshKPIs()
      refreshInsights()
    }
  }, [userId, refreshKPIs, refreshInsights])

  return {
    // Data
    kpis,
    insights,
    actionPlans,
    
    // Loading states
    isLoadingKPIs,
    isLoadingInsights,
    isLoadingActionPlans,
    isAnalyzing,
    
    // Errors
    error,
    
    // Actions
    refreshKPIs,
    refreshInsights,
    createActionPlan,
    analyzeUserData,
    chat,
    streamChat,
    clearError
  }
}