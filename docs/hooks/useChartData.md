# useChartData Hook Collection

## Overview
A comprehensive collection of React hooks for managing dashboard chart data in the multi-tenant application. Provides type-safe data fetching, loading states, and error handling for various chart components and analytics views.

**File:** `hooks/useChartData.ts`

## Core Hooks

### useProgressDistribution
Fetches progress distribution data for progress range charts.

```tsx
import { useProgressDistribution } from '@/hooks/useChartData'

function ProgressChart() {
  const { data, loading, error, refetch } = useProgressDistribution('tenant-id')
  
  if (loading) return <ChartSkeleton />
  if (error) return <ErrorMessage error={error} />
  
  return <ProgressDistributionChart data={data} />
}
```

**Returns**: `ProgressDistributionData[]`
```tsx
interface ProgressDistributionData {
  range: string        // e.g., "0-25%", "26-50%"
  count: number        // Number of initiatives in range
  percentage: number   // Percentage of total
}
```

### useStatusDistribution
Fetches status distribution data for status overview charts.

```tsx
const { data, loading, error } = useStatusDistribution('tenant-id')
```

**Returns**: `StatusDistributionData[]`
```tsx
interface StatusDistributionData {
  status: string      // e.g., "Completed", "In Progress"
  count: number       // Number of initiatives with status
  percentage: number  // Percentage of total
  color: string       // Hex color for chart display
}
```

### useAreaComparison
Fetches area comparison data for business area performance charts.

```tsx
const { data, loading, error } = useAreaComparison('tenant-id')
```

**Returns**: `AreaProgressData[]`
```tsx
interface AreaProgressData {
  area: string                    // Business area name
  avgProgress: number             // Average progress percentage
  initiativesCount: number        // Number of initiatives
  status: 'excellent' | 'good' | 'warning' | 'critical'
}
```

### useAreaObjectives
Fetches objectives for a specific business area.

```tsx
const { data, loading, error } = useAreaObjectives('sales', 'tenant-id')
```

**Returns**: `ObjectiveData[]`
```tsx
interface ObjectiveData {
  objective: string           // Objective description
  progress: number           // Progress percentage
  obstacles: string          // Current obstacles
  enablers: string          // Success enablers
  status: '🟢' | '🟡' | '🔴'  // Visual status indicator
  area: string              // Business area
}
```

### useAllObjectives
Fetches all objectives grouped by area.

```tsx
const { data, loading, error } = useAllObjectives('tenant-id')
```

**Returns**: `{ [area: string]: ObjectiveData[] }`

## Utility Hooks

### useDataRefresh
Provides mechanism for triggering data refresh across components.

```tsx
import { useDataRefresh } from '@/hooks/useChartData'

function DashboardControls() {
  const { refreshKey, refreshData } = useDataRefresh()
  
  return (
    <button onClick={refreshData}>
      Refresh All Data
    </button>
  )
}
```

**Returns**:
- `refreshKey`: Number that increments on refresh
- `refreshData`: Function to trigger refresh

### useChartLoadingStates
Manages loading states across multiple chart data sources.

```tsx
import { useChartLoadingStates } from '@/hooks/useChartData'

function Dashboard() {
  const { isLoading, hasError, allLoaded, errors } = useChartLoadingStates()
  
  if (isLoading) return <DashboardSkeleton />
  if (hasError) return <ErrorDashboard errors={errors} />
  
  return <DashboardCharts />
}
```

**Returns**:
- `isLoading`: True if any chart data is loading
- `hasError`: True if any chart has errors
- `allLoaded`: True if all chart data is loaded
- `errors`: Object with specific error messages

## Base Hook: useApiData

### Internal Implementation
```tsx
function useApiData<T>(endpoint: string, tenantId: string = 'fema-electricidad') {
  const { data, loading, error, refetch } = useApiData<T>(endpoint, tenantId)
  // Returns typed data with loading states
}
```

### Features
- **Generic Type Support**: Type-safe data handling
- **Tenant Isolation**: Automatic tenant ID parameter handling
- **Error Handling**: Comprehensive error catching and logging
- **URL Construction**: Automatic URL building with query parameters
- **Refetch Support**: Manual data refresh capability

## API Integration

### Endpoint Patterns
All hooks integrate with dashboard API endpoints:
- `/api/dashboard/progress-distribution`
- `/api/dashboard/status-distribution`
- `/api/dashboard/area-comparison`
- `/api/dashboard/objectives`

### Query Parameters
- `tenant_id`: Automatically added for multi-tenant support
- `area`: Added for area-specific objectives

### Response Format
Expected API response structure:
```json
{
  "data": [...], // Actual chart data
  "status": "success",
  "timestamp": "2025-01-01T00:00:00Z"
}
```

## Error Handling

### Error Types
- **Network Errors**: Connection issues, timeouts
- **HTTP Errors**: 400, 401, 403, 404, 500 status codes
- **Data Errors**: Invalid response format, missing data

### Error Recovery
- Automatic error logging to console
- User-friendly error messages
- Maintains error state for UI handling
- Refetch capability for recovery

## Performance Optimizations

### Efficient Data Fetching
- Single API call per hook
- Automatic caching via React state
- Dependency-based refetching
- Minimal re-renders

### Loading States
- Granular loading states per hook
- Combined loading states for multiple hooks
- Prevents unnecessary loading indicators

## Usage Patterns

### Single Chart Component
```tsx
function ProgressChart() {
  const { data, loading, error } = useProgressDistribution()
  
  return (
    <ChartContainer>
      {loading && <Skeleton />}
      {error && <ErrorState retry={refetch} />}
      {data && <Chart data={data} />}
    </ChartContainer>
  )
}
```

### Multi-Chart Dashboard
```tsx
function AnalyticsDashboard() {
  const { isLoading, hasError, allLoaded } = useChartLoadingStates()
  const progress = useProgressDistribution()
  const status = useStatusDistribution()
  const areas = useAreaComparison()
  
  if (isLoading) return <DashboardSkeleton />
  
  return (
    <div className="grid grid-cols-3 gap-4">
      <ProgressChart data={progress.data} />
      <StatusChart data={status.data} />
      <AreaChart data={areas.data} />
    </div>
  )
}
```

### Real-time Dashboard
```tsx
function LiveDashboard() {
  const { refreshData } = useDataRefresh()
  
  useEffect(() => {
    const interval = setInterval(refreshData, 30000) // 30 seconds
    return () => clearInterval(interval)
  }, [refreshData])
  
  return <Dashboard />
}
```

## TypeScript Support
Full TypeScript integration with:
- Strongly typed return values
- Generic type parameters
- Interface definitions for all data structures
- Type-safe error handling

## Testing Considerations
- Mock API responses for testing
- Test loading states
- Test error scenarios
- Test refetch functionality
- Test tenant ID parameter handling

## Dependencies
- `react`: useState, useEffect hooks
- Browser fetch API
- Window object for URL construction