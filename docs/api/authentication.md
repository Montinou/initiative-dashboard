# Authentication & Session Management

## Overview

The application uses Supabase Auth for authentication with cookie-based session management.

## Authentication Flow

```
1. User Login
   ↓
2. Supabase Auth Verification
   ↓
3. JWT Token Generation
   ↓
4. Cookie Storage
   ↓
5. Middleware Validation
   ↓
6. User Profile Fetch
```

## Implementation

### Login Flow

```typescript
// app/login/page.tsx
const handleLogin = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) throw error;
  
  // Redirect to dashboard
  router.push('/dashboard');
};
```

### Session Management

```typescript
// utils/supabase/middleware.ts
export async function updateSession(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );
  
  const { data: { user } } = await supabase.auth.getUser();
  
  return { user, response };
}
```

### User Profile Helper

```typescript
// lib/server-user-profile.ts
export async function getUserProfile(request?: NextRequest): Promise<{
  user: any,
  userProfile: UserProfile | null
}> {
  const supabase = createClient();
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (!user) {
    return { user: null, userProfile: null };
  }
  
  // Fetch user profile
  const { data: userProfile, error: profileError } = await supabase
    .from('user_profiles')
    .select(`
      *,
      tenant:tenants!user_profiles_tenant_id_fkey (
        id,
        subdomain,
        organization:organizations!tenants_organization_id_fkey (
          id,
          name
        )
      ),
      area:areas!user_profiles_area_id_fkey (
        id,
        name
      )
    `)
    .eq('user_id', user.id)
    .single();
  
  return { user, userProfile };
}
```

## API Route Protection

### Protected Route Example

```typescript
// app/api/protected/route.ts
export async function GET(request: Request) {
  const { user, userProfile } = await getUserProfile(request);
  
  if (!user || !userProfile) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    );
  }
  
  // Check role-based access
  if (userProfile.role !== 'CEO' && userProfile.role !== 'Admin') {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }
  
  // Process request
  return NextResponse.json({ data: 'Protected data' });
}
```

### Middleware Protection

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const { user, response } = await updateSession(request);
  
  // Protected routes
  const protectedPaths = ['/dashboard', '/api'];
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );
  
  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
```

## Role-Based Access Control

### User Roles

```typescript
enum UserRole {
  CEO = 'CEO',
  Admin = 'Admin',
  Manager = 'Manager'
}
```

### Permission Matrix

| Feature | CEO | Admin | Manager |
|---------|-----|-------|---------|
| View All Data | ✓ | ✓ | Area Only |
| Create Initiatives | ✓ | ✓ | ✓ |
| Edit Any Initiative | ✓ | ✓ | Own Only |
| Delete Initiatives | ✓ | ✓ | × |
| Manage Users | ✓ | ✓ | × |
| View Analytics | ✓ | ✓ | Limited |

### Role Check Helper

```typescript
// lib/auth-helper.ts
export function hasPermission(
  userRole: UserRole,
  action: string,
  resource?: any
): boolean {
  const permissions = {
    CEO: ['*'],
    Admin: ['create', 'read', 'update', 'delete'],
    Manager: ['create:own', 'read:area', 'update:own']
  };
  
  const userPermissions = permissions[userRole];
  
  if (userPermissions.includes('*')) return true;
  
  // Check specific permissions
  return userPermissions.some(perm => {
    if (perm.includes(':')) {
      const [permAction, scope] = perm.split(':');
      return permAction === action && checkScope(scope, resource);
    }
    return perm === action;
  });
}
```

## Session Refresh

### Auto-Refresh Implementation

```typescript
// hooks/useSession.ts
export function useSession() {
  const [session, setSession] = useState(null);
  
  useEffect(() => {
    // Initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
    
    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );
    
    return () => subscription.unsubscribe();
  }, []);
  
  return session;
}
```

### Manual Refresh

```typescript
// lib/auth-actions.ts
export async function refreshSession() {
  const { data: { session }, error } = await supabase.auth.refreshSession();
  
  if (error) {
    console.error('Session refresh failed:', error);
    // Redirect to login
    window.location.href = '/login';
    return null;
  }
  
  return session;
}
```

## Logout Implementation

```typescript
// app/api/auth/logout/route.ts
export async function POST() {
  const supabase = createClient();
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return NextResponse.json(
      { error: 'Logout failed' },
      { status: 500 }
    );
  }
  
  // Clear cookies and redirect
  const response = NextResponse.redirect(new URL('/login', request.url));
  response.cookies.delete('sb-access-token');
  response.cookies.delete('sb-refresh-token');
  
  return response;
}
```

## Security Best Practices

### 1. Secure Cookie Configuration

```typescript
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days
  path: '/',
};
```

### 2. CSRF Protection

```typescript
// lib/csrf.ts
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function validateCSRFToken(token: string, sessionToken: string): boolean {
  return crypto.timingSafeEqual(
    Buffer.from(token),
    Buffer.from(sessionToken)
  );
}
```

### 3. Rate Limiting

```typescript
// lib/rate-limit.ts
const rateLimiter = new Map();

export function checkRateLimit(identifier: string, limit = 5): boolean {
  const now = Date.now();
  const windowStart = now - 60000; // 1 minute window
  
  const attempts = rateLimiter.get(identifier) || [];
  const recentAttempts = attempts.filter(time => time > windowStart);
  
  if (recentAttempts.length >= limit) {
    return false;
  }
  
  recentAttempts.push(now);
  rateLimiter.set(identifier, recentAttempts);
  
  return true;
}
```

## Testing Authentication

### Test User Credentials

```typescript
const testUsers = {
  ceo: {
    email: 'ceo@sega.com',
    password: 'demo123456',
    role: 'CEO'
  },
  admin: {
    email: 'admin@sega.com',
    password: 'demo123456',
    role: 'Admin'
  },
  manager: {
    email: 'manager@sega.com',
    password: 'demo123456',
    role: 'Manager'
  }
};
```

### Authentication Test

```typescript
// __tests__/auth.test.ts
describe('Authentication', () => {
  it('should login successfully', async () => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: testUsers.ceo.email,
      password: testUsers.ceo.password
    });
    
    expect(error).toBeNull();
    expect(data.user).toBeDefined();
    expect(data.session).toBeDefined();
  });
  
  it('should fetch user profile', async () => {
    const { user, userProfile } = await getUserProfile();
    
    expect(user).toBeDefined();
    expect(userProfile).toBeDefined();
    expect(userProfile.role).toBe('CEO');
  });
});
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**
   - Check if user is logged in
   - Verify JWT token validity
   - Check cookie presence

2. **403 Forbidden**
   - Verify user role
   - Check permission requirements
   - Validate tenant access

3. **Session Expired**
   - Implement auto-refresh
   - Show session timeout warning
   - Redirect to login

### Debug Helpers

```typescript
// lib/auth-debug.ts
export function debugAuth() {
  console.log('Cookies:', document.cookie);
  console.log('Local Storage:', localStorage.getItem('supabase.auth.token'));
  
  supabase.auth.getSession().then(({ data }) => {
    console.log('Session:', data.session);
    console.log('User:', data.session?.user);
    console.log('Expires:', new Date(data.session?.expires_at * 1000));
  });
}