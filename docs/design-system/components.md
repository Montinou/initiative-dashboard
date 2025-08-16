# Component Catalog

## Core UI Components

### Button

**Location:** `components/ui/button.tsx`

**Description:** Versatile button component with multiple variants, sizes, and states.

**Props:**
```typescript
interface ButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'xs' | 'sm' | 'default' | 'lg' | 'xl' | 'icon' | 'touch'
  asChild?: boolean
  loading?: boolean
  loadingText?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  animated?: boolean
  disabled?: boolean
}
```

**Usage:**
```tsx
<Button variant="default" size="lg" loading={isLoading}>
  Submit Form
</Button>

<Button variant="outline" leftIcon={<PlusIcon />}>
  Add Item
</Button>
```

**Accessibility:**
- Minimum touch target of 44x44px
- ARIA attributes for loading states
- Keyboard navigation support
- Focus visible indicators

---

### Card

**Location:** `components/ui/card.tsx`

**Description:** Flexible container component with glassmorphism support.

**Props:**
```typescript
interface CardProps {
  variant?: 'default' | 'elevated' | 'outline' | 'ghost'
  padding?: 'none' | 'sm' | 'default' | 'lg'
  size?: 'default' | 'sm' | 'lg' | 'xl'
  interactive?: boolean
  animated?: boolean
  as?: React.ElementType
}
```

**Usage:**
```tsx
<Card variant="elevated" padding="lg" interactive>
  <CardHeader>
    <CardTitle>Dashboard Overview</CardTitle>
    <CardDescription>Your performance metrics</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    <Button>View Details</Button>
  </CardFooter>
</Card>
```

---

### Dialog

**Location:** `components/ui/dialog.tsx`

**Description:** Accessible modal dialog with multiple variants.

**Variants:**
- Standard Dialog
- Drawer Dialog (mobile-optimized)
- Complex Dialog (multi-step)

**Usage:**
```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Initiative</DialogTitle>
      <DialogDescription>
        Make changes to your initiative details.
      </DialogDescription>
    </DialogHeader>
    {/* Form content */}
    <DialogFooter>
      <Button type="submit">Save changes</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

---

## Form Components

### Input

**Location:** `components/ui/input.tsx`

**Description:** Text input with validation states and accessibility features.

**Props:**
```typescript
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  helperText?: string
  leftAddon?: React.ReactNode
  rightAddon?: React.ReactNode
}
```

---

### Select

**Location:** `components/ui/select.tsx`

**Description:** Accessible dropdown select using Radix UI.

**Usage:**
```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

---

### Date Picker

**Location:** `components/ui/calendar.tsx` + `components/ui/date-range-picker.tsx`

**Description:** Date selection with range support.

**Features:**
- Single date selection
- Date range selection
- Keyboard navigation
- Localization support

---

## Data Display Components

### Table

**Location:** `components/ui/table.tsx`

**Description:** Responsive data table with sorting and filtering.

**Usage:**
```tsx
<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Progress</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>Initiative 1</TableCell>
      <TableCell>Active</TableCell>
      <TableCell>75%</TableCell>
    </TableRow>
  </TableBody>
</Table>
```

---

### Progress Ring

**Location:** `components/charts/ProgressRing.tsx`

**Description:** Circular progress indicator with animation.

**Props:**
```typescript
interface ProgressRingProps {
  progress: number
  size?: 'sm' | 'md' | 'lg'
  strokeWidth?: number
  showLabel?: boolean
  animate?: boolean
  color?: string
}
```

---

### Badge

**Location:** `components/ui/badge.tsx`

**Description:** Status indicators and labels.

**Variants:**
- default
- secondary
- destructive
- outline
- success
- warning

---

## Navigation Components

### Sidebar

**Location:** `components/ui/sidebar.tsx`

**Description:** Responsive sidebar navigation with collapsible sections.

**Features:**
- Mobile responsive
- Collapsible groups
- Role-based visibility
- Active state indicators

---

### Breadcrumb

**Location:** `components/ui/breadcrumb.tsx`

**Description:** Hierarchical navigation indicator.

**Usage:**
```tsx
<Breadcrumb>
  <BreadcrumbList>
    <BreadcrumbItem>
      <BreadcrumbLink href="/">Home</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbLink href="/initiatives">Initiatives</BreadcrumbLink>
    </BreadcrumbItem>
    <BreadcrumbSeparator />
    <BreadcrumbItem>
      <BreadcrumbPage>Current Page</BreadcrumbPage>
    </BreadcrumbItem>
  </BreadcrumbList>
</Breadcrumb>
```

---

### Tabs

**Location:** `components/ui/tabs.tsx`

**Description:** Tabbed interface for content organization.

**Usage:**
```tsx
<Tabs defaultValue="overview">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="analytics">Analytics</TabsTrigger>
    <TabsTrigger value="settings">Settings</TabsTrigger>
  </TabsList>
  <TabsContent value="overview">
    {/* Overview content */}
  </TabsContent>
  <TabsContent value="analytics">
    {/* Analytics content */}
  </TabsContent>
</Tabs>
```

