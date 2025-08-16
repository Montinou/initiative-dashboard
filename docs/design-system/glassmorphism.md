# Glassmorphism Implementation Guide

## Overview

Glassmorphism is a modern UI design trend that creates a frosted glass effect through transparency, blur, and subtle borders. This guide covers the implementation details, best practices, and accessibility considerations for glassmorphism in the Initiative Dashboard.

## Core Properties

### Essential CSS Properties

```css
/* Basic glassmorphism effect */
.glass {
  /* Semi-transparent background */
  background: rgba(255, 255, 255, 0.1);
  
  /* Backdrop blur */
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  
  /* Subtle border */
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  /* Soft shadow for depth */
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
  
  /* Rounded corners */
  border-radius: 10px;
}
```

## Implementation Patterns

### Tailwind Utility Classes

```html
<!-- Basic glass effect -->
<div class="
  bg-white/10 
  backdrop-blur-xl 
  border border-white/20 
  rounded-xl 
  shadow-2xl
">
  Content
</div>

<!-- Dark mode glass -->
<div class="
  bg-gray-900/50 
  dark:bg-white/5 
  backdrop-blur-lg 
  border border-gray-200/20 
  dark:border-white/10
">
  Content
</div>
```

### Component Implementation

#### Glass Card Component

```tsx
// components/ui/glass-card.tsx
import { cn } from '@/lib/utils'

interface GlassCardProps {
  variant?: 'light' | 'dark' | 'colored'
  blur?: 'sm' | 'md' | 'lg' | 'xl'
  opacity?: 'low' | 'medium' | 'high'
  className?: string
  children: React.ReactNode
}

const blurLevels = {
  sm: 'backdrop-blur-sm',
  md: 'backdrop-blur-md',
  lg: 'backdrop-blur-lg',
  xl: 'backdrop-blur-xl',
}

const opacityLevels = {
  low: 'bg-white/5',
  medium: 'bg-white/10',
  high: 'bg-white/20',
}

export function GlassCard({
  variant = 'light',
  blur = 'lg',
  opacity = 'medium',
  className,
  children,
}: GlassCardProps) {
  return (
    <div
      className={cn(
        // Base styles
        'rounded-xl border transition-all duration-200',
        
        // Blur effect
        blurLevels[blur],
        
        // Opacity
        variant === 'light' && opacityLevels[opacity],
        variant === 'dark' && 'bg-gray-900/50',
        variant === 'colored' && 'bg-gradient-to-br from-purple-500/10 to-blue-500/10',
        
        // Border
        'border-white/20',
        
        // Shadow
        'shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]',
        
        // Hover effect
        'hover:bg-white/15 hover:shadow-2xl',
        
        className
      )}
    >
      {children}
    </div>
  )
}
```

### Advanced Effects

#### Gradient Glass

```tsx
<div className="
  relative 
  overflow-hidden 
  rounded-xl 
  backdrop-blur-xl
">
  {/* Gradient overlay */}
  <div className="
    absolute 
    inset-0 
    bg-gradient-to-br 
    from-purple-500/20 
    via-transparent 
    to-blue-500/20
  " />
  
  {/* Glass effect */}
  <div className="
    relative 
    bg-white/10 
    border 
    border-white/20 
    p-6
  ">
    Content
  </div>
</div>
```

#### Animated Glass

```tsx
import { motion } from 'framer-motion'

export function AnimatedGlassCard({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, backdropFilter: 'blur(0px)' }}
      animate={{ opacity: 1, y: 0, backdropFilter: 'blur(12px)' }}
      transition={{ duration: 0.3 }}
      className="
        bg-white/10 
        border 
        border-white/20 
        rounded-xl 
        p-6
      "
    >
      {children}
    </motion.div>
  )
}
```

## Tenant-Specific Implementations

### SIGA Theme Glass

```css
/* Green-tinted glass for SIGA */
.glass-siga {
  background: linear-gradient(
    135deg,
    rgba(0, 183, 74, 0.1),
    rgba(255, 193, 7, 0.05)
  );
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 183, 74, 0.2);
}
```

### FEMA Theme Glass

```css
/* Blue-tinted glass for FEMA */
.glass-fema {
  background: linear-gradient(
    135deg,
    rgba(0, 83, 159, 0.1),
    rgba(255, 199, 44, 0.05)
  );
  backdrop-filter: blur(10px);
  border: 1px solid rgba(0, 83, 159, 0.2);
}
```

### Stratix Theme Glass

```css
/* Purple gradient glass for Stratix */
.glass-stratix {
  background: linear-gradient(
    135deg,
    rgba(139, 92, 246, 0.1),
    rgba(59, 130, 246, 0.05)
  );
  backdrop-filter: blur(12px);
  border: 1px solid rgba(139, 92, 246, 0.2);
  box-shadow: 
    0 0 30px rgba(139, 92, 246, 0.3),
    inset 0 0 20px rgba(139, 92, 246, 0.1);
}
```

## Performance Considerations

