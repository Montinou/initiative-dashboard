# Redesign Objectives Dashboard

## Current Problems to Fix

### 1. **Card Height Inconsistency**
- Cards in the objectives grid have different heights based on content
- No min-height constraint causing layout shifts
- Uneven visual appearance

### 2. **Poor Space Distribution**
- Inconsistent gaps between elements
- Sidebar too wide (needs to be max 240px)
- Content area not properly constrained

### 3. **Oversized KPI Section**
- KPI cards are too tall
- Not optimized for quick scanning
- Inefficient use of vertical space

### 4. **Mobile Responsiveness Issues**
- Cards don't stack properly on mobile
- Sidebar doesn't collapse on small screens
- Touch targets too small

### 5. **Visual Hierarchy Problems**
- All elements compete for attention
- No clear primary/secondary/tertiary levels
- Inconsistent text sizes and weights

## Requirements for New Design

### Layout Structure
```
┌─────────────────────────────────────────────────┐
│                  Header (h-16)                  │
├────┬────────────────────────────────────────────┤
│    │         KPI Cards Row (h-24)               │
│ S  ├────────────────────────────────────────────┤
│ i  │      Filters & Actions Bar (h-12)          │
│ d  ├────────────────────────────────────────────┤
│ e  │                                            │
│ b  │         Objectives Grid                    │
│ a  │    (uniform min-h-[200px] cards)          │
│ r  │         Responsive columns                 │
│    │                                            │
│    │                                            │
└────┴────────────────────────────────────────────┘
```

### Component Requirements

#### KPI Cards Section
```typescript
interface KPICard {
  title: string
  value: number | string
  change?: number
  trend?: 'up' | 'down' | 'stable'
  icon: LucideIcon
}
```
- Fixed height: `h-24`
- Grid: 4 columns (xl), 3 columns (lg), 2 columns (md), 1 column (sm)
- Include trend indicators
- Glassmorphic styling

#### Objectives Grid
```typescript
interface ObjectiveCard {
  id: string
  title: string
  description?: string
  progress: number
  status: 'on-track' | 'at-risk' | 'completed'
  initiatives: number
  startDate?: Date
  endDate?: Date
  owner?: string
}
```
- Uniform height: `min-h-[200px] max-h-[300px]`
- Grid: 3 columns (lg), 2 columns (md), 1 column (sm)
- Consistent internal spacing
- Progress bar always at same position
- Action buttons in footer

#### Filters Bar
- Date range picker
- Status filter (dropdown)
- Area/Department filter
- Search input
- Create button (primary CTA)

### Grid System Specifications
```css
/* Container */
.dashboard-container {
  @apply grid grid-cols-12 gap-4;
}

/* Sidebar */
.sidebar {
  @apply col-span-12 lg:col-span-2;
  max-width: 240px;
}

/* Main Content */
.main-content {
  @apply col-span-12 lg:col-span-10;
}

/* KPI Grid */
.kpi-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4;
}

/* Objectives Grid */
.objectives-grid {
  @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4;
}
```

### Responsive Breakpoints
- **Mobile (< 640px)**: Single column, collapsed sidebar
- **Tablet (640px - 1024px)**: 2 columns, collapsible sidebar
- **Desktop (1024px - 1280px)**: 3 columns, fixed sidebar
- **Wide (> 1280px)**: 3-4 columns, fixed sidebar

### Color Scheme & Styling
```css
/* Glassmorphic Base */
.glass-card {
  @apply bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg shadow-xl;
}

/* Status Colors */
.status-on-track { @apply text-green-400 bg-green-400/10; }
.status-at-risk { @apply text-yellow-400 bg-yellow-400/10; }
.status-critical { @apply text-red-400 bg-red-400/10; }
.status-completed { @apply text-blue-400 bg-blue-400/10; }
```

## Files to Generate

### 1. `components/objectives/ImprovedObjectivesView.tsx`
Main container component with:
- Grid layout management
- State management for filters
- Data fetching logic
- Responsive sidebar

### 2. `components/objectives/ObjectiveKPISection.tsx`
KPI cards row with:
- 4 metric cards
- Trend indicators
- Loading states
- Animation on value change

### 3. `components/objectives/ObjectiveGridCard.tsx`
Individual objective card with:
- Consistent height
- Progress visualization
- Status badges
- Action buttons
- Hover effects

### 4. `components/objectives/ObjectiveFiltersBar.tsx`
Filter controls with:
- Date range picker
- Multi-select dropdowns
- Search input
- Create button

## Code Generation Instructions

1. Use only shadcn/ui components from the catalog
2. Implement all TypeScript interfaces
3. Include loading states with Skeleton
4. Add error boundaries
5. Implement keyboard navigation
6. Use framer-motion for subtle animations
7. Include empty states
8. Add proper ARIA labels
9. Use React.memo for performance
10. Implement virtual scrolling for large lists

## Success Criteria

- [ ] All cards have uniform height within sections
- [ ] Responsive design works on all screen sizes
- [ ] Loading states for all async operations
- [ ] Keyboard accessible
- [ ] Glassmorphic theme consistently applied
- [ ] Performance optimized (< 100ms interaction delay)
- [ ] Proper TypeScript typing throughout
- [ ] Error states handled gracefully
- [ ] Empty states are informative
- [ ] Animations are smooth and purposeful