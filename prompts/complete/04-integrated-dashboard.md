# PROMPT 4: Generate Complete Improved Dashboard

## Instructions
Use this prompt after completing Prompts 1-3 to generate the fully integrated dashboard.

---

## TASK: Create Complete Improved Objectives Dashboard

### CONTEXT
Integrate all improved components into a cohesive dashboard with proper layout, state management, and responsive design.

### DASHBOARD LAYOUT SPECIFICATION
```
┌────────────────────────────────────────────────────────┐
│                    HEADER                              │
│  Objectives Dashboard            [+ New] [Filters] [⚙] │
├────────────────────────────────────────────────────────┤
│                  KPI CARDS (h-24)                      │
│  ┌──────┬──────┬──────┬──────┐                       │
│  │  12  │  8   │ 45%  │  3   │                       │
│  │ Obj. │ Init.│ Prog.│ Risk │                       │
│  └──────┴──────┴──────┴──────┘                       │
├────────────────────────────────────────────────────────┤
│              FILTERS & SEARCH BAR                      │
│  [Search...] [Area ▼] [Status ▼] [Date ▼] [Clear]     │
├────────────────────────────────────────────────────────┤
│                    TABS                                │
│  [All (12)] [On Track (9)] [At Risk (3)] [Archived]   │
├────────────────────────────────────────────────────────┤
│              OBJECTIVES GRID                           │
│  ┌──────────┬──────────┬──────────┐                  │
│  │ Card 1   │ Card 2   │ Card 3   │ min-h-[200px]    │
│  │ (fixed)  │ (fixed)  │ (fixed)  │                  │
│  ├──────────┼──────────┼──────────┤                  │
│  │ Card 4   │ Card 5   │ Card 6   │                  │
│  │ (fixed)  │ (fixed)  │ (fixed)  │                  │
│  └──────────┴──────────┴──────────┘                  │
└────────────────────────────────────────────────────────┘
```

### COMPONENT REQUIREMENTS

#### 1. Main Dashboard Component
```typescript
interface ImprovedObjectivesDashboardProps {
  areaId?: string
  quarterId?: string
  className?: string
}
```

#### 2. State Management
```typescript
interface DashboardState {
  // Filters
  searchQuery: string
  selectedArea: string | null
  selectedStatus: 'all' | 'on-track' | 'at-risk'
  dateRange: { start: Date | null, end: Date | null }
  
  // View
  activeTab: 'all' | 'on-track' | 'at-risk' | 'archived'
  viewMode: 'grid' | 'list'
  sortBy: 'title' | 'progress' | 'date' | 'priority'
  
  // UI
  showCreateDialog: boolean
  editingObjective: ObjectiveWithRelations | null
  selectedObjectives: string[]
}
```

#### 3. Components to Import and Use
- `KPICards` from `./KPICards`
- `FixedHeightObjectiveCard` from `./FixedHeightObjectiveCard`
- `ObjectiveFilters` from `./ObjectiveFilters` (to be created)
- `EmptyStates` from `./EmptyStates` (to be created)
- All shadcn/ui components as needed

### FEATURES TO IMPLEMENT

#### 1. Search & Filters
```tsx
// Search with debounce
const debouncedSearch = useDebouncedValue(searchQuery, 300)

// Filter logic
const filteredObjectives = objectives.filter(obj => {
  // Search
  if (debouncedSearch && !obj.title.toLowerCase().includes(debouncedSearch.toLowerCase())) {
    return false
  }
  // Area filter
  if (selectedArea && obj.area_id !== selectedArea) {
    return false
  }
  // Status filter
  if (selectedStatus === 'on-track' && !obj.is_on_track) {
    return false
  }
  if (selectedStatus === 'at-risk' && obj.is_on_track) {
    return false
  }
  // Date range filter
  // ... etc
  return true
})
```

#### 2. Responsive Grid
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {filteredObjectives.map(objective => (
    <FixedHeightObjectiveCard
      key={objective.id}
      objective={objective}
      onEdit={() => handleEdit(objective)}
      onDelete={() => handleDelete(objective.id)}
    />
  ))}
</div>
```

#### 3. Loading States
```tsx
if (loading) {
  return (
    <>
      <KPICardsSkeleton />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <FixedHeightObjectiveCardSkeleton key={i} />
        ))}
      </div>
    </>
  )
}
```

#### 4. Empty States
```tsx
if (filteredObjectives.length === 0) {
  return (
    <EmptyState
      type={searchQuery ? 'no-results' : 'no-objectives'}
      onAction={() => setShowCreateDialog(true)}
    />
  )
}
```

#### 5. Batch Actions
```tsx
{selectedObjectives.length > 0 && (
  <div className="flex items-center gap-2 p-4 glass-card">
    <span>{selectedObjectives.length} selected</span>
    <Button size="sm" variant="outline">Archive</Button>
    <Button size="sm" variant="destructive">Delete</Button>
  </div>
)}
```

### GENERATE COMPLETE COMPONENT

Create file: `components/objectives/improved/ImprovedObjectivesDashboard.tsx`

Must include:
1. **All imports** properly organized
2. **Complete TypeScript** types and interfaces
3. **State management** with useState and useReducer
4. **Data fetching** with useObjectives hook
5. **Filtering logic** with performance optimization
6. **Responsive design** for all screen sizes
7. **Loading states** with skeletons
8. **Error handling** with error boundaries
9. **Empty states** for different scenarios
10. **Keyboard shortcuts** for power users
11. **Accessibility** features
12. **Performance optimizations** (memo, useMemo, useCallback)

### EXPECTED OUTPUT FORMAT

```tsx
"use client"

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useObjectives } from '@/hooks/useObjectives'
import { cn } from '@/lib/utils'

// Component imports
import { KPICards } from './KPICards'
import { FixedHeightObjectiveCard } from './FixedHeightObjectiveCard'

// shadcn/ui imports
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
// ... more imports

export function ImprovedObjectivesDashboard({ 
  areaId, 
  quarterId, 
  className 
}: ImprovedObjectivesDashboardProps) {
  // Complete implementation
}
```

Generate the complete, production-ready dashboard component now.
