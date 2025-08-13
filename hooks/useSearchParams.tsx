"use client"

import { useState, useEffect } from 'react'

/**
 * Custom hook to read and sync with URL search parameters
 * Works in client-side rendering environments
 */
export function useSearchParams() {
  const [searchParams, setSearchParams] = useState<URLSearchParams>(new URLSearchParams())
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Only access window on client side
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      setSearchParams(params)
      setIsLoaded(true)
    }
  }, [])

  const getParam = (key: string): string | null => {
    return isLoaded ? searchParams.get(key) : null
  }

  const getBooleanParam = (key: string, defaultValue: boolean = false): boolean => {
    if (!isLoaded) return defaultValue
    const value = searchParams.get(key)
    return value === 'true'
  }

  const getArrayParam = (key: string): string[] => {
    if (!isLoaded) return []
    return searchParams.getAll(key)
  }

  const updateParam = (key: string, value: string | null) => {
    if (typeof window === 'undefined') return
    
    const url = new URL(window.location.href)
    if (value === null || value === '') {
      url.searchParams.delete(key)
    } else {
      url.searchParams.set(key, value)
    }
    
    // Update URL without page reload
    window.history.replaceState({}, '', url.toString())
    
    // Update local state
    setSearchParams(new URLSearchParams(url.search))
  }

  return {
    searchParams,
    isLoaded,
    getParam,
    getBooleanParam, 
    getArrayParam,
    updateParam,
    // Specific helper for common parameters
    useinitiatives: getBooleanParam('useinitiatives', false),
    include_initiatives: getBooleanParam('include_initiatives', false)
  }
}