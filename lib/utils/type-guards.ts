/**
 * Type guard utilities for runtime type checking
 * Ensures type safety beyond TypeScript compile time
 */

import { 
  FilterState, 
  EnhancedFilterState, 
  VALID_STATUSES, 
  VALID_PRIORITIES, 
  InitiativeStatus,
  ObjectiveStatus,
  Priority,
} from '@/lib/types/filters'

import { 
  Area, 
  UserProfile, 
  Objective, 
  Initiative, 
  Activity,
  FilterableItem 
} from '@/lib/types/data'

// Primitive type guards
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean'
}

export function isArray<T>(value: unknown, itemGuard?: (item: unknown) => item is T): value is T[] {
  if (!Array.isArray(value)) return false
  if (!itemGuard) return true
  return value.every(item => itemGuard(item))
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function isUUID(value: unknown): value is string {
  if (!isString(value)) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

export function isDateString(value: unknown): value is string {
  if (!isString(value)) return false
  const date = new Date(value)
  return !isNaN(date.getTime())
}

// Domain-specific type guards
export function isInitiativeStatus(value: unknown): value is InitiativeStatus {
  return isString(value) && VALID_STATUSES.initiatives.includes(value as InitiativeStatus)
}

export function isObjectiveStatus(value: unknown): value is ObjectiveStatus {
  return isString(value) && VALID_STATUSES.objectives.includes(value as ObjectiveStatus)
}

export function isPriority(value: unknown): value is Priority {
  return isString(value) && VALID_PRIORITIES.includes(value as Priority)
}


export function isUserRole(value: unknown): value is 'CEO' | 'Admin' | 'Manager' {
  return isString(value) && ['CEO', 'Admin', 'Manager'].includes(value)
}

// Entity type guards
export function isArea(value: unknown): value is Area {
  if (!isObject(value)) return false
  
  return (
    isUUID(value.id) &&
    isUUID(value.tenant_id) &&
    isString(value.name) &&
    (value.description === null || isString(value.description)) &&
    (value.manager_id === null || isUUID(value.manager_id)) &&
    isBoolean(value.is_active) &&
    isDateString(value.created_at) &&
    isDateString(value.updated_at)
  )
}

export function isUserProfile(value: unknown): value is UserProfile {
  if (!isObject(value)) return false
  
  return (
    isUUID(value.id) &&
    isUUID(value.user_id) &&
    isUUID(value.tenant_id) &&
    isString(value.email) &&
    (value.full_name === null || isString(value.full_name)) &&
    isUserRole(value.role) &&
    (value.area_id === null || isUUID(value.area_id)) &&
    isBoolean(value.is_active) &&
    isDateString(value.created_at) &&
    isDateString(value.updated_at)
  )
}

export function isObjective(value: unknown): value is Objective {
  if (!isObject(value)) return false
  
  return (
    isUUID(value.id) &&
    isUUID(value.tenant_id) &&
    (value.area_id === null || isUUID(value.area_id)) &&
    isString(value.title) &&
    (value.description === null || isString(value.description)) &&
    isUUID(value.created_by) &&
    isPriority(value.priority) &&
    isObjectiveStatus(value.status) &&
    isNumber(value.progress) &&
    value.progress >= 0 &&
    value.progress <= 100 &&
    isDateString(value.created_at) &&
    isDateString(value.updated_at)
  )
}

export function isInitiative(value: unknown): value is Initiative {
  if (!isObject(value)) return false
  
  return (
    isUUID(value.id) &&
    isUUID(value.tenant_id) &&
    isUUID(value.area_id) &&
    isString(value.title) &&
    (value.description === null || isString(value.description)) &&
    isNumber(value.progress) &&
    value.progress >= 0 &&
    value.progress <= 100 &&
    isUUID(value.created_by) &&
    isInitiativeStatus(value.status) &&
    isDateString(value.created_at) &&
    isDateString(value.updated_at)
  )
}

export function isActivity(value: unknown): value is Activity {
  if (!isObject(value)) return false
  
  return (
    isUUID(value.id) &&
    isUUID(value.initiative_id) &&
    isString(value.title) &&
    (value.description === null || isString(value.description)) &&
    isBoolean(value.is_completed) &&
    (value.assigned_to === null || isUUID(value.assigned_to)) &&
    isDateString(value.created_at) &&
    isDateString(value.updated_at)
  )
}

// Filter state type guards
export function isFilterState(value: unknown): value is FilterState {
  if (!isObject(value)) return false
  
  return (
    (value.startDate === null || isString(value.startDate)) &&
    (value.endDate === null || isString(value.endDate)) &&
    isArray(value.areas, isString) &&
    isNumber(value.progressMin) &&
    value.progressMin >= 0 &&
    value.progressMin <= 100 &&
    isNumber(value.progressMax) &&
    value.progressMax >= 0 &&
    value.progressMax <= 100 &&
    value.progressMin <= value.progressMax &&
    isArray(value.statuses, isString) &&
    isArray(value.priorities, isString)
  )
}

export function isEnhancedFilterState(value: unknown): value is EnhancedFilterState {
  if (!isFilterState(value)) return false
  if (!isObject(value)) return false
  
  return (
    isArray(value.objectiveIds, isString) &&
    isArray(value.initiativeIds, isString) &&
    isArray(value.assignedTo, isString) &&
    // REMOVED: quarterIds validation - using date ranges instead
    isString(value.searchQuery)
  )
}

export function isFilterableItem(value: unknown): value is FilterableItem {
  if (!isObject(value)) return false
  
  return (
    isUUID(value.id) &&
    (value.title === undefined || isString(value.title)) &&
    (value.name === undefined || isString(value.name)) &&
    (value.description === undefined || value.description === null || isString(value.description)) &&
    (value.status === undefined || isString(value.status)) &&
    (value.priority === undefined || isString(value.priority)) &&
    (value.progress === undefined || isNumber(value.progress)) &&
    (value.area_id === undefined || isString(value.area_id)) &&
    (value.created_at === undefined || isString(value.created_at)) &&
    (value.updated_at === undefined || isString(value.updated_at))
  )
}

// Validation helpers
export function validateProgressRange(min: number, max: number): boolean {
  return (
    isNumber(min) && 
    isNumber(max) && 
    min >= 0 && 
    min <= 100 && 
    max >= 0 && 
    max <= 100 && 
    min <= max
  )
}

export function validateDateRange(startDate: string | null, endDate: string | null): boolean {
  if (startDate === null && endDate === null) return true
  if (startDate !== null && !isDateString(startDate)) return false
  if (endDate !== null && !isDateString(endDate)) return false
  
  if (startDate && endDate) {
    return new Date(startDate) <= new Date(endDate)
  }
  
  return true
}

export function validateFilterValues(filters: Partial<EnhancedFilterState>): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Validate progress range
  if (filters.progressMin !== undefined || filters.progressMax !== undefined) {
    const min = filters.progressMin ?? 0
    const max = filters.progressMax ?? 100
    
    if (!validateProgressRange(min, max)) {
      errors.push('Invalid progress range')
    }
  }
  
  // Validate date range
  if (!validateDateRange(filters.startDate ?? null, filters.endDate ?? null)) {
    errors.push('Invalid date range')
  }
  
  // Validate status values
  if (filters.statuses) {
    const invalidStatuses = filters.statuses.filter(status => 
      !isInitiativeStatus(status) && !isObjectiveStatus(status)
    )
    if (invalidStatuses.length > 0) {
      errors.push(`Invalid status values: ${invalidStatuses.join(', ')}`)
    }
  }
  
  // Validate priority values
  if (filters.priorities) {
    const invalidPriorities = filters.priorities.filter(priority => !isPriority(priority))
    if (invalidPriorities.length > 0) {
      errors.push(`Invalid priority values: ${invalidPriorities.join(', ')}`)
    }
  }
  
  // Validate UUIDs
  const uuidFields: (keyof EnhancedFilterState)[] = ['areas', 'objectiveIds', 'initiativeIds', 'assignedTo']
  
  for (const field of uuidFields) {
    const values = filters[field]
    if (values && isArray(values, isString)) {
      const invalidUUIDs = values.filter(value => !isUUID(value))
      if (invalidUUIDs.length > 0) {
        errors.push(`Invalid UUID values in ${field}: ${invalidUUIDs.join(', ')}`)
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Runtime assertion functions
export function assertIsFilterableItem(value: unknown, context = 'value'): asserts value is FilterableItem {
  if (!isFilterableItem(value)) {
    throw new Error(`Expected ${context} to be a FilterableItem`)
  }
}

export function assertIsEnhancedFilterState(value: unknown, context = 'value'): asserts value is EnhancedFilterState {
  if (!isEnhancedFilterState(value)) {
    throw new Error(`Expected ${context} to be an EnhancedFilterState`)
  }
}

export function assertIsUUID(value: unknown, context = 'value'): asserts value is string {
  if (!isUUID(value)) {
    throw new Error(`Expected ${context} to be a valid UUID`)
  }
}

// Safe parsing functions
export function safeParseNumber(value: unknown, defaultValue: number = 0): number {
  if (isNumber(value)) return value
  if (isString(value)) {
    const parsed = parseFloat(value)
    return isNaN(parsed) ? defaultValue : parsed
  }
  return defaultValue
}

export function safeParseBoolean(value: unknown, defaultValue: boolean = false): boolean {
  if (isBoolean(value)) return value
  if (isString(value)) {
    return value.toLowerCase() === 'true'
  }
  return defaultValue
}

export function safeParseArray(value: unknown, defaultValue: string[] = []): string[] {
  if (isArray(value, isString)) return value
  if (isString(value)) {
    return value.split(',').map(s => s.trim()).filter(Boolean)
  }
  return defaultValue
}