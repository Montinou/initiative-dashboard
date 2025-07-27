# Theme Architecture Documentation

## Overview

The application implements a sophisticated multi-tenant theming system that provides company-specific branding and color schemes based on domain detection and user authentication. The system combines domain-based theme selection, tenant-specific customization, and dynamic CSS generation to deliver a seamless white-label experience.

## Table of Contents

1. [Theme Configuration Structure](#theme-configuration-structure)
2. [Multi-Level Theme Selection](#multi-level-theme-selection)
3. [Dynamic Theme Application](#dynamic-theme-application)
4. [CSS Architecture](#css-architecture)
5. [Component Integration](#component-integration)
6. [Glassmorphism Integration](#glassmorphism-integration)
7. [Implementation Examples](#implementation-examples)
8. [Best Practices](#best-practices)

---

## Theme Configuration Structure

### CompanyTheme Interface

```typescript
interface CompanyTheme {
  companyName: string
  fullName: string
  domain: string
  tenantId: string
  colors: {
    primary: string
    secondary: string
    accent: string
    background: string
    gradientFrom: string
    gradientTo: string
  }
  logo: {
    text: string
    icon?: string
  }
  industry: string
  description: string
}
```

### Predefined Themes

#### 1. Stratix Platform (Default)
- **Domain**: `stratix-platform.vercel.app`
- **Colors**: Indigo/purple gradients
- **Industry**: Enterprise Management
- **Usage**: Default theme for localhost and unknown domains

#### 2. FEMA Electricidad
- **Domain**: `fema-electricidad` variants
- **Colors**: Blue/yellow color scheme
- **Industry**: Electrical Services
- **Features**: Specialized for electrical industry workflows

#### 3. SIGA Turismo
- **Domain**: `siga-turismo` variants
- **Colors**: Green/yellow palette
- **Industry**: Tourism Management
- **Features**: Tourism-specific functionality

---

## Multi-Level Theme Selection

### 1. Domain-Based Selection (`getThemeFromDomain`)

Primary mechanism for initial theme determination:

```typescript
function getThemeFromDomain(hostname: string): CompanyTheme
```

**Process:**
1. Analyzes `window.location.hostname`
2. Matches against predefined domain patterns
3. Supports domain variants and subdomains
4. Falls back to Stratix theme for localhost/unknown domains

**Domain Matching Examples:**
- `fema-electricidad.vercel.app` → FEMA theme
- `siga-turismo.com` → SIGA theme
- `localhost:3000` → Stratix theme (default)

### 2. Tenant-Based Selection (`getThemeFromTenant`)

Secondary mechanism activated post-authentication:

```typescript
function getThemeFromTenant(tenantId: string): CompanyTheme
```

**Process:**
1. Maps authenticated user's `tenant_id` to theme
2. Overrides domain-based theme for logged-in users
3. Enables multi-tenant support on single domains

### 3. Domain Tenant Restrictions

Access control mechanism:

```typescript
function getDomainTenantRestriction(hostname: string): string[]
```

**Enforcement Rules:**
- FEMA domains: Access restricted to `fema-electricidad` tenant
- SIGA domains: Access restricted to `siga-turismo` tenant
- Stratix domains: Multi-tenant demo access allowed

---

## Dynamic Theme Application

### 1. CSS Variable Override System

**Component**: `components/dynamic-theme.tsx`

```typescript
export function DynamicTheme() {
  // Modifies CSS custom properties in real-time
  // Handles FEMA-specific color overrides
  // Converts hex to HSL for CSS variables
}
```

**Features:**
- Client-side CSS variable modification
- Hex to HSL color conversion
- Light/dark mode variations
- Chart and sidebar color updates

### 2. CSS Generation Function

**Function**: `generateThemeCSS(theme: CompanyTheme): string`

**Generated CSS Classes:**
- `.theme-gradient` - Company-specific gradients
- `.theme-text-primary` - Brand color text
- `.theme-glass` - Glassmorphism effects
- `.theme-button-primary` - Branded buttons

**Example Output:**
```css
.theme-gradient {
  background: linear-gradient(135deg, #3b82f6, #fbbf24);
}
.theme-glass {
  backdrop-filter: blur(20px);
  background: rgba(59, 130, 246, 0.1);
}
```

---

## CSS Architecture

### Base CSS Variables (`app/globals.css`)

**Color System:**
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 221.2 83.2% 53.3%;
  --secondary: 210 40% 96%;
  /* Chart colors */
  --chart-1: 12 76% 61%;
  --chart-2: 173 58% 39%;
  /* Sidebar colors */
  --sidebar-background: 0 0% 98%;
  --sidebar-foreground: 240 5.3% 26.1%;
}
```

**Dark Mode:**
```css
.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  /* Adjusted for dark theme */
}
```

### Tailwind Integration (`tailwind.config.ts`)

**Color Mapping:**
```typescript
colors: {
  background: "hsl(var(--background))",
  foreground: "hsl(var(--foreground))",
  primary: {
    DEFAULT: "hsl(var(--primary))",
    foreground: "hsl(var(--primary-foreground))",
  },
  chart: {
    "1": "hsl(var(--chart-1))",
    "2": "hsl(var(--chart-2))",
    // ... up to chart-5
  }
}
```

---

## Component Integration

### 1. Dashboard Theme Handling

**File**: `dashboard.tsx`

```typescript
const [theme, setTheme] = useState<any>(null)

useEffect(() => {
  if (tenantId) {
    // Prioritize tenant-based theme after login
    const currentTheme = getThemeFromTenant(tenantId);
    setTheme(currentTheme);
    document.title = `${currentTheme.companyName} - Dashboard`;
  } else {
    // Fallback to domain-based theme
    const currentTheme = getThemeFromDomain(window.location.hostname);
    setTheme(currentTheme);
  }
}, [tenantId]);

return (
  <>
    <style dangerouslySetInnerHTML={{ __html: theme ? generateThemeCSS(theme) : '' }} />
    {/* Component content */}
  </>
)
```

### 2. Login Page Theme Application

**File**: `app/auth/login/page.tsx`

```typescript
useEffect(() => {
  if (typeof window !== 'undefined') {
    try {
      const currentTheme = getThemeFromDomain(window.location.hostname)
      setTheme(currentTheme)
    } catch (error) {
      console.error('Theme loading error:', error)
      // Graceful fallback to default
    }
  }
}, [])
```

### 3. Layout Integration

**File**: `app/layout.tsx`

```typescript
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <DynamicTheme />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

---

## Glassmorphism Integration

### Theme-Aware Glass Effects

The theming system seamlessly integrates with glassmorphism design:

**Generated Glass Classes:**
```css
.theme-glass {
  backdrop-filter: blur(20px);
  background: rgba(var(--theme-primary-rgb), 0.1);
  border: 1px solid rgba(var(--theme-primary-rgb), 0.2);
}

.theme-glass-darker {
  backdrop-filter: blur(20px);
  background: rgba(var(--theme-primary-rgb), 0.15);
  border: 1px solid rgba(var(--theme-primary-rgb), 0.3);
}
```

**Usage in Components:**
```jsx
<Card className="theme-glass border-white/10">
  <CardContent className="backdrop-blur-xl bg-white/5">
    {/* Glassmorphic content */}
  </CardContent>
</Card>
```

---

## Implementation Examples

### Adding a New Theme

1. **Define Theme Configuration:**
```typescript
const newCompanyTheme: CompanyTheme = {
  companyName: "New Company",
  fullName: "New Company Full Name",
  domain: "newcompany.com",
  tenantId: "new-company",
  colors: {
    primary: "#ff6b6b",
    secondary: "#4ecdc4",
    accent: "#45b7d1",
    background: "#f8f9fa",
    gradientFrom: "#ff6b6b",
    gradientTo: "#4ecdc4"
  },
  logo: {
    text: "NC",
    icon: "/logos/newcompany.svg"
  },
  industry: "Technology",
  description: "Innovation-focused technology solutions"
}
```

2. **Add to Theme Registry:**
```typescript
// In lib/theme-config.ts
const COMPANY_THEMES = {
  // ... existing themes
  'new-company': newCompanyTheme
}

const DOMAIN_MAPPINGS = {
  // ... existing mappings
  'newcompany.com': 'new-company',
  'newcompany.vercel.app': 'new-company'
}
```

### Using Themes in Components

**Basic Theme Application:**
```tsx
function MyComponent() {
  const [theme, setTheme] = useState<CompanyTheme | null>(null)
  
  useEffect(() => {
    const currentTheme = getThemeFromDomain(window.location.hostname)
    setTheme(currentTheme)
  }, [])
  
  if (!theme) return <div>Loading...</div>
  
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: generateThemeCSS(theme) }} />
      <div className="theme-gradient p-4">
        <h1 className="theme-text-primary">{theme.companyName}</h1>
        <button className="theme-button-primary">
          Action Button
        </button>
      </div>
    </>
  )
}
```

---

## Best Practices

### 1. Performance Optimization

- **CSS Generation**: Generate theme CSS only when theme changes
- **Component Memoization**: Use `useMemo` for expensive theme calculations
- **CSS Injection**: Prefer `dangerouslySetInnerHTML` for dynamic styles

```typescript
const themeCSS = useMemo(() => 
  theme ? generateThemeCSS(theme) : '', 
  [theme]
)
```

### 2. Error Handling

- **Graceful Fallbacks**: Always provide default theme fallback
- **Error Boundaries**: Wrap theme-dependent components
- **Loading States**: Show loading UI while theme loads

```typescript
try {
  const theme = getThemeFromDomain(hostname)
  setTheme(theme)
} catch (error) {
  console.error('Theme loading error:', error)
  setTheme(getDefaultTheme()) // Fallback
}
```

### 3. Type Safety

- **Strong Typing**: Use TypeScript interfaces for theme configuration
- **Theme Validation**: Validate theme properties before application
- **Component Props**: Type theme-related component props properly

### 4. Accessibility

- **Color Contrast**: Ensure sufficient contrast in all themes
- **Focus Indicators**: Maintain visible focus states across themes
- **Screen Readers**: Test theme changes with assistive technologies

### 5. Testing

- **Theme Switching**: Test all theme transitions
- **Domain Detection**: Verify domain-based theme selection
- **Fallback Scenarios**: Test error conditions and fallbacks

---

## Troubleshooting

### Common Issues

1. **Theme Not Loading**: Check domain configuration and network connectivity
2. **CSS Not Applied**: Verify CSS injection and style precedence
3. **Color Inconsistency**: Ensure CSS variables are properly defined
4. **Performance Issues**: Optimize CSS generation and component re-renders

### Debug Tools

```typescript
// Enable theme debugging
const debugTheme = (theme: CompanyTheme) => {
  console.log('Current theme:', theme)
  console.log('Generated CSS:', generateThemeCSS(theme))
}
```

---

This architecture provides a robust, scalable solution for multi-tenant theming that maintains excellent performance, user experience, and developer ergonomics while supporting complex branding requirements across different industries and use cases.