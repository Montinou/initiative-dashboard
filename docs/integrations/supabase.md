# Supabase Integration Documentation

## Overview
Supabase provides the complete backend infrastructure for the Initiative Dashboard, including PostgreSQL database, authentication, real-time subscriptions, and Row Level Security (RLS).

## Configuration

### Environment Variables
```env
# Public Keys (Client-side)
NEXT_PUBLIC_SUPABASE_URL=https://zkkdnslupqnpioltjpeu.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Keys (Server-side only)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=TKR98/4C9kb01gdMpiZNZ6hJDBTdtqV8...

# Database Connection
POSTGRES_HOST=db.zkkdnslupqnpioltjpeu.supabase.co
POSTGRES_DATABASE=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=bWSg6ONuXWdZsDVP

# Connection URLs
POSTGRES_URL=postgres://postgres.zkkdnslupqnpioltjpeu:password@pooler.supabase.com:6543/postgres
POSTGRES_PRISMA_URL=postgres://postgres.zkkdnslupqnpioltjpeu:password@pooler.supabase.com:6543/postgres?pgbouncer=true
POSTGRES_URL_NON_POOLING=postgres://postgres.zkkdnslupqnpioltjpeu:password@pooler.supabase.com:5432/postgres

# Management
SUPABASE_ACCESS_TOKEN=sbp_1106e8119c52818bd02306a680d0d4fdd1441db9
```

## Client Setup

### Browser Client (`/utils/supabase/client.ts`)
```typescript
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Server Client (`/utils/supabase/server.ts`)
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
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    }
  )
}
```

## Authentication

### Key Principles
1. **Always use `getUser()` on server-side**, never `getSession()`
2. **Session refresh handled automatically** when `autoRefreshToken: true`
3. **JWT claims include user ID**, not profile ID
4. **Cookies used for auth** in SSR environments

### Authentication Flow
```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password'
})

// Get authenticated user (server-side)
const { data: { user }, error } = await supabase.auth.getUser()

// Logout
await supabase.auth.signOut()
```

### Auth State Management
```typescript
// Listen for auth changes
const { data } = supabase.auth.onAuthStateChange((event, session) => {
  switch (event) {
    case 'SIGNED_IN':
      // Handle login
      break
    case 'SIGNED_OUT':
      // Handle logout
      break
    case 'TOKEN_REFRESHED':
      // Token auto-refreshed
      break
  }
})
```

## Database Access

### Row Level Security (RLS)
All tables have RLS policies that automatically filter by `tenant_id`:

```sql
-- Example RLS Policy
CREATE POLICY "Tenant isolation" ON public.initiatives
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
  );
```

### Database Queries
```typescript
// Queries automatically filtered by RLS
const { data, error } = await supabase
  .from('initiatives')
  .select('*')
  .eq('area_id', areaId)
  
// Insert with automatic tenant_id
const { data, error } = await supabase
  .from('initiatives')
  .insert({
    title: 'New Initiative',
    area_id: areaId
    // tenant_id automatically set by RLS
  })
```

## Real-time Subscriptions
```typescript
// Subscribe to changes
const channel = supabase
  .channel('initiatives-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'initiatives'
    },
    (payload) => {
      console.log('Change received!', payload)
    }
  )
  .subscribe()

// Cleanup
channel.unsubscribe()
```

## File Storage
```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('uploads')
  .upload(`${tenantId}/${fileName}`, file)

// Get public URL
const { data } = supabase.storage
  .from('uploads')
  .getPublicUrl(filePath)

// Download file
const { data, error } = await supabase.storage
  .from('uploads')
  .download(filePath)
```

## Error Handling
```typescript
import { isAuthApiError } from '@supabase/supabase-js'

const handleError = (error: any) => {
  if (isAuthApiError(error)) {
    switch (error.code) {
      case 'invalid_credentials':
        return 'Invalid email or password'
      case 'email_not_confirmed':
        return 'Please confirm your email'
      case 'session_expired':
        return 'Session expired, please login again'
      default:
        return error.message
    }
  }
  return 'An unexpected error occurred'
}
```

## Migrations

### Running Migrations
```bash
# Apply migrations
supabase db push

# Create new migration
supabase migration new migration_name

# List migrations
supabase migration list
```

### Migration Files Location
```
/supabase/migrations/
├── 20240101000001_create_base_tables_and_types.sql
├── 20240101000002_create_auth_sync_trigger.sql
├── 20240101000003_add_foreign_key_constraints.sql
├── 20240101000004_add_audit_function_and_triggers.sql
├── 20240101000005_enable_rls_and_policies.sql
└── ...
```

## Webhook Integration

### BigQuery Sync Webhook
```typescript
// Webhook configuration
const WEBHOOK_URL = process.env.BIGQUERY_SYNC_WEBHOOK_URL
const WEBHOOK_SECRET = process.env.BIGQUERY_SYNC_WEBHOOK_SECRET

// Verify webhook signature
const verifyWebhook = (signature: string, body: string) => {
  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET)
  const expectedSignature = hmac.update(body).digest('hex')
  return signature === expectedSignature
}
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Ensure `getUser()` is used on server-side
   - Check if session cookies are properly set
   - Verify ANON_KEY and SERVICE_ROLE_KEY

2. **RLS Policy Violations**
   - Check user has `tenant_id` in profile
   - Verify RLS policies are enabled
   - Use service role key for admin operations

3. **Connection Issues**
   - Use pooler URL for serverless environments
   - Non-pooling URL for persistent connections
   - Check connection limits

### Debug Mode
```typescript
const supabase = createClient(url, key, {
  auth: {
    debug: true // Enable debug logs
  }
})
```

## Best Practices

1. **Always handle errors gracefully**
2. **Use RLS for security, never bypass without reason**
3. **Implement proper session management**
4. **Cache frequently accessed data**
5. **Use transactions for multi-table operations**
6. **Monitor rate limits**
7. **Implement retry logic for network errors**

## CLI Commands

```bash
# Login to Supabase
supabase login

# Link project
supabase link --project-ref zkkdnslupqnpioltjpeu

# Reset database
supabase db reset

# Run seed script
npm run db:seed

# Check status
supabase status
```

## Security Considerations

1. **Never expose SERVICE_ROLE_KEY to client**
2. **Always validate user permissions**
3. **Use RLS policies for all tables**
4. **Implement rate limiting**
5. **Audit sensitive operations**
6. **Regular security reviews**

## Performance Optimization

1. **Use indexes for frequent queries**
2. **Implement connection pooling**
3. **Cache with Redis for repeated queries**
4. **Batch operations when possible**
5. **Use materialized views for complex queries**

## Monitoring

### Key Metrics to Track
- Authentication success/failure rates
- Database query performance
- RLS policy execution time
- Storage usage
- Real-time connection count
- API request latency

### Logging
```typescript
// Enable query logging
const { data, error } = await supabase
  .from('table')
  .select()
  .explain({ analyze: true })
```

## References

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Project Dashboard](https://app.supabase.com/project/zkkdnslupqnpioltjpeu)