# Authentication Flow and Session Management

## Overview

The Initiative Dashboard uses Supabase Auth for a robust, secure authentication system that supports multiple authentication methods while maintaining strict security standards. This document details the authentication flows, session management, and security measures implemented.

## Authentication Architecture

### Core Components

```typescript
// Authentication Stack
├── Supabase Auth Service (JWT Provider)
├── Next.js Middleware (Route Protection)
├── API Authentication Helper (Request Validation)
├── Client-Side Auth Context (Session Management)
└── Server-Side Auth Utilities (Token Validation)
```

## Authentication Methods

### 1. Email/Password Authentication

**Implementation**:
```typescript
// Sign Up Flow
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'SecurePassword123!',
  options: {
    emailRedirectTo: 'https://app.example.com/welcome',
    data: {
      first_name: 'John',
      tenant_id: 'tenant-uuid'
    }
  }
})

// Sign In Flow
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'SecurePassword123!'
})
```

**Security Measures**:
- Password complexity requirements enforced
- Account lockout after failed attempts
- Email verification required
- Secure password reset flow

### 2. OAuth Providers

**Supported Providers**:
- Google
- GitHub
- Microsoft Azure AD
- Custom SAML providers

**Implementation**:
```typescript
// OAuth Sign In
const { data, error } = await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: {
    redirectTo: 'https://app.example.com/auth/callback',
    scopes: 'email profile'
  }
})
```

### 3. Magic Links (Passwordless)

**Implementation**:
```typescript
// Send Magic Link
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: {
    shouldCreateUser: false,
    emailRedirectTo: 'https://app.example.com/dashboard'
  }
})
```

**Security Features**:
- One-time use tokens
- Time-limited validity (1 hour)
- Secure random token generation
- Email verification built-in

## Session Management

### JWT Token Structure

```json
{
  "aud": "authenticated",
  "exp": 1736353745,
  "iat": 1736350145,
  "iss": "https://[project].supabase.co/auth/v1",
  "sub": "user-uuid",
  "email": "user@example.com",
  "phone": "",
  "app_metadata": {
    "provider": "email",
    "providers": ["email"]
  },
  "user_metadata": {
    "first_name": "John"
  },
  "role": "authenticated",
  "aal": "aal1",
  "amr": [
    {
      "method": "password",
      "timestamp": 1736350145
    }
  ],
  "session_id": "session-uuid"
}
```

### Token Lifecycle

1. **Access Token**: Short-lived (1 hour default)
2. **Refresh Token**: Long-lived, single use
3. **Automatic Refresh**: Handled by Supabase client
4. **Token Rotation**: New tokens on each refresh

### Cookie Configuration

```typescript
// Secure Cookie Settings
const cookieOptions = {
  name: 'sb-session',
  domain: process.env.COOKIE_DOMAIN,
  path: '/',
  sameSite: 'lax' as const,
  secure: true, // HTTPS only
  httpOnly: true, // No JavaScript access
  maxAge: 3600 // 1 hour
}
```

## Server-Side Authentication

### API Route Protection

```typescript
// /lib/api-auth-helper.ts
export async function authenticateRequest(request?: NextRequest) {
  // 1. Check for Bearer token in Authorization header
  const authHeader = request?.headers?.get('authorization')
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    // Validate token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token)
  } else {
    // 2. Fall back to cookie-based auth
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()
  }
  
  // 3. Verify user profile and tenant
  const userProfile = await getUserProfile(supabase, user.id)
  
  // 4. Return authenticated context
  return { user, userProfile, supabase }
}
```

### Middleware Protection

```typescript
// /utils/supabase/middleware.ts
export async function middleware(request: NextRequest) {
  // Protected routes configuration
  const PROTECTED_ROUTES = [
    '/dashboard',
    '/manager-dashboard',
    '/admin',
    '/org-admin'
  ]
  
  // Check if route requires authentication
  if (isProtectedRoute(pathname)) {
    // ALWAYS use getUser() on server-side (never getSession())
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (!user) {
      // Redirect to login with return URL
      return NextResponse.redirect('/auth/login?redirectTo=' + pathname)
    }
  }
  
  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Strict-Transport-Security', 'max-age=63072000')
  
  return response
}
```

## Client-Side Authentication

### Auth Context Provider

```typescript
// /contexts/AuthContext.tsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        
        // Handle specific events
        switch (event) {
          case 'SIGNED_IN':
            await router.push('/dashboard')
            break
          case 'SIGNED_OUT':
            await router.push('/login')
            break
          case 'TOKEN_REFRESHED':
            console.log('Token refreshed successfully')
            break
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {children}
    </AuthContext.Provider>
  )
}
```

## Security Best Practices

