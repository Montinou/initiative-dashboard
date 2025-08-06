# Theme System Implementation

## Overview

The Initiative Dashboard uses a sophisticated multi-tenant theme system that supports both domain-based and tenant-based theming. This ensures proper branding on login pages while respecting the user's actual organization theme inside the application.

## Architecture

### Server-Side Theme Resolution

The theme system now uses a server-side approach for determining the tenant theme, similar to how authentication sessions are handled. This eliminates the dependency on localStorage and provides better security and performance.

### Key Components

1. **Root Layout** (`app/layout.tsx`)
   - Fetches tenant information on the server
   - Passes tenant ID to client components via props
   - No localStorage dependency

2. **Tenant Context** (`lib/tenant-context.tsx`)
   - Manages tenant information across the app
   - Initialized with server-provided data
   - Provides hooks for accessing tenant theme

3. **Theme Wrapper** (`components/theme-wrapper.tsx`)
   - Uses tenant context for app pages
   - Falls back to domain-based theming for auth pages
   - Applies theme attributes to document body

4. **Theme Configuration** (`lib/theme-config.ts`)
   - Maps tenant IDs to theme configurations
   - Provides domain-to-theme mapping for auth pages
   - Contains all theme definitions

## Implementation Flow

### 1. Server-Side Data Fetching
```typescript
// In app/layout.tsx
async function getTenantInfo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('user_id', user.id)
    .single()
  
  return profile?.tenant_id || null
}
```

### 2. Passing Data to Client
```typescript
// In root layout
const tenantId = await getTenantInfo()

return (
  <Providers initialTenantId={tenantId}>
    <ThemeWrapper initialTenantId={tenantId}>
      {children}
    </ThemeWrapper>
  </Providers>
)
```

### 3. Client-Side Theme Application
```typescript
// In ThemeWrapper
const { theme } = useTenant() // Gets theme from context initialized with server data
document.body.setAttribute('data-theme', themeKey)
```

## Theme Selection Logic

### Auth Pages (Login, Reset Password)
- Uses domain-based theming
- Example: `fema-electricidad.vercel.app` → FEMA theme
- Ensures correct branding before user authentication

### App Pages (Dashboard, Profile, etc.)
- Uses tenant-based theming from server
- Theme determined by user's `tenant_id` in database
- No localStorage required

## Benefits

1. **No localStorage Dependency**
   - Themes work even with strict browser settings
   - Better security and privacy
   - Server-side rendering compatible

2. **Consistent with Auth Pattern**
   - Uses same approach as session management
   - Data flows from server to client
   - Single source of truth (database)

3. **Better Performance**
   - No client-side lookups needed
   - Theme ready on first render
   - Reduced JavaScript execution

4. **Multi-Tenant Security**
   - Tenant isolation at server level
   - No client-side tenant data exposure
   - Proper RLS enforcement

## Adding New Themes

To add a new theme:

1. Add theme configuration to `COMPANY_THEMES` in `lib/theme-config.ts`
2. Map the tenant UUID in `getTenantSlugFromUUID()`
3. Add domain mapping if needed in `getTenantSlugFromDomain()`
4. Update CSS variables and styles as needed

## Migration Notes

If you're migrating from the localStorage-based approach:

1. Remove any `localStorage.getItem('user_profile_v2')` calls
2. Use `useTenant()` hook instead for tenant information
3. Ensure server components fetch tenant data
4. Update any direct theme lookups to use the context

## Troubleshooting

### Theme Not Applying
1. Check that tenant ID is being fetched on server
2. Verify tenant UUID mapping in theme-config.ts
3. Ensure ThemeWrapper is receiving initialTenantId
4. Check browser console for theme application logs

### Fallback Behavior
- If no tenant ID: falls back to domain-based theme
- If no domain match: uses default professional theme
- Auth pages always use domain-based theming
