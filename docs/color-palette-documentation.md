# Color Palette Documentation

## CSS Variable-Based Theming System

This document outlines the complete color palette system for the Initiative Dashboard, featuring tenant-specific themes with automatic detection and CSS custom properties.

## Theme Architecture

### CSS Variable Structure

All colors are defined using HSL values in CSS custom properties, allowing for dynamic theming based on the `data-tenant` attribute.

```css
/* Example structure */
:root {
  --primary: 215 25% 27%;         /* H S L values */
  --primary-foreground: 0 0% 98%; /* Corresponding text color */
}

/* Usage in components */
.button {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
```

## Color Categories

### Core Colors
- **Primary**: Main brand color for buttons, links, and key UI elements
- **Secondary**: Secondary brand color for accents and highlights
- **Accent**: Tertiary color for special highlights and interactive elements

### Background & Surface Colors
- **Background**: Main page background
- **Foreground**: Primary text color
- **Card**: Card background color
- **Card Foreground**: Text color on cards
- **Popover**: Dropdown/modal background
- **Popover Foreground**: Text color in dropdowns/modals

### UI Element Colors
- **Muted**: Subtle background for secondary areas
- **Muted Foreground**: Subdued text color
- **Border**: Default border color
- **Input**: Input field background
- **Ring**: Focus ring color

### Semantic Colors
- **Destructive**: Error states and dangerous actions
- **Success**: Success states and positive feedback
- **Warning**: Warning states and caution indicators
- **Info**: Information states and neutral feedback

### Chart Colors
- **Chart 1-5**: Data visualization color palette

### Sidebar Colors
- **Sidebar Background**: Sidebar background color
- **Sidebar Foreground**: Sidebar text color
- **Sidebar Primary**: Sidebar active/selected states
- **Sidebar Accent**: Sidebar hover states
- **Sidebar Border**: Sidebar border and divider color

## Tenant-Specific Color Schemes

### Default Theme (Professional Neutral)
**Target**: Business-agnostic professional appearance

```css
:root {
  /* Core Colors */
  --primary: 215 25% 27%;         /* Professional slate blue */
  --primary-foreground: 0 0% 98%;
  --secondary: 220 13% 91%;       /* Light slate */
  --secondary-foreground: 215 25% 27%;
  --accent: 168 76% 36%;          /* Cool teal accent */
  --accent-foreground: 0 0% 98%;
  
  /* Semantic Colors */
  --success: 142 71% 45%;         /* Professional green */
  --warning: 38 92% 50%;          /* Professional orange */
  --info: 199 89% 48%;            /* Professional blue */
  --destructive: 0 84% 60%;       /* Professional red */
}
```

