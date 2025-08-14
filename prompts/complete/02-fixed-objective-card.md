# PROMPT 2: Generate Fixed Height Objective Card

## Instructions
After completing Prompt 1, use this prompt to generate the improved objective card component.

---

## TASK: Generate Improved Objective Card Component

### CURRENT PROBLEMATIC CODE
```tsx
// From components/objectives/ObjectivesView.tsx
function ObjectiveCard({ objective, onEdit, onDelete }) {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Card className="glassmorphic-card hover:border-primary/30 transition-all">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-5 h-5 text-primary" />
              <CardTitle className="text-white">{objective.title}</CardTitle>
            </div>
            {objective.description && (
              <CardDescription className="text-white/60 mt-2">
                {objective.description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Progress value={objective.completion_percentage || 0} className="h-2" />
        </div>
      </CardContent>
    </Card>
  )
}
```

### IDENTIFIED PROBLEMS
1. ❌ No minimum height constraint (cards have different heights)
2. ❌ Content pushes card height inconsistently
3. ❌ Not using flex layout properly for space distribution
4. ❌ Long text not truncated (can overflow)
5. ❌ Progress bar position varies based on content
6. ❌ Missing visual hierarchy
7. ❌ No loading states
8. ❌ Touch targets too small on mobile

### REQUIREMENTS FOR NEW COMPONENT

#### Structure Requirements:
```
┌─────────────────────────────────────┐
│ Header (fixed height)               │
│ ┌─────────────────────┬──────────┐ │
│ │ Title (truncated)   │ Actions  │ │
│ │ Badge Status        │ ••• Menu │ │
│ └─────────────────────┴──────────┘ │
│                                     │
│ Content (flexible, flex-1)          │
│ ┌─────────────────────────────────┐│
│ │ Description (clamped to 2 lines)││
│ │                                  ││
│ │ Meta info (area, dates)          ││
│ └─────────────────────────────────┘│
│                                     │
│ Footer (fixed position)             │
│ ┌─────────────────────────────────┐│
│ │ Progress Bar         [====] 45% ││
│ │ 3 Initiatives | 2 Activities    ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

#### Technical Specifications:
1. **Fixed Height**: `min-h-[200px]` for all cards
2. **Layout**: `flex flex-col` structure
3. **Content Area**: `flex-1` to expand and fill space
4. **Text Truncation**: 
   - Title: `line-clamp-1`
   - Description: `line-clamp-2`
5. **Glass Effect**: Use `glass-card` class (not glassmorphic-card)
6. **Status Badge**: Show "On Track" or "At Risk" with appropriate colors
7. **Icons**: Use lucide-react icons
8. **Responsive**: Full width on mobile, proper touch targets
9. **Accessibility**: ARIA labels, keyboard navigation

#### TypeScript Interface:
```typescript
interface ObjectiveWithRelations {
  id: string
  title: string
  description?: string
  completion_percentage: number
  is_on_track: boolean
  initiative_count: number
  area_name?: string
  start_date?: string
  end_date?: string
  initiatives?: Array<{
    id: string
    title: string
    progress: number
  }>
}

interface FixedHeightObjectiveCardProps {
  objective: ObjectiveWithRelations
  onEdit: () => void
  onDelete: () => void
  className?: string
}
```

### GENERATE COMPLETE COMPONENT

Create file: `components/objectives/improved/FixedHeightObjectiveCard.tsx`

Include:
1. All necessary imports from shadcn/ui
2. Proper TypeScript types
3. Loading skeleton variant
4. Error boundary wrapper
5. Mobile-optimized touch targets
6. Smooth animations
7. Keyboard navigation support
8. ARIA labels for accessibility

### EXPECTED OUTPUT FORMAT

```tsx
"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
// ... more imports

export function FixedHeightObjectiveCard({ 
  objective, 
  onEdit, 
  onDelete,
  className 
}: FixedHeightObjectiveCardProps) {
  // Component implementation
}

// Loading skeleton variant
export function FixedHeightObjectiveCardSkeleton() {
  // Skeleton implementation
}
```

Generate the complete, production-ready component now.
