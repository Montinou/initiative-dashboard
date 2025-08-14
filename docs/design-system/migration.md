# Design System Migration Guide

This guide provides step-by-step instructions for migrating to the Initiative Dashboard Design System, including component upgrades, glassmorphism adoption, and best practices for maintaining consistency during the transition.

## Table of Contents

- [Overview](#overview)
- [Pre-Migration Assessment](#pre-migration-assessment)
- [Migration Strategies](#migration-strategies)
- [Component-by-Component Migration](#component-by-component-migration)
- [Breaking Changes](#breaking-changes)
- [Testing During Migration](#testing-during-migration)
- [Performance Considerations](#performance-considerations)
- [Team Coordination](#team-coordination)
- [Post-Migration Validation](#post-migration-validation)

---

## Overview

### Migration Goals

1. **Modernize UI Components**: Upgrade to enhanced shadcn/ui components with glassmorphism support
2. **Standardize Design Language**: Ensure consistent visual language across all interfaces
3. **Improve Accessibility**: Upgrade to WCAG 2.1 AA compliant components
4. **Enable Tenant Theming**: Support multi-tenant glassmorphism and theming
5. **Maintain Functionality**: Preserve existing functionality while enhancing user experience

### Migration Timeline

```
Phase 1: Assessment & Planning (1-2 weeks)
├── Audit existing components
├── Identify migration priorities
├── Plan rollout strategy
└── Setup testing framework

Phase 2: Core Components (2-3 weeks)
├── Migrate foundational components
├── Implement glassmorphism system
├── Update theme configuration
└── Test core functionality

Phase 3: Feature Components (3-4 weeks)
├── Migrate dashboard components
├── Update form components
├── Migrate data display components
└── Implement tenant-specific features

Phase 4: Validation & Optimization (1-2 weeks)
├── Comprehensive testing
├── Performance optimization
├── Documentation updates
└── Team training
```

---

## Pre-Migration Assessment

### Component Inventory

First, create a comprehensive inventory of existing components:

```bash
# Generate component inventory
find src -name "*.tsx" -o -name "*.ts" | grep -E "(component|ui)" | sort > component-inventory.txt

# Identify custom styling
grep -r "className\|styled\|css" src/components | wc -l

# Find hardcoded colors
grep -r "#[0-9a-fA-F]\{6\}\|rgb\|hsl" src/components
```

#### Inventory Checklist

- [ ] **Button variants**: Count and categorize existing button types
- [ ] **Card components**: Identify custom card implementations
- [ ] **Form elements**: List all input, select, and form components
- [ ] **Layout components**: Document grid, flex, and container components
- [ ] **Data display**: Catalog tables, lists, and visualization components
- [ ] **Navigation**: Document sidebar, breadcrumb, and menu components
- [ ] **Overlay components**: List modals, dropdowns, and tooltip implementations
- [ ] **Custom styling**: Identify components with hardcoded styles

### Dependency Analysis

```typescript
// analyze-dependencies.ts
import fs from 'fs'
import path from 'path'

interface ComponentDependency {
  component: string
  dependencies: string[]
  usageCount: number
  complexity: 'low' | 'medium' | 'high'
}

function analyzeComponentDependencies(): ComponentDependency[] {
  // Implementation to analyze component usage and dependencies
  // This helps prioritize migration order
}

// Generate migration priority matrix
const dependencies = analyzeComponentDependencies()
const migrationPriority = dependencies
  .sort((a, b) => b.usageCount - a.usageCount)
  .map(dep => ({
    ...dep,
    priority: dep.usageCount > 10 ? 'high' : 
              dep.usageCount > 5 ? 'medium' : 'low'
  }))
```

### Current State Documentation

Document the current state before migration:

```typescript
// Document current component props and APIs
interface CurrentComponentAPI {
  name: string
  props: Record<string, any>
  variants: string[]
  usage: string[]
  dependencies: string[]
}

const currentAPIs: CurrentComponentAPI[] = [
  {
    name: 'Button',
    props: { variant: 'primary | secondary', size: 'sm | md | lg' },
    variants: ['primary', 'secondary', 'danger'],
    usage: ['Header', 'Forms', 'Cards'],
    dependencies: ['styled-components']
  },
  // ... other components
]
```

---

## Migration Strategies

### Strategy 1: Gradual Migration (Recommended)

Migrate components incrementally while maintaining backward compatibility.

#### Implementation Plan

```typescript
// 1. Install new design system alongside existing components
npm install @radix-ui/react-* class-variance-authority clsx tailwind-merge

// 2. Create compatibility layer
// components/compat/Button.tsx
import { Button as NewButton } from '@/components/ui/button'
import { Button as OldButton } from '@/components/legacy/button'

interface CompatButtonProps {
  useNew?: boolean
  // ... other props
}

export function Button({ useNew = false, ...props }: CompatButtonProps) {
  if (useNew) {
    return <NewButton {...props} />
  }
  return <OldButton {...props} />
}

// 3. Gradually enable new components
// Use feature flags or environment variables
const USE_NEW_DESIGN_SYSTEM = process.env.NEXT_PUBLIC_USE_NEW_DS === 'true'

export function Button(props: ButtonProps) {
  return (
    <CompatButton useNew={USE_NEW_DESIGN_SYSTEM} {...props} />
  )
}
```

### Strategy 2: Page-by-Page Migration

Migrate entire pages or sections at once for consistency.

```typescript
// Enable new design system per page
// app/dashboard/page.tsx
export default function DashboardPage() {
  return (
    <DesignSystemProvider version="new">
      <Dashboard />
    </DesignSystemProvider>
  )
}

// components/providers/DesignSystemProvider.tsx
export function DesignSystemProvider({ 
  version, 
  children 
}: { 
  version: 'legacy' | 'new'
  children: React.ReactNode 
}) {
  return (
    <div className={version === 'new' ? 'new-design-system' : 'legacy-design-system'}>
      {children}
    </div>
  )
}
```

### Strategy 3: Feature Flag Migration

Use feature flags to control component usage during migration.

```typescript
// lib/feature-flags.ts
export const featureFlags = {
  useNewButton: true,
  useNewCard: false,
  useGlassmorphism: true,
  // ... other flags
}

// components/ui/Button.tsx
import { featureFlags } from '@/lib/feature-flags'
import { Button as NewButton } from './new/button'
import { Button as LegacyButton } from './legacy/button'

export function Button(props: ButtonProps) {
  if (featureFlags.useNewButton) {
    return <NewButton {...props} />
  }
  return <LegacyButton {...props} />
}
```

---

## Component-by-Component Migration

### Core Components Migration

#### Button Component

**Before (Legacy):**
```tsx
// Legacy button implementation
interface LegacyButtonProps {
  variant?: 'primary' | 'secondary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

const LegacyButton = styled.button<LegacyButtonProps>`
  background: ${props => props.variant === 'primary' ? '#007bff' : '#6c757d'};
  padding: ${props => props.size === 'sm' ? '4px 8px' : '8px 16px'};
  /* ... more styles */
`
```

**After (New Design System):**
```tsx
// New enhanced button
<Button 
  variant="glass" 
  size="lg" 
  loading={isLoading}
  leftIcon={<PlusIcon />}
>
  Create Initiative
</Button>

// Migration wrapper for gradual transition
function MigratedButton({ variant, size, loading, children, ...props }: LegacyButtonProps) {
  const newVariant = {
    'primary': 'default',
    'secondary': 'secondary', 
    'danger': 'destructive'
  }[variant] || 'default'

  return (
    <Button
      variant={newVariant}
      size={size}
      loading={loading}
      {...props}
    >
      {children}
    </Button>
  )
}
```

#### Card Component

**Before:**
```tsx
// Legacy card
const LegacyCard = styled.div`
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
`

function CustomCard({ title, children }) {
  return (
    <LegacyCard>
      <h3>{title}</h3>
      {children}
    </LegacyCard>
  )
}
```

**After:**
```tsx
// New design system card with glassmorphism
function EnhancedCard({ title, children, useGlass = false }) {
  const { theme } = useTheme()
  const shouldUseGlass = useGlass && theme.tenant !== 'default'

  return (
    <Card variant={shouldUseGlass ? "glass" : "default"}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}

// Migration adapter
function MigratedCard({ title, children }: { title: string, children: React.ReactNode }) {
  return <EnhancedCard title={title} useGlass>{children}</EnhancedCard>
}
```

### Form Components Migration

#### Input Component

**Before:**
```tsx
// Legacy input
const LegacyInput = styled.input`
  border: 1px solid #ced4da;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
  
  &:focus {
    border-color: #007bff;
    outline: none;
    box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
  }
`
```

**After:**
```tsx
// New enhanced input with glassmorphism
<Input 
  variant="glass" 
  placeholder="Enter text..."
  leftIcon={<SearchIcon />}
  error={!!fieldError}
  aria-describedby={fieldError ? "error-message" : undefined}
/>

// Migration wrapper
function MigratedInput({ error, ...props }) {
  return (
    <div>
      <Input 
        variant="default"
        error={!!error}
        {...props}
      />
      {error && (
        <p id="error-message" className="text-destructive text-sm mt-1">
          {error}
        </p>
      )}
    </div>
  )
}
```

### Layout Components Migration

#### Grid System

**Before:**
```tsx
// Legacy grid with custom CSS
const GridContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  padding: 16px;
`

const GridItem = styled.div`
  background: white;
  border-radius: 8px;
  padding: 16px;
`
```

**After:**
```tsx
// New responsive grid with glassmorphism
function ResponsiveGrid({ children, useGlass = false }) {
  const { theme } = useTheme()
  const shouldUseGlass = useGlass && theme.tenant !== 'default'

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
      {React.Children.map(children, (child, index) => (
        <Card 
          key={index}
          variant={shouldUseGlass ? "glass-subtle" : "default"}
          className="p-6"
        >
          {child}
        </Card>
      ))}
    </div>
  )
}
```

### Data Display Migration

#### Table Component

**Before:**
```tsx
// Legacy table
const TableContainer = styled.div`
  overflow-x: auto;
  border: 1px solid #dee2e6;
  border-radius: 8px;
`

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 12px;
    border-bottom: 1px solid #dee2e6;
    text-align: left;
  }
  
  th {
    background-color: #f8f9fa;
    font-weight: 600;
  }
`
```

**After:**
```tsx
// New enhanced table with glassmorphism
function EnhancedDataTable({ data, columns, useGlass = false }) {
  const { theme } = useTheme()
  const shouldUseGlass = useGlass && theme.tenant !== 'default'

  return (
    <Card variant={shouldUseGlass ? "glass" : "default"}>
      <CardContent className="p-0">
        <Table>
          <TableHeader className={shouldUseGlass ? "glass-effect-subtle" : ""}>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.key}>{column.title}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, index) => (
              <TableRow 
                key={index}
                className={cn(
                  "hover:bg-muted/50",
                  shouldUseGlass && "hover:glass-effect-subtle"
                )}
              >
                {columns.map((column) => (
                  <TableCell key={column.key}>
                    {column.render ? column.render(row[column.key], row) : row[column.key]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

---

## Breaking Changes

### API Changes

#### Button Component Breaking Changes

| Legacy Prop | New Prop | Migration |
|-------------|----------|-----------|
| `variant="primary"` | `variant="default"` | Direct replacement |
| `variant="danger"` | `variant="destructive"` | Direct replacement |
| `loading={true}` | `loading={true}` | ✅ Compatible |
| `size="md"` | `size="default"` | Direct replacement |

#### Card Component Breaking Changes

| Legacy API | New API | Migration |
|------------|---------|-----------|
| Single component | Compound components | Split into Card, CardHeader, CardTitle, CardContent |
| Custom title prop | CardTitle component | Wrap title in CardTitle component |
| Hardcoded padding | Configurable padding | Use padding variant prop |

### CSS Changes

#### Color System Migration

**Before:**
```css
/* Legacy hardcoded colors */
.primary-button {
  background-color: #007bff;
  color: white;
}

.success-text {
  color: #28a745;
}

.border-light {
  border-color: #dee2e6;
}
```

**After:**
```css
/* New CSS variable system */
.primary-button {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}

.success-text {
  color: hsl(var(--success));
}

.border-light {
  border-color: hsl(var(--border));
}
```

#### Migration Script

```typescript
// scripts/migrate-colors.ts
import fs from 'fs'
import path from 'path'

const colorMappings = {
  '#007bff': 'hsl(var(--primary))',
  '#28a745': 'hsl(var(--success))',
  '#dc3545': 'hsl(var(--destructive))',
  '#ffc107': 'hsl(var(--warning))',
  '#17a2b8': 'hsl(var(--info))',
  '#dee2e6': 'hsl(var(--border))',
  '#f8f9fa': 'hsl(var(--muted))',
  // ... more mappings
}

function migrateColorsInFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf-8')
  
  Object.entries(colorMappings).forEach(([oldColor, newColor]) => {
    const regex = new RegExp(oldColor.replace('#', '\\#'), 'gi')
    content = content.replace(regex, newColor)
  })
  
  fs.writeFileSync(filePath, content)
}

// Run migration
function migrateColors() {
  const cssFiles = glob.sync('src/**/*.{css,scss,ts,tsx}')
  cssFiles.forEach(migrateColorsInFile)
}
```

---

## Testing During Migration

### Component Testing Strategy

#### 1. Visual Regression Testing

```typescript
// tests/visual-regression.test.ts
import { test, expect } from '@playwright/test'

test.describe('Component Migration Visual Tests', () => {
  test('Button variants render correctly', async ({ page }) => {
    await page.goto('/test/buttons')
    
    // Test each button variant
    const variants = ['default', 'destructive', 'outline', 'glass']
    
    for (const variant of variants) {
      await expect(page.locator(`[data-testid="button-${variant}"]`)).toHaveScreenshot(`button-${variant}.png`)
    }
  })

  test('Card variants render correctly', async ({ page }) => {
    await page.goto('/test/cards')
    
    // Test glassmorphism variants across themes
    const themes = ['default', 'siga', 'fema', 'stratix']
    
    for (const theme of themes) {
      await page.setAttribute('html', 'data-tenant', theme)
      await expect(page.locator('[data-testid="glass-card"]')).toHaveScreenshot(`card-glass-${theme}.png`)
    }
  })
})
```

#### 2. Accessibility Testing

```typescript
// tests/accessibility.test.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Migration Accessibility Tests', () => {
  test('migrated components maintain accessibility', async ({ page }) => {
    await page.goto('/dashboard')
    
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()
    
    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('glassmorphism maintains contrast ratios', async ({ page }) => {
    // Test each tenant theme
    const themes = ['siga', 'fema', 'stratix']
    
    for (const theme of themes) {
      await page.goto(`/dashboard?theme=${theme}`)
      
      const contrastResults = await new AxeBuilder({ page })
        .withRules(['color-contrast'])
        .analyze()
      
      expect(contrastResults.violations).toEqual([])
    }
  })
})
```

#### 3. Functional Testing

```typescript
// tests/migration-functional.test.ts
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

describe('Migration Functional Tests', () => {
  test('migrated buttons maintain functionality', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    
    render(
      <Button variant="glass" onClick={handleClick}>
        Click me
      </Button>
    )
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  test('migrated forms maintain validation', async () => {
    const user = userEvent.setup()
    const handleSubmit = jest.fn()
    
    render(
      <Form onSubmit={handleSubmit}>
        <FormField
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input variant="glass" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </Form>
    )
    
    const input = screen.getByRole('textbox')
    await user.type(input, 'invalid-email')
    
    const submitButton = screen.getByRole('button', { name: /submit/i })
    await user.click(submitButton)
    
    expect(screen.getByText(/invalid email/i)).toBeInTheDocument()
    expect(handleSubmit).not.toHaveBeenCalled()
  })
})
```

### Performance Testing

```typescript
// tests/performance.test.ts
import { test, expect } from '@playwright/test'

test.describe('Migration Performance Tests', () => {
  test('glassmorphism does not impact performance', async ({ page }) => {
    // Measure baseline performance
    await page.goto('/dashboard')
    const baselineMetrics = await page.evaluate(() => {
      return JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')[0]))
    })
    
    // Measure glassmorphism performance
    await page.goto('/dashboard?theme=siga') // Enable glassmorphism
    const glassMetrics = await page.evaluate(() => {
      return JSON.parse(JSON.stringify(performance.getEntriesByType('navigation')[0]))
    })
    
    // Performance should not degrade significantly
    const performanceDiff = glassMetrics.loadEventEnd - baselineMetrics.loadEventEnd
    expect(performanceDiff).toBeLessThan(500) // Max 500ms difference
  })

  test('component rendering performance', async ({ page }) => {
    await page.goto('/test/performance')
    
    // Measure component rendering time
    const renderTime = await page.evaluate(() => {
      const startTime = performance.now()
      
      // Trigger component re-render
      document.dispatchEvent(new CustomEvent('force-rerender'))
      
      return new Promise(resolve => {
        requestAnimationFrame(() => {
          const endTime = performance.now()
          resolve(endTime - startTime)
        })
      })
    })
    
    expect(renderTime).toBeLessThan(16) // Should render within one frame (60fps)
  })
})
```

---

## Performance Considerations

### Bundle Size Impact

#### Before Migration Analysis

```bash
# Analyze current bundle size
npm run build
npx webpack-bundle-analyzer .next/static/chunks/*.js

# Create baseline measurements
echo "Current bundle sizes:" > migration-baseline.txt
du -sh .next/static >> migration-baseline.txt
```

#### After Migration Comparison

```typescript
// scripts/analyze-bundle-impact.ts
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer'

interface BundleAnalysis {
  totalSize: number
  componentSizes: Record<string, number>
  improvement: number
}

function analyzeBundleImpact(): BundleAnalysis {
  // Implementation to compare before/after bundle sizes
  return {
    totalSize: 245000, // bytes
    componentSizes: {
      'ui-components': 45000,
      'glassmorphism': 8000,
      'theme-system': 12000,
    },
    improvement: 15.2 // percentage reduction due to tree-shaking
  }
}
```

### Runtime Performance

#### Glassmorphism Performance Monitoring

```typescript
// lib/performance-monitor.ts
export class GlassmorphismPerformanceMonitor {
  private observer: PerformanceObserver
  
  constructor() {
    this.observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.name.includes('backdrop-filter')) {
          console.log(`Glass effect render time: ${entry.duration}ms`)
          
          // Alert if performance is poor
          if (entry.duration > 16) {
            console.warn('Glass effect causing performance issues')
          }
        }
      })
    })
  }
  
  start() {
    this.observer.observe({ entryTypes: ['measure'] })
  }
  
  stop() {
    this.observer.disconnect()
  }
  
  measureGlassEffect(elementId: string) {
    performance.mark(`glass-start-${elementId}`)
    
    return () => {
      performance.mark(`glass-end-${elementId}`)
      performance.measure(
        `glass-render-${elementId}`,
        `glass-start-${elementId}`,
        `glass-end-${elementId}`
      )
    }
  }
}

// Usage in components
export function GlassCard({ children }: { children: React.ReactNode }) {
  const monitor = useMemo(() => new GlassmorphismPerformanceMonitor(), [])
  
  useEffect(() => {
    monitor.start()
    const endMeasure = monitor.measureGlassEffect('glass-card')
    
    return () => {
      endMeasure()
      monitor.stop()
    }
  }, [monitor])
  
  return (
    <Card variant="glass" id="glass-card">
      {children}
    </Card>
  )
}
```

---

## Team Coordination

### Migration Workflow

#### 1. Feature Branch Strategy

```bash
# Create migration branches for different components
git checkout -b migration/button-component
git checkout -b migration/card-component
git checkout -b migration/form-components

# Migration pull request template
# .github/pull_request_template.md
## Migration Checklist

- [ ] Component API is backward compatible
- [ ] Visual regression tests pass
- [ ] Accessibility tests pass
- [ ] Performance impact assessed
- [ ] Documentation updated
- [ ] Legacy component deprecated (if applicable)

### Breaking Changes
- List any breaking changes
- Provide migration instructions

### Performance Impact
- Bundle size change: +/- X KB
- Runtime performance: No impact / Minor impact / Needs attention
```

#### 2. Code Review Guidelines

```typescript
// .eslintrc.migration.js
module.exports = {
  extends: ['.eslintrc.js'],
  rules: {
    // Enforce new design system usage
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['@/components/legacy/*'],
            message: 'Use new design system components instead'
          },
          {
            group: ['styled-components'],
            message: 'Use Tailwind CSS and design system variants'
          }
        ]
      }
    ]
  },
  overrides: [
    {
      files: ['**/migration/**/*.{ts,tsx}'],
      rules: {
        'no-restricted-imports': 'off' // Allow legacy imports in migration files
      }
    }
  ]
}
```

#### 3. Communication Plan

```markdown
# Migration Communication Template

## Weekly Migration Update

### Completed This Week
- [x] Button component migration (15 files updated)
- [x] Card component migration (23 files updated)
- [ ] Form components migration (in progress)

### Metrics
- Bundle size impact: -12KB (-5.2%)
- Performance: No degradation detected
- Test coverage: 95% maintained

### Blockers
- None

### Next Week Plan
- Complete form components migration
- Begin data table migration
- Update design documentation

### Action Items
- [ ] @team-lead: Review glass effect performance
- [ ] @designer: Validate FEMA theme colors
- [ ] @developer: Fix accessibility issue in Select component
```

---

## Post-Migration Validation

### Comprehensive Testing Suite

```typescript
// tests/post-migration-validation.test.ts
import { test, expect } from '@playwright/test'

test.describe('Post-Migration Validation', () => {
  test('all pages load without errors', async ({ page }) => {
    const pages = [
      '/dashboard',
      '/initiatives',
      '/objectives', 
      '/analytics',
      '/team',
      '/settings'
    ]
    
    for (const pagePath of pages) {
      await page.goto(pagePath)
      
      // Check for JavaScript errors
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      
      // Wait for page to fully load
      await page.waitForLoadState('networkidle')
      
      expect(errors).toHaveLength(0)
    }
  })

  test('glassmorphism works across all themes', async ({ page }) => {
    const themes = ['siga', 'fema', 'stratix']
    
    for (const theme of themes) {
      await page.goto(`/dashboard?theme=${theme}`)
      
      // Check glass effects are applied
      const glassElements = await page.locator('.glass-effect').count()
      expect(glassElements).toBeGreaterThan(0)
      
      // Check backdrop-filter is applied
      const hasBackdropFilter = await page.evaluate(() => {
        const element = document.querySelector('.glass-effect')
        const styles = window.getComputedStyle(element)
        return styles.backdropFilter !== 'none'
      })
      
      expect(hasBackdropFilter).toBe(true)
    }
  })

  test('all components maintain accessibility', async ({ page }) => {
    await page.goto('/test/components')
    
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    let focusedElement = await page.locator(':focus').first()
    expect(focusedElement).toBeVisible()
    
    // Continue tabbing through all interactive elements
    let tabCount = 0
    while (tabCount < 50) { // Prevent infinite loop
      await page.keyboard.press('Tab')
      focusedElement = await page.locator(':focus').first()
      
      if (!await focusedElement.isVisible()) break
      tabCount++
    }
    
    expect(tabCount).toBeGreaterThan(5) // Should have multiple focusable elements
  })
})
```

### Performance Validation

```typescript
// tests/performance-validation.test.ts
import { test, expect } from '@playwright/test'

test.describe('Performance Validation', () => {
  test('Core Web Vitals meet thresholds', async ({ page }) => {
    await page.goto('/dashboard')
    
    const metrics = await page.evaluate(() => {
      return new Promise(resolve => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const webVitals = {}
          
          entries.forEach(entry => {
            if (entry.name === 'LCP') webVitals.LCP = entry.value
            if (entry.name === 'FID') webVitals.FID = entry.value
            if (entry.name === 'CLS') webVitals.CLS = entry.value
          })
          
          resolve(webVitals)
        }).observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'cumulative-layout-shift'] })
        
        // Trigger measurements
        setTimeout(() => resolve({}), 5000)
      })
    })
    
    // Core Web Vitals thresholds
    if (metrics.LCP) expect(metrics.LCP).toBeLessThan(2500) // 2.5s
    if (metrics.FID) expect(metrics.FID).toBeLessThan(100)  // 100ms
    if (metrics.CLS) expect(metrics.CLS).toBeLessThan(0.1)  // 0.1
  })

  test('glassmorphism performance impact', async ({ page }) => {
    // Measure without glassmorphism
    await page.goto('/dashboard?theme=default')
    const baselineTime = await page.evaluate(() => {
      const start = performance.now()
      // Trigger re-render
      document.dispatchEvent(new CustomEvent('test-render'))
      return performance.now() - start
    })
    
    // Measure with glassmorphism
    await page.goto('/dashboard?theme=siga')
    const glassTime = await page.evaluate(() => {
      const start = performance.now()
      // Trigger re-render
      document.dispatchEvent(new CustomEvent('test-render'))
      return performance.now() - start
    })
    
    // Performance impact should be minimal
    const impact = ((glassTime - baselineTime) / baselineTime) * 100
    expect(impact).toBeLessThan(20) // Less than 20% performance impact
  })
})
```

### User Acceptance Testing

```typescript
// Create UAT test scenarios
interface UATScenario {
  name: string
  description: string
  steps: string[]
  expectedOutcome: string
  priority: 'high' | 'medium' | 'low'
}

