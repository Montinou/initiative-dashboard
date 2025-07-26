# OKR Dashboard Component

## Purpose
The OKR Dashboard component provides a comprehensive view of Objectives and Key Results across departments. It supports both CEO and Admin user roles with different levels of access and functionality.

## Usage

```typescript
import { OKRDashboard } from '@/components/okr-dashboard';

function App() {
  return (
    <OKRDashboard userRole="CEO" />
  );
}
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `userRole` | `'CEO' \| 'Admin'` | Yes | Determines the level of access and features available |

## Dependencies

### Hooks
- `useOKRDepartments` from `@/hooks/useOKRData` - Fetches OKR data for departments

### UI Components
- `Card`, `CardContent`, `CardDescription`, `CardHeader`, `CardTitle` from `@/components/ui/card`
- `Button` from `@/components/ui/button`
- `Badge` from `@/components/ui/badge`
- `Progress` from `@/components/ui/progress`
- `Select`, `SelectContent`, `SelectItem`, `SelectTrigger`, `SelectValue` from `@/components/ui/select`

### Icons
- Multiple Lucide React icons: `Target`, `TrendingUp`, `AlertTriangle`, `CheckCircle2`, `Clock`, `Pause`, `Users`, `BarChart3`, `ArrowUp`, `ArrowDown`, `Eye`, `Filter`

## State Management

The component manages the following internal state:
- `selectedDepartment`: Controls which department's OKRs are displayed
- `viewMode`: Toggles between 'overview' and 'detailed' views

## Features

### Loading State
- Displays animated skeleton components while data is loading
- Responsive grid layout with placeholder cards

### Department Filtering
- Dropdown to select specific departments or view all
- Filters OKR data based on selection

### View Modes
- **Overview**: High-level summary of OKR progress
- **Detailed**: Comprehensive view with detailed metrics

### Role-Based Access
- Different features and data visibility based on user role
- CEO role: Full access to all departments and metrics
- Admin role: Limited access based on permissions

## Styling

Uses Tailwind CSS with glassmorphism design:
- `bg-white/10` for glass-like backgrounds
- Responsive grid layouts
- Rounded corners and backdrop blur effects
- Consistent spacing with the application theme

## Related Components

### @sync Dependencies
- **Depends on**: `useOKRData` hook for data fetching
- **Uses**: Multiple UI components from the design system
- **Integrates with**: Authentication system for role-based access

### Component Hierarchy
```
OKRDashboard
├── Card (multiple instances)
│   ├── CardHeader
│   ├── CardContent
│   └── CardDescription
├── Button (filter controls)
├── Badge (status indicators)
├── Progress (completion indicators)
└── Select (department filter)
```

## Examples

### Basic Usage
```typescript
// For CEO users
<OKRDashboard userRole="CEO" />

// For Admin users
<OKRDashboard userRole="Admin" />
```

### Integration with Layout
```typescript
function DashboardPage() {
  const { user } = useAuth();
  
  return (
    <div className="p-6">
      <h1>OKR Management</h1>
      <OKRDashboard userRole={user.role} />
    </div>
  );
}
```

## Data Flow

1. Component mounts and calls `useOKRDepartments()` hook
2. Hook fetches data from backend API
3. Component receives data, loading, and error states
4. User interactions (department selection, view mode) trigger state updates
5. Component re-renders with filtered/updated data

## Error Handling

- Displays error state when data fetching fails
- Provides retry functionality through the `refetch` method
- Graceful degradation when permissions are insufficient

## Performance Considerations

- Uses loading skeletons to improve perceived performance
- Implements responsive design for mobile devices
- Efficient re-rendering through proper state management

## Notes

- Component requires authentication context to determine user role
- Responsive design adapts to different screen sizes
- Integrates with the application's glassmorphism theme
- Supports real-time updates when OKR data changes

---

*File: `/components/okr-dashboard.tsx`*
*Dependencies: React, Lucide icons, UI components, OKR data hook*
*Last updated: Auto-generated from source code*