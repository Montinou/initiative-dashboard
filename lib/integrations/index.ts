/**
 * Integration Layer Index
 * Exports all integration utilities for shadcn blocks and Supabase backend
 */

// Data Adapters
export { InitiativeAdapter } from '../adapters/initiative-adapter'
export { ObjectiveAdapter } from '../adapters/objective-adapter'
export { ActivityAdapter } from '../adapters/activity-adapter'
export { UserProfileAdapter } from '../adapters/user-profile-adapter'
export { AreasAdapter } from '../adapters/areas-adapter'

// Real-time Subscriptions
export { InitiativeSubscriptions } from '../realtime/initiative-subscriptions'
export { ProgressSubscriptions } from '../realtime/progress-subscriptions'
export { ActivitySubscriptions } from '../realtime/activity-subscriptions'
export { NotificationSubscriptions } from '../realtime/notification-subscriptions'

// Caching Layer
export { 
  baseSWRConfig,
  realtimeSWRConfig,
  staticSWRConfig,
  criticalSWRConfig,
  backgroundSWRConfig,
  initiativesSWRConfig,
  objectivesSWRConfig,
  activitiesSWRConfig,
  progressSWRConfig,
  userProfilesSWRConfig,
  areasSWRConfig,
  analyticsSWRConfig,
  dashboardMetricsSWRConfig,
  createTenantCacheKey,
  createDateRangeCacheKey,
  createTenantAwareFetcher,
  createOptimisticUpdate,
  cacheInvalidationPatterns
} from '../cache/swr-configurations'

export { CacheInvalidation, useCacheInvalidation } from '../cache/cache-invalidation'

// API Utilities
export { APIErrorHandler } from '../api/error-handling'
export { RequestDeduplication } from '../api/request-deduplication'

// Type definitions
export type {
  RawInitiativeData,
  AdaptedInitiativeData,
  DateFilterOptions
} from '../adapters/initiative-adapter'

export type {
  RawObjectiveData,
  AdaptedObjectiveData,
  ObjectiveDateFilterOptions
} from '../adapters/objective-adapter'

export type {
  RawActivityData,
  AdaptedActivityData,
  ActivityFilterOptions
} from '../adapters/activity-adapter'

export type {
  RawUserProfileData,
  AdaptedUserProfileData,
  UserFilterOptions
} from '../adapters/user-profile-adapter'

export type {
  RawAreaData,
  AdaptedAreaData,
  AreaFilterOptions
} from '../adapters/areas-adapter'

export type {
  InitiativeRealtimeEvent,
  InitiativeSubscriptionOptions,
  ActivityRealtimeEvent
} from '../realtime/initiative-subscriptions'

export type {
  ProgressUpdateEvent,
  ProgressSubscriptionOptions,
  ProgressMilestoneEvent,
  ProgressMetrics
} from '../realtime/progress-subscriptions'

export type {
  ActivityRealtimeEvent as ActivityRealTimeEventType,
  ActivityAssignmentEvent,
  ActivityCompletionEvent,
  ActivitySubscriptionOptions,
  ActivityMetrics
} from '../realtime/activity-subscriptions'

export type {
  NotificationEvent,
  NotificationSubscriptionOptions
} from '../realtime/notification-subscriptions'

export type {
  TenantAwareSWRConfig
} from '../cache/swr-configurations'

export type {
  CacheInvalidationOptions
} from '../cache/cache-invalidation'

export type {
  APIError,
  RetryOptions,
  CircuitBreakerOptions,
  RequestConfig
} from '../api/error-handling'

export type {
  RequestMetadata,
  CachedRequest,
  TransformationConfig
} from '../api/request-deduplication'

/**
 * Utility functions for common integration patterns
 */
