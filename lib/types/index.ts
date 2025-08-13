/**
 * Central exports for all TypeScript types
 * This file provides a single import point for all application types
 */

// Filter types
export type {
  FilterState,
  EnhancedFilterState,
  StandardQueryParams,
  FilterPreset,
  UseFiltersConfig,
  FilterValidationResult,
  FilterConversionUtils,
  InitiativeStatus,
  ObjectiveStatus,
  Priority,
  Quarter
} from './filters'

export {
  defaultFilterState,
  defaultEnhancedFilterState,
  VALID_STATUSES,
  VALID_PRIORITIES,
  VALID_QUARTERS,
  isValidStatus,
  isValidPriority,
  isValidQuarter
} from './filters'

// Data types
export type {
  UserProfile,
  Area,
  Objective,
  Quarter as QuarterData,
  Initiative,
  Activity,
  ProgressHistory,
  AuditLogEntry,
  DashboardStatistics,
  ManagerDashboardData,
  TeamMember,
  InitiativeSummary,
  ObjectiveSummary,
  ActivitySummary,
  RecentUpdate,
  DataItem,
  FilterableItem
} from './data'

export {
  isInitiative,
  isObjective,
  isActivity,
  isArea,
  isUserProfile
} from './data'

// Filter API types
export type {
  FilterOptions,
  QuarterOption,
  ActivityStatus,
  FilterComponentProps,
  FilterBarProps,
  SimpleFilterBarProps,
  DateRangeFilterProps,
  FilterUtilities,
  FilterPresetManager,
  UseFiltersReturn,
  UseEnhancedFiltersReturn,
  FilterValidationError,
  FilterChangeEvent,
  FilterResetEvent,
  FilterPresetEvent,
  FilterEvent,
  FilterUsageStats,
  ServerFilterQuery,
  ServerFilterResponse,
  FilterContextValue,
  ConditionalFilter,
  AdvancedFilterState,
  FilterValue,
  FilterKey,
  FilterChangeHandler,
  FilterResetHandler,
  FilterEventHandler,
  GenericFilterProps,
  FilterHookConfig
} from './filter-api'

// Type guard utilities
export {
  isString,
  isNumber,
  isBoolean,
  isArray,
  isObject,
  isUUID,
  isDateString,
  isInitiativeStatus,
  isObjectiveStatus,
  isPriority,
  isQuarter,
  isUserRole,
  isFilterState,
  isEnhancedFilterState,
  isFilterableItem,
  validateProgressRange,
  validateDateRange,
  validateFilterValues,
  assertIsFilterableItem,
  assertIsEnhancedFilterState,
  assertIsUUID,
  safeParseNumber,
  safeParseBoolean,
  safeParseArray
} from '../utils/type-guards'