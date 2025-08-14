# Shadcn Blocks - Enhanced Data Management Components

This directory contains comprehensive data management interfaces built using shadcn blocks, featuring advanced data tables, forms, and file upload capabilities.

## 📋 Components Overview

### Data Tables (`/data-tables/`)

Enhanced table components with advanced filtering, sorting, and bulk operations:

#### `InitiativesTable.tsx`
- **Purpose**: Manage initiatives with progress tracking and deadline monitoring
- **Features**:
  - Sortable columns (title, area, status, progress, due date)
  - Progress visualization with activity completion counts
  - Overdue detection with visual indicators
  - Bulk operations (edit, export, delete)
  - Status-based color coding
- **Props**: 
  - `data`: ExtendedInitiative[]
  - `onEdit`, `onDelete`, `onViewDetails`: Action handlers
  - `selectedIds`, `onSelectionChange`: Bulk selection

#### `ObjectivesTable.tsx`
- **Purpose**: Strategic objectives management with filtering
- **Features**:
  - Advanced filtering (priority, status, quarter, date ranges)
  - Date range picker for target dates
  - Progress tracking with initiative linkage
  - Priority and status badges
  - On-track vs at-risk indicators
- **Props**: Similar to InitiativesTable with additional filtering options

#### `ActivitiesTable.tsx`
- **Purpose**: Task management with assignment tracking
- **Features**:
  - Completion status toggle with visual indicators
  - Assignment filtering and management
  - Priority levels with color coding
  - Overdue detection
  - Initiative context display
- **Props**: Includes `onToggleCompletion`, `onAssign` handlers

#### `TeamsTable.tsx`
- **Purpose**: User management with role-based permissions
- **Features**:
  - Role-based access control visualization
  - Performance metrics display
  - Active/inactive status toggle
  - Area assignment filtering
  - Workload analysis (activities, initiatives)
- **Props**: Includes `currentUserRole` for permission checks

### Forms (`/forms/`)

Comprehensive form components using the FormBuilder block:

#### `InitiativeForm.tsx`
- **Purpose**: Create/edit initiatives with activity management
- **Features**:
  - Multi-section form (initiative details, objectives linking, activities)
  - Date picker integration (start/due dates)
  - Activity manager with dynamic add/remove
  - Objective selection with visual indicators
  - Real-time validation with Zod schemas
- **Props**: 
  - `mode`: 'create' | 'edit'
  - `availableAreas`, `availableUsers`, `availableObjectives`
  - `initialData`, `initialActivities`

#### `ObjectiveForm.tsx`
- **Purpose**: Strategic objective creation with metrics and quarters
- **Features**:
  - Comprehensive objective configuration
  - Quarter selection with visual timeline
  - Success metrics builder (add/remove metrics)
  - Priority and status management
  - Date range validation
- **Props**: Includes `availableQuarters` for quarter planning

#### `ActivityForm.tsx`
- **Purpose**: Task creation with assignment and tracking
- **Features**:
  - Initiative context display
  - Assignee details with workload information
  - Time tracking (estimated vs actual hours)
  - Priority levels and due dates
  - Status indicators and overdue warnings
- **Props**: Includes `parentInitiative`, `showAssigneeDetails`

#### `UserInviteForm.tsx`
- **Purpose**: Team member invitation (single and bulk)
- **Features**:
  - Single vs bulk invitation modes
  - Email validation and parsing
  - Role assignment with permission descriptions
  - Custom message templates
  - Invitation expiry settings
- **Props**: 
  - `mode`: 'single' | 'bulk'
  - `currentUserRole` for role restrictions

#### `OKRImportForm.tsx`
- **Purpose**: Bulk data import from CSV/Excel files
- **Features**:
  - File upload with validation
  - Preview generation with error detection
  - Progress tracking with detailed feedback
  - Template download
  - Import settings (overwrite, notifications)
- **Props**: File handling and progress callbacks

#### `DocumentUpload.tsx`
- **Purpose**: File attachment to initiatives/areas/objectives
- **Features**:
  - Multi-file upload with progress tracking
  - File categorization and tagging
  - Existing file management
  - Preview and download capabilities
  - Context-aware uploads (initiative, area, etc.)
- **Props**: 
  - `contextType`: 'initiative' | 'area' | 'objective' | 'organization'
  - `contextId`, `existingFiles`

## 🚀 Usage Examples

### Basic Table Implementation

```tsx
import { InitiativesTable } from '@/components/data-tables'

function InitiativesPage() {
  const [initiatives, setInitiatives] = useState([])
  const [selectedIds, setSelectedIds] = useState([])

  const handleEdit = (initiative) => {
    // Open edit modal or navigate to edit page
  }

  const handleDelete = async (initiative) => {
    // Delete initiative with confirmation
  }

  return (
    <InitiativesTable
      data={initiatives}
      onEdit={handleEdit}
      onDelete={handleDelete}
      selectedIds={selectedIds}
      onSelectionChange={setSelectedIds}
    />
  )
}
```

