# Custom Hooks Documentation

## Overview

This guide documents all custom React hooks in the Initiative Dashboard application. Our hooks follow consistent patterns for data fetching, state management, and business logic encapsulation.

## Core Hook Patterns

### Base Hook Structure

```typescript
export function useResourceName() {
  const [data, setData] = useState<Type[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch logic
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return {
    data,
    loading,
    error,
    refetch: fetch,
    // Additional methods
  };
}
```

## Data Fetching Hooks

### useInitiatives

**Location:** `/hooks/useInitiatives.tsx`

**Purpose:** Manages initiatives data fetching and mutations

```typescript
const {
  initiatives,      // Initiative[]
  loading,         // boolean
  error,          // Error | null
  refetch,        // () => Promise<void>
  createInitiative, // (data: InitiativeInsert) => Promise<Initiative>
  updateInitiative, // (id: string, data: InitiativeUpdate) => Promise<void>
  deleteInitiative, // (id: string) => Promise<void>
} = useInitiatives();
```

**Example Usage:**

```typescript
function InitiativesList() {
  const { initiatives, loading, createInitiative } = useInitiatives();

  const handleCreate = async () => {
    await createInitiative({
      title: 'New Initiative',
      area_id: 'uuid',
      progress: 0
    });
  };

  if (loading) return <Spinner />;
  
  return (
    <div>
      {initiatives.map(initiative => (
        <InitiativeCard key={initiative.id} {...initiative} />
      ))}
    </div>
  );
}
```

### useObjectives

**Location:** `/hooks/useObjectives.tsx`

**Purpose:** Manages strategic objectives with quarter associations

```typescript
const {
  objectives,              // Objective[]
  loading,                // boolean
  error,                 // Error | null
  createObjective,       // (data: ObjectiveInsert) => Promise<Objective>
  updateObjective,       // (id: string, data: ObjectiveUpdate) => Promise<void>
  deleteObjective,       // (id: string) => Promise<void>
  linkToQuarter,        // (objectiveId: string, quarterId: string) => Promise<void>
  linkToInitiative,     // (objectiveId: string, initiativeId: string) => Promise<void>
} = useObjectives({
  area_id?: string,      // Optional area filter
  quarter_id?: string,   // Optional quarter filter
});
```

### useAreas

**Location:** `/hooks/useAreas.tsx`

**Purpose:** Fetches and manages organizational areas

```typescript
const {
  areas,          // Area[]
  loading,       // boolean
  error,        // Error | null
  createArea,   // (data: AreaInsert) => Promise<Area>
  updateArea,   // (id: string, data: AreaUpdate) => Promise<void>
  deleteArea,   // (id: string) => Promise<void>
  assignManager // (areaId: string, managerId: string) => Promise<void>
} = useAreas();
```

### useActivities

**Location:** `/hooks/useActivities.tsx`

**Purpose:** Manages activities within initiatives

```typescript
const {
  activities,         // Activity[]
  loading,           // boolean
  error,            // Error | null
  createActivity,   // (data: ActivityInsert) => Promise<Activity>
  updateActivity,   // (id: string, data: ActivityUpdate) => Promise<void>
  toggleComplete,   // (id: string) => Promise<void>
  assignToUser,     // (activityId: string, userId: string) => Promise<void>
  bulkAssign,       // (assignments: BulkAssignment[]) => Promise<void>
} = useActivities(initiativeId: string);
```

## Analytics Hooks

### useAnalytics

**Location:** `/hooks/useAnalytics.ts`

**Purpose:** Provides analytics data and metrics

```typescript
const {
  metrics,           // DashboardMetrics
  trends,           // TrendData[]
  distribution,     // DistributionData
  loading,         // boolean
  error,          // Error | null
  dateRange,      // DateRange
  setDateRange,   // (range: DateRange) => void
  exportData,     // (format: 'csv' | 'json') => Promise<void>
} = useAnalytics({
  area_id?: string,
  quarter_id?: string,
});
```

**Metrics Structure:**

```typescript
interface DashboardMetrics {
  totalObjectives: number;
  totalInitiatives: number;
  totalActivities: number;
  averageProgress: number;
  completionRate: number;
  atRiskCount: number;
  onTrackCount: number;
}
```

### useProgressTracking

**Location:** `/hooks/useProgressTracking.tsx`

**Purpose:** Tracks and records progress history

```typescript
const {
  history,              // ProgressHistory[]
  statistics,          // ProgressStatistics
  loading,            // boolean
  error,             // Error | null
  recordProgress,    // (initiativeId: string, value: number, notes?: string) => Promise<void>
  getProgressTrend,  // (initiativeId: string) => TrendData
  batchUpdate,       // (updates: ProgressUpdate[]) => Promise<void>
} = useProgressTracking({
  initiative_id?: string,
  area_id?: string,
});
```