### 1. Server-Side Validation

**CRITICAL**: Always use `getUser()` on server-side, never `getSession()`:

```typescript
// ❌ WRONG - Session can be spoofed
const { data: { session } } = await supabase.auth.getSession()

// ✅ CORRECT - Verifies JWT signature
const { data: { user }, error } = await supabase.auth.getUser()
```

### 2. Token Storage

- **Access tokens**: Stored in memory or secure cookies
- **Refresh tokens**: HttpOnly cookies only
- **Never store tokens in**: localStorage, sessionStorage, or client-side code

### 3. CSRF Protection

```typescript
// SameSite cookie attribute prevents CSRF
cookieOptions: {
  sameSite: 'lax', // or 'strict' for higher security
  secure: true,     // HTTPS only
  httpOnly: true    // No JS access
}
```

### 4. Rate Limiting

Supabase enforces automatic rate limiting:
- **Email auth**: 2 emails per hour
- **OTP**: 30 OTPs per hour
- **Token refresh**: 1800 requests/hour
- **Sign-ins**: 30 requests/hour per IP

### 5. Session Security

```typescript
// Configure session duration
const supabase = createClient(url, key, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce', // Use PKCE flow for OAuth
    storage: customSecureStorage, // Custom secure storage
    storageKey: 'sb-auth-token',
    cookieOptions: {
      lifetime: 60 * 60 * 8, // 8 hours
      domain: '.example.com',
      sameSite: 'lax'
    }
  }
})
```

## Multi-Factor Authentication (MFA)

### Enrollment Flow

```typescript
// 1. Enroll TOTP factor
const { data, error } = await supabase.auth.mfa.enroll({
  factorType: 'totp',
  friendlyName: 'Authenticator App'
})

// 2. Display QR code
showQRCode(data.totp.qr_code)

// 3. Verify TOTP code
const { data: challenge } = await supabase.auth.mfa.challenge({
  factorId: data.id
})

const { data: verified } = await supabase.auth.mfa.verify({
  factorId: data.id,
  challengeId: challenge.id,
  code: userInputCode
})
```

### Verification Flow

```typescript
// Check if MFA is required
const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()

if (data.currentLevel === 'aal1' && data.nextLevel === 'aal2') {
  // Prompt for MFA verification
  const code = await promptForMFACode()
  
  // Verify MFA
  const { error } = await supabase.auth.mfa.verify({
    factorId: factorId,
    challengeId: challengeId,
    code: code
  })
}
```

## Password Security

### Password Requirements

```typescript
const passwordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventUserInfo: true,
  maxConsecutiveChars: 3
}
```

### Password Reset Flow

```typescript
// 1. Request password reset
await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: 'https://app.example.com/reset-password'
})

// 2. Update password with token
await supabase.auth.updateUser({
  password: newPassword
})
```

## Authentication Monitoring

### Tracked Events

```typescript
// Authentication events to monitor
const authEvents = [
  'INITIAL_SESSION',    // First load
  'SIGNED_IN',         // Successful login
  'SIGNED_OUT',        // Logout
  'TOKEN_REFRESHED',   // Token refresh
  'USER_UPDATED',      // Profile update
  'PASSWORD_RECOVERY', // Password reset
  'MFA_CHALLENGE',     // MFA required
]

// Log authentication events
supabase.auth.onAuthStateChange((event, session) => {
  logAuthEvent({
    event,
    userId: session?.user?.id,
    timestamp: new Date(),
    ip: request.ip,
    userAgent: request.headers['user-agent']
  })
})
```

### Security Metrics

- Failed login attempts per user
- Unusual login locations
- Session duration patterns
- Token refresh frequency
- MFA adoption rate

## Troubleshooting

### Common Issues

1. **Session Expired**
   - Solution: Implement proper token refresh logic
   - Check: Token expiration settings

2. **CORS Errors**
   - Solution: Configure allowed origins in Supabase
   - Check: Redirect URLs configuration

3. **Cookie Not Set**
   - Solution: Ensure HTTPS in production
   - Check: SameSite and Secure attributes

4. **Token Refresh Failed**
   - Solution: Handle refresh token expiration
   - Check: Network connectivity

## Security Checklist

- [ ] Use `getUser()` for server-side validation
- [ ] Implement proper session timeout
- [ ] Enable MFA for sensitive operations
- [ ] Configure secure cookie settings
- [ ] Implement rate limiting
- [ ] Monitor authentication events
- [ ] Regular security audits
- [ ] Test authentication flows
- [ ] Document security procedures
- [ ] Train users on security best practices

---

**Document Version**: 1.0.0
**Last Updated**: 2025-08-16
**Classification**: Internal Use Only