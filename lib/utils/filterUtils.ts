import { FilterState, EnhancedFilterState, StandardQueryParams } from "../types/filters"
import { FilterableItem } from "../types/data"

// Re-export for backward compatibility
export type { FilterState, EnhancedFilterState, StandardQueryParams }

// Type alias for consistency with documentation
export type GlobalFilterState = EnhancedFilterState

// REMOVED: Quarter functions - using date ranges instead
// dateToQuarter(), getQuarterDateRange(), isDateInQuarters() removed

/**
 * Convert a date to its corresponding month period (YYYY-MM)
 */
export function dateToMonthPeriod(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const year = d.getFullYear()
  const month = d.getMonth() + 1
  return `${year}-${month.toString().padStart(2, '0')}`
}

/**
 * Check if a date falls within the selected date ranges
 */
export function isDateInRanges(date: string | Date, startDate?: Date, endDate?: Date): boolean {
  const d = new Date(date)
  if (isNaN(d.getTime())) return true
  
  if (startDate && d < startDate) return false
  if (endDate && d > endDate) return false
  
  return true
}

/**
 * Filter an array of data based on FilterState (legacy function)
 * @deprecated Use applyFilters() instead for enhanced functionality
 */
export function applyFiltersToData<T extends FilterableItem>(
  data: T[],
  filters: FilterState
): T[] {
  return data.filter(item => {
    
    // Area filter
    if (filters.areas.length > 0) {
      const areaId = item.area_id
      if (!areaId || !filters.areas.includes(areaId)) {
        return false
      }
    }
    
    // Progress filter
    const progress = typeof item.progress === 'number' ? item.progress : 0
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
}

/**
 * Get filter summary text for display
 */
export function getFilterSummary(filters: GlobalFilterState | FilterState): string {
  const parts: string[] = []
  
  // Check for date range filters
  if (filters.startDate && filters.endDate) {
    parts.push('rango de fechas personalizado')
  } else if (filters.startDate) {
    parts.push('desde fecha específica')
  } else if (filters.endDate) {
    parts.push('hasta fecha específica')
  }
  
  if (filters.areas && filters.areas.length > 0) {
    parts.push(`${filters.areas.length} área${filters.areas.length > 1 ? 's' : ''}`)
  }
  
  if (filters.progressMin > 0 || filters.progressMax < 100) {
    parts.push(`progreso ${filters.progressMin}%-${filters.progressMax}%`)
  }
  
  if (filters.statuses.length > 0) {
    parts.push(`${filters.statuses.length} estado${filters.statuses.length > 1 ? 's' : ''}`)
  }
  
  if (filters.priorities.length > 0) {
    parts.push(`${filters.priorities.length} prioridad${filters.priorities.length > 1 ? 'es' : ''}`)
  }
  
  if (parts.length === 0) {
    return 'Sin filtros activos'
  }
  
  if (parts.length === 1) {
    return `Filtrado por ${parts[0]}`
  }
  
  if (parts.length === 2) {
    return `Filtrado por ${parts[0]} y ${parts[1]}`
  }
  
  return `Filtrado por ${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`
}

/**
 * Aggregate filtered data for dashboard metrics
 */
export function aggregateFilteredData<T extends FilterableItem>(
  data: T[]
): {
  totalCount: number
  completedCount: number
  inProgressCount: number
  averageProgress: number
  highPriorityCount: number
  monthDistribution: Record<string, number>
  statusDistribution: Record<string, number>
  priorityDistribution: Record<string, number>
} {
  if (data.length === 0) {
    return {
      totalCount: 0,
      completedCount: 0,
      inProgressCount: 0,
      averageProgress: 0,
      highPriorityCount: 0,
      monthDistribution: {},
      statusDistribution: {},
      priorityDistribution: {},
    }
  }
  
  const monthDistribution: Record<string, number> = {}
  const statusDistribution: Record<string, number> = {}
  const priorityDistribution: Record<string, number> = {}
  
  let totalProgress = 0
  let completedCount = 0
  let inProgressCount = 0
  let highPriorityCount = 0
  
  data.forEach(item => {
    // Progress aggregation
    const progress = typeof item.progress === 'number' ? item.progress : 0
    totalProgress += progress
    
    // Status counts
    const status = item.status
    if (status === 'completed') completedCount++
    if (status === 'in_progress') inProgressCount++
    
    // Priority counts
    const priority = item.priority
    if (priority === 'high') highPriorityCount++
    
    // Month distribution (replacing quarter distribution)
    const targetDate = item.target_date || item.due_date || item.created_at
    if (targetDate) {
      const monthPeriod = dateToMonthPeriod(targetDate)
      if (monthPeriod) {
        quarterDistribution[monthPeriod] = (quarterDistribution[monthPeriod] || 0) + 1
      }
    }
    
    // Status distribution
    if (status) {
      statusDistribution[status] = (statusDistribution[status] || 0) + 1
    }
    
    // Priority distribution
    if (priority) {
      priorityDistribution[priority] = (priorityDistribution[priority] || 0) + 1
    }
  })
  
  return {
    totalCount: data.length,
    completedCount,
    inProgressCount,
    averageProgress: data.length > 0 ? Math.round(totalProgress / data.length) : 0,
    highPriorityCount,
    monthDistribution,
    statusDistribution,
    priorityDistribution,
  }
}

/**
 * Enhanced apply filters function for client-side filtering with search support
 */
export function applyFilters<T extends FilterableItem>(
  data: T[],
  filters: GlobalFilterState | FilterState,
  searchFields: string[] = ['title', 'name', 'description']
): T[] {
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
    
    // Date range filter
    if (filters.startDate || filters.endDate) {
      const targetDate = item.target_date || item.due_date || item.created_at
      if (targetDate) {
        const itemDate = new Date(targetDate)
        if (filters.startDate && itemDate < new Date(filters.startDate)) {
          return false
        }
        if (filters.endDate && itemDate > new Date(filters.endDate)) {
          return false
        }
      }
    }
    
    // Entity filters
    if (filters.areas && filters.areas.length > 0) {
      const areaId = item.area_id
      if (!areaId || !filters.areas.includes(areaId)) {
        return false
      }
    }
    
    if ('objectiveIds' in filters && filters.objectiveIds && filters.objectiveIds.length > 0) {
      const objectiveId = item.objective_id
      if (!objectiveId || !filters.objectiveIds.includes(objectiveId)) {
        return false
      }
    }
    
    if ('initiativeIds' in filters && filters.initiativeIds && filters.initiativeIds.length > 0) {
      const initiativeId = item.initiative_id || item.id
      if (!initiativeId || !filters.initiativeIds.includes(initiativeId)) {
        return false
      }
    }
    
    if ('assignedTo' in filters && filters.assignedTo && filters.assignedTo.length > 0) {
      const assignedToId = item.assigned_to || item.created_by
      if (!assignedToId || !filters.assignedTo.includes(assignedToId)) {
        return false
      }
    }
    
    // Progress filter
    const progress = item.progress || 0
    if (progress < filters.progressMin || progress > filters.progressMax) {
      return false
    }
    
    // Status filter
    if (filters.statuses && filters.statuses.length > 0) {
      const status = item.status
      if (!status || !filters.statuses.includes(status)) {
        return false
      }
    }
    
    // Priority filter
    if (filters.priorities && filters.priorities.length > 0) {
      const priority = item.priority
      if (!priority || !filters.priorities.includes(priority)) {
        return false
      }
    }
    
    // Search filter
    if ('searchQuery' in filters && filters.searchQuery && filters.searchQuery.trim()) {
      const searchTerm = filters.searchQuery.toLowerCase().trim()
      const matchFound = searchFields.some(field => {
        const fieldValue = item[field]
        if (typeof fieldValue === 'string') {
          return fieldValue.toLowerCase().includes(searchTerm)
        }
        return false
      })
      
      if (!matchFound) {
        return false
      }
    }
    
    return true
  })
}

