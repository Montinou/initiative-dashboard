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

## Dialogflow CX Configuration

These variables configure the Web Messenger widget and backend integrations. Do not expose any server secrets on the client unless prefixed with NEXT_PUBLIC_.

```env
# Enable/disable the in‑app Dialogflow CX messenger (client‑side)
NEXT_PUBLIC_DF_ENABLED=true

# Dialogflow CX identifiers (client‑side)
NEXT_PUBLIC_DF_PROJECT_ID=your-gcp-project-id
NEXT_PUBLIC_DF_AGENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
NEXT_PUBLIC_DF_LOCATION=global # or us, eu, etc.
NEXT_PUBLIC_DF_TITLE="Assistant"
```

Notes
- The messenger reads session context from the route `/api/ai/session-map` (no env var required). Ensure this API is deployed and returns user/tenant context.
- Allowed domains must be configured in the Dialogflow CX Web integration as exact hostnames (no scheme, paths, ports, or wildcards). Examples: `yourapp.vercel.app`, `lvh.me`, `staging.yourdomain.com`.

## Cloud Storage (GCS) Configuration

File uploads are stored in a Google Cloud Storage bucket with object‑level metadata. Processing happens on the server only.

```env
# Google Cloud project id (server‑side)
GCP_PROJECT_ID=your-gcp-project-id

# GCS bucket name (server‑side)
GCS_BUCKET_NAME=initiative-dashboard-files

# Service account credentials (one of the following)
# Option A: base64‑encoded JSON of the service account key
GCP_SERVICE_ACCOUNT_JSON_BASE64=ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsIC4uLn0=
# Option B: path to JSON on disk (use only for local dev)
GOOGLE_APPLICATION_CREDENTIALS=.secrets/gcp-sa.json

# Upload and processing tuning (server‑side)
MAX_UPLOAD_SIZE_MB=50
GCS_USE_RESUMABLE_UPLOADS=true
GCS_SIGNED_URL_TTL_SECONDS=1800
```

Security
- Keep all GCP credentials server‑side; never prefix with NEXT_PUBLIC_.
- Ensure bucket IAM allows the service account to write objects and set metadata (roles/storage.objectAdmin minimum), and to create signed URLs if needed (roles/storage.admin or SignBlob permissions).

## Security Best Practices

### Never Commit

- `.env.local`
- `.env.production`
- Any file containing `SUPABASE_SERVICE_ROLE_KEY` or GCP service account keys

### Public vs Private Keys

**Public Keys** (NEXT_PUBLIC_*):
- Safe for client-side use
- Included in browser bundle
- Used for Supabase client initialization and DF Messenger config

**Private Keys**:
- Server-side only
- Never exposed to client
- Used for admin operations and cloud storage

### Key Rotation

1. Generate new keys in Supabase / GCP console
2. Update environment variables
3. Restart application
4. Test authentication and uploads

## Environment-Specific Settings

### Development

```env
# Development database
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=dev_key_here

# Debug settings
NEXT_PUBLIC_DEBUG=true
LOG_LEVEL=debug

# Local DF (optional)
NEXT_PUBLIC_DF_ENABLED=true
NEXT_PUBLIC_DF_PROJECT_ID=local-project
NEXT_PUBLIC_DF_AGENT_ID=local-agent-id
NEXT_PUBLIC_DF_LOCATION=global
NEXT_PUBLIC_DF_TITLE="Assistant (Dev)"

# Local GCS (use emulator or set real bucket for testing)
GCP_PROJECT_ID=dev-project
GCS_BUCKET_NAME=initiative-dashboard-dev
GCP_SERVICE_ACCOUNT_JSON_BASE64=...
```

### Staging

```env
# Staging database
NEXT_PUBLIC_SUPABASE_URL=https://staging.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging_key_here

# Limited debug
NEXT_PUBLIC_DEBUG=false
LOG_LEVEL=info

# Staging DF
NEXT_PUBLIC_DF_ENABLED=true
NEXT_PUBLIC_DF_PROJECT_ID=staging-project
NEXT_PUBLIC_DF_AGENT_ID=staging-agent-id
NEXT_PUBLIC_DF_LOCATION=us
NEXT_PUBLIC_DF_TITLE="Assistant (Staging)"

# Staging GCS
GCP_PROJECT_ID=staging-project
GCS_BUCKET_NAME=initiative-dashboard-stg
GCP_SERVICE_ACCOUNT_JSON_BASE64=...
```

