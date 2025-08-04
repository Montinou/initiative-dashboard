'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/lib/auth-context'

export interface ProcessingStatus {
  sessionId: string
  userId: string
  fileName: string
  fileType: string
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  currentStep: string
  result?: any
  error?: string
  timestamp: Date
}

export interface ProcessingUpdate {
  type: 'status_update' | 'progress_update' | 'completion' | 'error'
  sessionId: string
  data: Partial<ProcessingStatus>
}

export interface UseStratixWebSocketReturn {
  // Connection state
  isConnected: boolean
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error'
  
  // Processing states
  activeProcessingSessions: Map<string, ProcessingStatus>
  
  // Actions
  connect: () => void
  disconnect: () => void
  startProcessingSession: (fileName: string, fileType: string) => string
  updateProcessingStatus: (sessionId: string, update: Partial<ProcessingStatus>) => void
  
  // Event handlers
  onProcessingUpdate: (handler: (update: ProcessingUpdate) => void) => void
  onProcessingComplete: (handler: (sessionId: string, result: any) => void) => void
  onProcessingError: (handler: (sessionId: string, error: string) => void) => void
}

// WebSocket endpoint - in production this would be a proper WebSocket server
// For now, we'll simulate real-time updates with a polling mechanism
const WS_ENDPOINT = process.env.NEXT_PUBLIC_WS_ENDPOINT || 'ws://localhost:3001/stratix-ws'

