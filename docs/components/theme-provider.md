# ThemeProvider Component

## Overview
A client-side wrapper component that provides theme functionality to the application using the `next-themes` library. This component enables dark/light mode switching and theme persistence across the application.

**File:** `components/theme-provider.tsx`

## Usage

```tsx
import { ThemeProvider } from '@/components/theme-provider'

function App({ children }) {
  return (
    <ThemeProvider 
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  )
}
```

## Props
Accepts all `ThemeProviderProps` from `next-themes`:

- `attribute` (string): HTML attribute to use for storing theme (default: "data-theme")
- `defaultTheme` (string): Default theme to use (e.g., "light", "dark", "system")
- `enableSystem` (boolean): Whether to enable system theme detection
- `disableTransitionOnChange` (boolean): Disable CSS transitions when theme changes
- `children` (ReactNode): Child components to wrap with theme context

## Features
- **Theme Switching**: Enables toggling between light and dark themes
- **System Detection**: Automatically detects user's system preference
- **Persistence**: Maintains theme choice across browser sessions
- **SSR Safe**: Works correctly with server-side rendering
- **Transition Control**: Option to disable CSS transitions during theme changes

## Implementation Notes
- Uses the `'use client'` directive for client-side functionality
- Acts as a thin wrapper around `next-themes` ThemeProvider
- Passes through all props to the underlying provider
- No custom logic or state management

## Integration with Application
This component should be placed high in the component tree, typically in:
- `app/layout.tsx` (App Router)
- `pages/_app.tsx` (Pages Router)

## Example Layout Integration

```tsx
// app/layout.tsx
import { ThemeProvider } from '@/components/theme-provider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

## Theme Usage in Components
Once wrapped with ThemeProvider, components can access theme functionality:

```tsx
import { useTheme } from 'next-themes'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  
  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle Theme
    </button>
  )
}
```

## CSS Variables Integration
Works with CSS custom properties for theme values:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 224 71.4% 4.1%;
}

.dark {
  --background: 224 71.4% 4.1%;
  --foreground: 210 20% 98%;
}
```

## Dependencies
- `next-themes`: Theme management library
- `react`: For component functionality

## Browser Support
Supports all modern browsers that support:
- CSS custom properties
- Local storage (for persistence)
- Media queries (for system detection)

## Performance Considerations
- Minimal performance impact
- No unnecessary re-renders
- Efficient theme state management via context
- Optional transition disabling for smooth theme changes

## Accessibility
- Respects user's system theme preference
- No additional accessibility requirements
- Compatible with screen readers and other assistive technologies