# PROMPT 5: Generate Support Components (Filters & Empty States)

## Instructions
Use this prompt after completing Prompts 1-4 to generate the supporting components.

---

## TASK: Create Filter and Empty State Components

### PART A: OBJECTIVE FILTERS COMPONENT

#### Visual Design
```
Desktop (horizontal layout):
┌──────────────────────────────────────────────────────────┐
│ 🔍 [Search objectives...]  [All Areas ▼] [All Status ▼]  │
│                            [Date Range ▼] [Clear Filters] │
└──────────────────────────────────────────────────────────┘

Mobile (vertical stack):
┌──────────────────────┐
│ 🔍 [Search...]       │
├──────────────────────┤
│ [All Areas ▼]        │
├──────────────────────┤
│ [All Status ▼]       │
├──────────────────────┤
│ [Date Range ▼]       │
├──────────────────────┤
│ [Clear Filters]      │
└──────────────────────┘
```

#### Requirements
```typescript
interface ObjectiveFiltersProps {
  filters: {
    search: string
    areaId: string | null
    status: 'all' | 'on-track' | 'at-risk'
    dateRange: { start: Date | null; end: Date | null }
  }
  onFiltersChange: (filters: Partial<typeof filters>) => void
  areas: Array<{ id: string; name: string }>
  className?: string
}
```

#### Features to Implement:
1. **Search Input**
   - Debounced search (300ms)
   - Clear button when text present
   - Placeholder: "Search objectives..."
   - Icon: Search from lucide-react

2. **Area Select**
   - Options: All Areas + dynamic list
   - Icon: Building2 from lucide-react
   - Show count next to each area

3. **Status Select**
   - Options: All, On Track, At Risk
   - Color-coded options
   - Icon: Flag from lucide-react

4. **Date Range Picker**
   - Preset ranges: Last 30 days, Last quarter, This year, Custom
   - Icon: Calendar from lucide-react
   - Format: "Jan 1 - Mar 31"

5. **Clear Filters Button**
   - Only show when filters are active
   - Icon: X from lucide-react
   - Reset all filters to default

#### Component Code Structure:
```tsx
"use client"

import { useState, useCallback, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { Search, Building2, Flag, Calendar as CalendarIcon, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'

export function ObjectiveFilters({ filters, onFiltersChange, areas, className }: ObjectiveFiltersProps) {
  // Implementation with debounced search, responsive layout, etc.
}
```

---

### PART B: EMPTY STATES COMPONENT

#### Visual Designs

##### 1. No Objectives (Initial State)
```
┌────────────────────────────────────┐
│                                    │
│         🎯 (large icon)            │
│                                    │
│     No Objectives Yet              │
│                                    │
│  Start by creating your first      │
│  strategic objective               │
│                                    │
│    [+ Create Objective]            │
│                                    │
└────────────────────────────────────┘
```

##### 2. No Search Results
```
┌────────────────────────────────────┐
│                                    │
│         🔍 (large icon)            │
│                                    │
│     No Results Found               │
│                                    │
│  Try adjusting your filters or     │
│  search terms                      │
│                                    │
│    [Clear Filters]                 │
│                                    │
└────────────────────────────────────┘
```

##### 3. Error State
```
┌────────────────────────────────────┐
│                                    │
│         ⚠️ (large icon)            │
│                                    │
│    Something Went Wrong            │
│                                    │
│  We couldn't load your objectives. │
│  Please try again.                 │
│                                    │
│    [Retry] [Go Back]               │
│                                    │
└────────────────────────────────────┘
```

##### 4. Loading State
```
┌────────────────────────────────────┐
│                                    │
│      ⟳ (spinning icon)            │
│                                    │
│    Loading Objectives...           │
│                                    │
│  ░░░░░░░░░░░░░░░░░░░░░░           │
│                                    │
└────────────────────────────────────┘
```

#### Requirements
```typescript
interface EmptyStateProps {
  type: 'no-objectives' | 'no-results' | 'error' | 'loading'
  onAction?: () => void
  onSecondaryAction?: () => void
  customMessage?: string
  className?: string
}
```

#### Component Code Structure:
```tsx
"use client"

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Target, 
  Search, 
  AlertCircle, 
  Loader2, 
  Plus,
  RotateCcw,
  ArrowLeft 
} from 'lucide-react'
import { cn } from '@/lib/utils'

const emptyStateConfig = {
  'no-objectives': {
    icon: Target,
    title: 'No Objectives Yet',
    description: 'Start by creating your first strategic objective',
    actionLabel: 'Create Objective',
    actionIcon: Plus
  },
  'no-results': {
    icon: Search,
    title: 'No Results Found',
    description: 'Try adjusting your filters or search terms',
    actionLabel: 'Clear Filters',
    actionIcon: RotateCcw
  },
  'error': {
    icon: AlertCircle,
    title: 'Something Went Wrong',
    description: "We couldn't load your objectives. Please try again.",
    actionLabel: 'Retry',
    actionIcon: RotateCcw,
    secondaryActionLabel: 'Go Back',
    secondaryActionIcon: ArrowLeft
  },
  'loading': {
    icon: Loader2,
    title: 'Loading Objectives...',
    description: '',
    isAnimated: true
  }
}

export function EmptyState({ 
  type, 
  onAction, 
  onSecondaryAction, 
  customMessage,
  className 
}: EmptyStateProps) {
  // Implementation with animations and responsive design
}
```

---

### COMPLETE COMPONENT REQUIREMENTS

Both components must include:

1. **TypeScript**: Full type safety
2. **Responsive**: Mobile-first design
3. **Accessibility**: ARIA labels, keyboard navigation
4. **Performance**: Memoization where appropriate
5. **Glass Theme**: Use glass-* classes
6. **Animations**: Smooth transitions
7. **Error Handling**: Graceful fallbacks
8. **Testing**: Consider edge cases

### FILES TO GENERATE

1. `components/objectives/improved/ObjectiveFilters.tsx`
2. `components/objectives/improved/EmptyStates.tsx`

Generate both components with complete implementation now.
