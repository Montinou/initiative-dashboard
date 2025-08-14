# shadcn/ui Quick Reference - Component Selection Guide

## 🎯 Component Selection by Use Case

### Dashboard Views
```
┌─────────────────────────────────────────────────────────┐
│ KPI/Metrics Row                                        │
├─────────────────────────────────────────────────────────┤
│ Components: Card + Progress + Badge                     │
│ Grid: col-span-3 or col-span-4                         │
│ Height: h-24 (fixed)                                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Data Table                                             │
├─────────────────────────────────────────────────────────┤
│ Components: Table + Badge + Button                      │
│ Grid: col-span-12                                      │
│ Height: min-h-[300px] max-h-[500px] overflow-y-auto   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ List/Grid View                                         │
├─────────────────────────────────────────────────────────┤
│ Components: Card + Badge + Progress + Button           │
│ Grid: col-span-4 (desktop), col-span-6 (tablet)       │
│ Height: min-h-[200px]                                  │
└─────────────────────────────────────────────────────────┘
```

## 📊 Component Matrix

| Use Case | Primary Component | Supporting Components | Grid Span |
|----------|------------------|----------------------|-----------|
| KPI Card | Card | Progress, Badge | 3-4 |
| Data List | Table | Badge, Button | 12 |
| Form | Dialog | Input, Select, Button | 6-8 |
| Filters | Select | Button, Input | 2-3 |
| Navigation | Tabs | Badge | 12 |
| Status | Badge | - | auto |
| Actions | Button | DropdownMenu | auto |
| Charts | Card | Chart, Progress | 4-6 |
| Alerts | Alert | AlertDialog | 12 |
| Profile | Avatar | Card, Badge | 3-4 |

## 🔄 State Patterns

### Loading State
```tsx
import { Skeleton } from "@/components/ui/skeleton"

// Card skeleton
<Card>
  <CardHeader>
    <Skeleton className="h-4 w-[250px]" />
  </CardHeader>
  <CardContent>
    <Skeleton className="h-20 w-full" />
  </CardContent>
</Card>

// Table skeleton
<Table>
  <TableBody>
    {[...Array(5)].map((_, i) => (
      <TableRow key={i}>
        <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
        <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

### Empty State
```tsx
import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from "lucide-react"

<Alert>
  <InfoIcon className="h-4 w-4" />
  <AlertDescription>
    No hay datos disponibles. Crea tu primer objetivo.
  </AlertDescription>
</Alert>
```

### Error State
```tsx
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

<Alert variant="destructive">
  <AlertCircle className="h-4 w-4" />
  <AlertDescription>
    Error al cargar los datos. Intenta nuevamente.
  </AlertDescription>
</Alert>
```

## 🎨 Common Layouts

### Dashboard Grid
```tsx
// Main dashboard layout
<div className="container mx-auto p-6">
  {/* KPI Row */}
  <div className="grid grid-cols-12 gap-4 mb-6">
    <div className="col-span-12 md:col-span-3">
      <KPICard />
    </div>
    <div className="col-span-12 md:col-span-3">
      <KPICard />
    </div>
    <div className="col-span-12 md:col-span-3">
      <KPICard />
    </div>
    <div className="col-span-12 md:col-span-3">
      <KPICard />
    </div>
  </div>
  
  {/* Content Area */}
  <div className="grid grid-cols-12 gap-4">
    <div className="col-span-12 lg:col-span-8">
      <MainContent />
    </div>
    <div className="col-span-12 lg:col-span-4">
      <Sidebar />
    </div>
  </div>
</div>
```

### Form Layout
```tsx
// Form in dialog
<Dialog>
  <DialogContent className="sm:max-w-[600px]">
    <form className="space-y-4">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 sm:col-span-6">
          <Input />
        </div>
        <div className="col-span-12 sm:col-span-6">
          <Select />
        </div>
        <div className="col-span-12">
          <Textarea />
        </div>
      </div>
    </form>
  </DialogContent>
</Dialog>
```

### Card Grid
```tsx
// Responsive card grid
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => (
    <Card key={item.id} className="min-h-[200px]">
      <CardHeader>
        <CardTitle>{item.title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Content */}
      </CardContent>
    </Card>
  ))}
</div>
```

## 🚀 Component Combinations

### Objective Card
```tsx
Card + CardHeader + CardTitle + CardContent + Progress + Badge + Button
```

### Initiative List Item
```tsx
Card + Avatar + Badge + Progress + DropdownMenu
```

### KPI Widget
```tsx
Card + Icon + Typography + Progress
```

### Data Table Row
```tsx
TableRow + TableCell + Badge + Button + DropdownMenu
```

### Filter Bar
```tsx
Select + Input + Button + DatePicker
```

## 📏 Standard Sizes

### Heights
- KPI Cards: `h-24`
- Content Cards: `min-h-[200px]`
- Tables: `max-h-[500px]`
- Modals: `max-w-[600px]`
- Sidebars: `w-[280px]`

### Spacing
- Section gap: `gap-6`
- Card gap: `gap-4`
- Form gap: `space-y-4`
- Inline gap: `space-x-2`

### Text Sizes
- Headings: `text-2xl` to `text-4xl`
- Body: `text-base`
- Small: `text-sm`
- Muted: `text-muted-foreground`

## ⚡ Performance Tips

1. **Use Suspense for heavy components**
```tsx
<Suspense fallback={<Skeleton />}>
  <HeavyComponent />
</Suspense>
```

2. **Virtualize long lists**
```tsx
import { VirtualList } from '@tanstack/react-virtual'
```

3. **Lazy load dialogs**
```tsx
const Dialog = lazy(() => import('@/components/ui/dialog'))
```

4. **Memoize expensive computations**
```tsx
const expensiveValue = useMemo(() => 
  computeExpensive(data), [data]
)
```

## 🎯 Decision Tree

```
Need to display data?
├── Tabular → Table
├── Cards → Card Grid
└── Metrics → KPI Card

Need user input?
├── Simple → Input/Select
├── Complex → Form in Dialog
└── Filters → Select + DatePicker

Need navigation?
├── Sections → Tabs
├── Actions → DropdownMenu
└── Pages → Breadcrumb

Need feedback?
├── Success → Toast
├── Error → Alert
└── Loading → Skeleton
```

---

*Use this quick reference to make fast component selection decisions and maintain consistency across the application.*