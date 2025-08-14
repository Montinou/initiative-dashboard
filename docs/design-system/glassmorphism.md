# Glassmorphism Design Guide

This guide provides comprehensive documentation for implementing and using glassmorphism effects in the Initiative Dashboard Design System.

## Table of Contents

- [Introduction](#introduction)
- [Design Principles](#design-principles)
- [Implementation System](#implementation-system)
- [Component Integration](#component-integration)
- [Performance Optimization](#performance-optimization)
- [Browser Compatibility](#browser-compatibility)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

---

## Introduction

Glassmorphism is a design trend that creates a translucent, glass-like aesthetic using backdrop filters, transparency, and subtle borders. Our implementation provides a comprehensive system of glass effects that integrate seamlessly with shadcn/ui components while maintaining accessibility and performance standards.

### When to Use Glassmorphism

**✅ Appropriate Use Cases:**
- Branded tenant themes (SIGA, FEMA, Stratix)
- Hero sections and landing areas
- Overlay components (modals, dropdowns)
- Interactive cards and panels
- Modern dashboard interfaces

**❌ Avoid When:**
- Text readability is compromised
- Performance is critical (mobile/low-end devices)
- Default/professional theme is required
- Accessibility needs highest priority

---

## Design Principles

### Visual Hierarchy

1. **Transparency Levels**: Use varying opacity to create depth
2. **Blur Intensity**: Different blur amounts for different importance levels
3. **Border Definition**: Subtle borders to define glass surfaces
4. **Color Tinting**: Light color overlays for brand consistency

### Accessibility First

- **Contrast Ratios**: Maintain WCAG 2.1 AA compliance
- **Fallback Support**: Graceful degradation for unsupported browsers
- **Motion Sensitivity**: Respect `prefers-reduced-motion`
- **Focus Indicators**: Enhanced visibility on glass elements

### Performance Considerations

- **GPU Acceleration**: CSS-based implementation using GPU
- **Selective Application**: Applied only where beneficial
- **Efficient Rendering**: Optimized backdrop-filter usage
- **Memory Management**: Minimal impact on rendering performance

---

## Implementation System

### Core Glass Classes

#### Base Effects

```css
/* Light glass effect - subtle blur with transparency */
.glass-effect-subtle {
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  background-color: hsl(var(--background) / 0.5);
  border: 1px solid hsl(var(--border) / 0.1);
}

/* Standard glass effect - balanced blur and transparency */
.glass-effect {
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  background-color: hsl(var(--background) / 0.7);
  border: 1px solid hsl(var(--border) / 0.2);
}

/* Strong glass effect - heavy blur with high opacity */
.glass-effect-strong {
  backdrop-filter: blur(40px);
  -webkit-backdrop-filter: blur(40px);
  background-color: hsl(var(--background) / 0.9);
  border: 1px solid hsl(var(--border) / 0.3);
}
```

#### Color Variants

```css
/* Primary glass - brand colored */
.glass-primary {
  background-color: hsl(var(--primary) / 0.8);
  border-color: hsl(var(--primary) / 0.5);
  color: hsl(var(--primary-foreground));
}

/* Secondary glass - secondary brand color */
.glass-secondary {
  background-color: hsl(var(--secondary) / 0.8);
  border-color: hsl(var(--secondary) / 0.5);
  color: hsl(var(--secondary-foreground));
}

/* Accent glass - accent color variant */
.glass-accent {
  background-color: hsl(var(--accent) / 0.8);
  border-color: hsl(var(--accent) / 0.5);
  color: hsl(var(--accent-foreground));
}

/* Success glass - green glass for positive actions */
.glass-success {
  background-color: hsl(var(--success) / 0.8);
  border-color: hsl(var(--success) / 0.5);
  color: hsl(var(--success-foreground));
}

/* Destructive glass - red glass for dangerous actions */
.glass-destructive {
  background-color: hsl(var(--destructive) / 0.8);
  border-color: hsl(var(--destructive) / 0.5);
  color: hsl(var(--destructive-foreground));
}

/* Ghost glass - transparent with minimal styling */
.glass-ghost {
  background-color: transparent;
  border-color: transparent;
  color: hsl(var(--foreground));
}
```

#### Interactive States

```css
/* Hover effects for glass elements */
.glass-hover:hover {
  background-color: hsl(var(--background) / 0.9);
  border-color: hsl(var(--border) / 0.4);
  transform: translateY(-1px);
  box-shadow: 0 10px 25px -5px hsl(var(--foreground) / 0.1);
}

/* Focus effects with enhanced visibility */
.glass-focus:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px hsl(var(--ring) / 0.5);
  border-color: hsl(var(--primary) / 0.6);
}

/* Active state with subtle scaling */
.glass-active:active {
  transform: translateY(0);
  scale: 0.98;
}
```

#### Special Effects

```css
/* Glow effect for emphasis */
.glass-glow {
  box-shadow: 0 0 20px hsl(var(--primary) / 0.4);
}

/* Strong glow for high emphasis */
.glass-glow-strong {
  box-shadow: 0 0 30px hsl(var(--primary) / 0.6);
}

/* Elevated shadow for depth */
.glass-elevated {
  box-shadow: 0 25px 50px -12px hsl(var(--foreground) / 0.25);
}
```

### Pre-built Component Classes

#### Glass Button

```css
.glass-button {
  @apply glass-effect glass-primary rounded-lg glass-hover glass-focus glass-active transition-all duration-200 min-h-[44px] min-w-[44px] shadow-lg;
}

.glass-button-ghost {
  @apply glass-effect-subtle glass-ghost rounded-lg glass-hover glass-focus glass-active transition-all duration-200 min-h-[44px] min-w-[44px];
}

.glass-button-outline {
  @apply glass-effect-subtle rounded-lg glass-hover glass-focus glass-active transition-all duration-200 min-h-[44px] min-w-[44px] border-2;
  border-color: hsl(var(--border) / 0.6);
}
```

#### Glass Card

```css
.glass-card {
  @apply glass-effect rounded-xl glass-elevated;
}

.glass-card-interactive {
  @apply glass-card glass-hover transition-all duration-200 cursor-pointer;
}
```

#### Glass Input

```css
.glass-input {
  @apply glass-effect-subtle rounded-lg glass-focus transition-all duration-200;
  background-color: hsl(var(--background) / 0.7);
}

.glass-input:focus {
  background-color: hsl(var(--background) / 0.9);
}
```

---

## Component Integration

### Enhanced Button Component

The Button component includes glassmorphism variants that automatically apply appropriate glass effects:

```tsx
// Basic glass button
<Button variant="glass">Glass Button</Button>

// Glass button with effects
<Button variant="glass" effect="glow">Glowing Button</Button>

// Success glass button
<Button variant="glass-success">Success Action</Button>

// Destructive glass button
<Button variant="glass-destructive">Delete Item</Button>
```

#### Implementation Details

```tsx
const buttonVariants = cva(
  "base-button-classes",
  {
    variants: {
      variant: {
        // Standard variants...
        glass: "glass-button",
        "glass-ghost": "glass-button-ghost",
        "glass-outline": "glass-button-outline",
        "glass-destructive": "glass-effect glass-destructive rounded-lg glass-hover glass-focus glass-active transition-all duration-200 min-h-[44px] min-w-[44px] shadow-lg",
        "glass-success": "glass-effect glass-success rounded-lg glass-hover glass-focus glass-active transition-all duration-200 min-h-[44px] min-w-[44px] shadow-lg",
      },
      effect: {
        none: "",
        glow: "glass-glow",
        "glow-strong": "glass-glow-strong",
        elevated: "glass-elevated",
      }
    }
  }
)
```

### Enhanced Card Component

Cards support multiple glassmorphism variants for different use cases:

```tsx
// Subtle glass card
<Card variant="glass-subtle">
  <CardContent>Light glass effect</CardContent>
</Card>

// Interactive glass card
<Card variant="glass-interactive" onClick={handleClick}>
  <CardContent>Clickable glass card</CardContent>
</Card>

// Strong glass card with glow
<Card variant="glass-strong" effect="glow">
  <CardContent>Prominent glass card</CardContent>
</Card>
```

#### Implementation Details

```tsx
const cardVariants = cva(
  "base-card-classes",
  {
    variants: {
      variant: {
        // Standard variants...
        glass: "glass-card",
        "glass-interactive": "glass-card-interactive",
        "glass-subtle": "glass-effect-subtle rounded-xl",
        "glass-strong": "glass-effect-strong rounded-xl glass-elevated",
      },
      effect: {
        none: "",
        glow: "glass-glow",
        "glow-strong": "glass-glow-strong",
        elevated: "glass-elevated",
        hover: "glass-hover",
      }
    }
  }
)
```

### Dialog and Modal Components

Glass effects enhance overlay components by creating visual depth:

```tsx
// Glass modal dialog
<DialogContent className="glassmorphic-modal">
  <DialogHeader>
    <DialogTitle>Glass Modal</DialogTitle>
  </DialogHeader>
  <DialogFooter>
    <Button variant="glass-ghost">Cancel</Button>
    <Button variant="glass">Confirm</Button>
  </DialogFooter>
</DialogContent>

// Glass dropdown menu
<DropdownMenuContent className="glassmorphic-dropdown">
  <DropdownMenuItem>Option 1</DropdownMenuItem>
  <DropdownMenuItem>Option 2</DropdownMenuItem>
</DropdownMenuContent>
```

### Form Components

Glass effects can be applied to form elements for cohesive branding:

```tsx
// Glass input field
<Input variant="glass" placeholder="Enter text..." />

// Glass select dropdown
<SelectTrigger className="glass-input">
  <SelectValue placeholder="Select option" />
</SelectTrigger>
<SelectContent className="glassmorphic-dropdown">
  <SelectItem value="option1">Option 1</SelectItem>
</SelectContent>

// Glass form layout
<Card variant="glass-subtle" className="p-6">
  <Form>
    <FormField
      name="example"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Glass Form Field</FormLabel>
          <FormControl>
            <Input variant="glass" {...field} />
          </FormControl>
        </FormItem>
      )}
    />
  </Form>
</Card>
```

---

## Performance Optimization

### GPU Acceleration

Glass effects utilize CSS `backdrop-filter` which is GPU-accelerated in modern browsers:

```css
/* Optimized for GPU rendering */
.glass-effect {
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px); /* Safari support */
  will-change: backdrop-filter; /* Hint for GPU layer */
  transform: translateZ(0); /* Force GPU layer */
}
```

### Conditional Application

Apply glass effects only when appropriate:

```tsx
function GlassComponent({ useGlass = false, children }) {
  const theme = useTheme()
  
  // Only apply glass effects for certain themes
  const shouldUseGlass = useGlass && 
    ['siga', 'fema', 'stratix'].includes(theme.tenant)
  
  return (
    <div className={cn(
      "base-component-classes",
      shouldUseGlass && "glass-effect"
    )}>
      {children}
    </div>
  )
}
```

### Performance Monitoring

```tsx
// Monitor glass effect performance
function useGlassPerformance() {
  useEffect(() => {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      entries.forEach((entry) => {
        if (entry.name.includes('backdrop-filter')) {
          console.log('Glass effect render time:', entry.duration)
        }
      })
    })
    
    observer.observe({ entryTypes: ['measure'] })
    
    return () => observer.disconnect()
  }, [])
}
```

### Memory Optimization

```css
/* Efficient memory usage */
.glass-effect {
  /* Use transform3d instead of transform for GPU efficiency */
  transform: translate3d(0, 0, 0);
  
  /* Limit blur radius for memory efficiency */
  backdrop-filter: blur(24px); /* Optimal balance */
  
  /* Avoid excessive shadow blur */
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1); /* Reasonable blur */
}
```

---

## Browser Compatibility

### Support Matrix

| Browser | Backdrop Filter | CSS Masks | Performance |
|---------|----------------|-----------|-------------|
| Chrome 76+ | ✅ Full | ✅ Full | Excellent |
| Firefox 103+ | ✅ Full | ✅ Full | Good |
| Safari 14+ | ✅ Full | ✅ Full | Excellent |
| Edge 79+ | ✅ Full | ✅ Full | Excellent |
| iOS Safari 14+ | ✅ Full | ✅ Full | Good |
| Android Chrome | ✅ Full | ✅ Full | Variable |

### Fallback Strategy

```css
/* Progressive enhancement approach */
.glass-effect {
  /* Fallback for unsupported browsers */
  background-color: hsl(var(--background) / 0.95);
  border: 1px solid hsl(var(--border) / 0.3);
  
  /* Modern browsers with backdrop-filter support */
  @supports (backdrop-filter: blur(1px)) {
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    background-color: hsl(var(--background) / 0.7);
  }
}
```

### Feature Detection

```tsx
function useBackdropFilterSupport() {
  const [isSupported, setIsSupported] = useState(false)
  
  useEffect(() => {
    const testElement = document.createElement('div')
    testElement.style.backdropFilter = 'blur(1px)'
    
    setIsSupported(
      testElement.style.backdropFilter === 'blur(1px)' ||
      testElement.style.webkitBackdropFilter === 'blur(1px)'
    )
  }, [])
  
  return isSupported
}

// Usage
function GlassComponent() {
  const supportsBackdrop = useBackdropFilterSupport()
  
  return (
    <div className={cn(
      "base-styles",
      supportsBackdrop ? "glass-effect" : "fallback-styles"
    )}>
      Content
    </div>
  )
}
```

---

## Best Practices

### Design Guidelines

#### 1. Maintain Contrast

```tsx
// ✅ Good: Ensure sufficient contrast
<Card variant="glass-subtle">
  <CardContent className="text-foreground font-medium">
    Readable text on glass
  </CardContent>
</Card>

// ❌ Avoid: Low contrast text
<Card variant="glass-strong">
  <CardContent className="text-muted-foreground">
    Hard to read text
  </CardContent>
</Card>
```

#### 2. Layer Appropriately

```tsx
// ✅ Good: Logical layering
<div className="relative">
  <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20" />
  <Card variant="glass" className="relative z-10">
    <CardContent>Content above background</CardContent>
  </Card>
</div>

// ❌ Avoid: Conflicting layers
<Card variant="glass">
  <Card variant="glass">Nested glass effects</Card>
</Card>
```

#### 3. Use Semantic Colors

```tsx
// ✅ Good: Semantic glass usage
<Button variant="glass-success">Save Changes</Button>
<Button variant="glass-destructive">Delete Item</Button>
<Alert variant="warning" className="glass-effect-subtle">
  Warning message
</Alert>

// ❌ Avoid: Mismatched semantics
<Button variant="glass-destructive">Save Changes</Button>
<Alert variant="success" className="glass-destructive">
  Success message
</Alert>
```

### Implementation Best Practices

#### 1. Conditional Glass Effects

```tsx
function ThemeAwareComponent({ children }) {
  const { theme } = useTheme()
  
  // Only apply glass effects for branded themes
  const useGlass = ['siga', 'fema', 'stratix'].includes(theme.tenant)
  
  return (
    <Card variant={useGlass ? "glass" : "default"}>
      {children}
    </Card>
  )
}
```

#### 2. Performance Considerations

```tsx
// ✅ Good: Lazy load glass effects
const GlassCard = lazy(() => import('./components/GlassCard'))

function Dashboard() {
  const { theme } = useTheme()
  
  if (theme.tenant === 'default') {
    return <StandardCard />
  }
  
  return (
    <Suspense fallback={<CardSkeleton />}>
      <GlassCard />
    </Suspense>
  )
}

// ✅ Good: Conditional rendering
function ConditionalGlass({ useGlass, children }) {
  if (!useGlass) {
    return <Card variant="default">{children}</Card>
  }
  
  return <Card variant="glass">{children}</Card>
}
```

#### 3. Accessibility Integration

```tsx
// ✅ Good: Maintain accessibility with glass effects
<Button 
  variant="glass" 
  aria-label="Save document"
  className="focus:ring-2 focus:ring-primary/50"
>
  <SaveIcon className="h-4 w-4" />
  <span className="sr-only">Save</span>
</Button>

// ✅ Good: Enhanced focus for glass elements
<Input
  variant="glass"
  className="focus:backdrop-blur-sm focus:bg-background/90"
  aria-describedby="input-help"
/>
```

### Common Patterns

#### Hero Section with Glass Cards

```tsx
function HeroSection() {
  return (
    <section className="relative min-h-screen bg-gradient-to-br from-primary/20 via-background to-secondary/20">
      <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10" />
      
      <div className="relative z-10 container mx-auto px-4 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card variant="glass" effect="glow" className="p-6">
            <h3 className="text-xl font-semibold mb-4">Feature One</h3>
            <p className="text-muted-foreground">Description of feature</p>
          </Card>
          
          <Card variant="glass-strong" effect="elevated" className="p-6">
            <h3 className="text-xl font-semibold mb-4">Feature Two</h3>
            <p className="text-muted-foreground">Description of feature</p>
          </Card>
          
          <Card variant="glass" effect="hover" className="p-6">
            <h3 className="text-xl font-semibold mb-4">Feature Three</h3>
            <p className="text-muted-foreground">Description of feature</p>
          </Card>
        </div>
      </div>
    </section>
  )
}
```

#### Dashboard with Glass Elements

```tsx
function GlassDashboard() {
  return (
    <div className="space-y-6">
      {/* Glass metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.id} variant="glass-subtle" className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{metric.label}</p>
                <p className="text-2xl font-bold">{metric.value}</p>
              </div>
              <metric.icon className="h-8 w-8 text-primary" />
            </div>
          </Card>
        ))}
      </div>
      
      {/* Glass data table */}
      <Card variant="glass" className="p-6">
        <CardHeader>
          <CardTitle>Recent Activities</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable data={activities} />
        </CardContent>
      </Card>
    </div>
  )
}
```

---

## Troubleshooting

### Common Issues

#### 1. Blurry Text

**Problem**: Text appears blurry on glass elements
**Solution**: Adjust blur intensity and background opacity

```css
/* ❌ Too much blur causing text issues */
.glass-effect-problematic {
  backdrop-filter: blur(50px);
  background-color: hsl(var(--background) / 0.3);
}

/* ✅ Balanced blur for text readability */
.glass-effect-optimized {
  backdrop-filter: blur(20px);
  background-color: hsl(var(--background) / 0.8);
}
```

#### 2. Performance Issues

**Problem**: Sluggish animations and interactions
**Solution**: Optimize glass usage and reduce concurrent effects

```tsx
// ❌ Too many glass effects
function OverdoneGlass() {
  return (
    <div className="glass-effect">
      <Card variant="glass">
        <Button variant="glass">
          <span className="glass-effect">Text</span>
        </Button>
      </Card>
    </div>
  )
}

// ✅ Strategic glass usage
function OptimizedGlass() {
  return (
    <Card variant="glass">
      <Button variant="outline">Standard Button</Button>
    </Card>
  )
}
```

#### 3. Browser Compatibility

**Problem**: Glass effects not appearing in older browsers
**Solution**: Implement proper fallbacks

```css
.glass-with-fallback {
  /* Fallback styles */
  background-color: hsl(var(--background) / 0.95);
  border: 1px solid hsl(var(--border));
  
  /* Progressive enhancement */
  @supports (backdrop-filter: blur(1px)) {
    backdrop-filter: blur(24px);
    background-color: hsl(var(--background) / 0.7);
  }
}
```

#### 4. Color Contrast Issues

**Problem**: Insufficient contrast on glass elements
**Solution**: Enhance text styling and background opacity

```tsx
// ❌ Poor contrast
<Card variant="glass-subtle">
  <p className="text-muted-foreground">Hard to read</p>
</Card>

// ✅ Enhanced contrast
<Card variant="glass-subtle">
  <p className="text-foreground font-medium drop-shadow-sm">
    Easy to read
  </p>
</Card>
```

### Debugging Tools

#### CSS Debugging

```css
/* Debug glass effects */
.debug-glass {
  outline: 2px solid red;
  background-color: rgba(255, 0, 0, 0.1) !important;
}

/* Check backdrop filter support */
@supports not (backdrop-filter: blur(1px)) {
  .glass-effect::before {
    content: "Backdrop filter not supported";
    position: absolute;
    top: 0;
    left: 0;
    background: red;
    color: white;
    padding: 4px;
    font-size: 12px;
  }
}
```

#### JavaScript Debugging

```tsx
function GlassDebugger() {
  useEffect(() => {
    // Check for glass effect performance
    const glassElements = document.querySelectorAll('[class*="glass"]')
    
    console.log(`Found ${glassElements.length} glass elements`)
    
    glassElements.forEach((el, index) => {
      const computedStyle = window.getComputedStyle(el)
      console.log(`Glass element ${index}:`, {
        backdropFilter: computedStyle.backdropFilter,
        backgroundColor: computedStyle.backgroundColor,
        borderColor: computedStyle.borderColor,
      })
    })
  }, [])
  
  return null
}
```

### Performance Profiling

```tsx
function useGlassPerformanceProfiler() {
  useEffect(() => {
    const startTime = performance.now()
    
    // Monitor glass rendering performance
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === 1 && node.classList.contains('glass-effect')) {
              const renderTime = performance.now() - startTime
              console.log(`Glass element rendered in ${renderTime}ms`)
            }
          })
        }
      })
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
    
    return () => observer.disconnect()
  }, [])
}
```

---

## Migration from Legacy Glass

### From Custom Glass to Design System

#### Before (Legacy)

```css
/* Old custom glass implementation */
.custom-glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
```

#### After (Design System)

```tsx
// New design system approach
<Card variant="glass-subtle">
  <CardContent>Upgraded glass effect</CardContent>
</Card>

// Or with utility classes
<div className="glass-effect-subtle rounded-lg">
  Content with design system glass
</div>
```

### Migration Steps

1. **Audit Existing Glass Usage**
   ```bash
   # Find all custom glass implementations
   grep -r "backdrop-filter" src/
   grep -r "rgba.*0\." src/styles/
   ```

2. **Map to Design System Classes**
   ```tsx
   // Old: Custom class
   <div className="custom-glass-card">
   
   // New: Design system variant
   <Card variant="glass">
   ```

3. **Update Component Props**
   ```tsx
   // Old: Manual styling
   <Button className="backdrop-blur-md bg-white/20">
   
   // New: Built-in variant
   <Button variant="glass">
   ```

4. **Test Across Themes**
   ```tsx
   // Ensure glass effects work across all tenants
   function TestGlassAcrossThemes() {
     const themes = ['default', 'siga', 'fema', 'stratix']
     
     return themes.map(theme => (
       <div key={theme} data-tenant={theme}>
         <Card variant="glass">Test in {theme} theme</Card>
       </div>
     ))
   }
   ```

---

**Glassmorphism Guide Version**: 2.0.0  
**Last Updated**: August 14, 2025  
**Maintained By**: UI/UX Development Team

For practical implementation examples, see [Examples & Patterns](./examples.md).