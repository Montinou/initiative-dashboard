# Button Component

## Purpose
A versatile button component built with Radix UI Slot and class-variance-authority (CVA) for consistent styling across the application. Supports multiple variants, sizes, and can render as child components.

## Usage

```typescript
import { Button } from '@/components/ui/button';

// Basic button
<Button>Click me</Button>

// Button variants
<Button variant="destructive">Delete</Button>
<Button variant="outline">Cancel</Button>
<Button variant="ghost">Subtle action</Button>

// Different sizes
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon">🎯</Button>

// As child component
<Button asChild>
  <Link href="/profile">Profile</Link>
</Button>
```

## Props

### ButtonProps Interface
```typescript
interface ButtonProps extends 
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `ButtonVariant` | `"default"` | Visual style variant |
| `size` | `ButtonSize` | `"default"` | Size of the button |
| `asChild` | `boolean` | `false` | Render as child component using Radix Slot |
| `className` | `string` | - | Additional CSS classes |
| `...props` | `ButtonHTMLAttributes` | - | Standard HTML button attributes |

### Variant Options
```typescript
type ButtonVariant = 
  | "default"      // Primary blue button
  | "destructive"  // Red danger button
  | "outline"      // Transparent with border
  | "secondary"    // Gray secondary button
  | "ghost"        // Transparent hover effect
  | "link"         // Text link styling
```

### Size Options
```typescript
type ButtonSize = 
  | "default"  // h-10 px-4 py-2
  | "sm"       // h-9 rounded-md px-3
  | "lg"       // h-11 rounded-md px-8
  | "icon"     // h-10 w-10 (square)
```

## Dependencies

### External Libraries
- `@radix-ui/react-slot` - Polymorphic component rendering
- `class-variance-authority` - Type-safe variant styling
- `React` - Core React functionality

### Internal Dependencies
- `@/lib/utils` - `cn()` utility for class name merging

## Styling System

### Class Variance Authority (CVA)
The button uses CVA for type-safe variant management:

```typescript
const buttonVariants = cva(
  // Base classes
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: { /* variant definitions */ },
    defaultVariants: { /* defaults */ }
  }
);
```

### Base Styling
- Flexbox layout with center alignment
- 2px gap between children elements
- Rounded corners with medium radius
- Smooth color transitions
- Focus ring for accessibility
- Disabled state handling
- SVG icon optimization

### Variant Styles

**Default** (`bg-primary text-primary-foreground hover:bg-primary/90`)
- Primary brand color background
- Contrasting foreground text
- 10% darker on hover

**Destructive** (`bg-destructive text-destructive-foreground hover:bg-destructive/90`)
- Red/danger color scheme
- Used for delete/remove actions
- 10% darker on hover

**Outline** (`border border-input bg-background hover:bg-accent hover:text-accent-foreground`)
- Transparent background with border
- Accent colors on hover
- Good for secondary actions

**Secondary** (`bg-secondary text-secondary-foreground hover:bg-secondary/80`)
- Gray color scheme
- 20% darker on hover
- Alternative to primary

**Ghost** (`hover:bg-accent hover:text-accent-foreground`)
- Fully transparent by default
- Accent background only on hover
- Minimal visual weight

**Link** (`text-primary underline-offset-4 hover:underline`)
- Text styling with primary color
- Underline effect on hover
- No background or border

## Advanced Features

### Polymorphic Rendering with asChild
The `asChild` prop uses Radix UI Slot for composition:

```typescript
// Renders as <a> element instead of <button>
<Button asChild>
  <Link href="/dashboard">
    Go to Dashboard
  </Link>
</Button>

// Renders as custom component
<Button asChild>
  <motion.div whileHover={{ scale: 1.05 }}>
    Animated Button
  </motion.div>
</Button>
```

### Forward Ref Support
Component properly forwards refs for imperative access:

```typescript
const buttonRef = useRef<HTMLButtonElement>(null);

<Button ref={buttonRef} onClick={() => buttonRef.current?.focus()}>
  Self-focusing button
