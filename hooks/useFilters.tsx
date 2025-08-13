"use client"

import { useState, useCallback, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { logger } from '@/lib/logger'
import { 
  FilterState, 
  EnhancedFilterState, 
  defaultFilterState, 
  defaultEnhancedFilterState,
  UseFiltersConfig,
  StandardQueryParams,
  isValidStatus,
  isValidPriority
} from '@/lib/types/filters'
import { FilterableItem } from '@/lib/types/data'

// Re-export for backward compatibility
export type { FilterState, EnhancedFilterState }

// Backward compatible default
const defaultFilters: FilterState = defaultFilterState

interface UseFiltersProps {
  // Legacy prop for backward compatibility
  onFiltersChange?: (filters: FilterState | EnhancedFilterState) => void
  persistToUrl?: boolean
  persistToLocalStorage?: boolean
  useEnhancedFilters?: boolean
}

export function useFilters({ 
  onFiltersChange, 
  persistToUrl = true, 
  persistToLocalStorage = true,
  useEnhancedFilters = false
}: UseFiltersProps = {}) {
  // Safely get search params to avoid Next.js 15 Suspense boundary error
  let searchParams: URLSearchParams | null = null
  try {
    searchParams = useSearchParams()
  } catch (error) {
    // If useSearchParams throws (not wrapped in Suspense), continue without URL persistence
    logger.warn('useSearchParams not available, URL persistence disabled', { error })
    persistToUrl = false
  }
  
  const router = useRouter()
  const pathname = usePathname()

  // Initialize filters from URL or localStorage
  const initializeFilters = useCallback((): FilterState | EnhancedFilterState => {
    const baseDefault = useEnhancedFilters ? defaultEnhancedFilterState : defaultFilters
    
    if (persistToUrl && searchParams) {
      const urlFilters: Partial<EnhancedFilterState> = {}
      
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
      
      // Enhanced filters - only parse if enhanced mode is enabled
      if (useEnhancedFilters) {
        // Parse objective IDs from URL
        const objectiveIdsParam = searchParams.get('objectiveIds')
        if (objectiveIdsParam) {
          urlFilters.objectiveIds = objectiveIdsParam.split(',').filter(Boolean)
        }
        
        // Parse initiative IDs from URL
        const initiativeIdsParam = searchParams.get('initiativeIds')
        if (initiativeIdsParam) {
          urlFilters.initiativeIds = initiativeIdsParam.split(',').filter(Boolean)
        }
        
        // Parse assigned to IDs from URL
        const assignedToParam = searchParams.get('assignedTo')
        if (assignedToParam) {
          urlFilters.assignedTo = assignedToParam.split(',').filter(Boolean)
        }
        
        // Parse quarter IDs from URL (backward compatibility)
        const quarterIdsParam = searchParams.get('quarterIds')
        if (quarterIdsParam) {
          urlFilters.quarterIds = quarterIdsParam.split(',').filter(Boolean)
        }
        
        // Parse search query from URL
        const searchQueryParam = searchParams.get('searchQuery') || searchParams.get('search')
        if (searchQueryParam) {
          urlFilters.searchQuery = searchQueryParam
        }
      }
      
      if (Object.keys(urlFilters).length > 0) {
        return { ...baseDefault, ...urlFilters }
      }
    }
    
    // Fallback to localStorage
    if (persistToLocalStorage && typeof window !== 'undefined') {
      try {
        const storageKey = useEnhancedFilters ? 'dashboard-enhanced-filters' : 'dashboard-filters'
        const savedFilters = localStorage.getItem(storageKey)
        if (savedFilters) {
          const parsed = JSON.parse(savedFilters)
          return { ...baseDefault, ...parsed }
        }
      } catch (error) {
        logger.warn('Failed to parse saved filters from localStorage', { error })
      }
    }
    
    return baseDefault
  }, [searchParams, persistToUrl, persistToLocalStorage, useEnhancedFilters])

  const [filters, setFilters] = useState<FilterState | EnhancedFilterState>(initializeFilters)

  // Update URL when filters change
  const updateUrl = useCallback((newFilters: FilterState | EnhancedFilterState) => {
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
    
    // Enhanced filters - only set if enhanced mode is enabled and filters exist
    if (useEnhancedFilters && 'objectiveIds' in newFilters) {
      const enhancedFilters = newFilters as EnhancedFilterState
      
      if (enhancedFilters.objectiveIds.length > 0) {
        params.set('objectiveIds', enhancedFilters.objectiveIds.join(','))
      }
      
      if (enhancedFilters.initiativeIds.length > 0) {
        params.set('initiativeIds', enhancedFilters.initiativeIds.join(','))
      }
      
      if (enhancedFilters.assignedTo.length > 0) {
        params.set('assignedTo', enhancedFilters.assignedTo.join(','))
      }
      
      if (enhancedFilters.quarterIds.length > 0) {
        params.set('quarterIds', enhancedFilters.quarterIds.join(','))
      }
      
      if (enhancedFilters.searchQuery.trim()) {
        params.set('searchQuery', enhancedFilters.searchQuery.trim())
      }
    }
    
    const queryString = params.toString()
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname
    
    router.replace(newUrl, { scroll: false })
  }, [persistToUrl, router, pathname, useEnhancedFilters])

  // Save to localStorage
  const saveToLocalStorage = useCallback((newFilters: FilterState | EnhancedFilterState) => {
    if (!persistToLocalStorage || typeof window === 'undefined') return
    
    try {
      const storageKey = useEnhancedFilters ? 'dashboard-enhanced-filters' : 'dashboard-filters'
      localStorage.setItem(storageKey, JSON.stringify(newFilters))
    } catch (error) {
      logger.warn('Failed to save filters to localStorage', { error })
    }
  }, [persistToLocalStorage, useEnhancedFilters])

  // Update filters function
  const updateFilters = useCallback((partialFilters: Partial<FilterState | EnhancedFilterState>) => {
    setFilters(prevFilters => {
      const newFilters = { ...prevFilters, ...partialFilters }
      
      // Ensure progress bounds are valid
      if (partialFilters.progressMin !== undefined || partialFilters.progressMax !== undefined) {
        newFilters.progressMin = Math.max(0, Math.min(newFilters.progressMin, newFilters.progressMax))
        newFilters.progressMax = Math.max(newFilters.progressMin, Math.min(100, newFilters.progressMax))
      }
      
      // Validate enhanced filter values if in enhanced mode
      if (useEnhancedFilters && 'searchQuery' in newFilters) {
        const enhancedFilters = newFilters as EnhancedFilterState
        
        // Trim and validate search query
        if (enhancedFilters.searchQuery !== undefined) {
          enhancedFilters.searchQuery = enhancedFilters.searchQuery.trim()
        }
        
        // Ensure arrays are not null/undefined
        enhancedFilters.objectiveIds = enhancedFilters.objectiveIds || []
        enhancedFilters.initiativeIds = enhancedFilters.initiativeIds || []
        enhancedFilters.assignedTo = enhancedFilters.assignedTo || []
        enhancedFilters.quarterIds = enhancedFilters.quarterIds || []
      }
      
      updateUrl(newFilters)
      saveToLocalStorage(newFilters)
      onFiltersChange?.(newFilters)
      
      return newFilters
    })
  }, [updateUrl, saveToLocalStorage, onFiltersChange, useEnhancedFilters])

  // Reset filters function
  const resetFilters = useCallback(() => {
    const resetDefault = useEnhancedFilters ? defaultEnhancedFilterState : defaultFilters
    setFilters(resetDefault)
    updateUrl(resetDefault)
    saveToLocalStorage(resetDefault)
    onFiltersChange?.(resetDefault)
  }, [updateUrl, saveToLocalStorage, onFiltersChange, useEnhancedFilters])

  // Get count of active filters
  const getActiveFilterCount = useCallback(() => {
    let count = 0
    
    if (filters.startDate || filters.endDate) count++
    if (filters.areas.length > 0) count++
    if (filters.progressMin > 0 || filters.progressMax < 100) count++
    if (filters.statuses.length > 0) count++
    if (filters.priorities.length > 0) count++
    
    // Enhanced filters
    if (useEnhancedFilters && 'objectiveIds' in filters) {
      const enhancedFilters = filters as EnhancedFilterState
      if (enhancedFilters.objectiveIds.length > 0) count++
      if (enhancedFilters.initiativeIds.length > 0) count++
      if (enhancedFilters.assignedTo.length > 0) count++
      if (enhancedFilters.quarterIds.length > 0) count++
      if (enhancedFilters.searchQuery.trim()) count++
    }
    
    return count
  }, [filters, useEnhancedFilters])

  // Check if filters are active (not default)
  const hasActiveFilters = useCallback(() => {
    return getActiveFilterCount() > 0
  }, [getActiveFilterCount])

  // Apply filters to data array
  const applyFilters = useCallback(<T extends FilterableItem>(data: T[]): T[] => {
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
      
      // Enhanced filters
      if (useEnhancedFilters && 'objectiveIds' in filters) {
        const enhancedFilters = filters as EnhancedFilterState
        
        // Objective ID filter
        if (enhancedFilters.objectiveIds.length > 0) {
          const objectiveId = item.objective_id || item.objectiveId
          if (!objectiveId || !enhancedFilters.objectiveIds.includes(objectiveId)) {
            return false
          }
        }
        
        // Initiative ID filter
        if (enhancedFilters.initiativeIds.length > 0) {
          const initiativeId = item.initiative_id || item.initiativeId || item.id
          if (!initiativeId || !enhancedFilters.initiativeIds.includes(initiativeId)) {
            return false
          }
        }
        
        // Assigned to filter
        if (enhancedFilters.assignedTo.length > 0) {
          const assignedTo = item.assigned_to || item.assignedTo || item.created_by
          if (!assignedTo || !enhancedFilters.assignedTo.includes(assignedTo)) {
            return false
          }
        }
        
        // Quarter ID filter (backward compatibility)
        if (enhancedFilters.quarterIds.length > 0) {
          const quarterId = item.quarter_id || item.quarterId
          if (!quarterId || !enhancedFilters.quarterIds.includes(quarterId)) {
            return false
          }
        }
        
        // Search query filter
        if (enhancedFilters.searchQuery.trim()) {
          const searchTerm = enhancedFilters.searchQuery.toLowerCase().trim()
          const searchableFields = [
            item.title,
            item.name,
            item.description,
            item.area?.name,
            item.area_name,
            item.objective?.title,
            item.objective_title,
            item.initiative?.title,
            item.initiative_title,
            item.created_by_name,
            item.assigned_to_name
          ].filter(Boolean)
          
          const hasMatch = searchableFields.some(field => 
            field && field.toString().toLowerCase().includes(searchTerm)
          )
          
          if (!hasMatch) {
            return false
          }
        }
      }
      
      return true
    })
  }, [filters, useEnhancedFilters])

  // Save current filters as preset
  const saveFilterPreset = useCallback((name: string) => {
    if (typeof window === 'undefined') return false
    
    try {
      const storageKey = useEnhancedFilters ? 'dashboard-enhanced-filter-presets' : 'dashboard-filter-presets'
      const presets = JSON.parse(localStorage.getItem(storageKey) || '{}')
      presets[name] = {
        filters,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      localStorage.setItem(storageKey, JSON.stringify(presets))
      return true
    } catch (error) {
      logger.warn('Failed to save filter preset', { error, presetName: name })
      return false
    }
  }, [filters, useEnhancedFilters])

  // Load filter preset
  const loadFilterPreset = useCallback((name: string) => {
    if (typeof window === 'undefined') return false
    
    try {
      const storageKey = useEnhancedFilters ? 'dashboard-enhanced-filter-presets' : 'dashboard-filter-presets'
      const presets = JSON.parse(localStorage.getItem(storageKey) || '{}')
      if (presets[name]) {
        const baseDefault = useEnhancedFilters ? defaultEnhancedFilterState : defaultFilters
        const presetData = presets[name].filters || presets[name] // Support both new and old format
        const presetFilters = { ...baseDefault, ...presetData }
        setFilters(presetFilters)
        updateUrl(presetFilters)
        onFiltersChange?.(presetFilters)
        return true
      }
      return false
    } catch (error) {
      logger.warn('Failed to load filter preset', { error, presetName: name })
      return false
    }
  }, [updateUrl, onFiltersChange, useEnhancedFilters])

  // Get available presets
  const getFilterPresets = useCallback(() => {
    if (typeof window === 'undefined') return {}
    
    try {
      const storageKey = useEnhancedFilters ? 'dashboard-enhanced-filter-presets' : 'dashboard-filter-presets'
      return JSON.parse(localStorage.getItem(storageKey) || '{}')
    } catch (error) {
      logger.warn('Failed to get filter presets', { error })
      return {}
    }
  }, [useEnhancedFilters])

  // Convert filters to API query parameters
  const toQueryParams = useCallback((): StandardQueryParams => {
    const params: StandardQueryParams = {}
    
    if (filters.startDate) params.start_date = filters.startDate
    if (filters.endDate) params.end_date = filters.endDate
    if (filters.areas.length > 0) params.area_id = filters.areas[0] // API typically expects single value
    if (filters.progressMin > 0) params.min_progress = filters.progressMin
    if (filters.progressMax < 100) params.max_progress = filters.progressMax
    if (filters.statuses.length > 0) params.status = filters.statuses[0] // API typically expects single value
    if (filters.priorities.length > 0) params.priority = filters.priorities[0] // API typically expects single value
    
    if (useEnhancedFilters && 'objectiveIds' in filters) {
      const enhancedFilters = filters as EnhancedFilterState
      if (enhancedFilters.objectiveIds.length > 0) params.objective_id = enhancedFilters.objectiveIds[0]
      if (enhancedFilters.initiativeIds.length > 0) params.initiative_id = enhancedFilters.initiativeIds[0]
      if (enhancedFilters.assignedTo.length > 0) params.assigned_to = enhancedFilters.assignedTo[0]
      if (enhancedFilters.quarterIds.length > 0) params.quarter_id = enhancedFilters.quarterIds[0]
      if (enhancedFilters.searchQuery.trim()) params.search = enhancedFilters.searchQuery.trim()
    }
    
    return params
  }, [filters, useEnhancedFilters])

  // Clear specific filter type
  const clearFilterType = useCallback((filterType: keyof (FilterState | EnhancedFilterState)) => {
    const currentValue = filters[filterType]
    const clearValue = Array.isArray(currentValue) ? [] : 
                      typeof currentValue === 'string' ? '' :
                      typeof currentValue === 'number' ? 
                        (filterType === 'progressMin' ? 0 : filterType === 'progressMax' ? 100 : 0) :
                      null
    
    updateFilters({ [filterType]: clearValue } as Partial<FilterState | EnhancedFilterState>)
  }, [filters, updateFilters])

  // Get filter summary for display
  const getFilterSummary = useCallback(() => {
    const summary: string[] = []
    
    if (filters.startDate || filters.endDate) {
      const dateRange = [filters.startDate, filters.endDate].filter(Boolean).join(' - ')
      summary.push(`Dates: ${dateRange}`)
    }
    
    if (filters.areas.length > 0) {
      summary.push(`Areas: ${filters.areas.length}`)
    }
    
    if (filters.progressMin > 0 || filters.progressMax < 100) {
      summary.push(`Progress: ${filters.progressMin}%-${filters.progressMax}%`)
    }
    
    if (filters.statuses.length > 0) {
      summary.push(`Status: ${filters.statuses.join(', ')}`)
    }
    
    if (filters.priorities.length > 0) {
      summary.push(`Priority: ${filters.priorities.join(', ')}`)
    }
    
    if (useEnhancedFilters && 'objectiveIds' in filters) {
      const enhancedFilters = filters as EnhancedFilterState
      if (enhancedFilters.objectiveIds.length > 0) {
        summary.push(`Objectives: ${enhancedFilters.objectiveIds.length}`)
      }
      if (enhancedFilters.initiativeIds.length > 0) {
        summary.push(`Initiatives: ${enhancedFilters.initiativeIds.length}`)
      }
      if (enhancedFilters.assignedTo.length > 0) {
        summary.push(`Assigned: ${enhancedFilters.assignedTo.length}`)
      }
      if (enhancedFilters.quarterIds.length > 0) {
        summary.push(`Quarters: ${enhancedFilters.quarterIds.length}`)
      }
      if (enhancedFilters.searchQuery.trim()) {
        summary.push(`Search: "${enhancedFilters.searchQuery.trim()}"`)
      }
    }
    
    return summary
  }, [filters, useEnhancedFilters])

  return {
    // Core filter state and actions
    filters,
    updateFilters,
    resetFilters,
    
    // Filter utilities
    getActiveFilterCount,
    hasActiveFilters,
    applyFilters,
    toQueryParams,
    clearFilterType,
    getFilterSummary,
    
    // Preset management
    saveFilterPreset,
    loadFilterPreset,
    getFilterPresets,
    
    // Configuration
    useEnhancedFilters,
  }
}

// Enhanced hook that defaults to enhanced mode
export function useEnhancedFilters(props: Omit<UseFiltersProps, 'useEnhancedFilters'> = {}) {
  return useFilters({ ...props, useEnhancedFilters: true })
}

// Legacy hook export for backward compatibility
export function useLegacyFilters(props: Omit<UseFiltersProps, 'useEnhancedFilters'> = {}) {
  return useFilters({ ...props, useEnhancedFilters: false })
}