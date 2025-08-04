import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { stratixAPI, StratixKPI, StratixInsight, StratixActionPlan, StratixChatMessage } from '@/lib/stratix/api-client'
import { roleBasedAI, UserRole, RoleBasedQuery, RoleBasedResponse } from '@/lib/stratix/role-based-ai'
import type { CompanyContext } from '@/lib/stratix/data-service'

export interface UseStratixAssistantReturn {
  // Loading states
  isLoading: boolean
  isProcessingFile: boolean
  processingProgress: number
  
  // Errors
  error: string | null
  
  // Actions - using only real AI tool methods
  getInitiativeProgress: (nombreIniciativa: string) => Promise<string>
  getAreaKPIs: (nombreArea: string) => Promise<string>
  chat: (message: string, history?: StratixChatMessage[]) => Promise<string>
  streamChat: (message: string, history: StratixChatMessage[] | undefined, onChunk: (chunk: string) => void) => Promise<void>
  
  // Enhanced file analysis methods
  analyzeDocument: (fileContent: string, fileName: string, fileType: 'document' | 'spreadsheet' | 'presentation' | 'pdf', companyContext?: any) => Promise<any>
  generateFileInsights: (fileContent: string, fileName: string, fileType: 'document' | 'spreadsheet' | 'presentation' | 'pdf', companyContext?: any) => Promise<StratixInsight[] | null>
  createActionPlanFromFile: (fileContent: string, fileName: string, fileType: 'document' | 'spreadsheet' | 'presentation' | 'pdf', objective: string, companyContext?: any) => Promise<StratixActionPlan[] | null>
  analyzeFileForKPIs: (fileContent: string, fileName: string, fileType: 'document' | 'spreadsheet' | 'presentation' | 'pdf', companyContext?: any) => Promise<StratixKPI[] | null>
  chatWithFileContext: (message: string, fileContext: { fileName: string; fileType: string; extractedData: any }, history?: StratixChatMessage[]) => Promise<string>
  
  // Role-based AI methods
  processRoleBasedQuery: (query: string, role: UserRole, context: CompanyContext, analysisType?: 'operational' | 'strategic' | 'financial' | 'predictive' | 'competitive') => Promise<RoleBasedResponse>
  getAvailableFeatures: (role: UserRole) => { features: string[]; restrictions: string[]; analysisTypes: string[] }
  getSuggestedQueries: (role: UserRole) => string[]
  
  clearError: () => void
}

