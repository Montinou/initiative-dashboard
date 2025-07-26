# useOKRData Hook

## Purpose
Provides data fetching and state management for OKR (Objectives and Key Results) data across departments. Handles authentication, loading states, and error management for OKR-related operations.

## Usage

```typescript
import { useOKRDepartments, useDepartmentOKRs } from '@/hooks/useOKRData';

// Fetch all departments' OKR data
function OKROverview() {
  const { data, loading, error, refetch } = useOKRDepartments();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      {data?.departments.map(dept => (
        <div key={dept.id}>{dept.name}: {dept.progress}%</div>
      ))}
    </div>
  );
}

// Fetch specific department OKR data
function DepartmentView({ departmentId }: { departmentId: string }) {
  const { data, loading, error, refetch } = useDepartmentOKRs(departmentId);
  
  return (
    <div>
      {data && (
        <div>
          <h2>{data.name}</h2>
          <p>Progress: {data.progress}%</p>
          <p>Status: {data.status}</p>
        </div>
      )}
    </div>
  );
}
```

## Exported Hooks

### useOKRDepartments()

Returns OKR data for all departments.

**Returns**: `UseOKRDataReturn`
```typescript
interface UseOKRDataReturn {
  data: OKRData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}
```

### useDepartmentOKRs(departmentId: string)

Returns OKR data for a specific department.

**Parameters**:
- `departmentId` (string): The ID of the department to fetch data for

**Returns**: `UseOKRDataReturn` with filtered department data

## Data Structures

### OKRData
```typescript
interface OKRData {
  departments: DepartmentOKR[];
  summary: TenantSummary;
  lastUpdated: string;
}
```

### DepartmentOKR
```typescript
interface DepartmentOKR {
  id: string;
  name: string;
  description: string;
  status: string;
  progress: number;
  metrics: {
    totalInitiatives: number;
    completedInitiatives: number;
    inProgressInitiatives: number;
    atRiskInitiatives: number;
    pausedInitiatives: number;
    totalActivities: number;
    criticalCount: number;
  };
  initiatives: OKRInitiative[];
  criticalInitiatives: CriticalInitiative[];
}
```

### OKRInitiative
```typescript
interface OKRInitiative {
  id: string;
  name: string;
  description: string;
  progress: number;
  status: string;
  priority: string;
  leader: string;
  startDate: string;
  targetDate: string;
  obstacles: string;
  enablers: string;
  activitiesCount: number;
  activities: any[];
}
```

### TenantSummary
```typescript
interface TenantSummary {
  totalDepartments: number;
  totalInitiatives: number;
  totalActivities: number;
  avgTenantProgress: number;
  departmentsByStatus: {
    green: number;
    yellow: number;
    red: number;
  };
  criticalInitiatives: number;
}
```

## Dependencies

### Hooks
- `useAuth` from `@/lib/auth-context` - Provides authentication session

### React
- `useState` - Manages component state
- `useEffect` - Handles side effects and data fetching

## Authentication

The hook automatically handles authentication:
- Requires valid `session.access_token` 
- Includes Bearer token in API requests
- Returns authentication error if token is missing
- Refetches data when authentication state changes

## API Integration

### Endpoint
- **URL**: `/api/okrs/departments`
- **Method**: GET
- **Headers**: `Authorization: Bearer {token}`

### Response Format
```typescript
{
  success: boolean;
  data?: OKRData;
  error?: string;
}
```

## State Management

### Loading States
- Initial load: `loading = true`
- Refetch operations: `loading = true` during fetch
- Complete: `loading = false`

### Error Handling
- Network errors
- HTTP status errors
- Authentication errors
- Parsing errors
- Sets descriptive error messages

### Data Caching
- Data persists until next fetch
- Automatic refetch on authentication changes
- Manual refetch available through `refetch()` function

## Examples

### Basic Usage with Error Handling
```typescript
function OKRDashboard() {
  const { data, loading, error, refetch } = useOKRDepartments();
  
  if (loading) {
    return <LoadingSkeleton />;
  }
  
  if (error) {
    return (
      <div>
        <p>Error: {error}</p>
        <button onClick={refetch}>Retry</button>
      </div>
    );
  }
  
  return (
    <div>
      <h1>OKR Summary</h1>
      <p>Total Departments: {data?.summary.totalDepartments}</p>
      <p>Average Progress: {data?.summary.avgTenantProgress}%</p>
      
      {data?.departments.map(dept => (
        <DepartmentCard key={dept.id} department={dept} />
      ))}
    </div>
  );
}
```

### Department-Specific View
```typescript
function DepartmentDetail({ departmentId }: { departmentId: string }) {
  const { data: department, loading, error } = useDepartmentOKRs(departmentId);
  
  if (!department) return <div>Department not found</div>;
  
  return (
    <div>
      <h1>{department.name}</h1>
      <p>{department.description}</p>
      
      <div className="metrics">
        <p>Total Initiatives: {department.metrics.totalInitiatives}</p>
        <p>Completed: {department.metrics.completedInitiatives}</p>
        <p>In Progress: {department.metrics.inProgressInitiatives}</p>
        <p>At Risk: {department.metrics.atRiskInitiatives}</p>
      </div>
      
      <div className="initiatives">
        {department.initiatives.map(initiative => (
          <InitiativeCard key={initiative.id} initiative={initiative} />
        ))}
      </div>
    </div>
  );
}
```

### Real-time Updates
```typescript
function LiveOKRDashboard() {
  const { data, loading, error, refetch } = useOKRDepartments();
  
  // Refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(refetch, 30000);
    return () => clearInterval(interval);
  }, [refetch]);
  
  return (
    <div>
      <button onClick={refetch} disabled={loading}>
        {loading ? 'Updating...' : 'Refresh Data'}
      </button>
      
      <OKRContent data={data} />
    </div>
  );
}
```

## @sync Dependencies

### Depends On
- `@/lib/auth-context` - Authentication session management
- React hooks (`useState`, `useEffect`)
- Fetch API for HTTP requests

### Used By
- `@/components/okr-dashboard` - Main OKR dashboard display
- `@/components/department-view` - Individual department views
- `@/components/okr-metrics` - Metrics and summary components

### Data Flow
```
useAuth() → useOKRDepartments() → OKR Components
    ↓              ↓                    ↓
Session Token → API Request → UI Rendering
```

## Performance Considerations

- Automatic refetch only on authentication changes
- Manual refetch available for user-initiated updates
- No automatic polling (implement if needed)
- Data persists across re-renders
- Efficient re-rendering through proper dependency arrays

## Error Recovery

- Provides detailed error messages
- Includes retry functionality
- Handles network timeouts gracefully
- Maintains previous data on refetch errors
- Clear error state on successful refetch

---

*File: `/hooks/useOKRData.ts`*
*Dependencies: React, auth context*
*API Endpoint: `/api/okrs/departments`*
*Last updated: Auto-generated from source code*