/**
 * Build query string for API calls from filter state
 */
export function buildQueryString(filters: GlobalFilterState | FilterState): string {
  const params = new URLSearchParams()
  
  // Date filters
  if ('startDate' in filters && filters.startDate) {
    params.set('start_date', filters.startDate)
  }
  if ('endDate' in filters && filters.endDate) {
    params.set('end_date', filters.endDate)
  }
  
  // Entity filters (convert arrays to comma-separated strings)
  if (filters.areas && filters.areas.length > 0) {
    if (filters.areas.length === 1) {
      params.set('area_id', filters.areas[0])
    } else {
      params.set('area_id', filters.areas.join(','))
    }
  }
  
  if ('objectiveIds' in filters && filters.objectiveIds && filters.objectiveIds.length > 0) {
    if (filters.objectiveIds.length === 1) {
      params.set('objective_id', filters.objectiveIds[0])
    } else {
      params.set('objective_id', filters.objectiveIds.join(','))
    }
  }
  
  if ('initiativeIds' in filters && filters.initiativeIds && filters.initiativeIds.length > 0) {
    if (filters.initiativeIds.length === 1) {
      params.set('initiative_id', filters.initiativeIds[0])
    } else {
      params.set('initiative_id', filters.initiativeIds.join(','))
    }
  }
  
  if ('assignedTo' in filters && filters.assignedTo && filters.assignedTo.length > 0) {
    if (filters.assignedTo.length === 1) {
      params.set('assigned_to', filters.assignedTo[0])
    } else {
      params.set('assigned_to', filters.assignedTo.join(','))
    }
  }
  
  // Date range handling (instead of quarters)
  // Note: Date ranges are already handled at the top of this function
  
  // Range filters
  if (filters.progressMin > 0) {
    params.set('min_progress', filters.progressMin.toString())
  }
  if (filters.progressMax < 100) {
    params.set('max_progress', filters.progressMax.toString())
  }
  
  // Status filters
  if (filters.statuses && filters.statuses.length > 0) {
    if (filters.statuses.length === 1) {
      params.set('status', filters.statuses[0])
    } else {
      params.set('status', filters.statuses.join(','))
    }
  }
  
  if (filters.priorities && filters.priorities.length > 0) {
    if (filters.priorities.length === 1) {
      params.set('priority', filters.priorities[0])
    } else {
      params.set('priority', filters.priorities.join(','))
    }
  }
  
  // Search
  if ('searchQuery' in filters && filters.searchQuery && filters.searchQuery.trim()) {
    params.set('search', filters.searchQuery.trim())
  }
  
  return params.toString()
}

