# Superadmin Authentication Migration Guide

## Overview

This guide outlines the migration from the current `public.superadmins` table-based authentication to using `auth.users` with `public.user_profiles.role = 'superadmin'` for https://stratix-platform.vercel.app/superadmin/login

## Current vs New Implementation

### Current Implementation ❌
- Uses separate `public.superadmins` table
- Custom password hashing with Web Crypto API
- Custom session management via `superadmin_sessions` table
- HTTP-only cookies with custom session tokens

### New Implementation ✅
- Uses Supabase `auth.users` table
- Supabase-managed password hashing and authentication
- JWT-based session management via Supabase Auth
- `public.user_profiles.role = 'superadmin'` for authorization
- HTTP-only cookies with Supabase access tokens

## Migration Steps

### Step 1: Database Schema Migration

1. **Run the database migration**:
   ```sql
   -- Execute the migration script
   \i database/superadmin-auth-migration.sql
   ```

2. **Add 'superadmin' to user_role enum**:
   ```sql
   ALTER TYPE user_role ADD VALUE 'superadmin';
   ```

3. **Create first superadmin user**:
   ```sql
   -- Create user in Supabase Auth Dashboard first, then:
   UPDATE public.user_profiles 
   SET role = 'superadmin'
   WHERE email = 'admin@stratix-platform.com';
   ```

### Step 2: Update Authentication Code

1. **Replace authentication imports**:
   ```typescript
   // OLD
   import { edgeCompatibleAuth } from '@/lib/edge-compatible-auth';
   
   // NEW
   import { supabaseSuperadminAuth } from '@/lib/supabase-superadmin-auth';
   ```

2. **Update API routes**:
   - Replace `/app/api/superadmin/auth/login/route.ts` with `route-updated.ts`
   - Replace `/app/api/superadmin/auth/session/route.ts` with `route-updated.ts`

3. **Update middleware**:
   - Replace `/lib/superadmin-middleware.ts` with `superadmin-middleware-updated.ts`

4. **Update main middleware**:
   ```typescript
   // In middleware.ts, update the import:
   import { superadminMiddleware } from '@/lib/superadmin-middleware-updated'
   ```

### Step 3: Create Initial Superadmin User

#### Option A: Via Supabase Dashboard
1. Go to Supabase Dashboard → Authentication → Users
2. Create new user with email/password
3. Note the user ID
4. Run SQL to set role:
   ```sql
   INSERT INTO public.user_profiles (id, email, full_name, role, is_active)
   VALUES ('USER_ID_FROM_DASHBOARD', 'admin@stratix-platform.com', 'System Administrator', 'superadmin', true)
   ON CONFLICT (id) DO UPDATE SET role = 'superadmin';
   ```

#### Option B: Via Code (after migration)
```typescript
import { supabaseSuperadminAuth } from '@/lib/supabase-superadmin-auth';

const result = await supabaseSuperadminAuth.createSuperadmin(
  'admin@stratix-platform.com',
  'secure-password-123',
  'System Administrator'
);
```

### Step 4: Update Environment Variables

Ensure these environment variables are set:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Step 5: Test the Migration

1. **Test login flow**:
   ```bash
   curl -X POST https://stratix-platform.vercel.app/api/superadmin/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@stratix-platform.com","password":"your-password"}'
   ```

2. **Test session validation**:
   ```bash
   curl https://stratix-platform.vercel.app/api/superadmin/auth/session \
     -H "Cookie: superadmin-session=TOKEN_FROM_LOGIN"
   ```

3. **Test superadmin dashboard access**:
   - Navigate to https://stratix-platform.vercel.app/superadmin/login
   - Login with superadmin credentials
   - Verify redirect to dashboard

## Key Differences

### Authentication Flow

#### Before:
```
Email/Password → Custom hash verification → Custom session token → HTTP-only cookie
```

#### After:
```
Email/Password → Supabase Auth → JWT access token → Role verification → HTTP-only cookie
```

### Session Management

#### Before:
- Custom session tokens stored in `superadmin_sessions` table
- Manual expiration handling
- Custom cleanup processes

#### After:
- JWT tokens managed by Supabase
- Automatic expiration via JWT claims
- Built-in token refresh capabilities

### Role Verification