---

## Feedback Components

### Toast

**Location:** `components/ui/toast.tsx` + `components/ui/toaster.tsx`

**Description:** Non-blocking notifications.

**Usage:**
```tsx
const { toast } = useToast()

toast({
  title: "Success",
  description: "Initiative created successfully",
  variant: "success",
})
```

---

### Alert

**Location:** `components/ui/alert.tsx`

**Description:** Inline alert messages.

**Variants:**
- default
- destructive
- success
- warning
- info

---

### Skeleton

**Location:** `components/ui/skeleton.tsx`

**Description:** Loading placeholder component.

**Usage:**
```tsx
<div className="space-y-2">
  <Skeleton className="h-4 w-[250px]" />
  <Skeleton className="h-4 w-[200px]" />
</div>
```

---

## Business Components

### Initiative Card

**Location:** `components/dashboard/EnhancedInitiativeCard.tsx`

**Description:** Display initiative with progress, activities, and actions.

**Features:**
- Progress visualization
- Activity count
- Quick actions
- Responsive layout
- Theme-aware styling

---

### KPI Overview Card

**Location:** `components/dashboard/KPIOverviewCard.tsx`

**Description:** Key performance indicator display.

**Props:**
```typescript
interface KPIOverviewCardProps {
  title: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  period?: string
  icon?: React.ReactNode
}
```

---

### Activity Manager

**Location:** `components/forms/ActivityManager/index.tsx`

**Description:** Manage activities within initiatives.

**Features:**
- Add/edit/delete activities
- Assign to users
- Track completion
- Bulk operations

---

### File Upload

**Location:** `components/OKRFileUpload.tsx`

**Description:** Drag-and-drop file upload with validation.

**Features:**
- Drag and drop support
- File type validation
- Progress indication
- Error handling
- Multi-file support

---

## Filter Components

### Filter Bar

**Location:** `components/filters/FilterBar.tsx`

**Description:** Composable filter interface.

**Available Filters:**
- AreaFilter
- StatusFilter
- DateRangeFilter
- ProgressFilter
- UserFilter
- ObjectiveFilter
- QuarterFilter

**Usage:**
```tsx
<FilterBar>
  <AreaFilter value={area} onChange={setArea} />
  <StatusFilter value={status} onChange={setStatus} />
  <DateRangeFilter value={dateRange} onChange={setDateRange} />
</FilterBar>
```

---

## Chart Components

### Area Chart

**Location:** `components/charts/MiniAreaChart.tsx`

**Description:** Responsive area chart for trends.

**Props:**
```typescript
interface AreaChartProps {
  data: Array<{ date: string; value: number }>
  height?: number
  color?: string
  gradient?: boolean
  animate?: boolean
}
```

---

### Status Donut

**Location:** `components/charts/status-donut.tsx`

**Description:** Donut chart for status distribution.

---

### Progress Distribution

**Location:** `components/charts/progress-distribution.tsx`

**Description:** Bar chart showing progress across initiatives.

---

## Utility Components

### Loading Spinner

**Location:** `components/ui/loading-spinner.tsx`

**Description:** Animated loading indicator.

**Sizes:**
- xs: 16px
- sm: 20px
- md: 24px
- lg: 32px
- xl: 48px

---

### Error Boundary

**Location:** `components/dashboard/ErrorBoundary.tsx`

**Description:** Error fallback UI component.

**Features:**
- Error logging
- Retry mechanism
- User-friendly messages
- Development/production modes

---

### Empty State

**Location:** `components/dashboard/EmptyState.tsx`

**Description:** Placeholder for empty data states.

**Props:**
```typescript
interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}
```

---

## Tenant-Specific Components

### SIGA Theme Provider

**Location:** `components/siga/SigaThemeProvider.tsx`

**Description:** SIGA tenant theme configuration.

---

### FEMA Dashboard Components

**Location:** `components/ceo/` directory

**Components:**
- CEOMetricsGrid
- ExecutiveCharts
- RiskDashboard
- StrategicTimeline
- TeamPerformanceMatrix

---

### Stratix AI Components

**Location:** `components/stratix/` directory

**Components:**
- StratixAssistant
- AIInsightsPanel
- ChatInterface
- FileUploadAnalyzer

---

## Component Guidelines

### Performance Considerations

1. **Lazy Loading:** Heavy components should be lazy loaded
2. **Memoization:** Use React.memo for expensive renders
3. **Virtual Scrolling:** For large lists
4. **Code Splitting:** At route level

### Accessibility Requirements

1. **ARIA Labels:** All interactive elements
2. **Keyboard Navigation:** Full keyboard support
3. **Focus Management:** Logical focus flow
4. **Screen Reader:** Proper announcements

### Theme Customization

All components support theming through:
- CSS custom properties
- Tailwind utilities
- CVA variants
- Theme context

### Testing Coverage

Each component requires:
- Unit tests for logic
- Accessibility tests
- Visual regression tests
- Performance benchmarks

---

Last Updated: 2025-08-16