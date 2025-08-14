# PROMPT 3: Generate Compact KPI Cards Section

## Instructions
Use this prompt after Prompts 1 and 2 to generate the KPI cards component.

---

## TASK: Create Compact KPI Cards Component

### CONTEXT
The dashboard needs a compact KPI section at the top showing 4 key metrics with fixed height cards.

### VISUAL DESIGN SPECIFICATION
```
Desktop (lg: 4 columns):
┌─────────────┬─────────────┬─────────────┬─────────────┐
│   📊        │   🎯        │   📈        │   ⚠️        │
│   12        │   0         │   0%        │   3         │
│ Objectives  │ Initiatives │  Progress   │  At Risk    │
│    ↑ +2     │    → 0      │    ↑ +5%    │    ↓ -1     │
└─────────────┴─────────────┴─────────────┴─────────────┘

Tablet (md: 2 columns):
┌─────────────┬─────────────┐
│   📊 12     │   🎯 0      │
│ Objectives  │ Initiatives │
├─────────────┼─────────────┤
│   📈 0%     │   ⚠️ 3      │
│  Progress   │  At Risk    │
└─────────────┴─────────────┘

Mobile (sm: 1 column - stacked):
┌─────────────┐
│   📊 12     │
│ Objectives  │
├─────────────┤
│   🎯 0      │
│ Initiatives │
├─────────────┤
│   📈 0%     │
│  Progress   │
├─────────────┤
│   ⚠️ 3      │
│  At Risk    │
└─────────────┘
```

### REQUIREMENTS

#### 1. Layout Structure:
- Container: `grid grid-cols-12 gap-4`
- Desktop: Each card `col-span-3`
- Tablet: Each card `col-span-6`
- Mobile: Each card `col-span-12`
- Fixed height: `h-24` (96px)

#### 2. Each KPI Card Must Have:
```tsx
interface KPICardProps {
  icon: LucideIcon
  value: number | string
  label: string
  trend?: {
    direction: 'up' | 'down' | 'stable'
    value: number | string
  }
  color?: 'default' | 'success' | 'warning' | 'destructive'
}
```

#### 3. Features:
- **Glass Effect**: Use `glass-card` class
- **Number Animation**: Animate counting from 0 to value
- **Trend Indicators**: Show ↑ ↓ → with color coding
- **Loading State**: Skeleton while data loads
- **Hover Effect**: Subtle scale and glow
- **Responsive Text**: Smaller on mobile

#### 4. Data Structure:
```typescript
interface KPIData {
  totalObjectives: number
  totalInitiatives: number
  averageProgress: number
  atRiskCount: number
  trends: {
    objectives: { direction: 'up' | 'down' | 'stable', value: number }
    initiatives: { direction: 'up' | 'down' | 'stable', value: number }
    progress: { direction: 'up' | 'down' | 'stable', value: number }
    atRisk: { direction: 'up' | 'down' | 'stable', value: number }
  }
  loading?: boolean
  error?: string
}
```

#### 5. Component Structure:
```
components/objectives/improved/KPICards.tsx
├── Main component (KPICards)
├── Individual card (KPICard)
├── Loading skeleton (KPICardsSkeleton)
└── Animated counter hook (useAnimatedCounter)
```

### SPECIFIC IMPLEMENTATION DETAILS

#### Icons to Use (from lucide-react):
- Objectives: `Target`
- Initiatives: `Lightbulb`
- Progress: `TrendingUp`
- At Risk: `AlertTriangle`

#### Color Scheme:
- Objectives: `text-primary`
- Initiatives: `text-accent`
- Progress: `text-success`
- At Risk: `text-destructive`

#### Trend Colors:
- Up: `text-green-500`
- Down: `text-red-500`
- Stable: `text-gray-500`

### GENERATE COMPLETE COMPONENT

Create file: `components/objectives/improved/KPICards.tsx`

Must include:
1. **Imports**: All shadcn/ui components and lucide icons
2. **TypeScript**: Full type definitions
3. **Animation**: Counter animation using requestAnimationFrame
4. **Loading**: Skeleton states for each card
5. **Error**: Error boundary and fallback
6. **Accessibility**: ARIA labels and descriptions
7. **Mobile**: Touch-friendly and readable on small screens

### EXPECTED OUTPUT STRUCTURE

```tsx
"use client"

import { useEffect, useState, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Target, Lightbulb, TrendingUp, AlertTriangle, ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

// Animated counter hook
function useAnimatedCounter(end: number, duration: number = 1000) {
  // Implementation
}

// Individual KPI Card
function KPICard({ icon: Icon, value, label, trend, color }: KPICardProps) {
  // Implementation
}

// Loading skeleton
export function KPICardsSkeleton() {
  // Implementation
}

// Main component
export function KPICards({ data }: { data: KPIData }) {
  // Implementation
}
```

Generate the complete, production-ready component now.
