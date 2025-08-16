# Initiative Dashboard Design System

## Overview

The Initiative Dashboard Design System is a comprehensive collection of reusable components, design tokens, and guidelines that ensure consistency, accessibility, and maintainability across the multi-tenant OKR management platform.

## Core Principles

### 1. **Accessibility First**
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader optimization
- Touch-friendly targets (minimum 44x44px)
- High contrast modes support

### 2. **Multi-Tenant Theming**
- Dynamic color schemes per tenant (SIGA, FEMA, Stratix)
- CSS custom properties for runtime theming
- Dark mode support across all tenants
- Consistent spacing and typography

### 3. **Component-Based Architecture**
- Radix UI primitives for accessibility
- shadcn/ui components as foundation
- Composable component patterns
- TypeScript for type safety

### 4. **Performance Optimized**
- Lazy loading with React Suspense
- Code splitting at route level
- Optimized bundle sizes
- Memoization for expensive renders

### 5. **Responsive Design**
- Mobile-first approach
- Fluid typography and spacing
- Adaptive layouts
- Touch-optimized interactions

## Architecture

### Component Hierarchy

```
┌─────────────────────────────────────┐
│         Theme Provider              │
│  (next-themes + tenant context)     │
└─────────────────────────────────────┘
                  │
┌─────────────────────────────────────┐
│       Primitive Components          │
│     (Radix UI + shadcn/ui)         │
└─────────────────────────────────────┘
                  │
┌─────────────────────────────────────┐
│      Composite Components           │
│   (Business logic + patterns)       │
└─────────────────────────────────────┘
                  │
┌─────────────────────────────────────┐
│         Feature Components          │
│    (Page-specific components)       │
└─────────────────────────────────────┘
```

### Design Token Structure

```typescript
// Base tokens (CSS custom properties)
--background: 0 0% 100%
--foreground: 222.2 84% 4.9%
--primary: tenant-specific
--secondary: tenant-specific

// Semantic tokens
--card: var(--background)
--popover: var(--background)
--muted: 210 40% 96.1%
--accent: 210 40% 96.1%

// Component tokens
--radius: 0.5rem
--border: 214.3 31.8% 91.4%
--input: 214.3 31.8% 91.4%
--ring: var(--primary)
```

## Component Categories

### 1. **Foundation Components**
- Typography system
- Color palette
- Spacing scale
- Icons library
- Loading states

### 2. **Form Components**
- Input fields with validation
- Select dropdowns
- Date pickers
- File uploads
- Form layouts

### 3. **Data Display**
- Cards with variants
- Tables with sorting/filtering
- Charts and visualizations
- Progress indicators
- Timelines

### 4. **Navigation**
- Sidebar navigation
- Breadcrumbs
- Tabs
- Mobile navigation
- Role-based nav

### 5. **Feedback Components**
- Toasts and notifications
- Modals and dialogs
- Error boundaries
- Empty states
- Success states

### 6. **Layout Components**
- Page layouts
- Grid systems
- Flex containers
- Responsive wrappers
- Section dividers

## Glassmorphism Design

Our design system incorporates modern glassmorphism effects for enhanced visual hierarchy:

### Implementation Features
- Backdrop blur effects (`backdrop-blur-sm/md/lg/xl`)
- Semi-transparent backgrounds
- Subtle borders with opacity
- Depth through layering
- Dynamic lighting effects

### Usage Guidelines
- Reserve for elevated UI elements
- Ensure sufficient contrast
- Test across different backgrounds
- Provide fallbacks for older browsers

## Accessibility Standards

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Logical tab order maintained
- Focus indicators clearly visible
- Keyboard shortcuts documented

### Screen Reader Support
- Semantic HTML structure
- ARIA labels and descriptions
- Live regions for dynamic content
- Proper heading hierarchy

### Color Contrast
- Minimum 4.5:1 for normal text
- Minimum 3:1 for large text
- Tested across all theme variants
- High contrast mode support

## Responsive Breakpoints

```scss
// Tailwind default + extended
sm: 640px   // Mobile landscape
md: 768px   // Tablet portrait
lg: 1024px  // Tablet landscape
xl: 1280px  // Desktop
2xl: 1536px // Large desktop
3xl: 1920px // Full HD
4xl: 2560px // 4K displays
```

## Animation Guidelines

### Principles
- Purposeful animations only
- Respect reduced motion preferences
- Consistent timing functions
- Performance over complexity

### Standard Durations
- Instant: 0ms (immediate feedback)
- Fast: 150ms (hover states)
- Normal: 200ms (transitions)
- Slow: 300ms (page transitions)
- Deliberate: 500ms (complex animations)

## Multi-Tenant Theming

### SIGA Theme
- Primary: Green (#00B74A)
- Secondary: Yellow (#FFC107)
- Dark mode optimized
- Agriculture/sustainability focus

### FEMA Theme
- Primary: Blue (#00539F)
- Secondary: Yellow (#FFC72C)
- Government/emergency management
- High contrast requirements

### Stratix Theme
- Primary: Purple gradient
- Secondary: Blue accent
- AI/tech focused
- Glassmorphism enhanced

## File Organization

```
components/
├── ui/                 # Primitive components
│   ├── button.tsx
│   ├── card.tsx
│   └── ...
├── dashboard/          # Dashboard-specific
│   ├── EnhancedInitiativeCard.tsx
│   └── ...
├── forms/             # Form components
│   ├── InitiativeForm.tsx
│   └── ...
├── charts/            # Data visualizations
│   ├── ProgressRing.tsx
│   └── ...
└── providers/         # Context providers
    └── ThemeProvider.tsx
```

## Best Practices

### Component Development
1. Start with accessibility requirements
2. Use TypeScript for all components
3. Implement proper error boundaries
4. Include loading and error states
5. Write comprehensive prop documentation

### Styling Guidelines
1. Use Tailwind utilities first
2. Create reusable variants with CVA
3. Avoid inline styles
4. Use CSS custom properties for theming
5. Test across all supported browsers

### Performance Optimization
1. Lazy load heavy components
2. Implement virtual scrolling for lists
3. Optimize images with Next.js Image
4. Use React.memo for expensive renders
5. Monitor bundle size regularly

## Testing Requirements

### Unit Testing
- Component behavior
- Accessibility compliance
- Theme switching
- Responsive layouts

### Visual Testing
- Cross-browser rendering
- Theme consistency
- Responsive breakpoints
- Dark mode support

### Performance Testing
- Initial load time
- Time to interactive
- Bundle size analysis
- Runtime performance

## Documentation Standards

Every component should include:
1. Purpose and use cases
2. Props documentation with types
3. Usage examples
4. Accessibility notes
5. Performance considerations
6. Theme customization options

## Migration Path

For teams migrating from legacy components:
1. Audit existing component usage
2. Map to new design system components
3. Update imports gradually
4. Test thoroughly at each step
5. Remove deprecated components

## Resources

- [Component Catalog](./components.md)
- [Glassmorphism Guide](./glassmorphism.md)
- [Theme System](./theme-system.md)
- [Accessibility Guide](./accessibility.md)
- [Responsive Design](./responsive-design.md)
- [Migration Guide](./migration.md)

## Version History

- **v2.0.0** - Current version with glassmorphism and multi-tenant theming
- **v1.5.0** - Added Radix UI primitives
- **v1.0.0** - Initial design system

---

Last Updated: 2025-08-16