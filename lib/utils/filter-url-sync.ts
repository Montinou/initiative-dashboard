"use client"

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback, useEffect } from 'react'
import { EnhancedFilterState as GlobalFilterState } from '../types/filters'

/**
 * URL parameter mapping for filters
 */
const URL_PARAM_MAP = {
  startDate: 'start_date',
  endDate: 'end_date', 
  areas: 'areas',
  objectiveIds: 'objectives',
  initiativeIds: 'initiatives',
  assignedTo: 'assigned',
  quarterIds: 'quarters',
  progressMin: 'prog_min',
  progressMax: 'prog_max',
  statuses: 'status',
  priorities: 'priority',
  searchQuery: 'q'
} as const

/**
 * Hook for syncing filter state with URL parameters
 */
export function useFilterUrlSync() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  /**
   * Parse filters from current URL
   */
  const parseFiltersFromUrl = useCallback((): Partial<GlobalFilterState> => {
    const filters: Partial<GlobalFilterState> = {}

    // Date filters
    const startDate = searchParams.get(URL_PARAM_MAP.startDate)
    const endDate = searchParams.get(URL_PARAM_MAP.endDate)
    if (startDate) filters.startDate = startDate
    if (endDate) filters.endDate = endDate

    // Array filters (comma-separated values)
    const areas = searchParams.get(URL_PARAM_MAP.areas)
    if (areas) filters.areas = areas.split(',').filter(Boolean)

    const objectives = searchParams.get(URL_PARAM_MAP.objectiveIds)
    if (objectives) filters.objectiveIds = objectives.split(',').filter(Boolean)

    const initiatives = searchParams.get(URL_PARAM_MAP.initiativeIds)
    if (initiatives) filters.initiativeIds = initiatives.split(',').filter(Boolean)

    const assigned = searchParams.get(URL_PARAM_MAP.assignedTo)
    if (assigned) filters.assignedTo = assigned.split(',').filter(Boolean)

    const quarters = searchParams.get(URL_PARAM_MAP.quarterIds)
    if (quarters) filters.quarterIds = quarters.split(',').filter(Boolean)

    const statusParam = searchParams.get(URL_PARAM_MAP.statuses)
    if (statusParam) filters.statuses = statusParam.split(',').filter(Boolean)

    const priorityParam = searchParams.get(URL_PARAM_MAP.priorities)
    if (priorityParam) filters.priorities = priorityParam.split(',').filter(Boolean)

    // Range filters
    const progressMin = searchParams.get(URL_PARAM_MAP.progressMin)
    const progressMax = searchParams.get(URL_PARAM_MAP.progressMax)
    if (progressMin) {
      const min = parseInt(progressMin, 10)
      if (!isNaN(min) && min >= 0 && min <= 100) {
        filters.progressMin = min
      }
    }
    if (progressMax) {
      const max = parseInt(progressMax, 10)
      if (!isNaN(max) && max >= 0 && max <= 100) {
        filters.progressMax = max
      }
    }

    // Search query
    const search = searchParams.get(URL_PARAM_MAP.searchQuery)
    if (search) filters.searchQuery = search

    return filters
  }, [searchParams])

  /**
   * Update URL with current filter state
   */
  const updateUrl = useCallback((filters: Partial<GlobalFilterState>, replace = true) => {
    const params = new URLSearchParams()

    // Date filters
    if (filters.startDate) {
      params.set(URL_PARAM_MAP.startDate, filters.startDate)
    }
    if (filters.endDate) {
      params.set(URL_PARAM_MAP.endDate, filters.endDate)
    }

    // Array filters (convert to comma-separated strings)
    if (filters.areas && filters.areas.length > 0) {
      params.set(URL_PARAM_MAP.areas, filters.areas.join(','))
    }
    if (filters.objectiveIds && filters.objectiveIds.length > 0) {
      params.set(URL_PARAM_MAP.objectiveIds, filters.objectiveIds.join(','))
    }
    if (filters.initiativeIds && filters.initiativeIds.length > 0) {
      params.set(URL_PARAM_MAP.initiativeIds, filters.initiativeIds.join(','))
    }
    if (filters.assignedTo && filters.assignedTo.length > 0) {
      params.set(URL_PARAM_MAP.assignedTo, filters.assignedTo.join(','))
    }
    if (filters.quarterIds && filters.quarterIds.length > 0) {
      params.set(URL_PARAM_MAP.quarterIds, filters.quarterIds.join(','))
    }
    if (filters.statuses && filters.statuses.length > 0) {
      params.set(URL_PARAM_MAP.statuses, filters.statuses.join(','))
    }
    if (filters.priorities && filters.priorities.length > 0) {
      params.set(URL_PARAM_MAP.priorities, filters.priorities.join(','))
    }

    // Range filters (only set if not default values)
    if (filters.progressMin !== undefined && filters.progressMin > 0) {
      params.set(URL_PARAM_MAP.progressMin, filters.progressMin.toString())
    }
    if (filters.progressMax !== undefined && filters.progressMax < 100) {
      params.set(URL_PARAM_MAP.progressMax, filters.progressMax.toString())
    }

    // Search query
    if (filters.searchQuery && filters.searchQuery.trim()) {
      params.set(URL_PARAM_MAP.searchQuery, filters.searchQuery.trim())
    }

    // Build new URL
    const queryString = params.toString()
    const newUrl = queryString ? `${pathname}?${queryString}` : pathname

    // Navigate to new URL
    if (replace) {
      router.replace(newUrl, { scroll: false })
    } else {
      router.push(newUrl, { scroll: false })
    }
  }, [router, pathname])

  /**
   * Clear all URL parameters
   */
  const clearUrl = useCallback(() => {
    router.replace(pathname, { scroll: false })
  }, [router, pathname])

  /**
   * Get a shareable URL with current filters
   */
  const getShareableUrl = useCallback((filters: Partial<GlobalFilterState>): string => {
    const params = new URLSearchParams()

    // Build params same as updateUrl but return string instead of navigating
    if (filters.startDate) params.set(URL_PARAM_MAP.startDate, filters.startDate)
    if (filters.endDate) params.set(URL_PARAM_MAP.endDate, filters.endDate)
    if (filters.areas?.length) params.set(URL_PARAM_MAP.areas, filters.areas.join(','))
    if (filters.objectiveIds?.length) params.set(URL_PARAM_MAP.objectiveIds, filters.objectiveIds.join(','))
    if (filters.initiativeIds?.length) params.set(URL_PARAM_MAP.initiativeIds, filters.initiativeIds.join(','))
    if (filters.assignedTo?.length) params.set(URL_PARAM_MAP.assignedTo, filters.assignedTo.join(','))
    if (filters.quarterIds?.length) params.set(URL_PARAM_MAP.quarterIds, filters.quarterIds.join(','))
    if (filters.statuses?.length) params.set(URL_PARAM_MAP.statuses, filters.statuses.join(','))
    if (filters.priorities?.length) params.set(URL_PARAM_MAP.priorities, filters.priorities.join(','))
    if (filters.progressMin !== undefined && filters.progressMin > 0) {
      params.set(URL_PARAM_MAP.progressMin, filters.progressMin.toString())
    }
    if (filters.progressMax !== undefined && filters.progressMax < 100) {
      params.set(URL_PARAM_MAP.progressMax, filters.progressMax.toString())
    }
    if (filters.searchQuery?.trim()) params.set(URL_PARAM_MAP.searchQuery, filters.searchQuery.trim())

    const queryString = params.toString()
    return queryString ? `${window.location.origin}${pathname}?${queryString}` : `${window.location.origin}${pathname}`
  }, [pathname])

  /**
   * Check if current URL has any filter parameters
   */
  const hasUrlFilters = useCallback((): boolean => {
    const params = Array.from(searchParams.keys())
    const filterParams = Object.values(URL_PARAM_MAP)
    return params.some(param => filterParams.includes(param as any))
  }, [searchParams])

  return {
    parseFiltersFromUrl,
    updateUrl,
    clearUrl,
    getShareableUrl,
    hasUrlFilters,
    currentUrl: `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`
  }
}