/**
 * Validate filter inputs to ensure data integrity
 */
export function validateFilters(filters: Partial<GlobalFilterState>): {
  isValid: boolean
  errors: string[]
  sanitized: Partial<GlobalFilterState>
} {
  const errors: string[] = []
  const sanitized: Partial<GlobalFilterState> = { ...filters }
  
  // Validate date range
  if (filters.startDate && filters.endDate) {
    const start = new Date(filters.startDate)
    const end = new Date(filters.endDate)
    
    if (isNaN(start.getTime())) {
      errors.push('Invalid start date format')
      delete sanitized.startDate
    }
    
    if (isNaN(end.getTime())) {
      errors.push('Invalid end date format')
      delete sanitized.endDate
    }
    
    if (start > end) {
      errors.push('Start date must be before end date')
      // Swap dates to fix the issue
      sanitized.startDate = filters.endDate
      sanitized.endDate = filters.startDate
    }
  }
  
  // Validate progress range
  if (filters.progressMin !== undefined) {
    if (filters.progressMin < 0 || filters.progressMin > 100) {
      errors.push('Progress minimum must be between 0 and 100')
      sanitized.progressMin = Math.max(0, Math.min(100, filters.progressMin))
    }
  }
  
  if (filters.progressMax !== undefined) {
    if (filters.progressMax < 0 || filters.progressMax > 100) {
      errors.push('Progress maximum must be between 0 and 100')
      sanitized.progressMax = Math.max(0, Math.min(100, filters.progressMax))
    }
  }
  
  if (filters.progressMin !== undefined && filters.progressMax !== undefined) {
    if (filters.progressMin > filters.progressMax) {
      errors.push('Progress minimum cannot be greater than maximum')
      // Swap values to fix
      sanitized.progressMin = filters.progressMax
      sanitized.progressMax = filters.progressMin
    }
  }
  
  // Validate status values
  const validStatuses = ['planning', 'in_progress', 'completed', 'on_hold', 'overdue']
  if (filters.statuses) {
    sanitized.statuses = filters.statuses.filter(status => {
      if (!validStatuses.includes(status)) {
        errors.push(`Invalid status: ${status}`)
        return false
      }
      return true
    })
  }
  
  // Validate priority values
  const validPriorities = ['high', 'medium', 'low']
  if (filters.priorities) {
    sanitized.priorities = filters.priorities.filter(priority => {
      if (!validPriorities.includes(priority)) {
        errors.push(`Invalid priority: ${priority}`)
        return false
      }
      return true
    })
  }
  
  // Validate search query length
  if (filters.searchQuery !== undefined) {
    if (filters.searchQuery.length > 255) {
      errors.push('Search query too long (max 255 characters)')
      sanitized.searchQuery = filters.searchQuery.substring(0, 255)
    }
  }
  
  // Validate array fields are actually arrays
  const arrayFields: (keyof GlobalFilterState)[] = [
    'areas', 'objectiveIds', 'initiativeIds', 'assignedTo', 'statuses', 'priorities'
  ]
  
  arrayFields.forEach(field => {
    if (filters[field] !== undefined && !Array.isArray(filters[field])) {
      errors.push(`${String(field)} must be an array`)
      delete sanitized[field]
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  }
}

/**
 * Build Supabase query filters from FilterState
 */
export function buildSupabaseFilters(filters: GlobalFilterState | FilterState) {
  const queryFilters: Array<{
    column: string
    operator: string
    value: string | string[] | number | boolean | null
  }> = []
  
  // Date filters
  if ('startDate' in filters && filters.startDate) {
    queryFilters.push({
      column: 'start_date',
      operator: 'gte',
      value: filters.startDate
    })
  }
  
  if ('endDate' in filters && filters.endDate) {
    queryFilters.push({
      column: 'end_date',
      operator: 'lte', 
      value: filters.endDate
    })
  }
  
  // Area filter
  if (filters.areas && filters.areas.length > 0) {
    queryFilters.push({
      column: 'area_id',
      operator: 'in',
      value: filters.areas
    })
  }
  
  // Objective filter
  if ('objectiveIds' in filters && filters.objectiveIds && filters.objectiveIds.length > 0) {
    queryFilters.push({
      column: 'objective_id',
      operator: 'in',
      value: filters.objectiveIds
    })
  }
  
  // Initiative filter
  if ('initiativeIds' in filters && filters.initiativeIds && filters.initiativeIds.length > 0) {
    queryFilters.push({
      column: 'id',
      operator: 'in',
      value: filters.initiativeIds
    })
  }
  
  // Assigned to filter
  if ('assignedTo' in filters && filters.assignedTo && filters.assignedTo.length > 0) {
    queryFilters.push({
      column: 'assigned_to',
      operator: 'in',
      value: filters.assignedTo
    })
  }
  
  // Progress filter
  if (filters.progressMin > 0) {
    queryFilters.push({
      column: 'progress',
      operator: 'gte',
      value: filters.progressMin
    })
  }
  
  if (filters.progressMax < 100) {
    queryFilters.push({
      column: 'progress',
      operator: 'lte',
      value: filters.progressMax
    })
  }
  
  // Status filter
  if (filters.statuses && filters.statuses.length > 0) {
    queryFilters.push({
      column: 'status',
      operator: 'in',
      value: filters.statuses
    })
  }
  
  // Priority filter
  if (filters.priorities && filters.priorities.length > 0) {
    queryFilters.push({
      column: 'priority',
      operator: 'in',
      value: filters.priorities
    })
  }
  
  return queryFilters
}

/**
 * Create debounced search function
 */
export function createDebouncedSearch(
  searchFn: (query: string) => void,
  delay: number = 300
) {
  let timeoutId: NodeJS.Timeout
  
  return (query: string) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => searchFn(query), delay)
  }
}