## Manager-Specific Hooks

### useManagerViews

**Location:** `/hooks/useManagerViews.tsx`

**Purpose:** Provides manager dashboard data and operations

```typescript
const {
  dashboardData,        // ManagerDashboard
  teamPerformance,     // TeamPerformance[]
  workload,           // WorkloadAnalysis
  loading,           // boolean
  error,            // Error | null
  assignActivity,   // (activityId: string, userId: string) => Promise<void>
  getAtRiskItems,   // () => AtRiskItem[]
  generateReport,   // (type: ReportType) => Promise<Blob>
} = useManagerViews(areaId: string);
```

### useManagerMetrics

**Location:** `/hooks/useManagerMetrics.tsx`

**Purpose:** Calculates manager-specific metrics

```typescript
const {
  teamUtilization,      // number (percentage)
  averageCompletion,   // number (percentage)
  upcomingDeadlines,   // Deadline[]
  blockedItems,        // BlockedItem[]
  performanceScore,    // number
} = useManagerMetrics(areaId: string);
```

## CEO Dashboard Hooks

### useCEOMetrics

**Location:** `/hooks/ceo/useCEOMetrics.ts`

**Purpose:** Executive-level metrics and KPIs

```typescript
const {
  metrics,            // CEOMetrics
  insights,          // AIInsight[]
  trends,           // TrendData[]
  comparisons,      // AreaComparison[]
  loading,         // boolean
  error,          // Error | null
} = useCEOMetrics();
```

### useStrategicOverview

**Location:** `/hooks/ceo/useStrategicOverview.ts`

**Purpose:** Strategic planning overview

```typescript
const {
  objectives,         // StrategicObjective[]
  alignment,         // AlignmentScore
  gaps,             // StrategicGap[]
  recommendations,   // Recommendation[]
} = useStrategicOverview();
```

## Authentication & Session Hooks

### useSession

**Location:** `/hooks/useSession.ts`

**Purpose:** Manages user session and authentication state

```typescript
const {
  user,              // User | null
  session,          // Session | null
  profile,         // UserProfile | null
  loading,        // boolean
  isAuthenticated, // boolean
  signIn,         // (email: string, password: string) => Promise<void>
  signOut,        // () => Promise<void>
  refreshSession, // () => Promise<void>
} = useSession();
```

### useUserProfile

**Location:** `/hooks/useUserProfile.ts`

**Purpose:** Manages user profile data

```typescript
const {
  profile,           // UserProfile | null
  loading,          // boolean
  error,           // Error | null
  updateProfile,   // (data: ProfileUpdate) => Promise<void>
  uploadAvatar,    // (file: File) => Promise<string>
} = useUserProfile();
```

## Permission Hooks

### usePermissions

**Location:** `/hooks/usePermissions.ts`

**Purpose:** Checks user permissions

```typescript
const {
  can,              // (action: string, resource?: string) => boolean
  cannot,          // (action: string, resource?: string) => boolean
  permissions,     // Permission[]
  role,           // UserRole
} = usePermissions();

// Usage
if (can('edit', 'initiatives')) {
  // Show edit button
}
```

### useTenantContext

**Location:** `/hooks/useTenantContext.tsx`

**Purpose:** Provides tenant-specific context

```typescript
const {
  tenant,           // Tenant
  tenantId,        // string
  organization,    // Organization
  switchTenant,    // (tenantId: string) => Promise<void>
  permissions,     // TenantPermissions
} = useTenantContext();
```

## UI & Interaction Hooks

### useLoadingState

**Location:** `/hooks/useLoadingState.tsx`

**Purpose:** Manages loading states with minimum duration

```typescript
const {
  isLoading,        // boolean
  startLoading,    // () => void
  stopLoading,     // () => void
  withLoading,     // (fn: () => Promise<T>) => Promise<T>
} = useLoadingState({
  minDuration: 500, // Minimum loading duration in ms
});

// Usage
const handleSubmit = withLoading(async () => {
  await saveData();
});
```

### useFilters

**Location:** `/hooks/useFilters.tsx`

**Purpose:** Manages filter state and URL synchronization

```typescript
const {
  filters,          // FilterState
  setFilter,       // (key: string, value: any) => void
  clearFilter,     // (key: string) => void
  clearAll,        // () => void
  urlParams,       // URLSearchParams
} = useFilters({
  defaultFilters: {
    status: 'all',
    area: null,
  },
  syncWithUrl: true,
});
```

### useSearchParams

**Location:** `/hooks/useSearchParams.tsx`

**Purpose:** Type-safe URL search params management