/**
 * Extract filter state from URL search params (server-side compatible)
 */
export function extractFiltersFromSearchParams(searchParams: URLSearchParams): Partial<GlobalFilterState> {
  const filters: Partial<GlobalFilterState> = {}

  // Date filters
  const startDate = searchParams.get(URL_PARAM_MAP.startDate)
  const endDate = searchParams.get(URL_PARAM_MAP.endDate)
  if (startDate) filters.startDate = startDate
  if (endDate) filters.endDate = endDate

  // Array filters
  const areas = searchParams.get(URL_PARAM_MAP.areas)
  if (areas) filters.areas = areas.split(',').filter(Boolean)

  const objectives = searchParams.get(URL_PARAM_MAP.objectiveIds)
  if (objectives) filters.objectiveIds = objectives.split(',').filter(Boolean)

  const initiatives = searchParams.get(URL_PARAM_MAP.initiativeIds)
  if (initiatives) filters.initiativeIds = initiatives.split(',').filter(Boolean)

  const assigned = searchParams.get(URL_PARAM_MAP.assignedTo)
  if (assigned) filters.assignedTo = assigned.split(',').filter(Boolean)

  const quarters = searchParams.get(URL_PARAM_MAP.quarterIds)
  if (quarters) filters.quarterIds = quarters.split(',').filter(Boolean)

  const statusParam = searchParams.get(URL_PARAM_MAP.statuses)
  if (statusParam) filters.statuses = statusParam.split(',').filter(Boolean)

  const priorityParam = searchParams.get(URL_PARAM_MAP.priorities)
  if (priorityParam) filters.priorities = priorityParam.split(',').filter(Boolean)

  // Range filters
  const progressMin = searchParams.get(URL_PARAM_MAP.progressMin)
  const progressMax = searchParams.get(URL_PARAM_MAP.progressMax)
  
  if (progressMin) {
    const min = parseInt(progressMin, 10)
    if (!isNaN(min) && min >= 0 && min <= 100) {
      filters.progressMin = min
    }
  }
  
  if (progressMax) {
    const max = parseInt(progressMax, 10)
    if (!isNaN(max) && max >= 0 && max <= 100) {
      filters.progressMax = max
    }
  }

  // Search query
  const search = searchParams.get(URL_PARAM_MAP.searchQuery)
  if (search) filters.searchQuery = search

  return filters
}