</Button>
```

## Examples

### Loading State Button
```typescript
function LoadingButton({ loading, children, ...props }) {
  return (
    <Button disabled={loading} {...props}>
      {loading && <Spinner className="mr-2" />}
      {children}
    </Button>
  );
}
```

### Icon Button Variants
```typescript
import { Trash2, Edit, Plus } from 'lucide-react';

// Icon with text
<Button>
  <Plus className="w-4 h-4" />
  Add Item
</Button>

// Icon only
<Button size="icon" variant="ghost">
  <Edit className="w-4 h-4" />
</Button>

// Destructive action
<Button variant="destructive" size="sm">
  <Trash2 className="w-4 h-4" />
  Delete
</Button>
```

### Form Integration
```typescript
function ContactForm() {
  return (
    <form>
      <div className="flex gap-2">
        <Button type="submit">
          Submit
        </Button>
        <Button type="button" variant="outline">
          Cancel
        </Button>
        <Button type="reset" variant="ghost">
          Reset
        </Button>
      </div>
    </form>
  );
}
```

### Navigation Buttons
```typescript
function Navigation() {
  return (
    <nav className="flex gap-2">
      <Button asChild>
        <Link href="/dashboard">Dashboard</Link>
      </Button>
      <Button asChild variant="outline">
        <Link href="/settings">Settings</Link>
      </Button>
    </nav>
  );
}
```

## @sync Dependencies

### Depends On
- `@radix-ui/react-slot` - Polymorphic rendering capability
- `class-variance-authority` - Type-safe variant system
- `@/lib/utils` - Class name utility functions
- React forwardRef and HTMLButtonElement types

### Used By
- **Profile Dropdown** - Menu trigger and action buttons
- **OKR Dashboard** - Action buttons and filters
- **Form Components** - Submit, cancel, and reset buttons
- **Navigation** - Menu items and page navigation
- **Modal Dialogs** - Confirm, cancel, and action buttons
- **Data Tables** - Row actions and pagination

### Component Hierarchy
```
Button (polymorphic)
├── Slot (when asChild=true)
│   └── Child Component (Link, motion.div, etc.)
└── button (when asChild=false)
    ├── Icon (optional)
    └── Text Content
```

## Accessibility

### Keyboard Navigation
- Full keyboard support (Enter, Space)
- Focus management with visible focus rings
- Proper tab order integration

### Screen Reader Support
- Semantic button element by default
- Supports aria-* attributes through props
- Proper labeling for icon-only buttons

### Color Contrast
- All variants meet WCAG AA contrast requirements
- Focus indicators are clearly visible
- Disabled state provides clear visual feedback

## Performance Considerations

- **Bundle Size**: Minimal impact due to efficient CVA
- **Runtime**: Fast variant resolution with pre-compiled classes
- **Re-renders**: Optimized with React.forwardRef and stable variants
- **CSS**: Utility-first approach reduces CSS bundle size

## Testing Examples

### Unit Tests
```typescript
import { render, screen } from '@testing-library/react';
import { Button } from './button';

test('renders button with text', () => {
  render(<Button>Click me</Button>);
  expect(screen.getByRole('button')).toHaveTextContent('Click me');
});

test('applies variant classes correctly', () => {
  render(<Button variant="destructive">Delete</Button>);
  expect(screen.getByRole('button')).toHaveClass('bg-destructive');
});

test('renders as child component', () => {
  render(
    <Button asChild>
      <a href="/test">Link</a>
    </Button>
  );
  expect(screen.getByRole('link')).toBeInTheDocument();
});
```

### Integration Tests
```typescript
test('button click triggers handler', async () => {
  const handleClick = jest.fn();
  render(<Button onClick={handleClick}>Test</Button>);
  
  await user.click(screen.getByRole('button'));
  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

## Migration Notes

### From v1 to v2
- Added `asChild` prop for polymorphic rendering
- Updated variant system to use CVA
- Improved TypeScript support with VariantProps

### Breaking Changes
- Removed deprecated `color` prop (use `variant` instead)
- Changed size prop values (renamed `xs` to `sm`)

---

*File: `/components/ui/button.tsx`*
*Dependencies: Radix UI Slot, CVA, React, utils*
*Used by: All interactive components requiring button functionality*
*Last updated: Auto-generated from source code*