```typescript
const {
  params,           // ParsedParams
  setParam,        // (key: string, value: string) => void
  removeParam,     // (key: string) => void
  clearParams,     // () => void
} = useSearchParams<{
  page: number;
  search: string;
  filter: string;
}>();
```

## File Management Hooks

### useFiles

**Location:** `/hooks/useFiles.tsx`

**Purpose:** Manages file uploads and storage

```typescript
const {
  files,            // UploadedFile[]
  uploading,       // boolean
  error,          // Error | null
  uploadFile,     // (file: File, metadata?: FileMetadata) => Promise<UploadedFile>
  deleteFile,     // (fileId: string) => Promise<void>
  downloadFile,   // (fileId: string) => Promise<Blob>
} = useFiles({
  area_id?: string,
  initiative_id?: string,
});
```

## Internationalization Hooks

### useLocale

**Location:** `/hooks/useLocale.tsx`

**Purpose:** Manages language and translations

```typescript
const {
  locale,           // string ('en' | 'es')
  t,               // (key: string, params?: object) => string
  setLocale,       // (locale: string) => void
  availableLocales, // string[]
} = useLocale();

// Usage
const message = t('dashboard.welcome', { name: user.name });
```

## Performance Hooks

### useCacheWarming

**Location:** `/hooks/useCacheWarming.tsx`

**Purpose:** Pre-fetches and caches data

```typescript
const {
  warmCache,        // () => Promise<void>
  isCached,        // (key: string) => boolean
  clearCache,      // () => void
} = useCacheWarming({
  routes: ['/api/initiatives', '/api/objectives'],
  ttl: 5 * 60 * 1000, // 5 minutes
});
```

### useIntelligentLoading

**Location:** `/hooks/useIntelligentLoading.tsx`

**Purpose:** Smart loading with retry and fallback

```typescript
const {
  data,             // T | null
  loading,         // boolean
  error,          // Error | null
  retry,          // () => void
  retryCount,     // number
} = useIntelligentLoading({
  fetcher: () => fetchData(),
  maxRetries: 3,
  retryDelay: 1000,
  fallbackData: [],
});
```

## WebSocket & Real-time Hooks

### useStratixWebSocket

**Location:** `/hooks/useStratixWebSocket.ts`

**Purpose:** WebSocket connection for real-time updates

```typescript
const {
  connected,        // boolean
  messages,        // Message[]
  sendMessage,     // (message: any) => void
  subscribe,       // (event: string, handler: Function) => void
  unsubscribe,     // (event: string) => void
} = useStratixWebSocket({
  url: 'wss://api.example.com/ws',
  reconnect: true,
});
```

## Best Practices

### 1. Error Handling

```typescript
// Always provide meaningful error messages
const fetchData = async () => {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};
```

### 2. Optimistic Updates

```typescript
const updateInitiative = async (id: string, data: Update) => {
  // Optimistic update
  setInitiatives(prev => 
    prev.map(item => 
      item.id === id ? { ...item, ...data } : item
    )
  );

  try {
    await api.update(id, data);
  } catch (error) {
    // Revert on error
    refetch();
    throw error;
  }
};
```

### 3. Debouncing

```typescript
const useDebounced = (value: string, delay: number = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
};
```

### 4. Memoization

```typescript
const expensiveCalculation = useMemo(() => {
  return calculateMetrics(data);
}, [data]);

const stableCallback = useCallback(() => {
  doSomething(id);
}, [id]);
```

## Testing Hooks

### Test Setup

```typescript
import { renderHook, act } from '@testing-library/react';
import { useInitiatives } from './useInitiatives';

describe('useInitiatives', () => {
  it('should fetch initiatives on mount', async () => {
    const { result } = renderHook(() => useInitiatives());
    
    expect(result.current.loading).toBe(true);
    
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.initiatives).toHaveLength(3);
  });
});
```

## Creating New Hooks

### Template

```typescript
// hooks/useNewFeature.tsx
import { useState, useEffect, useCallback } from 'react';

interface UseNewFeatureOptions {
  // Options
}

interface UseNewFeatureReturn {
  // Return type
}

export function useNewFeature(
  options?: UseNewFeatureOptions
): UseNewFeatureReturn {
  // State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Methods
  const fetchData = useCallback(async () => {
    // Implementation
  }, []);

  // Effects
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Return
  return {
    data,
    loading,
    error,
    refetch: fetchData,
  };
}
```

## Hook Dependencies

### Common Dependencies

- `swr` - Data fetching and caching
- `react-hook-form` - Form state management
- `zod` - Schema validation
- `date-fns` - Date utilities

### Internal Dependencies

- `/lib/utils` - Utility functions
- `/lib/types` - TypeScript types
- `/utils/supabase` - Database client
- `/lib/api-auth-helper` - Authentication