/**
 * Build URL search params from filter state
 */
export function buildUrlSearchParams(filters: Partial<GlobalFilterState>): URLSearchParams {
  const params = new URLSearchParams()

  if (filters.startDate) params.set(URL_PARAM_MAP.startDate, filters.startDate)
  if (filters.endDate) params.set(URL_PARAM_MAP.endDate, filters.endDate)
  if (filters.areas?.length) params.set(URL_PARAM_MAP.areas, filters.areas.join(','))
  if (filters.objectiveIds?.length) params.set(URL_PARAM_MAP.objectiveIds, filters.objectiveIds.join(','))
  if (filters.initiativeIds?.length) params.set(URL_PARAM_MAP.initiativeIds, filters.initiativeIds.join(','))
  if (filters.assignedTo?.length) params.set(URL_PARAM_MAP.assignedTo, filters.assignedTo.join(','))
  if (filters.quarterIds?.length) params.set(URL_PARAM_MAP.quarterIds, filters.quarterIds.join(','))
  if (filters.statuses?.length) params.set(URL_PARAM_MAP.statuses, filters.statuses.join(','))
  if (filters.priorities?.length) params.set(URL_PARAM_MAP.priorities, filters.priorities.join(','))
  
  if (filters.progressMin !== undefined && filters.progressMin > 0) {
    params.set(URL_PARAM_MAP.progressMin, filters.progressMin.toString())
  }
  if (filters.progressMax !== undefined && filters.progressMax < 100) {
    params.set(URL_PARAM_MAP.progressMax, filters.progressMax.toString())
  }
  
  if (filters.searchQuery?.trim()) {
    params.set(URL_PARAM_MAP.searchQuery, filters.searchQuery.trim())
  }

  return params
}