export function useStratixWebSocket(): UseStratixWebSocketReturn {
  const { session } = useAuth()
  const userId = session?.user?.id || ''
  
  // Connection state
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  
  // Processing state
  const [activeProcessingSessions, setActiveProcessingSessions] = useState<Map<string, ProcessingStatus>>(new Map())
  
  // WebSocket reference (for future implementation)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  
  // Event handlers
  const processUpdateHandlers = useRef<((update: ProcessingUpdate) => void)[]>([])
  const processCompleteHandlers = useRef<((sessionId: string, result: any) => void)[]>([])
  const processErrorHandlers = useRef<((sessionId: string, error: string) => void)[]>([])

  // Generate unique session ID
  const generateSessionId = useCallback(() => {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // Start a new processing session
  const startProcessingSession = useCallback((fileName: string, fileType: string): string => {
    const sessionId = generateSessionId()
    
    const newSession: ProcessingStatus = {
      sessionId,
      userId,
      fileName,
      fileType,
      status: 'queued',
      progress: 0,
      currentStep: 'Preparando análisis...',
      timestamp: new Date()
    }
    
    setActiveProcessingSessions(prev => new Map(prev).set(sessionId, newSession))
    
    console.log('🚀 Started processing session:', sessionId, fileName)
    
    // Notify handlers
    const update: ProcessingUpdate = {
      type: 'status_update',
      sessionId,
      data: newSession
    }
    
    processUpdateHandlers.current.forEach(handler => handler(update))
    
    return sessionId
  }, [userId, generateSessionId])

  // Update processing status
  const updateProcessingStatus = useCallback((sessionId: string, update: Partial<ProcessingStatus>) => {
    setActiveProcessingSessions(prev => {
      const newMap = new Map(prev)
      const existing = newMap.get(sessionId)
      
      if (existing) {
        const updated: ProcessingStatus = {
          ...existing,
          ...update,
          timestamp: new Date()
        }
        
        newMap.set(sessionId, updated)
        
        console.log('📊 Processing update:', sessionId, update.status, `${update.progress || existing.progress}%`)
        
        // Notify handlers based on update type
        const processUpdate: ProcessingUpdate = {
          type: update.status === 'completed' ? 'completion' : 
                update.status === 'failed' ? 'error' : 
                update.progress !== undefined ? 'progress_update' : 'status_update',
          sessionId,
          data: update
        }
        
        processUpdateHandlers.current.forEach(handler => handler(processUpdate))
        
        // Handle completion
        if (update.status === 'completed' && update.result) {
          processCompleteHandlers.current.forEach(handler => handler(sessionId, update.result))
        }
        
        // Handle errors
        if (update.status === 'failed' && update.error) {
          processErrorHandlers.current.forEach(handler => handler(sessionId, update.error))
        }
      }
      
      return newMap
    })
  }, [])

  // Simulate WebSocket connection (for development)
  const connect = useCallback(() => {
    if (!userId) {
      console.warn('Cannot connect WebSocket: User not authenticated')
      return
    }
    
    console.log('🔌 Connecting to Stratix WebSocket...')
    setConnectionStatus('connecting')
    
    // Simulate connection success after delay
    setTimeout(() => {
      setIsConnected(true)
      setConnectionStatus('connected')
      console.log('✅ Stratix WebSocket connected')
    }, 1000)
    
    // TODO: Implement real WebSocket connection
    /*
    try {
      wsRef.current = new WebSocket(`${WS_ENDPOINT}?userId=${userId}`)
      
      wsRef.current.onopen = () => {
        setIsConnected(true)
        setConnectionStatus('connected')
        reconnectAttempts.current = 0
        console.log('✅ Stratix WebSocket connected')
      }
      
      wsRef.current.onmessage = (event) => {
        try {
          const update: ProcessingUpdate = JSON.parse(event.data)
          console.log('📨 WebSocket message received:', update)
          
          // Update local state
          if (update.data) {
            updateProcessingStatus(update.sessionId, update.data)
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }
      
      wsRef.current.onclose = () => {
        setIsConnected(false)
        setConnectionStatus('disconnected')
        console.log('🔌 WebSocket disconnected')
        
        // Auto-reconnect logic
        if (reconnectAttempts.current < 5) {
          reconnectAttempts.current++
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, Math.pow(2, reconnectAttempts.current) * 1000)
        }
      }
      
      wsRef.current.onerror = (error) => {
        setConnectionStatus('error')
        console.error('❌ WebSocket error:', error)
      }
    } catch (error) {
      setConnectionStatus('error')
      console.error('❌ Failed to create WebSocket connection:', error)
    }
    */
  }, [userId])

  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting Stratix WebSocket...')
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    setIsConnected(false)
    setConnectionStatus('disconnected')
    setActiveProcessingSessions(new Map())
  }, [])

  // Event handler registration
  const onProcessingUpdate = useCallback((handler: (update: ProcessingUpdate) => void) => {
    processUpdateHandlers.current.push(handler)
    
    // Return cleanup function
    return () => {
      const index = processUpdateHandlers.current.indexOf(handler)
      if (index > -1) {
        processUpdateHandlers.current.splice(index, 1)
      }
    }
  }, [])

  const onProcessingComplete = useCallback((handler: (sessionId: string, result: any) => void) => {
    processCompleteHandlers.current.push(handler)
    
    // Return cleanup function
    return () => {
      const index = processCompleteHandlers.current.indexOf(handler)
      if (index > -1) {
        processCompleteHandlers.current.splice(index, 1)
      }
    }
  }, [])

  const onProcessingError = useCallback((handler: (sessionId: string, error: string) => void) => {
    processErrorHandlers.current.push(handler)
    
    // Return cleanup function
    return () => {
      const index = processErrorHandlers.current.indexOf(handler)
      if (index > -1) {
        processErrorHandlers.current.splice(index, 1)
      }
    }
  }, [])

  // Auto-connect when user is authenticated
  useEffect(() => {
    if (userId && !isConnected) {
      connect()
    }
    
    return () => {
      disconnect()
    }
  }, [userId, isConnected, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    // Connection state
    isConnected,
    connectionStatus,
    
    // Processing states
    activeProcessingSessions,
    
    // Actions
    connect,
    disconnect,
    startProcessingSession,
    updateProcessingStatus,
    
    // Event handlers
    onProcessingUpdate,
    onProcessingComplete,
    onProcessingError
  }
}