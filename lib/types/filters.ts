/**
 * Centralized filter types for the Initiative Dashboard
 * Project Reference: FILTER-IMPL-2025
 */

// Base filter interface - backward compatible with existing FilterState
export interface FilterState {
  startDate: string | null
  endDate: string | null
  areas: string[]
  progressMin: number
  progressMax: number
  statuses: string[]
  priorities: string[]
}

// Enhanced filter interface with new capabilities
export interface EnhancedFilterState extends FilterState {
  // Entity filters
  objectiveIds: string[]
  initiativeIds: string[]
  assignedTo: string[]
  quarterIds: string[] // For backward compatibility
  
  // Search
  searchQuery: string
}

// Default values for filters
export const defaultFilterState: FilterState = {
  startDate: null,
  endDate: null,
  areas: [],
  progressMin: 0,
  progressMax: 100,
  statuses: [],
  priorities: [],
}

export const defaultEnhancedFilterState: EnhancedFilterState = {
  ...defaultFilterState,
  objectiveIds: [],
  initiativeIds: [],
  assignedTo: [],
  quarterIds: [],
  searchQuery: '',
}

// API Query Parameters Standard (matches API_REFERENCE.md)
export interface StandardQueryParams {
  // Date filters
  start_date?: string
  end_date?: string
  
  // Entity filters
  area_id?: string
  objective_id?: string
  initiative_id?: string
  assigned_to?: string
  quarter_id?: string
  
  // Status filters
  status?: string
  priority?: string
  is_completed?: boolean
  
  // Range filters
  min_progress?: number
  max_progress?: number
  
  // Pagination
  page?: number
  limit?: number
  
  // Sorting
  sort_by?: string
  sort_order?: 'asc' | 'desc'
  
  // Search
  search?: string
}

// Filter preset interface
export interface FilterPreset {
  name: string
  filters: EnhancedFilterState
  createdAt: string
  updatedAt: string
}

// Valid status values based on database schema
export const VALID_STATUSES = {
  initiatives: ['planning', 'in_progress', 'completed', 'on_hold'] as const,
  objectives: ['planning', 'in_progress', 'completed', 'overdue'] as const,
} as const

// Valid priority values
export const VALID_PRIORITIES = ['high', 'medium', 'low'] as const

// Valid quarter names
export const VALID_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'] as const

// Type guards
export function isValidStatus(status: string, type: 'initiatives' | 'objectives'): status is InitiativeStatus | ObjectiveStatus {
  return VALID_STATUSES[type].includes(status as InitiativeStatus & ObjectiveStatus)
}

export function isValidPriority(priority: string): priority is Priority {
  return VALID_PRIORITIES.includes(priority as Priority)
}

export function isValidQuarter(quarter: string): quarter is Quarter {
  return VALID_QUARTERS.includes(quarter as Quarter)
}

// Utility types
export type InitiativeStatus = typeof VALID_STATUSES.initiatives[number]
export type ObjectiveStatus = typeof VALID_STATUSES.objectives[number]
export type Priority = typeof VALID_PRIORITIES[number]
export type Quarter = typeof VALID_QUARTERS[number]

// Hook configuration interface
export interface UseFiltersConfig {
  onFiltersChange?: (filters: EnhancedFilterState) => void
  persistToUrl?: boolean
  persistToLocalStorage?: boolean
  useEnhancedFilters?: boolean // Toggle for enhanced features
}

// Filter validation interface
export interface FilterValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Filter conversion utilities
export interface FilterConversionUtils {
  toQueryParams: (filters: EnhancedFilterState) => StandardQueryParams
  fromQueryParams: (params: URLSearchParams) => Partial<EnhancedFilterState>
  toStorageFormat: (filters: EnhancedFilterState) => string
  fromStorageFormat: (json: string) => Partial<EnhancedFilterState>
}