export function useStratixAssistant(): UseStratixAssistantReturn {
  const { session } = useAuth()
  const userId = session?.user?.id || ''
  
  // State - minimal, only what's needed for AI interactions
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessingFile, setIsProcessingFile] = useState(false)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  // Clear error
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Get initiative progress using real AI tool
  const getInitiativeProgress = useCallback(async (nombreIniciativa: string): Promise<string> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Getting initiative progress via AI tool:', nombreIniciativa)
      const response = await stratixAPI.getInitiativeProgress(userId, nombreIniciativa)
      
      if (response.success && response.data?.message) {
        console.log('✅ Received initiative progress from AI')
        return response.data.message
      } else {
        throw new Error(response.error || 'Failed to get initiative progress')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get initiative progress'
      setError(errorMessage)
      console.error('❌ Initiative progress error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Get area KPIs using real AI tool
  const getAreaKPIs = useCallback(async (nombreArea: string): Promise<string> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🔍 Getting area KPIs via AI tool:', nombreArea)
      const response = await stratixAPI.getAreaKPIs(userId, nombreArea)
      
      if (response.success && response.data?.message) {
        console.log('✅ Received area KPIs from AI')
        return response.data.message
      } else {
        throw new Error(response.error || 'Failed to get area KPIs')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get area KPIs'
      setError(errorMessage)
      console.error('❌ Area KPIs error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Clean chat function using only AI tool
  const chat = useCallback(async (message: string, history?: StratixChatMessage[]): Promise<string> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('💬 Sending chat message to AI tool:', message)
      const response = await stratixAPI.chat(userId, message, history)
      
      if (response.success && response.data?.message) {
        console.log('✅ Chat response received from AI')
        return response.data.message
      } else {
        throw new Error(response.error || 'Failed to get chat response')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get chat response'
      setError(errorMessage)
      console.error('❌ Chat error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Clean stream chat function using only AI tool
  const streamChat = useCallback(async (
    message: string, 
    history?: StratixChatMessage[], 
    onChunk?: (chunk: string) => void
  ): Promise<void> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🔄 Starting stream chat with AI tool')
      const stream = stratixAPI.streamChat(userId, message, history)
      
      for await (const chunk of stream) {
        onChunk?.(chunk)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to stream chat'
      setError(errorMessage)
      console.error('❌ Stream chat error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Enhanced file analysis methods
  const analyzeDocument = useCallback(async (
    fileContent: string, 
    fileName: string, 
    fileType: 'document' | 'spreadsheet' | 'presentation' | 'pdf',
    companyContext?: any
  ): Promise<any> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }
    
    setIsProcessingFile(true)
    setProcessingProgress(0)
    setError(null)
    
    try {
      console.log('📄 Analyzing document via AI:', fileName)
      const response = await stratixAPI.analyzeDocument(userId, fileContent, fileName, fileType, companyContext)
      
      if (response.success && response.data) {
        console.log('✅ Document analysis completed')
        setProcessingProgress(100)
        return response.data.analysis
      } else {
        throw new Error(response.error || 'Failed to analyze document')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze document'
      setError(errorMessage)
      console.error('❌ Document analysis error:', err)
      throw err
    } finally {
      setIsProcessingFile(false)
    }
  }, [userId])

  const generateFileInsights = useCallback(async (
    fileContent: string, 
    fileName: string, 
    fileType: 'document' | 'spreadsheet' | 'presentation' | 'pdf',
    companyContext?: any
  ): Promise<StratixInsight[] | null> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }
    
    setIsProcessingFile(true)
    setError(null)
    
    try {
      console.log('🧠 Generating insights from file via AI:', fileName)
      const response = await stratixAPI.generateFileInsights(userId, fileContent, fileName, fileType, companyContext)
      
      if (response.success && response.data?.insights) {
        console.log('✅ File insights generated')
        return response.data.insights
      } else {
        throw new Error(response.error || 'Failed to generate file insights')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate file insights'
      setError(errorMessage)
      console.error('❌ File insights error:', err)
      throw err
    } finally {
      setIsProcessingFile(false)
    }
  }, [userId])

  const createActionPlanFromFile = useCallback(async (
    fileContent: string, 
    fileName: string, 
    fileType: 'document' | 'spreadsheet' | 'presentation' | 'pdf',
    objective: string,
    companyContext?: any
  ): Promise<StratixActionPlan[] | null> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }
    
    setIsProcessingFile(true)
    setError(null)
    
    try {
      console.log('📋 Creating action plan from file via AI:', fileName)
      const response = await stratixAPI.createActionPlanFromFile(userId, fileContent, fileName, fileType, objective, companyContext)
      
      if (response.success && response.data?.actionPlans) {
        console.log('✅ Action plan created from file')
        return response.data.actionPlans
      } else {
        throw new Error(response.error || 'Failed to create action plan from file')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create action plan from file'
      setError(errorMessage)
      console.error('❌ Action plan creation error:', err)
      throw err
    } finally {
      setIsProcessingFile(false)
    }
  }, [userId])

  const analyzeFileForKPIs = useCallback(async (
    fileContent: string, 
    fileName: string, 
    fileType: 'document' | 'spreadsheet' | 'presentation' | 'pdf',
    companyContext?: any
  ): Promise<StratixKPI[] | null> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }
    
    setIsProcessingFile(true)
    setError(null)
    
    try {
      console.log('📊 Analyzing file for KPIs via AI:', fileName)
      const response = await stratixAPI.analyzeFileForKPIs(userId, fileContent, fileName, fileType, companyContext)
      
      if (response.success && response.data?.kpis) {
        console.log('✅ KPI analysis completed from file')
        return response.data.kpis
      } else {
        throw new Error(response.error || 'Failed to analyze file for KPIs')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to analyze file for KPIs'
      setError(errorMessage)
      console.error('❌ File KPI analysis error:', err)
      throw err
    } finally {
      setIsProcessingFile(false)
    }
  }, [userId])

  const chatWithFileContext = useCallback(async (
    message: string, 
    fileContext: { fileName: string; fileType: string; extractedData: any },
    history?: StratixChatMessage[]
  ): Promise<string> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('💬 Chat with file context via AI:', fileContext.fileName)
      const response = await stratixAPI.chatWithFileContext(userId, message, fileContext, history)
      
      if (response.success && response.data?.message) {
        console.log('✅ Chat response with file context received')
        return response.data.message
      } else {
        throw new Error(response.error || 'Failed to get chat response with file context')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get chat response with file context'
      setError(errorMessage)
      console.error('❌ Chat with file context error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  // Role-based AI methods
  const processRoleBasedQuery = useCallback(async (
    query: string,
    role: UserRole,
    context: CompanyContext,
    analysisType?: 'operational' | 'strategic' | 'financial' | 'predictive' | 'competitive'
  ): Promise<RoleBasedResponse> => {
    if (!userId) {
      throw new Error('User not authenticated')
    }
    
    setIsLoading(true)
    setError(null)
    
    try {
      console.log('🎭 Processing role-based query:', role, analysisType)
      
      const roleBasedQuery: RoleBasedQuery = {
        role,
        query,
        context,
        analysisType,
        confidentialityLevel: role === 'CEO' || role === 'Admin' ? 'confidential' : 'internal'
      }
      
      const response = await roleBasedAI.processRoleBasedQuery(userId, roleBasedQuery)
      
      console.log('✅ Role-based query processed successfully')
      return response
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process role-based query'
      setError(errorMessage)
      console.error('❌ Role-based query error:', err)
      throw err
    } finally {
      setIsLoading(false)
    }
  }, [userId])

  const getAvailableFeatures = useCallback((role: UserRole) => {
    return roleBasedAI.getAvailableFeatures(role)
  }, [])

  const getSuggestedQueries = useCallback((role: UserRole) => {
    return roleBasedAI.getSuggestedQueries(role)
  }, [])

  return {
    // Loading states
    isLoading,
    isProcessingFile,
    processingProgress,
    
    // Errors
    error,
    
    // Actions - using only real AI tool methods
    getInitiativeProgress,
    getAreaKPIs,
    chat,
    streamChat,
    
    // Enhanced file analysis methods
    analyzeDocument,
    generateFileInsights,
    createActionPlanFromFile,
    analyzeFileForKPIs,
    chatWithFileContext,
    
    // Role-based AI methods
    processRoleBasedQuery,
    getAvailableFeatures,
    getSuggestedQueries,
    
    clearError
  }
}