const uatScenarios: UATScenario[] = [
  {
    name: 'Initiative Creation with Glass UI',
    description: 'Test complete initiative creation flow with glassmorphism',
    steps: [
      'Navigate to dashboard with SIGA theme',
      'Click "Create Initiative" button',
      'Fill out initiative form with glass inputs',
      'Add activities using glass modals',
      'Submit form and verify creation'
    ],
    expectedOutcome: 'Initiative created successfully with smooth glass UI interactions',
    priority: 'high'
  },
  {
    name: 'Cross-Theme Consistency',
    description: 'Verify UI consistency across all tenant themes',
    steps: [
      'Test same workflow in default theme',
      'Switch to SIGA theme and repeat',
      'Switch to FEMA theme and repeat',
      'Switch to Stratix theme and repeat'
    ],
    expectedOutcome: 'Consistent functionality with appropriate theme styling',
    priority: 'high'
  },
  // ... more scenarios
]
```

### Documentation Updates

```markdown
# Post-Migration Documentation Checklist

## Updated Documentation
- [ ] Component API documentation
- [ ] Glassmorphism usage guide
- [ ] Migration guide (this document)
- [ ] Performance optimization guide
- [ ] Accessibility guidelines
- [ ] Theme customization guide

## New Documentation
- [ ] Design system overview
- [ ] Component examples and patterns
- [ ] Troubleshooting guide
- [ ] Best practices guide