**Color Preview:**
- Primary: ![#475569](https://via.placeholder.com/20/475569/000000?text=+) `#475569`
- Secondary: ![#E2E8F0](https://via.placeholder.com/20/E2E8F0/000000?text=+) `#E2E8F0`
- Accent: ![#0F766E](https://via.placeholder.com/20/0F766E/000000?text=+) `#0F766E`

### SIGA Turismo Theme (Professional Blues & Grays)
**Target**: Tourism company with professional, trustworthy appearance

```css
[data-tenant="siga"] {
  /* Core Colors */
  --primary: 211 100% 35%;        /* Deep professional blue */
  --primary-foreground: 0 0% 100%;
  --secondary: 217 20% 85%;       /* Light blue-gray */
  --secondary-foreground: 211 39% 23%;
  --accent: 199 89% 48%;          /* Bright blue accent */
  --accent-foreground: 0 0% 100%;
  
  /* Background */
  --background: 210 25% 97%;      /* Light blue-tinted background */
  --foreground: 222 47% 16%;      /* Dark blue-gray text */
}
```

**Color Preview:**
- Primary: ![#005A9F](https://via.placeholder.com/20/005A9F/000000?text=+) `#005A9F`
- Secondary: ![#CBD5E1](https://via.placeholder.com/20/CBD5E1/000000?text=+) `#CBD5E1`
- Accent: ![#0EA5E9](https://via.placeholder.com/20/0EA5E9/000000?text=+) `#0EA5E9`

### FEMA Electricidad Theme (Emergency Greens & Yellows)
**Target**: Electrical utility company with safety and reliability focus

```css
[data-tenant="fema"] {
  /* Core Colors */
  --primary: 142 71% 35%;         /* Emergency green */
  --primary-foreground: 0 0% 100%;
  --secondary: 50 98% 64%;        /* Bright warning yellow */
  --secondary-foreground: 142 71% 25%;
  --accent: 162 63% 46%;          /* Teal-green accent */
  --accent-foreground: 0 0% 100%;
  
  /* Background */
  --background: 143 8% 97%;       /* Light green-tinted background */
  --foreground: 155 20% 15%;      /* Dark green-gray text */
}
```

**Color Preview:**
- Primary: ![#059669](https://via.placeholder.com/20/059669/000000?text=+) `#059669`
- Secondary: ![#FDE047](https://via.placeholder.com/20/FDE047/000000?text=+) `#FDE047`
- Accent: ![#0D9488](https://via.placeholder.com/20/0D9488/000000?text=+) `#0D9488`

### Stratix Platform Theme (Tech Purples & Pinks)
**Target**: Technology platform with modern, innovative appearance

```css
[data-tenant="stratix"] {
  /* Core Colors */
  --primary: 271 91% 65%;         /* Vibrant purple */
  --primary-foreground: 0 0% 100%;
  --secondary: 333 71% 71%;       /* Soft pink */
  --secondary-foreground: 0 0% 100%;
  --accent: 280 68% 60%;          /* Purple-pink accent */
  --accent-foreground: 0 0% 100%;
  
  /* Background */
  --background: 271 20% 96%;      /* Light purple-tinted background */
  --foreground: 271 50% 15%;      /* Dark purple text */
}
```

**Color Preview:**
- Primary: ![#8B5CF6](https://via.placeholder.com/20/8B5CF6/000000?text=+) `#8B5CF6`
- Secondary: ![#F472B6](https://via.placeholder.com/20/F472B6/000000?text=+) `#F472B6`
- Accent: ![#A855F7](https://via.placeholder.com/20/A855F7/000000?text=+) `#A855F7`

## Dark Mode Support

Each tenant theme includes dark mode variants that maintain brand identity while providing optimal readability in low-light conditions.

### Dark Mode Implementation

```css
/* Default dark mode */
.dark {
  --primary: 210 40% 90%;
  --background: 222 84% 5%;
  --card: 217 33% 12%;
  --border: 215 28% 22%;
}

/* Tenant-specific dark modes */
[data-tenant="siga"].dark {
  --primary: 211 100% 70%;
  --background: 222 47% 8%;
}

[data-tenant="fema"].dark {
  --primary: 142 71% 60%;
  --background: 155 20% 8%;
}

[data-tenant="stratix"].dark {
  --primary: 271 91% 75%;
  --background: 271 50% 8%;
}
```

## Usage Guidelines

### Component Implementation

Use CSS variables consistently across all components:

```tsx
// ✅ Correct - Using CSS variables
<button className="bg-primary text-primary-foreground">
  Click me
</button>

// ❌ Incorrect - Hardcoded colors
<button className="bg-blue-500 text-white">
  Click me
</button>
```

### Tailwind Configuration

Ensure Tailwind CSS is configured to use CSS variables:

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    colors: {
      primary: 'hsl(var(--primary))',
      'primary-foreground': 'hsl(var(--primary-foreground))',
      // ... other colors
    }
  }
}
```

### Custom Components

When creating custom components, always reference CSS variables:

```css
.custom-component {
  background-color: hsl(var(--card));
  border: 1px solid hsl(var(--border));
  color: hsl(var(--card-foreground));
}

.custom-component:hover {
  background-color: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}
```

## Automatic Tenant Detection

### How It Works

The system automatically detects the tenant based on:
1. **Subdomain**: `siga.example.com` → SIGA theme
2. **Port (Development)**: `localhost:3001` → SIGA theme
3. **Local Storage**: Cached tenant preference

### Implementation

```typescript
// Automatic detection on app initialization
import { initializeTenantTheme } from '@/lib/utils/tenant-theme'

// Call this in your app root
initializeTenantTheme()

// The system will:
// 1. Detect tenant from domain/port
// 2. Set data-tenant attribute on <html>
// 3. Apply appropriate CSS variables
// 4. Cache selection in localStorage
```

### React Hook Usage

```tsx
import { useTenantTheme } from '@/lib/utils/tenant-theme'

function MyComponent() {
  const { theme, isSiga, applyTheme } = useTenantTheme()
  
  return (
    <div className={`tenant-${theme}`}>
      {isSiga && <div>SIGA-specific content</div>}
    </div>
  )
}
```

## Accessibility Considerations

### Contrast Ratios

All color combinations meet WCAG 2.1 AA standards:
- **Normal text**: Minimum 4.5:1 contrast ratio
- **Large text**: Minimum 3:1 contrast ratio
- **UI components**: Minimum 3:1 contrast ratio

### Focus Indicators

Focus states use the `--ring` variable with consistent styling:

```css
*:focus {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

### Reduced Motion

Theme transitions respect user motion preferences:

```css
@media (prefers-reduced-motion: reduce) {
  .theme-transition * {
    transition: none !important;
  }
}
```

## Testing and Validation

### Theme Switching Test

1. Navigate to different tenant subdomains
2. Verify theme changes automatically
3. Check localStorage persistence
4. Test dark mode toggle
5. Validate color contrast ratios

### Browser Support

- Modern browsers with CSS custom property support
- Progressive enhancement for older browsers
- Fallback colors defined in root variables

## Development Workflow

### Adding New Colors

1. Define in `:root` selector for default theme
2. Add tenant-specific overrides in `[data-tenant="..."]` selectors
3. Include dark mode variants
4. Update this documentation
5. Test across all tenant themes

### Component Development

1. Use CSS variables exclusively
2. Test with all tenant themes
3. Verify dark mode compatibility
4. Check accessibility contrast ratios
5. Test with motion preferences

---

**Last Updated**: August 13, 2025
**Maintained By**: UI/UX Development Team