# DynamicTheme Component

## Overview
A client-side component that dynamically applies tenant-specific theme colors based on the current domain. This component enables multi-tenant branding by automatically detecting the hostname and applying appropriate color schemes.

**File:** `components/dynamic-theme.tsx`

## Usage

```tsx
import { DynamicTheme } from '@/components/dynamic-theme'

function Layout() {
  return (
    <>
      <DynamicTheme />
      {/* Rest of your application */}
    </>
  )
}
```

## Features
- **Domain-Based Theming**: Automatically detects hostname and applies tenant-specific colors
- **CSS Variable Updates**: Dynamically updates CSS custom properties for real-time theming
- **Dark Mode Support**: Includes specific color adjustments for dark mode
- **FEMA Brand Colors**: Specialized color scheme for FEMA Electricidad tenant
- **Chart Integration**: Updates chart colors to match tenant branding
- **Sidebar Theming**: Applies consistent colors to sidebar components

## Tenant-Specific Implementation

### FEMA Electricidad Theme
When `tenantId === 'fema-electricidad'`, applies:

#### Brand Colors
- **Primary**: `#00539F` (FEMA Blue) - HSL(210, 100%, 31%)
- **Accent**: `#FFC72C` (Accent Yellow) - HSL(45, 100%, 58%)
- **Light Gray**: `#F0F2F5` - HSL(214, 20%, 95%)
- **Medium Gray**: `#6C757D` - HSL(210, 11%, 46%)
- **Dark Gray**: `#212529` - HSL(210, 17%, 14%)

#### CSS Variables Applied
```css
--primary: 210 100% 31%
--primary-foreground: 0 0% 100%
--secondary: 214 20% 95%
--accent: 45 100% 58%
--muted: 214 20% 95%
--border: 214 20% 95%
--ring: 210 100% 31%
```

#### Chart Colors
- Chart 1: FEMA Blue
- Chart 2: Accent Yellow
- Chart 3: Medium Gray
- Chart 4: Light Gray
- Chart 5: Dark Gray

#### Sidebar Colors
- Background: FEMA Blue
- Foreground: White
- Primary: Accent Yellow
- Accent: Lighter FEMA Blue
- Border: Darker FEMA Blue

### Dark Mode Adjustments
When dark mode is active, automatically adjusts:
- Background colors to darker variants
- Foreground colors to light variants
- Maintains brand color consistency
- Updates muted and border colors for better contrast

## Implementation Details

### Effect Hook
```tsx
useEffect(() => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const theme = getThemeFromDomain(hostname);
    
    if (theme.tenantId === 'fema-electricidad') {
      // Apply FEMA-specific colors
    }
  }
}, []);
```

### CSS Variable Updates
```tsx
const root = document.documentElement;
root.style.setProperty('--primary', '210 100% 31%');
```

### Dark Mode Detection
```tsx
if (document.documentElement.classList.contains('dark')) {
  // Apply dark mode specific colors
}
```

## Integration Notes
- **Client-Side Only**: Uses `'use client'` directive
- **Window Dependency**: Requires browser environment for hostname detection
- **Immediate Application**: Colors apply on component mount
- **No Visual Output**: Returns `null` as it only applies styles

## Dependencies
- `@/lib/theme-config`: For `getThemeFromDomain` function
- Browser environment for `window.location.hostname`
- Document access for CSS variable manipulation

## CSS Custom Property Format
Uses HSL format without parentheses for Tailwind CSS compatibility:
- Correct: `'210 100% 31%'`
- Incorrect: `'hsl(210, 100%, 31%)'`

## Browser Support
Requires support for:
- CSS custom properties (modern browsers)
- Document.documentElement.style.setProperty
- Window.location.hostname

## Performance Considerations
- **Single Execution**: Effect runs only once on mount
- **Minimal DOM Manipulation**: Only updates CSS variables
- **No Re-renders**: Component returns null
- **Efficient Detection**: Quick hostname-based logic

## Extensibility
To add new tenant themes:

1. Add tenant check in the effect
2. Define brand colors in HSL format
3. Apply CSS variables following the same pattern
4. Include dark mode adjustments if needed

```tsx
if (theme.tenantId === 'new-tenant') {
  root.style.setProperty('--primary', 'hsl-values');
  // Apply other colors...
}
```

## Theme Configuration
Works in conjunction with:
- `@/lib/theme-config` for domain mapping
- Global CSS variables defined in `globals.css`
- Tailwind CSS color system
- Component-level theme utilities

## Accessibility
- Maintains proper color contrast ratios
- Respects user's dark mode preference
- Does not interfere with screen readers
- Compatible with high contrast modes