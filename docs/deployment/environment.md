# Environment Variables

## Configuration Files

### Development: `.env.local`
Local development environment variables.

### Production: `.env.production`
Production environment variables.

## Required Variables

### Supabase Configuration

```env
# Public Supabase URL
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co

# Public anonymous key for browser access
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Service role key for server-side operations (keep secret!)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### Application Configuration

```env
# Application URL
NEXT_PUBLIC_APP_URL=http://localhost:3000

# API base URL (optional, defaults to APP_URL)
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

### Feature Flags (Optional)

```env
# Enable debug mode
NEXT_PUBLIC_DEBUG=false

# Enable analytics
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Enable multi-tenancy features
NEXT_PUBLIC_MULTI_TENANT=true
```

## Security Best Practices

### Never Commit

- `.env.local`
- `.env.production`
- Any file containing `SUPABASE_SERVICE_ROLE_KEY`

### Public vs Private Keys

**Public Keys** (NEXT_PUBLIC_*):
- Safe for client-side use
- Included in browser bundle
- Used for Supabase client initialization

**Private Keys**:
- Server-side only
- Never exposed to client
- Used for admin operations

### Key Rotation

1. Generate new keys in Supabase dashboard
2. Update environment variables
3. Restart application
4. Test authentication flow

## Environment-Specific Settings

### Development

```env
# Development database
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=dev_key_here

# Debug settings
NEXT_PUBLIC_DEBUG=true
LOG_LEVEL=debug
```

### Staging

```env
# Staging database
NEXT_PUBLIC_SUPABASE_URL=https://staging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging_key_here

# Limited debug
NEXT_PUBLIC_DEBUG=false
LOG_LEVEL=info
```

### Production

```env
# Production database
NEXT_PUBLIC_SUPABASE_URL=https://prod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod_key_here

# No debug
NEXT_PUBLIC_DEBUG=false
LOG_LEVEL=error
```

## Validation

### Check Environment

```javascript
// utils/env-check.js
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});
```

### Runtime Verification

```javascript
// app/api/health/route.ts
export async function GET() {
  const status = {
    supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    auth: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };
  
  return NextResponse.json({ status });
}
```

## Deployment Platforms

### Vercel

Set environment variables in Vercel dashboard:
1. Project Settings → Environment Variables
2. Add each variable
3. Select environments (Production/Preview/Development)

### Docker

```dockerfile
# Use build args for public variables
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY

# Set environment variables
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Kubernetes

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  SUPABASE_SERVICE_ROLE_KEY: <base64-encoded-key>
```

## Troubleshooting

### Variable Not Loading

1. Check file name (`.env.local` not `.env`)
2. Restart development server
3. Clear Next.js cache: `rm -rf .next`
4. Verify variable naming (NEXT_PUBLIC_ prefix for client-side)

### Authentication Failures

1. Verify Supabase URL format
2. Check key validity in Supabase dashboard
3. Ensure correct key type (anon vs service role)
4. Check CORS settings in Supabase