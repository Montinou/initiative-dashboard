"use client"

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export interface FilterState {
  quarters: string[]
  areas: string[]
  progressMin: number
  progressMax: number
  statuses: string[]
  priorities: string[]
}

const defaultFilters: FilterState = {
  quarters: [],
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
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Initialize filters from URL or localStorage
  const initializeFilters = useCallback((): FilterState => {
    if (persistToUrl && searchParams) {
      const urlFilters: Partial<FilterState> = {}
      
      // Parse quarters from URL
      const quartersParam = searchParams.get('quarters')
      if (quartersParam) {
        urlFilters.quarters = quartersParam.split(',').filter(Boolean)
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
    
    if (newFilters.quarters.length > 0) {
      params.set('quarters', newFilters.quarters.join(','))
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
    
    if (filters.quarters.length > 0) count++
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
      // Quarter filter
      if (filters.quarters.length > 0) {
        const targetDate = item.target_date || item.due_date
        if (targetDate) {
          const date = new Date(targetDate)
          const quarter = `Q${Math.ceil((date.getMonth() + 1) / 3)}`
          if (!filters.quarters.includes(quarter)) {
            return false
          }
        } else if (filters.quarters.length > 0) {
          // If no date but quarters are filtered, exclude item
          return false
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