#### Before:
```sql
SELECT * FROM public.superadmins WHERE email = ? AND is_active = true
```

#### After:
```sql
SELECT * FROM public.user_profiles WHERE id = ? AND role = 'superadmin' AND is_active = true
```

## Security Improvements

### Enhanced Security Features

1. **JWT Security**: Supabase-managed JWT tokens with proper signing and expiration
2. **Built-in Protection**: Supabase handles common attack vectors (timing attacks, etc.)
3. **Token Refresh**: Automatic token refresh capabilities
4. **Audit Trail**: Enhanced logging with Supabase user context

### Maintained Security Features

1. **Rate Limiting**: Unchanged - still protects against brute force
2. **IP Whitelisting**: Can be re-enabled if needed
3. **Session Expiration**: 30-minute sessions maintained
4. **HTTP-only Cookies**: Same secure cookie settings

## API Changes

### Login Response

#### Before:
```json
{
  "success": true,
  "superadmin": {
    "id": "uuid",
    "name": "Admin Name",
    "email": "admin@example.com"
  }
}
```

#### After:
```json
{
  "success": true,
  "superadmin": {
    "id": "uuid",
    "name": "Admin Name", 
    "email": "admin@example.com",
    "role": "superadmin"
  },
  "session": {
    "expires_at": 1234567890
  }
}
```

### Session Validation

#### Before:
```json
{
  "id": "uuid",
  "email": "admin@example.com",
  "name": "Admin Name",
  "is_active": true,
  "last_login": "2025-01-26T10:00:00Z"
}
```

#### After:
```json
{
  "success": true,
  "superadmin": {
    "id": "uuid",
    "name": "Admin Name",
    "email": "admin@example.com", 
    "role": "superadmin",
    "is_active": true,
    "last_login": "2025-01-26T10:00:00Z"
  },
  "authenticated": true
}
```

## Rollback Plan

If issues arise, you can rollback by:

1. **Revert middleware changes**:
   ```bash
   git checkout HEAD~1 -- lib/superadmin-middleware.ts
   ```

2. **Revert API routes**:
   ```bash
   git checkout HEAD~1 -- app/api/superadmin/auth/
   ```

3. **Restore old auth system**:
   ```bash
   git checkout HEAD~1 -- lib/edge-compatible-auth.ts
   ```

4. **Keep database changes** (they don't conflict with old system)

## Testing Checklist

- [ ] Superadmin login works at `/superadmin/login`
- [ ] Session validation works for authenticated routes
- [ ] Logout clears cookies and invalidates session
- [ ] Rate limiting still functions correctly
- [ ] Audit logging captures all actions
- [ ] User profile role verification works
- [ ] JWT token expiration is handled properly
- [ ] Middleware protects all superadmin routes
- [ ] Error handling provides appropriate feedback
- [ ] CORS and security headers are maintained

## Performance Considerations

### Improvements:
- **Faster Authentication**: Supabase Auth is optimized for performance
- **Reduced Database Queries**: JWT validation is stateless
- **Better Caching**: Supabase provides built-in caching

### Monitoring:
- Monitor JWT token size (should be reasonable)
- Check authentication response times
- Verify session validation performance

## Support and Troubleshooting

### Common Issues:

1. **"Access denied: Superadmin privileges required"**
   - Verify user has `role = 'superadmin'` in `user_profiles`
   - Check user is `is_active = true`

2. **"Invalid or expired session"**
   - Check JWT token expiration
   - Verify Supabase project settings
   - Ensure environment variables are correct

3. **Login fails with correct credentials**
   - Verify user exists in both `auth.users` and `user_profiles`
   - Check Supabase Auth settings
   - Verify email confirmation status

### Debug Commands:

```sql
-- Check if user is properly configured as superadmin
SELECT 
  au.id,
  au.email,
  au.email_confirmed_at,
  up.role,
  up.is_active
FROM auth.users au
LEFT JOIN public.user_profiles up ON au.id = up.id
WHERE au.email = 'admin@stratix-platform.com';

-- Check recent audit log entries
SELECT * FROM public.superadmin_audit_log 
ORDER BY created_at DESC 
LIMIT 10;
```

---

This migration provides a more robust, secure, and maintainable authentication system while preserving all existing security features and audit capabilities.