### Production

```env
# Production database
NEXT_PUBLIC_SUPABASE_URL=https://prod.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=prod_key_here

# No debug
NEXT_PUBLIC_DEBUG=false
LOG_LEVEL=error

# Production DF
NEXT_PUBLIC_DF_ENABLED=true
NEXT_PUBLIC_DF_PROJECT_ID=prod-project
NEXT_PUBLIC_DF_AGENT_ID=prod-agent-id
NEXT_PUBLIC_DF_LOCATION=us
NEXT_PUBLIC_DF_TITLE="Assistant"

# Production GCS
GCP_PROJECT_ID=prod-project
GCS_BUCKET_NAME= gcf-v2-sources-30705406738-us-central1
GCP_SERVICE_ACCOUNT_JSON_BASE64=...
```

## Validation

### Check Environment

```javascript
// utils/env-check.js
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  // Dialogflow CX (client)
  'NEXT_PUBLIC_DF_ENABLED',
  'NEXT_PUBLIC_DF_PROJECT_ID',
  'NEXT_PUBLIC_DF_AGENT_ID',
  'NEXT_PUBLIC_DF_LOCATION',
  // Cloud Storage (server)
  'GCP_PROJECT_ID',
  'GCS_BUCKET_NAME',
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
    dfEnabled: process.env.NEXT_PUBLIC_DF_ENABLED === 'true',
    gcs: !!process.env.GCP_PROJECT_ID && !!process.env.GCS_BUCKET_NAME,
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
ARG NEXT_PUBLIC_DF_ENABLED
ARG NEXT_PUBLIC_DF_PROJECT_ID
ARG NEXT_PUBLIC_DF_AGENT_ID
ARG NEXT_PUBLIC_DF_LOCATION
ARG NEXT_PUBLIC_DF_TITLE

# Set environment variables
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY
ENV NEXT_PUBLIC_DF_ENABLED=$NEXT_PUBLIC_DF_ENABLED
ENV NEXT_PUBLIC_DF_PROJECT_ID=$NEXT_PUBLIC_DF_PROJECT_ID
ENV NEXT_PUBLIC_DF_AGENT_ID=$NEXT_PUBLIC_DF_AGENT_ID
ENV NEXT_PUBLIC_DF_LOCATION=$NEXT_PUBLIC_DF_LOCATION
ENV NEXT_PUBLIC_DF_TITLE=$NEXT_PUBLIC_DF_TITLE
```

### Kubernetes

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  NEXT_PUBLIC_SUPABASE_URL: "https://prod.supabase.co"
  NEXT_PUBLIC_DF_ENABLED: "true"
  NEXT_PUBLIC_DF_PROJECT_ID: "prod-project"
  NEXT_PUBLIC_DF_AGENT_ID: "prod-agent-id"
  NEXT_PUBLIC_DF_LOCATION: "us"
---
apiVersion: v1
kind: Secret
metadata:
  name: app-secrets
type: Opaque
data:
  SUPABASE_SERVICE_ROLE_KEY: <base64-encoded-key>
  GCP_SERVICE_ACCOUNT_JSON_BASE64: <base64-encoded-json>
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

### Dialogflow Messenger

1. Ensure `NEXT_PUBLIC_DF_ENABLED=true`
2. Verify allowed domains in Dialogflow CX Web integration are bare hostnames
3. Confirm `/api/ai/session-map` responds with sessionId and session params

### Cloud Storage

1. Check service account IAM on the bucket (objectAdmin or better)
2. Verify `GCS_BUCKET_NAME` exists and is accessible
3. Ensure uploads use resumable mode for large files
4. Validate object metadata is populated (tenant_id, user_id, filename, checksum)