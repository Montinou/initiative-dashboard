# Supabase Authentication Template

This template outlines the correct approach for implementing Supabase authentication in Next.js 15 with App Router and SSR.

## Core Configuration Files

### 1. Supabase Client Configuration

#### Client-side (`utils/supabase/client.ts`)
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

#### Server-side (`utils/supabase/server.ts`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

#### Middleware (`utils/supabase/middleware.ts`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing logic between createServerClient and supabase.auth.getUser()
  const { data: { user } } = await supabase.auth.getUser()

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  return supabaseResponse
}
```

### 2. Middleware Setup (`middleware.ts`)
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

## Authentication Patterns

### 1. API Routes
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    // Your API logic here
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 2. Server Components
```typescript
import { createClient } from '@/utils/supabase/server'

export default async function ServerComponent() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return <div>Please log in</div>
  }

  // Fetch data for authenticated user
  const { data } = await supabase
    .from('your_table')
    .select('*')
    .eq('user_id', user.id)

  return (
    <div>
      <h1>Welcome {user.email}</h1>
      {/* Render your data */}
    </div>
  )
}
```

### 3. Client Components
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function ClientComponent() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  if (loading) {
    return <div>Loading...</div>
  }

  if (!user) {
    return <div>Please log in</div>
  }

  return <div>Welcome {user.email}</div>
}
```

### 4. Auth Callback Handler (`app/auth/callback/route.ts`)
```typescript
import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')

  if (error) {
    console.error('Auth callback error:', error)
    return NextResponse.redirect(`${origin}/auth/login?error=${encodeURIComponent(error)}`)
  }

  if (code) {
    const supabase = await createClient()
    
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!exchangeError) {
        return NextResponse.redirect(`${origin}${next}`)
      } else {
        console.error('Code exchange error:', exchangeError)
        return NextResponse.redirect(
          `${origin}/auth/login?error=${encodeURIComponent('Authentication failed')}`
        )
      }
    } catch (error) {
      console.error('Auth callback exception:', error)
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent('Authentication error occurred')}`
      )
    }
  }

  return NextResponse.redirect(`${origin}/auth/login`)
}
```

## Security Best Practices

### 1. Always Use getUser() in API Routes
- **Use**: `supabase.auth.getUser()` - Validates JWT server-side
- **Avoid**: `supabase.auth.getSession()` - Only returns stored session

### 2. Proper Error Handling
```typescript
const { data: { user }, error: authError } = await supabase.auth.getUser()
if (authError || !user) {
  return NextResponse.json(
    { error: 'Authentication required' },
    { status: 401 }
  )
}
```

### 3. Tenant Isolation
```typescript
// Always filter by tenant_id for multi-tenant apps
const { data } = await supabase
  .from('your_table')
  .select('*')
  .eq('tenant_id', userProfile.tenant_id)
```

### 4. Role-Based Access Control
```typescript
const hasPermission = (userRole: string, requiredRoles: string[]) => {
  return requiredRoles.includes(userRole)
}

if (!hasPermission(userProfile.role, ['Admin', 'Manager'])) {
  return NextResponse.json(
    { error: 'Insufficient permissions' },
    { status: 403 }
  )
}
```

## Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Common Patterns

### User Profile Integration
```typescript
// Combined auth and profile check
const getUserWithProfile = async (supabase: any) => {
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Authentication required')
  }

  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (profileError || !userProfile) {
    throw new Error('User profile not found')
  }

  return { user, userProfile }
}
```

### Audit Logging
```typescript
const createAuditLog = async (supabase: any, data: {
  tenant_id: string
  user_id: string
  action: string
  resource_type: string
  resource_id?: string
  old_values?: any
  new_values?: any
}) => {
  await supabase
    .from('audit_log')
    .insert({
      ...data,
      created_at: new Date().toISOString()
    })
}
```

## Migration Checklist

When updating existing authentication code:

1. ✅ Replace `createClient(cookieStore)` with `await createClient()`
2. ✅ Remove `import { cookies } from 'next/headers'` from API routes
3. ✅ Use `supabase.auth.getUser()` instead of `getSession()` in API routes
4. ✅ Implement proper error handling for authentication
5. ✅ Add tenant isolation for multi-tenant applications
6. ✅ Update middleware to use `updateSession` pattern
7. ✅ Ensure proper cookie handling in server client
8. ✅ Add audit logging for sensitive operations

## Testing Authentication

### Basic Auth Test
```typescript
// Test API route authentication
const response = await fetch('/api/your-endpoint', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`
  }
})

if (response.status === 401) {
  // Handle unauthenticated user
}
```

### User Profile Test
```typescript
// Verify user profile creation/retrieval
const { data: profile } = await supabase
  .from('user_profiles')
  .select('*')
  .eq('user_id', user.id)
  .single()

console.assert(profile.tenant_id, 'User should have tenant_id')
console.assert(profile.role, 'User should have role assigned')
```