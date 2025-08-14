# shadcn/ui Design System Implementation Guide

## Overview

This document outlines the comprehensive design system implementation for the Initiative Dashboard using shadcn/ui components, multi-tenant theming, and accessibility best practices.

## Table of Contents

1. [Configuration](#configuration)
2. [Theme System](#theme-system)
3. [Component Architecture](#component-architecture)
4. [Installed Blocks & Components](#installed-blocks--components)
5. [Typography System](#typography-system)
6. [Color Palettes](#color-palettes)
7. [Spacing System](#spacing-system)
8. [Accessibility Guidelines](#accessibility-guidelines)
9. [Responsive Design](#responsive-design)
10. [Glassmorphism Effects](#glassmorphism-effects)
11. [Migration Strategy](#migration-strategy)
12. [Advanced Patterns](#advanced-patterns)

## Configuration

### shadcn/ui Setup

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

## Theme System

### Multi-Tenant Architecture

The application supports four distinct themes:

1. **Default (Professional)**
   - Clean, business-agnostic design
   - Light mode default
   - No glassmorphism effects

2. **SIGA Turismo**
   - Vibrant green (#00A651) and yellow (#FDC300)
   - Dark mode default
   - Glassmorphism enabled

3. **FEMA Electricidad**
   - Professional blue (#00539F) and yellow (#FFC72C)
   - Dark mode default
   - Glassmorphism enabled

4. **Stratix Platform**
   - Modern purple (#6366f1) and pink (#ec4899)
   - Dark mode default
   - Glassmorphism enabled

### Theme Implementation

```typescript
// Using the theme system
import { getThemeFromDomain, applyTheme } from '@/lib/theme-config'

// Auto-detect and apply theme
const hostname = window.location.hostname
const theme = getThemeFromDomain(hostname)
applyTheme(theme.tenantSlug)
```

## Component Architecture

### Base Components Structure

```
components/
├── ui/                  # shadcn/ui primitives
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   ├── input.tsx
│   ├── select.tsx
│   ├── table.tsx
│   └── ...
├── dashboard/          # Dashboard-specific components
│   ├── KPICard.tsx
│   ├── MetricsPanel.tsx
│   ├── ActivityFeed.tsx
│   └── ...
├── manager/           # Manager role components
│   ├── TeamView.tsx
│   ├── WorkloadChart.tsx
│   └── ...
└── blocks/           # shadcn blocks (pre-built sections)
    ├── dashboard-01/
    ├── auth-01/
    └── ...
```

## Installed Blocks & Components

### Essential Blocks

1. **Dashboard Layout (dashboard-01)**
   - Sidebar navigation
   - Header with user menu
   - Content area with responsive grid
   - Mobile-responsive drawer

2. **Data Tables**
   - Sortable columns
   - Filterable data
   - Pagination
   - Bulk actions
   - Export functionality

3. **Forms**
   - Multi-step forms
   - Validation with Zod
   - Error handling
   - File upload support

4. **Charts**
   - Line charts for trends
   - Bar charts for comparisons
   - Pie charts for distributions
   - Real-time updates

### Core Components

- **Button**: Multiple variants (primary, secondary, ghost, destructive)
- **Card**: Container with header, content, and footer sections
- **Dialog**: Modal overlays with accessibility
- **Sheet**: Side panels for forms and details
- **Tabs**: Tabbed navigation
- **Skeleton**: Loading states
- **Badge**: Status indicators
- **Avatar**: User profile images
- **Select**: Dropdown menus
- **Input**: Text inputs with validation
- **Textarea**: Multi-line text inputs
- **Checkbox**: Boolean selections
- **Radio**: Single choice selections
- **Switch**: Toggle controls
- **Slider**: Range selections
- **Progress**: Progress indicators
- **Alert**: Notification messages
- **Toast**: Temporary notifications
- **Popover**: Contextual overlays
- **Tooltip**: Hover information
- **Command**: Command palette
- **Calendar**: Date picker
- **Date Picker**: Date range selection

## Typography System

### Font Stack

```css
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, 
  "Helvetica Neue", Arial, sans-serif;
```

### Type Scale

| Level | Size | Line Height | Weight | Usage |
|-------|------|-------------|--------|
-------|
| Display | 4.5rem | 1.1 | 700 | Hero sections |
| H1 | 3rem | 1.2 | 700 | Page titles |
| H2 | 2.25rem | 1.3 | 600 | Section headers |
| H3 | 1.875rem | 1.4 | 600 | Subsections |
| H4 | 1.5rem | 1.4 | 500 | Card titles |
| H5 | 1.25rem | 1.5 | 500 | Labels |
| H6 | 1.125rem | 1.5 | 500 | Small headers |
| Body | 1rem | 1.6 | 400 | Default text |
| Small | 0.875rem | 1.5 | 400 | Helper text |
| Tiny | 0.75rem | 1.5 | 400 | Metadata |

## Color Palettes

### Default Professional Theme

```css
--primary: 215 25% 27%;         /* #475569 - Slate blue */
--secondary: 220 13% 91%;       /* #E2E8F0 - Light slate */
--accent: 168 76% 36%;          /* #0F766E - Cool teal */
--background: 0 0% 99.6%;       /* #FEFEFE - Warm white */
--foreground: 222 84% 5%;       /* #0F172A - Dark text */
--destructive: 0 84% 60%;       /* Error red */
--muted: 210 40% 96%;          /* #F1F5F9 - Light gray */
--border: 214 32% 91%;         /* #E2E8F0 - Light border */
```

### SIGA Turismo Theme

```css
--primary: 146 100% 32%;        /* #00A651 - SIGA Green */
--secondary: 46 98% 49%;        /* #FDC300 - SIGA Yellow */
--accent: 210 17% 95%;          /* #F8F9FA - Light gray */
--background: 212 12% 16%;      /* #212529 - Dark */
--foreground: 0 0% 95%;         /* Off-white text */
```

### FEMA Electricidad Theme

```css
--primary: 208 100% 31%;        /* #00539F - FEMA Blue */
--secondary: 45 100% 58%;       /* #FFC72C - FEMA Yellow */
--accent: 214 15% 91%;          /* #F0F2F5 - Light gray */
--background: 212 12% 16%;      /* #212529 - Dark */
--foreground: 0 0% 95%;         /* Off-white text */
```

### Stratix Platform Theme

```css
--primary: 238 75% 65%;         /* #6366f1 - Purple */
--secondary: 323 86% 58%;       /* #ec4899 - Pink */
--accent: 172 66% 50%;          /* #14b8a6 - Teal */
--background: 222 84% 5%;       /* #0f172a - Very dark */
--foreground: 0 0% 95%;         /* Off-white text */
```

## Spacing System

Using Tailwind's default spacing scale (based on 0.25rem):

| Name | Size | Pixels | Usage |
|------|------|--------|
-------|
| 0 | 0 | 0px | No spacing |
| 0.5 | 0.125rem | 2px | Tight spacing |
| 1 | 0.25rem | 4px | Very small gap |
| 2 | 0.5rem | 8px | Small gap |
| 3 | 0.75rem | 12px | Component padding |
| 4 | 1rem | 16px | Default spacing |
| 5 | 1.25rem | 20px | Medium spacing |
| 6 | 1.5rem | 24px | Section spacing |
| 8 | 2rem | 32px | Large spacing |
| 10 | 2.5rem | 40px | XL spacing |
| 12 | 3rem | 48px | 2XL spacing |
| 16 | 4rem | 64px | 3XL spacing |
| 20 | 5rem | 80px | 4XL spacing |

### Component Anatomy

Each shadcn/ui component follows a consistent pattern:

```tsx
// components/ui/button.tsx
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
```

## Accessibility Guidelines

### WCAG 2.1 Level AA Compliance

1. **Color Contrast**
   - Text: Minimum 4.5:1 ratio
   - Large text: Minimum 3:1 ratio
   - Interactive elements: Minimum 3:1 ratio

2. **Keyboard Navigation**
   - All interactive elements keyboard accessible
   - Visible focus indicators (2px solid outline)
   - Logical tab order
   - Skip links for main content

3. **Screen Reader Support**
   - Semantic HTML5 elements
   - ARIA labels where needed
   - Live regions for dynamic content
   - Descriptive alt text for images

4. **Touch Targets**
   - Minimum 44x44px on mobile
   - Adequate spacing between targets
   - Hover states for desktop
   - Active states for feedback

### Implementation Examples

```tsx
// Accessible button with loading state
<Button
  aria-label="Save changes"
  aria-busy={isLoading}
  disabled={isLoading}
  className="min-h-[44px] min-w-[44px]"
>
  {isLoading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      <span className="sr-only">Saving...</span>
      Saving
    </>
  ) : (
    'Save'
  )}
</Button>

// Skip link for keyboard navigation
<a 
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-primary text-primary-foreground px-4 py-2 rounded"
>
  Skip to main content
</a>
```

## Responsive Design

### Breakpoints

| Name | Min Width | Usage |
|------|-----------|-------|
| sm | 640px | Mobile landscape |
| md | 768px | Tablets |
| lg | 1024px | Small laptops |
| xl | 1280px | Desktops |
| 2xl | 1536px | Large screens |
| 3xl | 1920px | Full HD |
| 4xl | 2560px | Ultra-wide |

### Mobile-First Approach

```tsx
// Responsive grid example
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {items.map(item => (
    <Card key={item.id} className="w-full">
      {/* Card content */}
    </Card>
  ))}
</div>

// Responsive text
<h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl">
  Responsive Heading
</h1>

// Responsive padding
<div className="p-4 sm:p-6 lg:p-8 xl:p-10">
  {/* Content */}
</div>
```

## Glassmorphism Effects

### Implementation for Tenant Themes

```css
/* Base glassmorphic styles */
.glassmorphic-card {
  backdrop-filter: blur(24px);
  background: hsla(var(--card), 0.8);
  border: 1px solid hsla(var(--border), 0.5);
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
}

.glassmorphic-input {
  backdrop-filter: blur(24px);
  background: hsla(var(--input), 0.9);
  border: 1px solid hsla(var(--border), 0.6);
}

.glassmorphic-button {
  backdrop-filter: blur(24px);
  background: linear-gradient(135deg, 
    hsla(var(--primary), 0.8), 
    hsla(var(--secondary), 0.7)
  );
  border: 1px solid hsla(var(--border), 0.4);
}
```

### Usage Example

```tsx
// Glassmorphic card component
const GlassmorphicCard = ({ children, className }) => {
  const theme = useTheme()
  
  return (
    <div className={cn(
      theme.glassmorphism ? 'glassmorphic-card' : 'bg-card border rounded-lg shadow-sm',
      className
    )}>
      {children}
    </div>
  )
}
```

## Theming & Customization

### CSS Variables System

Define your design tokens in `app/globals.css`:

```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    
    --radius: 0.5rem;
  }
  
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    
    --card: 222.2 84% 4.9%;
    --card-foreground: 210 40% 98%;
    
    /* ... additional dark mode variables ... */
  }
}
```

### Creating Custom Themes

#### 1. Brand Colors
```css
:root {
  /* Custom brand colors */
  --primary: 262.1 83.3% 57.8%;           /* Purple */
  --primary-foreground: 210 40% 98%;
  
  --secondary: 173.4 80.4% 40%;          /* Teal */
  --secondary-foreground: 210 40% 98%;
}
```

#### 2. Component-Specific Customization
```tsx
// Extend existing component
import { Button as BaseButton, ButtonProps } from "@/components/ui/button"

export function BrandButton({ children, ...props }: ButtonProps) {
  return (
    <BaseButton
      className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
      {...props}
    >
      {children}
    </BaseButton>
  )
}
```

#### 3. Global Theme Provider
```tsx
// providers/theme-provider.tsx
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

// app/layout.tsx
import { ThemeProvider } from "@/providers/theme-provider"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

## Best Practices

### 1. Component Organization

#### DO:
- Keep shadcn/ui components in `components/ui/`
- Create wrapper components for business logic
- Maintain single responsibility principle
- Use composition over modification

#### DON'T:
- Modify shadcn/ui components directly for feature-specific needs
- Mix business logic with UI components
- Create deeply nested component structures

### 2. Styling Guidelines

#### DO:
```tsx
// Use cn utility for conditional classes
<Button className={cn(
  "transition-all duration-200",
  isActive && "ring-2 ring-primary",
  isDisabled && "opacity-50 cursor-not-allowed"
)} />

// Create variant props for reusable patterns
const alertVariants = cva(
  "rounded-lg border p-4",
  {
    variants: {
      severity: {
        info: "bg-blue-50 border-blue-200",
        warning: "bg-yellow-50 border-yellow-200",
        error: "bg-red-50 border-red-200",
      }
    }
  }
)
```

#### DON'T:
```tsx
// Avoid inline style objects
<Button style={{ backgroundColor: 'blue' }} />

// Don't override core component styles globally
.ui-button {
  background: blue !important;
}
```

### 3. Accessibility

#### Always Include:
- Proper ARIA labels
- Keyboard navigation support
- Focus indicators
- Screen reader announcements

```tsx
<Dialog>
  <DialogTrigger asChild>
    <Button aria-label="Open settings dialog">Settings</Button>
  </DialogTrigger>
  <DialogContent aria-describedby="settings-description">
    <DialogHeader>
      <DialogTitle>Settings</DialogTitle>
      <DialogDescription id="settings-description">
        Manage your application preferences
      </DialogDescription>
    </DialogHeader>
  </DialogContent>
</Dialog>
```

### 4. Performance Optimization

#### Code Splitting:
```tsx
// Lazy load heavy components
const DataTable = dynamic(() => import("@/components/ui/data-table"), {
  loading: () => <TableSkeleton />,
  ssr: false,
})
```

#### Memoization:
```tsx
// Memoize expensive computations
const ExpensiveComponent = memo(({ data }) => {
  const processedData = useMemo(() => 
    processComplexData(data), [data]
  )
  
  return <DataVisualization data={processedData} />
})
```

## Migration Strategy

### From Material-UI/Ant Design

#### Phase 1: Parallel Installation
1. Install shadcn/ui alongside existing library
2. Create mapping document for component equivalents
3. Build adapter components for gradual migration

#### Phase 2: Component Migration
```tsx
// Adapter pattern for gradual migration
export function Button({ variant, ...props }) {
  // Map MUI props to shadcn props
  const shadcnVariant = variant === 'contained' ? 'default' : 
                       variant === 'outlined' ? 'outline' : 
                       'ghost'
  
  return <ShadcnButton variant={shadcnVariant} {...props} />
}
```

#### Phase 3: Style System Migration
1. Map design tokens to CSS variables
2. Update theme configuration
3. Remove old library dependencies

### From Bootstrap/Custom CSS

#### Step 1: Component Inventory
- List all UI components currently in use
- Identify shadcn/ui equivalents
- Note custom components needing recreation

#### Step 2: Install Base Components
```bash
# Core components for most applications
pnpm dlx shadcn@latest add accordion alert button card checkbox dialog dropdown-menu form input label navigation-menu select table tabs textarea toast
```

#### Step 3: Recreate Custom Components
Use shadcn patterns for consistency:
```tsx
// Custom component following shadcn patterns
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
  {
    variants: {
      status: {
        active: "bg-green-100 text-green-800",
        pending: "bg-yellow-100 text-yellow-800",
        inactive: "bg-gray-100 text-gray-800",
      }
    }
  }
)

export function StatusBadge({ status, className, ...props }) {
  return (
    <span 
      className={cn(statusBadgeVariants({ status }), className)}
      {...props}
    />
  )
}
```

## Component Development Workflow

### 1. Creating New Components

Follow the shadcn/ui pattern for consistency:

```tsx
// components/ui/initiative-card.tsx
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"

const initiativeCardVariants = cva(
  "transition-all duration-200",
  {
    variants: {
      status: {
        active: "border-green-200 hover:border-green-300",
        completed: "border-blue-200 hover:border-blue-300",
        delayed: "border-red-200 hover:border-red-300",
      },
      priority: {
        high: "shadow-lg",
        medium: "shadow-md",
        low: "shadow-sm",
      }
    },
    defaultVariants: {
      status: "active",
      priority: "medium",
    }
  }
)

export interface InitiativeCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof initiativeCardVariants> {
  title: string
  description?: string
  progress: number
  dueDate?: string
  assignee?: string
}

const InitiativeCard = React.forwardRef<HTMLDivElement, InitiativeCardProps>(
  ({ className, status, priority, title, description, progress, dueDate, assignee, ...props }, ref) => {
    return (
      <Card
        ref={ref}
        className={cn(initiativeCardVariants({ status, priority }), className)}
        {...props}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{title}</CardTitle>
            {priority === "high" && <Badge variant="destructive">High Priority</Badge>}
          </div>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-muted-foreground mb-2">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
            
            <div className="flex justify-between text-sm">
              {dueDate && (
                <span className="text-muted-foreground">
                  Due: {new Date(dueDate).toLocaleDateString()}
                </span>
              )}
              {assignee && (
                <span className="text-muted-foreground">
                  Assigned to: {assignee}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }
)

InitiativeCard.displayName = "InitiativeCard"

export { InitiativeCard, initiativeCardVariants }
```

### 2. Component Testing

```tsx
// __tests__/initiative-card.test.tsx
import { render, screen } from '@testing-library/react'
import { InitiativeCard } from '@/components/ui/initiative-card'

describe('InitiativeCard', () => {
  it('renders with required props', () => {
    render(
      <InitiativeCard
        title="Test Initiative"
        progress={50}
      />
    )
    
    expect(screen.getByText('Test Initiative')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
  })
  
  it('applies correct status variant classes', () => {
    const { container } = render(
      <InitiativeCard
        title="Test"
        progress={100}
        status="completed"
      />
    )
    
    expect(container.firstChild).toHaveClass('border-blue-200')
  })
})
```

### 3. Documentation

Create Storybook stories for component documentation:

```tsx
// stories/InitiativeCard.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { InitiativeCard } from '@/components/ui/initiative-card'

const meta = {
  title: 'Dashboard/InitiativeCard',
  component: InitiativeCard,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    status: {
      control: 'select',
      options: ['active', 'completed', 'delayed'],
    },
    priority: {
      control: 'select',
      options: ['high', 'medium', 'low'],
    },
    progress: {
      control: { type: 'range', min: 0, max: 100 },
    },
  },
} satisfies Meta<typeof InitiativeCard>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    title: 'Implement New Feature',
    description: 'Add user authentication to the application',
    progress: 65,
    dueDate: '2025-12-31',
    assignee: 'John Doe',
  },
}

export const HighPriority: Story = {
  args: {
    ...Default.args,
    priority: 'high',
    status: 'active',
  },
}

export const Completed: Story = {
  args: {
    ...Default.args,
    status: 'completed',
    progress: 100,
  },
}
```

## Advanced Patterns

### 1. Compound Components

Create complex components with multiple parts:

```tsx
// components/ui/data-panel.tsx
const DataPanelContext = React.createContext<{
  expanded: boolean
  setExpanded: (expanded: boolean) => void
}>({
  expanded: false,
  setExpanded: () => {},
})

export function DataPanel({ children, defaultExpanded = false }) {
  const [expanded, setExpanded] = React.useState(defaultExpanded)
  
  return (
    <DataPanelContext.Provider value={{ expanded, setExpanded }}>
      <div className="border rounded-lg">{children}</div>
    </DataPanelContext.Provider>
  )
}

export function DataPanelHeader({ children }) {
  const { expanded, setExpanded } = React.useContext(DataPanelContext)
  
  return (
    <div 
      className="p-4 cursor-pointer hover:bg-accent"
      onClick={() => setExpanded(!expanded)}
    >
      {children}
    </div>
  )
}

export function DataPanelContent({ children }) {
  const { expanded } = React.useContext(DataPanelContext)
  
  if (!expanded) return null
  
  return <div className="p-4 border-t">{children}</div>
}

// Usage
<DataPanel defaultExpanded>
  <DataPanelHeader>
    <h3>Initiative Details</h3>
  </DataPanelHeader>
  <DataPanelContent>
    <p>Content goes here...</p>
  </DataPanelContent>
</DataPanel>
```

### 2. Polymorphic Components

Components that can render as different elements:

```tsx
// components/ui/text.tsx
type TextProps<T extends React.ElementType> = {
  as?: T
  variant?: 'h1' | 'h2' | 'h3' | 'body' | 'caption'
  children: React.ReactNode
} & React.ComponentPropsWithoutRef<T>

const variantElements = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  body: 'p',
  caption: 'span',
} as const

const variantStyles = {
  h1: 'text-4xl font-bold',
  h2: 'text-3xl font-semibold',
  h3: 'text-2xl font-medium',
  body: 'text-base',
  caption: 'text-sm text-muted-foreground',
} as const

export function Text<T extends React.ElementType = 'p'>({
  as,
  variant = 'body',
  className,
  ...props
}: TextProps<T>) {
  const Component = as || variantElements[variant] || 'p'
  
  return (
    <Component 
      className={cn(variantStyles[variant], className)}
      {...props}
    />
  )
}

// Usage
<Text variant="h1">Main Title</Text>
<Text as="label" htmlFor="input">Label Text</Text>
```

### 3. Form Integration

Advanced form handling with react-hook-form and zod:

```tsx
// components/forms/initiative-form.tsx
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const initiativeSchema = z.object({
  title: z.string().min(2, "Title must be at least 2 characters"),
  description: z.string().optional(),
  dueDate: z.date({
    required_error: "Please select a due date",
  }),
  assigneeId: z.string().uuid("Please select a valid assignee"),
})

type InitiativeFormData = z.infer<typeof initiativeSchema>

export function InitiativeForm({ onSubmit }: { onSubmit: (data: InitiativeFormData) => void }) {
  const form = useForm<InitiativeFormData>({
    resolver: zodResolver(initiativeSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  })
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initiative Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter initiative title" {...field} />
              </FormControl>
              <FormDescription>
                A clear, concise title for your initiative
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="dueDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Due Date</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    disabled={(date) =>
                      date < new Date()
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormDescription>
                When should this initiative be completed?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Button type="submit">Create Initiative</Button>
      </form>
    </Form>
  )
}
```

### 4. State Management Integration

Using with global state management:

```tsx
// hooks/use-ui-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  theme: 'light' | 'dark' | 'system'
  sidebarOpen: boolean
  commandPaletteOpen: boolean
  setTheme: (theme: UIState['theme']) => void
  toggleSidebar: () => void
  toggleCommandPalette: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      theme: 'system',
      sidebarOpen: true,
      commandPaletteOpen: false,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleCommandPalette: () => set((state) => ({ 
        commandPaletteOpen: !state.commandPaletteOpen 
      })),
    }),
    {
      name: 'ui-storage',
      partialize: (state) => ({ theme: state.theme, sidebarOpen: state.sidebarOpen }),
    }
  )
)

// Usage in components
export function AppShell({ children }) {
  const { sidebarOpen, toggleSidebar } = useUIStore()
  
  return (
    <div className="flex h-screen">
      <Sidebar open={sidebarOpen} onToggle={toggleSidebar} />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
```

## Performance Monitoring

### Bundle Size Analysis

Monitor component impact on bundle size:

```json
// package.json
{
  "scripts": {
    "analyze": "ANALYZE=true next build",
    "bundle-report": "next-bundle-analyzer"
  }
}
```

```js
// next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  // your next config
})
```

### Component Performance Metrics

```tsx
// utils/performance.ts
export function measureComponentPerformance(componentName: string) {
  if (typeof window === 'undefined') return
  
  const startMark = `${componentName}-start`
  const endMark = `${componentName}-end`
  const measureName = `${componentName}-render`
  
  performance.mark(startMark)
  
  return () => {
    performance.mark(endMark)
    performance.measure(measureName, startMark, endMark)
    
    const measure = performance.getEntriesByName(measureName)[0]
    console.log(`${componentName} rendered in ${measure.duration}ms`)
  }
}

// Usage
export function ExpensiveComponent() {
  useEffect(() => {
    const endMeasure = measureComponentPerformance('ExpensiveComponent')
    return endMeasure
  }, [])
  
  // component logic
}
```

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Styles Not Applied
**Problem**: Component appears unstyled
**Solution**: 
- Verify Tailwind CSS is properly configured
- Check that globals.css is imported in layout
- Ensure CSS variables are defined

#### 2. Dark Mode Not Working
**Problem**: Theme doesn't switch
**Solution**:
```tsx
// Ensure ThemeProvider wraps application
// Check that 'class' strategy is used
<ThemeProvider attribute="class">
  {children}
</ThemeProvider>
```

#### 3. TypeScript Errors
**Problem**: Type errors with components
**Solution**:
- Update TypeScript to 5.0+
- Check tsconfig paths match components.json
- Reinstall component with proper TypeScript flag

#### 4. Build Errors
**Problem**: Build fails after adding components
**Solution**:
```bash
# Clear cache and reinstall
rm -rf .next node_modules
pnpm install
pnpm build
```

## Resources & References

### Official Documentation
- [shadcn/ui Documentation](https://ui.shadcn.com)
- [Component Examples](https://ui.shadcn.com/examples)
- [Themes Gallery](https://ui.shadcn.com/themes)

### Community Resources
- [GitHub Repository](https://github.com/shadcn/ui)
- [Discord Community](https://discord.com/invite/shadcn)
- [Component Extensions](https://github.com/topics/shadcn-ui)

### Related Tools
- [Radix UI](https://radix-ui.com) - Underlying primitives
- [Tailwind CSS](https://tailwindcss.com) - Styling framework
- [class-variance-authority](https://cva.style) - Variant management
- [next-themes](https://github.com/pacocoursey/next-themes) - Theme management

### Learning Resources
- [Video Tutorials](https://www.youtube.com/results?search_query=shadcn+ui)
- [Blog Posts](https://dev.to/t/shadcnui)
- [Example Projects](https://github.com/search?q=shadcn-ui-example)

## Conclusion

shadcn/ui represents a paradigm shift in how we build and maintain design systems. By providing direct access to component source code, it empowers developers to create truly custom, performant, and maintainable user interfaces without the constraints of traditional component libraries.

The key to success with shadcn/ui is understanding that it's not just a component library—it's a methodology for building better user interfaces. Embrace the philosophy of ownership, composition, and progressive enhancement to create design systems that grow with your application's needs.

Remember: with shadcn/ui, you're not just using components; you're building your own design system on a foundation of best practices and modern web standards.