### Form Integration

```tsx
import { InitiativeForm } from '@/components/forms'

function CreateInitiativePage() {
  const handleSubmit = async (data, activities) => {
    // Submit to API
    await createInitiative(data, activities)
  }

  return (
    <InitiativeForm
      mode="create"
      availableAreas={areas}
      availableUsers={users}
      availableObjectives={objectives}
      onSubmit={handleSubmit}
    />
  )
}
```

### File Upload Integration

```tsx
import { OKRImportForm } from '@/components/forms'

function ImportPage() {
  const handleImport = async (data, file) => {
    // Process file upload
    const result = await importOKRData(data, file)
    return result
  }

  return (
    <OKRImportForm
      availableAreas={areas}
      onSubmit={handleImport}
    />
  )
}
```

## 🎨 Styling and Theming

All components use CSS variables for theming and follow the shadcn/ui design system:

```css
/* Custom theme variables */
:root {
  --primary: 210 40% 50%;
  --primary-foreground: 210 40% 98%;
  --muted: 210 40% 98%;
  --muted-foreground: 215.4 16.3% 46.9%;
  /* ... other variables */
}
```

Components automatically adapt to dark/light mode and custom color schemes.

## 🔧 Customization

### Extending Table Columns

```tsx
// Add custom columns to any table
const customColumns: ColumnDef<Initiative>[] = [
  ...defaultColumns,
  {
    accessorKey: "custom_field",
    header: "Custom Field",
    cell: ({ row }) => (
      <CustomComponent data={row.original} />
    ),
  },
]
```

### Form Field Customization

```tsx
// Add custom fields to forms
const customFields: FormFieldConfig[] = [
  ...defaultFields,
  {
    name: "custom_field",
    label: "Custom Field",
    type: "text",
    validation: z.string().optional(),
  },
]
```

### Bulk Operations

```tsx
// Implement custom bulk operations
const handleBulkAction = async (action: string, ids: string[]) => {
  switch (action) {
    case 'export':
      await exportItems(ids)
      break
    case 'archive':
      await archiveItems(ids)
      break
    case 'reassign':
      await reassignItems(ids, newAssignee)
      break
  }
}
```

## 📊 Data Transformation

Components expect specific data shapes. Use adapters for API integration:

```tsx
// Transform API data to component format
const transformInitiatives = (apiData) => {
  return apiData.map(item => ({
    ...item,
    area_name: item.area?.name,
    created_by_name: item.creator?.full_name,
    activities_count: item._count?.activities,
    is_overdue: isAfter(new Date(), new Date(item.due_date)),
  }))
}
```

## 🔄 Real-time Updates

Integrate with real-time subscriptions:

```tsx
// Example with Supabase real-time
useEffect(() => {
  const subscription = supabase
    .channel('initiatives')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'initiatives' },
      (payload) => {
        // Update local state
        handleRealtimeUpdate(payload)
      }
    )
    .subscribe()

  return () => subscription.unsubscribe()
}, [])
```

## ⚡ Performance Optimizations

### Virtual Scrolling
```tsx
// For large datasets, implement virtual scrolling
import { useVirtualizer } from '@tanstack/react-virtual'

const tableVirtualizer = useVirtualizer({
  count: data.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
})
```

### Memoization
```tsx
// Memoize expensive calculations
const processedData = useMemo(() => {
  return data.map(item => ({
    ...item,
    computed_field: expensiveCalculation(item)
  }))
}, [data])
```

## 🧪 Testing

### Component Testing
```tsx
// Example test for InitiativesTable
import { render, screen, fireEvent } from '@testing-library/react'
import { InitiativesTable } from '@/components/data-tables'

test('renders initiatives and handles edit action', () => {
  const mockData = [/* mock initiative */]
  const mockEdit = jest.fn()

  render(
    <InitiativesTable
      data={mockData}
      onEdit={mockEdit}
    />
  )

  fireEvent.click(screen.getByText('Edit initiative'))
  expect(mockEdit).toHaveBeenCalledWith(mockData[0])
})
```

## 🚀 Deployment Considerations

### Bundle Size Optimization
- Components are tree-shakeable
- Use dynamic imports for large forms
- Implement code splitting at the page level

### Accessibility
- All components include ARIA labels
- Keyboard navigation support
- Screen reader compatible
- Color contrast compliance

### Browser Support
- Modern browsers (ES2020+)
- Mobile responsive design
- Touch-friendly interactions

## 📚 Additional Resources

- [Shadcn/UI Documentation](https://ui.shadcn.com/)
- [React Table v8 Docs](https://tanstack.com/table/v8)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)

## 🤝 Contributing

When adding new components:
1. Follow existing patterns and naming conventions
2. Include comprehensive TypeScript types
3. Add proper documentation and examples
4. Ensure accessibility compliance
5. Test across different screen sizes
6. Consider performance implications

---

**Generated with [Claude Code](https://claude.ai/code)**