export const IntegrationUtils = {
  /**
   * Create a complete data fetcher with all integrations
   */
  createIntegratedFetcher: (tenantId: string, config: {
    enableRealtime?: boolean
    enableCaching?: boolean
    enableDeduplication?: boolean
    enableErrorHandling?: boolean
    transformations?: TransformationConfig
  } = {}) => {
    const {
      enableRealtime = true,
      enableCaching = true,
      enableDeduplication = true,
      enableErrorHandling = true,
      transformations
    } = config

    return {
      // Configure SWR with tenant-aware fetcher
      swrConfig: enableCaching ? {
        ...realtimeSWRConfig,
        fetcher: createTenantAwareFetcher(tenantId)
      } : undefined,

      // Create cache invalidation helper
      cacheInvalidation: enableCaching ? useCacheInvalidation(tenantId) : undefined,

      // Create request deduplication helper
      deduplicatedFetch: enableDeduplication 
        ? (key: string, requestFn: () => Promise<any>, config?: any) =>
            RequestDeduplication.deduplicatedFetch(key, requestFn, {
              tenantId,
              transform: transformations,
              ...config
            })
        : undefined,

      // Create error-handled fetch
      errorHandledFetch: enableErrorHandling
        ? <T>(requestFn: () => Promise<T>, config?: RequestConfig) =>
            APIErrorHandler.handleRequest(requestFn, { tenantId, ...config })
        : undefined,

      // Real-time subscription helpers
      realtime: enableRealtime ? {
        subscribeToInitiatives: (options: Omit<InitiativeSubscriptionOptions, 'tenantId'>) =>
          InitiativeSubscriptions.subscribeToInitiatives({ tenantId, ...options }),
        
        subscribeToProgress: (options: Omit<ProgressSubscriptionOptions, 'tenantId'>) =>
          ProgressSubscriptions.subscribeToInitiativeProgress({ tenantId, ...options }),
        
        subscribeToActivities: (options: Omit<ActivitySubscriptionOptions, 'tenantId'>) =>
          ActivitySubscriptions.subscribeToActivities({ tenantId, ...options }),
        
        subscribeToNotifications: (userId: string, options?: Omit<NotificationSubscriptionOptions, 'userId' | 'tenantId'>) =>
          NotificationSubscriptions.subscribeToAllUserNotifications({ userId, tenantId, ...options })
      } : undefined
    }
  },

  /**
   * Create data adapters for common entities
   */
  createAdapters: () => ({
    initiatives: InitiativeAdapter,
    objectives: ObjectiveAdapter,
    activities: ActivityAdapter,
    users: UserProfileAdapter,
    areas: AreasAdapter
  }),

  /**
   * Create date-based filtering utilities (no quarters)
   */
  createDateFilters: () => ({
    /**
     * Filter by current month
     */
    currentMonth: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { start, end }
    },

    /**
     * Filter by current quarter (for backwards compatibility)
     */
    currentQuarter: () => {
      const now = new Date()
      const quarter = Math.floor(now.getMonth() / 3)
      const start = new Date(now.getFullYear(), quarter * 3, 1)
      const end = new Date(now.getFullYear(), quarter * 3 + 3, 0)
      return { start, end }
    },

    /**
     * Filter by current year
     */
    currentYear: () => {
      const now = new Date()
      const start = new Date(now.getFullYear(), 0, 1)
      const end = new Date(now.getFullYear(), 11, 31)
      return { start, end }
    },

    /**
     * Filter by date range
     */
    dateRange: (startDate: Date, endDate: Date) => ({ start: startDate, end: endDate }),

    /**
     * Filter by last N days
     */
    lastNDays: (days: number) => {
      const end = new Date()
      const start = new Date(end.getTime() - (days * 24 * 60 * 60 * 1000))
      return { start, end }
    },

    /**
     * Filter by next N days
     */
    nextNDays: (days: number) => {
      const start = new Date()
      const end = new Date(start.getTime() + (days * 24 * 60 * 60 * 1000))
      return { start, end }
    }
  }),

  /**
   * Cleanup utilities
   */
  cleanup: {
    unsubscribeAll: () => {
      InitiativeSubscriptions.unsubscribeAll()
      ProgressSubscriptions.unsubscribeAll()
      ActivitySubscriptions.unsubscribeAll()
      NotificationSubscriptions.unsubscribeAll()
    },

    cleanupCaches: () => {
      CacheInvalidation.cleanupOptimisticUpdates()
      RequestDeduplication.cleanupRequestHistory()
    }
  }
}

export default IntegrationUtils