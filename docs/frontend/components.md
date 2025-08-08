# Component Architecture

## Component Structure

```
app/
├── components/
│   ├── ui/              # Reusable UI components
│   ├── dashboard/       # Dashboard-specific components
│   ├── charts/          # Chart components
│   └── layout/          # Layout components
```

## Core Components

### Dashboard Components

#### MetricCard
Displays key metrics with icons and trends.

```tsx
interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}
```

Usage:
```tsx
<MetricCard
  title="Total Initiatives"
  value={42}
  change={12}
  trend="up"
  icon={<Target />}
/>
```

#### ProgressBar
Shows progress with customizable colors and labels.

```tsx
interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  color?: string;
  showPercentage?: boolean;
}
```

#### StatusBadge
Displays status with appropriate styling.

```tsx
interface StatusBadgeProps {
  status: 'planning' | 'in_progress' | 'completed' | 'on_hold';
  size?: 'sm' | 'md' | 'lg';
}
```

### Chart Components

#### AreaChart
Displays area progression over time.

```tsx
interface AreaChartProps {
  data: Array<{
    name: string;
    value: number;
    [key: string]: any;
  }>;
  xKey: string;
  yKey: string;
  color?: string;
}
```

#### BarChart
Shows comparison data in bar format.

```tsx
interface BarChartProps {
  data: Array<{
    category: string;
    value: number;
  }>;
  orientation?: 'horizontal' | 'vertical';
}
```

#### PieChart
Displays distribution data.

```tsx
interface PieChartProps {
  data: Array<{
    name: string;
    value: number;
    color?: string;
  }>;
  showLegend?: boolean;
  showLabels?: boolean;
}
```

### Layout Components

#### PageHeader
Consistent page header with title and actions.

```tsx
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{
    label: string;
    href: string;
  }>;
}
```

#### SidebarNav
Navigation sidebar with collapsible sections.

```tsx
interface SidebarNavProps {
  items: Array<{
    title: string;
    href: string;
    icon?: React.ReactNode;
    children?: Array<NavItem>;
  }>;
  collapsed?: boolean;
}
```

#### DataTable
Reusable data table with sorting and filtering.

```tsx
interface DataTableProps<T> {
  data: T[];
  columns: Array<{
    key: keyof T;
    label: string;
    sortable?: boolean;
    render?: (value: any, row: T) => React.ReactNode;
  }>;
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
}
```

## UI Components (Shadcn/ui)

### Button
```tsx
<Button variant="default" size="md" onClick={handleClick}>
  Click me
</Button>
```

Variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`

### Card
```tsx
<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Card description</CardDescription>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Dialog
```tsx
<Dialog open={open} onOpenChange={setOpen}>
  <DialogTrigger>Open</DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <DialogFooter>
      <Button onClick={() => setOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Select
```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select..." />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

## Component Patterns

### Compound Components
```tsx
const DataCard = ({ children }) => {
  return <div className="data-card">{children}</div>;
};

DataCard.Header = ({ children }) => (
  <div className="data-card-header">{children}</div>
);

DataCard.Body = ({ children }) => (
  <div className="data-card-body">{children}</div>
);

// Usage
<DataCard>
  <DataCard.Header>Title</DataCard.Header>
  <DataCard.Body>Content</DataCard.Body>
</DataCard>
```

### Render Props
```tsx
const DataFetcher = ({ render, url }) => {
  const { data, loading, error } = useFetch(url);
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;
  
  return render(data);
};

// Usage
<DataFetcher
  url="/api/data"
  render={(data) => <DataList items={data} />}
/>
```

### Higher-Order Components
```tsx
const withAuth = (Component) => {
  return (props) => {
    const { user } = useAuth();
    
    if (!user) return <Redirect to="/login" />;
    
    return <Component {...props} user={user} />;
  };
};

// Usage
const ProtectedComponent = withAuth(MyComponent);
```

## Styling Conventions

### TailwindCSS Classes
```tsx
// Consistent spacing
<div className="p-4 md:p-6 lg:p-8">

// Responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

// Dark mode support
<div className="bg-white dark:bg-gray-900">
```

### Component Variants
```tsx
const buttonVariants = {
  primary: "bg-blue-500 text-white hover:bg-blue-600",
  secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
  danger: "bg-red-500 text-white hover:bg-red-600",
};

<button className={buttonVariants[variant]}>
  {children}
</button>
```

## Performance Optimization

### Lazy Loading
```tsx
const HeavyComponent = lazy(() => import('./HeavyComponent'));

<Suspense fallback={<Loading />}>
  <HeavyComponent />
</Suspense>
```

### Memoization
```tsx
const ExpensiveComponent = memo(({ data }) => {
  const processedData = useMemo(() => {
    return processData(data);
  }, [data]);
  
  return <div>{processedData}</div>;
});
```

### Virtual Scrolling
```tsx
import { VariableSizeList } from 'react-window';

<VariableSizeList
  height={600}
  itemCount={items.length}
  itemSize={getItemSize}
  width="100%"
>
  {Row}
</VariableSizeList>
```

## Testing Components

### Unit Tests
```tsx
describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  it('calls onClick handler', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Integration Tests
```tsx
describe('Dashboard', () => {
  it('displays metrics after loading', async () => {
    render(<Dashboard />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Initiatives')).toBeInTheDocument();
    });
    
    expect(screen.getByText('42')).toBeInTheDocument();
  });
});
```

## Accessibility

### ARIA Labels
```tsx
<button
  aria-label="Close dialog"
  aria-pressed={isPressed}
  aria-expanded={isExpanded}
>
  <X />
</button>
```

### Keyboard Navigation
```tsx
const handleKeyDown = (e: KeyboardEvent) => {
  switch(e.key) {
    case 'Enter':
    case ' ':
      handleSelect();
      break;
    case 'Escape':
      handleClose();
      break;
  }
};
```

### Focus Management
```tsx
useEffect(() => {
  if (isOpen) {
    firstFocusableRef.current?.focus();
  }
}, [isOpen]);
```