## Team Resources
- [ ] Design system workshop materials
- [ ] Component storybook updated
- [ ] Development guidelines updated
- [ ] Code review checklist updated
```

---

## Rollback Strategy

### Automated Rollback

```typescript
// scripts/rollback-migration.ts
interface RollbackPlan {
  components: string[]
  files: string[]
  dependencies: string[]
}

async function rollbackMigration(plan: RollbackPlan) {
  console.log('Starting migration rollback...')
  
  // 1. Restore component files from backup
  for (const component of plan.components) {
    await restoreComponentFromBackup(component)
  }
  
  // 2. Update imports to use legacy components
  for (const file of plan.files) {
    await updateImportsToLegacy(file)
  }
  
  // 3. Restore package.json dependencies
  await restoreDependencies(plan.dependencies)
  
  // 4. Rebuild and test
  await runCommand('npm run build')
  await runCommand('npm run test')
  
  console.log('Rollback completed successfully')
}

// Emergency rollback script
if (process.argv.includes('--emergency')) {
  rollbackMigration({
    components: ['Button', 'Card', 'Input'],
    files: ['src/components/**/*.tsx'],
    dependencies: ['@radix-ui/react-*']
  })
}
```

### Manual Rollback Steps

```bash
# 1. Restore from git backup
git checkout migration-backup

