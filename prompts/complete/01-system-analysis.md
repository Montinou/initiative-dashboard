# PROMPT 1: System Analysis and Context Setup

## Instructions for LLM
Copy this entire prompt to Claude, ChatGPT, or your preferred LLM.

---

You are an expert UI/UX designer specialized in creating modern dashboards using shadcn/ui components with Next.js 15 and TypeScript.

## PROJECT CONTEXT

**Tech Stack:**
- Framework: Next.js 15 with App Router
- UI Library: shadcn/ui (already installed)
- Styling: Tailwind CSS with glassmorphic theme
- Database: Supabase
- Language: TypeScript
- State Management: React hooks, SWR

## AVAILABLE RESOURCES

### 1. SHADCN/UI COMPONENTS CATALOG
```json
{
  "layout": {
    "Card": {
      "path": "@/components/ui/card",
      "subcomponents": ["CardHeader", "CardContent", "CardFooter", "CardTitle", "CardDescription"],
      "usage": "Container for content sections"
    },
    "Tabs": {
      "path": "@/components/ui/tabs",
      "subcomponents": ["TabsList", "TabsTrigger", "TabsContent"],
      "usage": "Navigation between different views"
    },
    "Sidebar": {
      "path": "@/components/ui/sidebar",
      "usage": "Main navigation sidebar"
    }
  },
  "data_display": {
    "Table": {
      "path": "@/components/ui/table",
      "subcomponents": ["TableHeader", "TableBody", "TableRow", "TableCell"],
      "usage": "Tabular data display"
    },
    "Progress": {
      "path": "@/components/ui/progress",
      "props": ["value", "max", "className"],
      "usage": "Progress indicators"
    },
    "Badge": {
      "path": "@/components/ui/badge",
      "variants": ["default", "secondary", "destructive", "outline"],
      "usage": "Status indicators"
    },
    "Chart": {
      "path": "@/components/ui/chart",
      "usage": "Data visualization"
    },
    "Skeleton": {
      "path": "@/components/ui/skeleton",
      "usage": "Loading placeholders"
    }
  },
  "forms": {
    "Button": {
      "path": "@/components/ui/button",
      "variants": ["default", "destructive", "outline", "secondary", "ghost", "link"],
      "sizes": ["default", "sm", "lg", "icon"]
    },
    "Input": {
      "path": "@/components/ui/input",
      "variants": ["default", "ghost"]
    },
    "Select": {
      "path": "@/components/ui/select",
      "subcomponents": ["SelectTrigger", "SelectContent", "SelectItem", "SelectValue"]
    },
    "Form": {
      "path": "@/components/ui/form",
      "subcomponents": ["FormField", "FormItem", "FormLabel", "FormControl", "FormMessage"]
    }
  },
  "feedback": {
    "Dialog": {
      "path": "@/components/ui/dialog",
      "subcomponents": ["DialogTrigger", "DialogContent", "DialogHeader", "DialogFooter", "DialogTitle"]
    },
    "Alert": {
      "path": "@/components/ui/alert",
      "variants": ["default", "destructive"]
    },
    "Toast": {
      "path": "@/components/ui/toast",
      "hook": "useToast"
    }
  }
}
```

### 2. GLASSMORPHIC CSS CLASSES
```css
/* Available glass effect classes */
.glass-card         /* Cards with glass effect */
.glass-button       /* Glass buttons */
.glass-input        /* Glass inputs */
.glass-badge        /* Glass badges */
.glass-dropdown     /* Glass dropdowns */
.glass-modal        /* Glass modals */

/* Legacy (still works but migrate to glass-*) */
.glassmorphic-card
.glassmorphic-button
```

### 3. DESIGN SYSTEM SPECIFICATIONS
```typescript
const designSystem = {
  grid: {
    columns: 12,
    gaps: {
      default: "gap-4",  // 16px
      sm: "gap-2",       // 8px
      lg: "gap-6"        // 24px
    }
  },
  breakpoints: {
    sm: "640px",   // Mobile
    md: "768px",   // Tablet
    lg: "1024px",  // Desktop
    xl: "1280px",  // Large desktop
  },
  heights: {
    kpiCard: "h-24",           // Fixed 96px
    objectiveCard: "min-h-[200px]", // Minimum 200px
    sidebar: "w-64"            // 256px width
  },
  colors: {
    primary: "hsl(var(--primary))",
    accent: "hsl(var(--accent))",
    success: "hsl(var(--success))",
    destructive: "hsl(var(--destructive))",
    warning: "hsl(var(--warning))"
  }
}
```

## CURRENT PROBLEMS TO SOLVE

1. **Inconsistent Card Heights**
   - Objective cards expand based on content
   - No minimum height constraint
   - Creates uneven grid appearance

2. **Oversized KPI Section**
   - Top metrics cards are too tall
   - Taking too much vertical space
   - Not optimized for mobile

3. **Poor Space Distribution**
   - Uneven gaps between elements
   - Sidebar too wide on desktop
   - Content not centered properly

4. **Missing States**
   - No loading skeletons
   - No empty states
   - No error boundaries

5. **Responsive Issues**
   - Cards don't stack properly on mobile
   - Text overflow on small screens
   - Touch targets too small

## TASK

Analyze this context and confirm your understanding by:
1. Listing which shadcn components you would use for each problem
2. Explaining how you would apply the design system rules
3. Suggesting the order in which to fix the issues

## EXPECTED RESPONSE FORMAT

```markdown
## Understanding Confirmed

### 1. Component Selection for Problems:
- Problem 1 (Card Heights): Use Card with flex layout...
- Problem 2 (KPI Section): Use Card with fixed h-24...
[etc.]

### 2. Design System Application:
- Grid: Will use 12-column system with...
- Spacing: Apply gap-4 consistently...
[etc.]

### 3. Implementation Order:
1. First: Fix card heights (most visible issue)
2. Second: Optimize KPI section
[etc.]
```

Please confirm your understanding and provide your analysis.