/**
 * Debounce utility function for general use
 */
export function debounce<Args extends unknown[], R>(
  func: (...args: Args) => R,
  delay: number
): (...args: Args) => void {
  let timeoutId: NodeJS.Timeout
  
  return (...args: Args) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

/**
 * Convert status from database format to display format
 */
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'planning': 'Planificación',
    'in_progress': 'En Progreso', 
    'completed': 'Completado',
    'on_hold': 'En Pausa',
  }
  
  return statusMap[status] || status
}

/**
 * Convert priority from database format to display format
 */
export function formatPriority(priority: string): string {
  const priorityMap: Record<string, string> = {
    'high': 'Alta',
    'medium': 'Media',
    'low': 'Baja',
  }
  
  return priorityMap[priority] || priority
}

/**
 * Get color class for status
 */
export function getStatusColor(status: string): string {
  const colorMap: Record<string, string> = {
    'planning': 'text-blue-400',
    'in_progress': 'text-orange-400',
    'completed': 'text-green-400',
    'on_hold': 'text-gray-400',
  }
  
  return colorMap[status] || 'text-gray-400'
}

/**
 * Get color class for priority
 */
export function getPriorityColor(priority: string): string {
  const colorMap: Record<string, string> = {
    'high': 'text-red-400',
    'medium': 'text-yellow-400',
    'low': 'text-green-400',
  }
  
  return colorMap[priority] || 'text-gray-400'
}