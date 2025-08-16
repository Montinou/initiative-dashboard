/**
 * API interfaces for filter-related operations
 * Provides type-safe interfaces for all filter API interactions
 */

import { 
  EnhancedFilterState, 
  FilterState, 
  StandardQueryParams,
  Priority,
  InitiativeStatus,
  ObjectiveStatus
} from './filters'

import { 
  FilterableItem, 
  Area, 
  UserProfile, 
  Objective, 
  Initiative, 
  Activity 
} from './data'

// Filter options interfaces
export interface FilterOptions {
  areas: Area[]
  users: UserProfile[]
  objectives: Objective[]
  initiatives: Initiative[]
  priorities: Priority[]
  statuses: {
    initiatives: InitiativeStatus[]
    objectives: ObjectiveStatus[]
    activities: ActivityStatus[]
  }
}


export type ActivityStatus = 'completed' | 'in_progress'

// Filter component props interfaces
export interface FilterComponentProps {
  filters: EnhancedFilterState
  onFiltersChange: (filters: Partial<EnhancedFilterState>) => void
  onReset: () => void
  activeFilterCount: number
  className?: string
}

export interface FilterBarProps extends FilterComponentProps {
  entityType?: 'initiatives' | 'objectives' | 'activities'
  showProgressFilter?: boolean
  showStatusFilter?: boolean
  showPriorityFilter?: boolean
  showAreaFilter?: boolean
  showAssignedFilter?: boolean
  showObjectiveFilter?: boolean
  showInitiativeFilter?: boolean
  showSearchFilter?: boolean
  showCreatedByFilter?: boolean
}

export interface SimpleFilterBarProps extends FilterComponentProps {
  entityType?: 'initiatives' | 'objectives' | 'activities'
  showProgressFilter?: boolean
  showStatusFilter?: boolean
  showPriorityFilter?: boolean
  showSearchFilter?: boolean
}

export interface DateRangeFilterProps {
  startDate: string | null
  endDate: string | null
  onDateChange: (dates: { startDate: string | null; endDate: string | null }) => void
  className?: string
}

// Filter utility interfaces
export interface FilterUtilities {
  applyFilters: <T extends FilterableItem>(data: T[]) => T[]
  getActiveFilterCount: () => number
  hasActiveFilters: () => boolean
  toQueryParams: () => StandardQueryParams
  getFilterSummary: () => string[]
  clearFilterType: (filterType: keyof EnhancedFilterState) => void
  resetFilters: () => void
}

export interface FilterPresetManager {
  saveFilterPreset: (name: string) => boolean
  loadFilterPreset: (name: string) => boolean
  getFilterPresets: () => Record<string, FilterPreset>
  deleteFilterPreset: (name: string) => boolean
}

export interface FilterPreset {
  name: string
  filters: EnhancedFilterState
  createdAt: string
  updatedAt: string
  description?: string
}

// Hook interfaces
export interface UseFiltersReturn extends FilterUtilities, FilterPresetManager {
  filters: EnhancedFilterState | FilterState
  updateFilters: (partialFilters: Partial<EnhancedFilterState | FilterState>) => void
  useEnhancedFilters: boolean
}

export interface UseEnhancedFiltersReturn extends FilterUtilities, FilterPresetManager {
  filters: EnhancedFilterState
  updateFilters: (partialFilters: Partial<EnhancedFilterState>) => void
  useEnhancedFilters: true
}

// Filter validation interfaces
export interface FilterValidationError {
  field: keyof EnhancedFilterState
  value: unknown
  message: string
  code: string
}

export interface FilterValidationResult {
  isValid: boolean
  errors: FilterValidationError[]
  warnings: FilterValidationError[]
  sanitized: Partial<EnhancedFilterState>
}

// Filter event interfaces
export interface FilterChangeEvent {
  type: 'filter_change'
  filters: Partial<EnhancedFilterState>
  source: 'user_input' | 'url_update' | 'preset_load' | 'reset'
  timestamp: Date
}

export interface FilterResetEvent {
  type: 'filter_reset'
  previousFilters: EnhancedFilterState
  timestamp: Date
}

export interface FilterPresetEvent {
  type: 'preset_save' | 'preset_load' | 'preset_delete'
  presetName: string
  filters?: EnhancedFilterState
  timestamp: Date
}

export type FilterEvent = FilterChangeEvent | FilterResetEvent | FilterPresetEvent

// Filter analytics interfaces
export interface FilterUsageStats {
  mostUsedFilters: Array<{
    filterType: keyof EnhancedFilterState
    usageCount: number
    lastUsed: Date
  }>
  presetUsage: Array<{
    presetName: string
    loadCount: number
    lastLoaded: Date
  }>
  sessionStats: {
    filterChanges: number
    resetCount: number
    averageActiveFilters: number
    sessionDuration: number
  }
}

// Server-side filtering interfaces
export interface ServerFilterQuery {
  table: string
  filters: StandardQueryParams
  joins?: string[]
  orderBy?: {
    column: string
    order: 'asc' | 'desc'
  }
  limit?: number
  offset?: number
}

export interface ServerFilterResponse<T> {
  data: T[]
  total: number
  filtered: number
  page?: number
  limit?: number
  hasMore: boolean
  filters: StandardQueryParams
}

// Filter context interfaces
export interface FilterContextValue {
  filters: EnhancedFilterState
  updateFilters: (filters: Partial<EnhancedFilterState>) => void
  resetFilters: () => void
  activeFilterCount: number
  isLoading: boolean
  error: string | null
}

// Advanced filter interfaces
export interface ConditionalFilter {
  field: keyof FilterableItem
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin' | 'contains' | 'startsWith' | 'endsWith'
  value: string | number | boolean | (string | number)[]
  condition?: 'AND' | 'OR'
}

export interface AdvancedFilterState extends EnhancedFilterState {
  conditionalFilters: ConditionalFilter[]
  sortBy?: {
    field: keyof FilterableItem
    order: 'asc' | 'desc'
  }
  groupBy?: keyof FilterableItem
}

// Export utility types
export type FilterValue = string | number | boolean | string[] | null
export type FilterKey = keyof EnhancedFilterState
export type FilterChangeHandler = (filters: Partial<EnhancedFilterState>) => void
export type FilterResetHandler = () => void
export type FilterEventHandler = (event: FilterEvent) => void

// Generic filter interfaces
export interface GenericFilterProps<T extends FilterableItem> {
  data: T[]
  filters: EnhancedFilterState
  onFiltersChange: FilterChangeHandler
  onDataFiltered: (filteredData: T[]) => void
  entityType: 'initiatives' | 'objectives' | 'activities' | 'areas' | 'users'
}

export interface FilterHookConfig {
  persistToUrl?: boolean
  persistToLocalStorage?: boolean
  useEnhancedFilters?: boolean
  onFiltersChange?: FilterChangeHandler
  debounceMs?: number
  validateFilters?: boolean
}