### Optimization Techniques

1. **Use sparingly:** Limit glassmorphism to key UI elements
2. **Reduce blur radius:** Lower values perform better
3. **GPU acceleration:** Use `transform: translateZ(0)` or `will-change: backdrop-filter`
4. **Conditional rendering:** Disable on low-end devices

```tsx
// Detect device capability
const useGlassmorphism = () => {
  const [canUseGlass, setCanUseGlass] = useState(true)
  
  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    
    // Check device performance
    const isLowEndDevice = navigator.hardwareConcurrency <= 2
    
    setCanUseGlass(!prefersReducedMotion && !isLowEndDevice)
  }, [])
  
  return canUseGlass
}
```

### Fallback Styles

```tsx
// Component with fallback
function GlassContainer({ children }) {
  const canUseGlass = useGlassmorphism()
  
  return (
    <div
      className={cn(
        'rounded-xl p-6',
        canUseGlass
          ? 'bg-white/10 backdrop-blur-lg border border-white/20'
          : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
      )}
    >
      {children}
    </div>
  )
}
```

## Accessibility Guidelines

### Color Contrast

Ensure sufficient contrast ratios:

```tsx
// Good contrast with glassmorphism
<div className="bg-white/20 backdrop-blur-lg">
  <h2 className="text-gray-900 dark:text-white font-semibold">
    {/* High contrast text */}
    Title Text
  </h2>
  <p className="text-gray-700 dark:text-gray-200">
    {/* Sufficient contrast for body text */}
    Body content
  </p>
</div>
```

### Focus Indicators

Provide clear focus states:

```css
.glass-interactive {
  transition: all 0.2s ease;
}

.glass-interactive:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
  backdrop-filter: blur(16px);
  background: rgba(255, 255, 255, 0.15);
}
```

### Screen Reader Support

```tsx
<div
  role="region"
  aria-label="Dashboard metrics"
  className="bg-white/10 backdrop-blur-lg"
>
  <h2 id="metrics-title">Performance Metrics</h2>
  <div aria-labelledby="metrics-title">
    {/* Content */}
  </div>
</div>
```

## Browser Compatibility

### Support Detection

```javascript
// Check for backdrop-filter support
const supportsBackdropFilter = CSS.supports('backdrop-filter', 'blur(10px)')
  || CSS.supports('-webkit-backdrop-filter', 'blur(10px)')

if (!supportsBackdropFilter) {
  // Apply fallback styles
  document.body.classList.add('no-backdrop-filter')
}
```

### Fallback Strategies

```css
/* Progressive enhancement */
.glass {
  /* Fallback for unsupported browsers */
  background: rgba(255, 255, 255, 0.95);
  
  /* Modern browsers */
  @supports (backdrop-filter: blur(10px)) {
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(10px);
  }
}
```

## Common Patterns

### Glass Navigation

```tsx
<nav className="
  fixed top-0 left-0 right-0 z-50
  bg-white/80 dark:bg-gray-900/80
  backdrop-blur-lg
  border-b border-white/20
">
  {/* Navigation items */}
</nav>
```

### Glass Modal

```tsx
<div className="
  fixed inset-0 z-50 
  flex items-center justify-center
  bg-black/20 backdrop-blur-sm
">
  <div className="
    bg-white/90 dark:bg-gray-900/90
    backdrop-blur-xl
    border border-white/20
    rounded-2xl p-6
    shadow-2xl
  ">
    {/* Modal content */}
  </div>
</div>
```

### Glass Tooltip

```tsx
<div className="
  absolute z-10
  bg-gray-900/90 dark:bg-white/90
  backdrop-blur-md
  border border-white/10
  rounded-lg px-3 py-2
  text-sm text-white dark:text-gray-900
">
  Tooltip content
</div>
```

## Testing Glassmorphism

### Visual Testing Checklist

- [ ] Effect visible on different backgrounds
- [ ] Readable text contrast
- [ ] Smooth animations/transitions
- [ ] Performance on mobile devices
- [ ] Fallback styles working
- [ ] Dark mode compatibility
- [ ] Cross-browser rendering

### Performance Metrics

Monitor these metrics when using glassmorphism:

1. **Paint time:** Should remain under 16ms
2. **Composite layers:** Minimize layer count
3. **GPU memory:** Watch for excessive usage
4. **Frame rate:** Maintain 60fps

## Best Practices Summary

### Do's
- Use for elevated UI elements
- Provide fallbacks for older browsers
- Test on various backgrounds
- Ensure text readability
- Use GPU acceleration hints
- Consider performance impact

### Don'ts
- Overuse the effect
- Apply to large areas
- Nest multiple glass layers
- Ignore accessibility
- Use without fallbacks
- Apply to text directly

## Code Examples Repository

Find complete examples in:
- `/components/ui/.archived-glassmorphism/` - Reference implementations
- `/components/stratix/` - Production usage in AI components
- `/components/dashboard/` - Dashboard card implementations

---

Last Updated: 2025-08-16