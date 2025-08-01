import { FilterState } from "@/hooks/useFilters"

/**
 * Convert a date to its corresponding quarter (Q1, Q2, Q3, Q4)
 */
export function dateToQuarter(date: string | Date): string {
  const d = new Date(date)
  if (isNaN(d.getTime())) return ''
  
  const month = d.getMonth() + 1 // getMonth() returns 0-11
  const quarter = Math.ceil(month / 3)
  return `Q${quarter}`
}

/**
 * Get the date range for a given quarter in the current year
 */
export function getQuarterDateRange(quarter: string, year?: number): { start: Date; end: Date } | null {
  const currentYear = year || new Date().getFullYear()
  
  switch (quarter) {
    case 'Q1':
      return {
        start: new Date(currentYear, 0, 1), // January 1
        end: new Date(currentYear, 2, 31),  // March 31
      }
    case 'Q2':
      return {
        start: new Date(currentYear, 3, 1), // April 1
        end: new Date(currentYear, 5, 30),  // June 30
      }
    case 'Q3':
      return {
        start: new Date(currentYear, 6, 1),  // July 1
        end: new Date(currentYear, 8, 30),   // September 30
      }
    case 'Q4':
      return {
        start: new Date(currentYear, 9, 1),  // October 1
        end: new Date(currentYear, 11, 31),  // December 31
      }
    default:
      return null
  }
}

/**
 * Check if a date falls within the selected quarters
 */
export function isDateInQuarters(date: string | Date, quarters: string[]): boolean {
  if (quarters.length === 0) return true
  
  const quarter = dateToQuarter(date)
  return quarters.includes(quarter)
}

/**
 * Filter an array of data based on FilterState
 */
export function applyFiltersToData<T extends Record<string, any>>(
  data: T[],
  filters: FilterState
): T[] {
  return data.filter(item => {
    // Quarter filter
    if (filters.quarters.length > 0) {
      const targetDate = item.target_date || item.due_date || item.created_at
      if (targetDate) {
        if (!isDateInQuarters(targetDate, filters.quarters)) {
          return false
        }
      } else {
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
export function getFilterSummary(filters: FilterState): string {
  const parts: string[] = []
  
  if (filters.quarters.length > 0) {
    parts.push(`${filters.quarters.length} trimestre${filters.quarters.length > 1 ? 's' : ''}`)
  }
  
  if (filters.areas.length > 0) {
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
export function aggregateFilteredData<T extends Record<string, any>>(
  data: T[]
): {
  totalCount: number
  completedCount: number
  inProgressCount: number
  averageProgress: number
  highPriorityCount: number
  quarterDistribution: Record<string, number>
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
      quarterDistribution: {},
      statusDistribution: {},
      priorityDistribution: {},
    }
  }
  
  const quarterDistribution: Record<string, number> = {}
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
    
    // Quarter distribution
    const targetDate = item.target_date || item.due_date || item.created_at
    if (targetDate) {
      const quarter = dateToQuarter(targetDate)
      if (quarter) {
        quarterDistribution[quarter] = (quarterDistribution[quarter] || 0) + 1
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
    quarterDistribution,
    statusDistribution,
    priorityDistribution,
  }
}

/**
 * Build Supabase query filters from FilterState
 */
export function buildSupabaseFilters(filters: FilterState) {
  const queryFilters: Array<{
    column: string
    operator: string
    value: any
  }> = []
  
  // Area filter
  if (filters.areas.length > 0) {
    queryFilters.push({
      column: 'area_id',
      operator: 'in',
      value: filters.areas
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
  if (filters.statuses.length > 0) {
    queryFilters.push({
      column: 'status',
      operator: 'in',
      value: filters.statuses
    })
  }
  
  // Priority filter
  if (filters.priorities.length > 0) {
    queryFilters.push({
      column: 'priority',
      operator: 'in',
      value: filters.priorities
    })
  }
  
  return queryFilters
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