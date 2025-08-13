"use client"

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export interface FilterState {
  startDate: string | null
  endDate: string | null
  areas: string[]
  progressMin: number
  progressMax: number
  statuses: string[]
  priorities: string[]
}

const defaultFilters: FilterState = {
  startDate: null,
  endDate: null,
  areas: [],
  progressMin: 0,
  progressMax: 100,
  statuses: [],
  priorities: [],
}

interface UseFiltersProps {
  onFiltersChange?: (filters: FilterState) => void
  persistToUrl?: boolean
  persistToLocalStorage?: boolean
}

export function useFilters({ 
  onFiltersChange, 
  persistToUrl = true, 
  persistToLocalStorage = true 
}: UseFiltersProps = {}) {
  // Safely get search params to avoid Next.js 15 Suspense boundary error
  let searchParams: URLSearchParams | null = null
  try {
    searchParams = useSearchParams()
  } catch (error) {
    // If useSearchParams throws (not wrapped in Suspense), continue without URL persistence
    console.warn('useSearchParams not available, URL persistence disabled:', error)
    persistToUrl = false
  }
  
  const router = useRouter()
  const pathname = usePathname()

  // Initialize filters from URL or localStorage
  const initializeFilters = useCallback((): FilterState => {
    if (persistToUrl && searchParams) {
      const urlFilters: Partial<FilterState> = {}
      
      // Parse date range from URL
      const startDateParam = searchParams.get('startDate')
      const endDateParam = searchParams.get('endDate')
      if (startDateParam) {
        urlFilters.startDate = startDateParam
      }
      if (endDateParam) {
        urlFilters.endDate = endDateParam
      }
      
      // Parse areas from URL
      const areasParam = searchParams.get('areas')
      if (areasParam) {
        urlFilters.areas = areasParam.split(',').filter(Boolean)
      }
      
      // Parse progress range from URL
      const progressMinParam = searchParams.get('progressMin')
      const progressMaxParam = searchParams.get('progressMax')
      if (progressMinParam) {
        urlFilters.progressMin = Math.max(0, Math.min(100, parseInt(progressMinParam)))
      }
      if (progressMaxParam) {
        urlFilters.progressMax = Math.max(0, Math.min(100, parseInt(progressMaxParam)))
      }
      
      // Parse statuses from URL
      const statusesParam = searchParams.get('statuses')
      if (statusesParam) {
        urlFilters.statuses = statusesParam.split(',').filter(Boolean)
      }
      
      // Parse priorities from URL
      const prioritiesParam = searchParams.get('priorities')
      if (prioritiesParam) {
        urlFilters.priorities = prioritiesParam.split(',').filter(Boolean)
      }
      
      if (Object.keys(urlFilters).length > 0) {
        return { ...defaultFilters, ...urlFilters }
      }
    }
    
    // Fallback to localStorage
    if (persistToLocalStorage && typeof window !== 'undefined') {
      try {
        const savedFilters = localStorage.getItem('dashboard-filters')
        if (savedFilters) {
          const parsed = JSON.parse(savedFilters)
          return { ...defaultFilters, ...parsed }
        }
      } catch (error) {
        console.warn('Failed to parse saved filters from localStorage:', error)
      }
    }
    
    return defaultFilters
  }, [searchParams, persistToUrl, persistToLocalStorage])

  const [filters, setFilters] = useState<FilterState>(initializeFilters)

  // Update URL when filters change
  const updateUrl = useCallback((newFilters: FilterState) => {
    if (!persistToUrl || !router || !pathname) return

    const params = new URLSearchParams()
    
    if (newFilters.startDate) {
      params.set('startDate', newFilters.startDate)
    }
    
    if (newFilters.endDate) {
      params.set('endDate', newFilters.endDate)
    }
    
    if (newFilters.areas.length > 0) {
      params.set('areas', newFilters.areas.join(','))
    }
    
    if (newFilters.progressMin > 0) {
      params.set('progressMin', newFilters.progressMin.toString())
    }
    
    if (newFilters.progressMax < 100) {
      params.set('progressMax', newFilters.progressMax.toString())
    }
    
    if (newFilters.statuses.length > 0) {
      params.set('statuses', newFilters.statuses.join(','))
    }
    
    if (newFilters.priorities.length > 0) {
      params.set('priorities', newFilters.priorities.join(','))
    }
    
    const queryString = params.toString()
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname
    
    router.replace(newUrl, { scroll: false })
  }, [persistToUrl, router, pathname])

  // Save to localStorage
  const saveToLocalStorage = useCallback((newFilters: FilterState) => {
    if (!persistToLocalStorage || typeof window === 'undefined') return
    
    try {
      localStorage.setItem('dashboard-filters', JSON.stringify(newFilters))
    } catch (error) {
      console.warn('Failed to save filters to localStorage:', error)
    }
  }, [persistToLocalStorage])

  // Update filters function
  const updateFilters = useCallback((partialFilters: Partial<FilterState>) => {
    setFilters(prevFilters => {
      const newFilters = { ...prevFilters, ...partialFilters }
      
      // Ensure progress bounds are valid
      if (partialFilters.progressMin !== undefined || partialFilters.progressMax !== undefined) {
        newFilters.progressMin = Math.max(0, Math.min(newFilters.progressMin, newFilters.progressMax))
        newFilters.progressMax = Math.max(newFilters.progressMin, Math.min(100, newFilters.progressMax))
      }
      
      updateUrl(newFilters)
      saveToLocalStorage(newFilters)
      onFiltersChange?.(newFilters)
      
      return newFilters
    })
  }, [updateUrl, saveToLocalStorage, onFiltersChange])

  // Reset filters function
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters)
    updateUrl(defaultFilters)
    saveToLocalStorage(defaultFilters)
    onFiltersChange?.(defaultFilters)
  }, [updateUrl, saveToLocalStorage, onFiltersChange])

  // Get count of active filters
  const getActiveFilterCount = useCallback(() => {
    let count = 0
    
    if (filters.startDate || filters.endDate) count++
    if (filters.areas.length > 0) count++
    if (filters.progressMin > 0 || filters.progressMax < 100) count++
    if (filters.statuses.length > 0) count++
    if (filters.priorities.length > 0) count++
    
    return count
  }, [filters])

  // Check if filters are active (not default)
  const hasActiveFilters = useCallback(() => {
    return getActiveFilterCount() > 0
  }, [getActiveFilterCount])

  // Apply filters to data array
  const applyFilters = useCallback(<T extends Record<string, any>>(data: T[]): T[] => {
    return data.filter(item => {
      // Date range filter
      if (filters.startDate || filters.endDate) {
        const itemStartDate = item.start_date
        const itemEndDate = item.end_date || item.due_date || item.target_date
        
        if (filters.startDate && itemEndDate) {
          if (new Date(itemEndDate) < new Date(filters.startDate)) {
            return false
          }
        }
        
        if (filters.endDate && itemStartDate) {
          if (new Date(itemStartDate) > new Date(filters.endDate)) {
            return false
          }
        }
      }
      
      // Area filter
      if (filters.areas.length > 0) {
        const areaId = item.area_id
        if (!areaId || !filters.areas.includes(areaId)) {
          return false
        }
      }
      
      // Progress filter
      const progress = item.progress || 0
      if (progress < filters.progressMin || progress > filters.progressMax) {
        return false
      }
      
      // Status filter
      if (filters.statuses.length > 0) {
        const status = item.status
        if (!status || !filters.statuses.includes(status)) {
          return false
        }
      }
      
      // Priority filter
      if (filters.priorities.length > 0) {
        const priority = item.priority
        if (!priority || !filters.priorities.includes(priority)) {
          return false
        }
      }
      
      return true
    })
  }, [filters])

  // Save current filters as preset
  const saveFilterPreset = useCallback((name: string) => {
    if (typeof window === 'undefined') return
    
    try {
      const presets = JSON.parse(localStorage.getItem('dashboard-filter-presets') || '{}')
      presets[name] = filters
      localStorage.setItem('dashboard-filter-presets', JSON.stringify(presets))
      return true
    } catch (error) {
      console.warn('Failed to save filter preset:', error)
      return false
    }
  }, [filters])

  // Load filter preset
  const loadFilterPreset = useCallback((name: string) => {
    if (typeof window === 'undefined') return false
    
    try {
      const presets = JSON.parse(localStorage.getItem('dashboard-filter-presets') || '{}')
      if (presets[name]) {
        const presetFilters = { ...defaultFilters, ...presets[name] }
        setFilters(presetFilters)
        updateUrl(presetFilters)
        onFiltersChange?.(presetFilters)
        return true
      }
      return false
    } catch (error) {
      console.warn('Failed to load filter preset:', error)
      return false
    }
  }, [updateUrl, onFiltersChange])

  // Get available presets
  const getFilterPresets = useCallback(() => {
    if (typeof window === 'undefined') return {}
    
    try {
      return JSON.parse(localStorage.getItem('dashboard-filter-presets') || '{}')
    } catch (error) {
      console.warn('Failed to get filter presets:', error)
      return {}
    }
  }, [])

  return {
    filters,
    updateFilters,
    resetFilters,
    getActiveFilterCount,
    hasActiveFilters,
    applyFilters,
    saveFilterPreset,
    loadFilterPreset,
    getFilterPresets,
  }
}