# 2. Reset specific components
git checkout HEAD~1 -- src/components/ui/

# 3. Update imports
find src -name "*.tsx" -exec sed -i 's/@\/components\/ui/@\/components\/legacy/g' {} +

# 4. Reinstall dependencies
npm install

# 5. Rebuild
npm run build

# 6. Test critical paths
npm run test:critical
```

---

## Migration Success Metrics

### Key Performance Indicators

```typescript
interface MigrationMetrics {
  // Code Quality
  componentsCovered: number
  totalComponents: number
  testCoverage: number
  accessibilityScore: number
  
  // Performance
  bundleSizeChange: number // percentage
  renderTimeChange: number // milliseconds
  webVitalsImprovement: number // percentage
  
  // User Experience
  userSatisfactionScore: number
  bugReports: number
  featureAdoptionRate: number
  
  // Development
  developmentVelocity: number
  codeReviewTime: number // hours
  deploymentFrequency: number
}

const successCriteria: MigrationMetrics = {
  componentsCovered: 100, // All components migrated
  testCoverage: 95, // Maintain 95% test coverage
  accessibilityScore: 100, // No accessibility regressions
  bundleSizeChange: -5, // 5% reduction in bundle size
  renderTimeChange: 0, // No performance degradation
  webVitalsImprovement: 10, // 10% improvement in Core Web Vitals
  userSatisfactionScore: 4.5, // Out of 5
  bugReports: 0, // No critical bugs
  featureAdoptionRate: 80, // 80% of users use glassmorphism features
  developmentVelocity: 100, // Maintain current velocity
  codeReviewTime: 2, // Average 2 hours per review
  deploymentFrequency: 5 // 5 deployments per week
}
```

### Monitoring Dashboard

```typescript
// Create migration success dashboard
function MigrationSuccessDashboard() {
  const metrics = useMigrationMetrics()
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card variant="glass-subtle">
        <CardHeader>
          <CardTitle>Components Migrated</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {metrics.componentsCovered}/{metrics.totalComponents}
          </div>
          <Progress 
            value={(metrics.componentsCovered / metrics.totalComponents) * 100} 
            className="mt-2"
          />
        </CardContent>
      </Card>
      
      <Card variant="glass-subtle">
        <CardHeader>
          <CardTitle>Performance Impact</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-success">
            {metrics.bundleSizeChange > 0 ? '+' : ''}{metrics.bundleSizeChange}%
          </div>
          <p className="text-sm text-muted-foreground">Bundle size change</p>
        </CardContent>
      </Card>
      
      <Card variant="glass-subtle">
        <CardHeader>
          <CardTitle>User Satisfaction</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            {metrics.userSatisfactionScore}/5
          </div>
          <div className="flex mt-2">
            {[1,2,3,4,5].map(star => (
              <StarIcon 
                key={star}
                className={cn(
                  "h-4 w-4",
                  star <= metrics.userSatisfactionScore ? "fill-primary text-primary" : "text-muted"
                )}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

---

**Migration Guide Version**: 2.0.0  
**Last Updated**: August 14, 2025  
**Maintained By**: UI/UX Development Team

For additional support during migration, contact the design system team or refer to our [troubleshooting guide](./components.md#troubleshooting).