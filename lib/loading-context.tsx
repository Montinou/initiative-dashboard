"use client"

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'

interface LoadingState {
  [key: string]: {
    isLoading: boolean
    error?: string | null
    progress?: number
    message?: string
  }
}

interface LoadingContextType {
  loadingStates: LoadingState
  setLoading: (key: string, isLoading: boolean, options?: {
    error?: string | null
    progress?: number
    message?: string
  }) => void
  isAnyLoading: boolean
  getLoadingState: (key: string) => LoadingState[string] | undefined
  clearError: (key: string) => void
  clearAllErrors: () => void
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined)

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [loadingStates, setLoadingStates] = useState<LoadingState>({})
  
  const setLoading = useCallback((
    key: string, 
    isLoading: boolean, 
    options?: {
      error?: string | null
      progress?: number
      message?: string
    }
  ) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        isLoading,
        error: options?.error ?? prev[key]?.error,
        progress: options?.progress ?? prev[key]?.progress,
        message: options?.message ?? prev[key]?.message
      }
    }))
  }, [])
  
  const isAnyLoading = Object.values(loadingStates).some(state => state.isLoading)
  
  const getLoadingState = useCallback((key: string) => {
    return loadingStates[key]
  }, [loadingStates])
  
  const clearError = useCallback((key: string) => {
    setLoadingStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        error: null
      }
    }))
  }, [])
  
  const clearAllErrors = useCallback(() => {
    setLoadingStates(prev => {
      const newState = { ...prev }
      Object.keys(newState).forEach(key => {
        newState[key] = { ...newState[key], error: null }
      })
      return newState
    })
  }, [])
  
  // Clean up completed loading states after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoadingStates(prev => {
        const newState = { ...prev }
        Object.keys(newState).forEach(key => {
          if (!newState[key].isLoading && !newState[key].error) {
            delete newState[key]
          }
        })
        return newState
      })
    }, 5000)
    
    return () => clearTimeout(timer)
  }, [loadingStates])
  
  return (
    <LoadingContext.Provider value={{
      loadingStates,
      setLoading,
      isAnyLoading,
      getLoadingState,
      clearError,
      clearAllErrors
    }}>
      {children}
    </LoadingContext.Provider>
  )
}

export function useLoading() {
  const context = useContext(LoadingContext)
  if (!context) {
    throw new Error('useLoading must be used within a LoadingProvider')
  }
  return context
}

// Hook for managing individual loading states
export function useLoadingState(key: string) {
  const { setLoading, getLoadingState, clearError } = useLoading()
  
  const state = getLoadingState(key) ?? { isLoading: false, error: null }
  
  const startLoading = useCallback((message?: string) => {
    setLoading(key, true, { message, error: null })
  }, [key, setLoading])
  
  const stopLoading = useCallback(() => {
    setLoading(key, false)
  }, [key, setLoading])
  
  const setError = useCallback((error: string) => {
    setLoading(key, false, { error })
  }, [key, setLoading])
  
  const setProgress = useCallback((progress: number, message?: string) => {
    setLoading(key, true, { progress, message })
  }, [key, setLoading])
  
  return {
    isLoading: state.isLoading,
    error: state.error,
    progress: state.progress,
    message: state.message,
    startLoading,
    stopLoading,
    setError,
    setProgress,
    clearError: () => clearError(key)
  }
}