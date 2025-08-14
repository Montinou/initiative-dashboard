# Integration Layer for Initiative Dashboard

This integration layer provides a comprehensive bridge between shadcn blocks and the Supabase backend, with a focus on date-based filtering (removing quarter dependencies) and maintaining tenant isolation.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   shadcn blocks │───▶│ Integration Layer │───▶│ Supabase Backend│
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ├── Data Adapters
                              ├── Real-time Subscriptions  
                              ├── Caching (SWR)
                              ├── API Error Handling
                              └── Webhook Handlers
```

## Key Features

### ✅ Date-Based Filtering
- **Removed**: All quarter-based logic and dependencies
- **Added**: Comprehensive date range filtering using `start_date`/`end_date` fields
- **Supports**: Current month, year, last N days, next N days, custom ranges

### ✅ Tenant Isolation
- All cache keys include `tenant_id`
- Real-time subscriptions filter by tenant
- API calls automatically include tenant context
- Circuit breakers are tenant-aware

### ✅ Real-time Updates
- Initiative progress changes
- Activity assignments and completions
- Progress milestones
- Team notifications

### ✅ Smart Caching
- SWR-based caching with different strategies per data type
- Optimistic updates with rollback capability
- Cache invalidation patterns
- Request deduplication

### ✅ Error Resilience
- Exponential backoff retry logic
- Circuit breaker pattern
- Request timeout handling
- Graceful degradation

## Components

### 1. Data Adapters (`/lib/adapters/`)

Transform raw Supabase data for consumption by shadcn blocks:

#### InitiativeAdapter
```typescript
import { InitiativeAdapter } from '@/lib/integrations'

const rawInitiatives = await supabase.from('initiatives').select('*')
const adaptedInitiatives = InitiativeAdapter.adaptMany(rawInitiatives)

// Date-based filtering
const filtered = InitiativeAdapter.filterByDates(adaptedInitiatives, {
  startDateFrom: new Date('2025-01-01'),
  dueDateTo: new Date('2025-12-31')
})

// Transform for different views
const cardView = InitiativeAdapter.transformForView(filtered, 'card')
const timelineView = InitiativeAdapter.transformForView(filtered, 'timeline')
```

#### ObjectiveAdapter
```typescript
import { ObjectiveAdapter } from '@/lib/integrations'

// Create quarterly view without quarters table
const quarterlyData = ObjectiveAdapter.createQuarterlyView(objectives, 2025)

// Filter by date ranges
const activeObjectives = ObjectiveAdapter.filterByDates(objectives, {
  activeDuringPeriod: { start: new Date(), end: new Date('2025-12-31') }
})
```

### 2. Real-time Subscriptions (`/lib/realtime/`)

#### Initiative Updates
```typescript
import { InitiativeSubscriptions } from '@/lib/integrations'

const subscriptionId = InitiativeSubscriptions.subscribeToInitiatives({
  tenantId: 'tenant-123',
  areaId: 'area-456',
  onUpdate: (event) => {
    console.log('Initiative updated:', event.new.title)
    // Trigger UI updates
  },
  onProgressUpdate: (event) => {
    console.log('Progress changed:', event.oldProgress, '->', event.newProgress)
  }
})

// Cleanup
InitiativeSubscriptions.unsubscribe(subscriptionId)
```

#### Progress Tracking
```typescript
import { ProgressSubscriptions } from '@/lib/integrations'

const subscriptionIds = ProgressSubscriptions.subscribeToAreaProgress(
  'tenant-123',
  'area-456',
  {
    onInitiativeProgress: (event) => updateInitiativeCard(event),
    onActivityCompletion: (event) => refreshActivityList(event),
    onMilestone: (event) => showMilestoneNotification(event)
  }
)
```

### 3. Caching Layer (`/lib/cache/`)

#### SWR Configuration
```typescript
import { useSWR } from 'swr'
import { 
  initiativesSWRConfig, 
  createTenantCacheKey,
  createTenantAwareFetcher 
} from '@/lib/integrations'

const { data, error, mutate } = useSWR(
  createTenantCacheKey('initiatives', tenantId, { area_id: areaId }),
  createTenantAwareFetcher(tenantId),
  initiativesSWRConfig
)
```

#### Cache Invalidation
```typescript
import { useCacheInvalidation } from '@/lib/integrations'

const { invalidateInitiative, optimisticUpdate } = useCacheInvalidation(tenantId)

// Optimistic update
await optimisticUpdate(
  cacheKey,
  updatedData,
  () => updateInitiativeAPI(initiativeId, changes)
)

// Invalidate related caches
await invalidateInitiative(initiativeId)
```

### 4. API Integration (`/lib/api/`)

#### Error Handling
```typescript
import { APIErrorHandler } from '@/lib/integrations'

const result = await APIErrorHandler.fetch('/api/initiatives', {
  method: 'POST',
  body: JSON.stringify(initiativeData),
  tenantId,
  retries: { maxRetries: 3 },
  circuitBreaker: true,
  timeout: 30000
})
```

#### Request Deduplication
```typescript
import { RequestDeduplication } from '@/lib/integrations'

const cacheKey = RequestDeduplication.createRequestKey('initiatives', { area_id: areaId }, tenantId)

