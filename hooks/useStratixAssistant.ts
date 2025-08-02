import { useState, useCallback } from 'react'
import { useAuth } from '@/lib/auth-context'
import { stratixAPI, StratixKPI, StratixInsight, StratixActionPlan, StratixChatMessage } from '@/lib/stratix/api-client'

export interface UseStratixAssistantReturn {
  // Loading states
  isLoading: boolean
  
  // Errors
  error: string | null
  
  // Actions - using only real AI tool methods
  getInitiativeProgress: (nombreIniciativa: string) => Promise<string>
  getAreaKPIs: (nombreArea: string) => Promise<string>
  chat: (message: string, history?: StratixChatMessage[]) => Promise<string>
  streamChat: (message: string, history: StratixChatMessage[] | undefined, onChunk: (chunk: string) => void) => Promise<void>
  clearError: () => void
}

export function useStratixAssistant(): UseStratixAssistantReturn {
  const { session } = useAuth()
  const userId = session?.user?.id || ''
  
  // State - minimal, only what's needed for AI interactions
  const [isLoading, setIsLoading] = useState(false)
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

  return {
    // Loading states
    isLoading,
    
    // Errors
    error,
    
    // Actions - using only real AI tool methods
    getInitiativeProgress,
    getAreaKPIs,
    chat,
    streamChat,
    clearError
  }
}