const data = await RequestDeduplication.deduplicatedFetch(
  cacheKey,
  () => fetchInitiatives(areaId),
  {
    maxAge: 30000,
    transform: {
      adaptInitiatives: true,
      dateBasedFiltering: true
    }
  }
)
```

### 5. Webhook Handlers (`/app/api/webhooks/`)

#### Initiative Updates
```
POST /api/webhooks/initiative-updates
```
- Handles initiative creation, updates, deletion
- Updates area statistics
- Creates progress history entries
- Triggers notifications

#### Progress Changes
```
POST /api/webhooks/progress-changes
```
- Tracks progress across initiatives, objectives, activities
- Detects milestone achievements
- Updates linked entity progress
- Broadcasts real-time updates

#### Team Notifications
```
POST /api/webhooks/team-notifications
```
- Activity assignments
- Team mentions
- Deadline alerts
- Achievement notifications

## Usage Examples

### Complete Integration Setup
```typescript
import { IntegrationUtils } from '@/lib/integrations'

const integration = IntegrationUtils.createIntegratedFetcher('tenant-123', {
  enableRealtime: true,
  enableCaching: true,
  enableDeduplication: true,
  transformations: {
    adaptInitiatives: true,
    dateBasedFiltering: true
  }
})

// Use in React component
function InitiativesDashboard() {
  const { data: initiatives } = useSWR(
    'initiatives?area_id=area-456',
    integration.swrConfig?.fetcher,
    integration.swrConfig
  )

  useEffect(() => {
    if (!integration.realtime) return

    const subscriptionId = integration.realtime.subscribeToInitiatives({
      areaId: 'area-456',
      onUpdate: (event) => {
        integration.cacheInvalidation?.invalidateInitiative(event.initiativeId)
      }
    })

    return () => {
      InitiativeSubscriptions.unsubscribe(subscriptionId)
    }
  }, [])

  return (
    <div>
      {initiatives?.map(initiative => (
        <InitiativeCard key={initiative.id} initiative={initiative} />
      ))}
    </div>
  )
}
```

### Date-Based Filtering
```typescript
import { IntegrationUtils } from '@/lib/integrations'

const dateFilters = IntegrationUtils.createDateFilters()

// Current month initiatives
const currentMonthRange = dateFilters.currentMonth()
const thisMonthInitiatives = InitiativeAdapter.filterByDates(initiatives, {
  startDateFrom: currentMonthRange.start,
  dueDateTo: currentMonthRange.end
})

// Next 30 days
const upcomingRange = dateFilters.nextNDays(30)
const upcomingInitiatives = InitiativeAdapter.filterByDates(initiatives, {
  dueDateFrom: upcomingRange.start,
  dueDateTo: upcomingRange.end
})
```

### Error Handling with Retry
```typescript
import { APIErrorHandler } from '@/lib/integrations'

try {
  const result = await APIErrorHandler.handleRequest(
    () => fetch('/api/initiatives', { method: 'POST', body: data }),
    {
      tenantId: 'tenant-123',
      retries: {
        maxRetries: 3,
        baseDelay: 1000,
        retryCondition: (error) => error.status >= 500
      },
      circuitBreaker: true,
      timeout: 15000
    }
  )
} catch (error) {
  // Error has been logged and user notified
  console.error('Failed to create initiative:', error)
}
```

## Migration from Quarter-Based System

### Before (Quarter-based)
```typescript
// Old quarter-based filtering
const q1Initiatives = initiatives.filter(i => i.quarter === 'Q1')
const quarterObjectives = await supabase
  .from('objectives')
  .select('*, quarters(*)')
  .eq('quarters.quarter_name', 'Q1')
```

### After (Date-based)
```typescript
// New date-based filtering
const q1Range = { start: new Date('2025-01-01'), end: new Date('2025-03-31') }
const q1Initiatives = InitiativeAdapter.filterByDates(initiatives, {
  activeDuringPeriod: q1Range
})

const q1Objectives = ObjectiveAdapter.filterByDates(objectives, {
  activeDuringPeriod: q1Range
})
```

## Performance Considerations

1. **Caching Strategy**
   - Real-time data: 10-30 second refresh
   - Static data: 5+ minute refresh
   - Critical data: 5-10 second refresh

2. **Request Deduplication**
   - Prevents duplicate API calls
   - 5-second deduplication window
   - Tenant-aware caching

3. **Circuit Breakers**
   - 5 failures trigger open circuit
   - 30-second recovery timeout
   - Tenant-isolated state

4. **Real-time Optimization**
   - Debounced event handlers
   - Batched updates for high-frequency events
   - Automatic cleanup on unmount

## Security Features

1. **Tenant Isolation**
   - All cache keys include tenant ID
   - RLS policies enforced at database level
   - User profile validation on server

2. **Webhook Security**
   - Signature verification required
   - Payload validation
   - Error logging and monitoring

3. **Error Information**
   - Sensitive details hidden from client
   - Detailed logging for debugging
   - User-friendly error messages

## Monitoring and Debugging

1. **Request Statistics**
   ```typescript
   const stats = RequestDeduplication.getRequestStats()
   console.log('Pending requests:', stats.pending)
   console.log('Most requested keys:', stats.mostRequestedKeys)
   ```

2. **Cache Invalidation Stats**
   ```typescript
   const invalidationStats = CacheInvalidation.getInvalidationStats()
   console.log('Pending invalidations:', invalidationStats.pendingCount)
   ```

3. **Real-time Connection Status**
   ```typescript
   const isConnected = InitiativeSubscriptions.isConnected()
   console.log('Realtime connected:', isConnected)
   ```

## Cleanup

Always clean up subscriptions and caches:

```typescript
// Component unmount
useEffect(() => {
  return () => {
    IntegrationUtils.cleanup.unsubscribeAll()
    IntegrationUtils.cleanup.cleanupCaches()
  }
}, [])
```

This integration layer provides a robust, scalable foundation for connecting shadcn blocks with the Supabase backend while maintaining excellent performance, error resilience, and real-time capabilities.