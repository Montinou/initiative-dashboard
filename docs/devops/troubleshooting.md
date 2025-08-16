# Troubleshooting Guide

## Overview

This comprehensive guide provides solutions for common issues, debugging procedures, and resolution strategies for the Initiative Dashboard application.

## Quick Diagnostics

### System Health Check Script
```bash
#!/bin/bash
# scripts/health-check.sh

echo "🔍 Running system diagnostics..."

# Check Node version
NODE_VERSION=$(node --version)
echo "Node.js: $NODE_VERSION"
if [[ ! "$NODE_VERSION" =~ ^v22\. ]]; then
  echo "⚠️  Warning: Node.js 22.x required"
fi

# Check npm/pnpm
PNPM_VERSION=$(pnpm --version 2>/dev/null || echo "not installed")
echo "pnpm: $PNPM_VERSION"

# Check environment variables
ENV_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "GCP_PROJECT_ID"
)

for var in "${ENV_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing: $var"
  else
    echo "✅ Set: $var"
  fi
done

# Test database connection
echo "Testing database connection..."
npx supabase db remote commit --dry-run 2>/dev/null && echo "✅ Database connected" || echo "❌ Database connection failed"

# Test API endpoints
echo "Testing API endpoints..."
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/health | grep -q "200" && echo "✅ API healthy" || echo "❌ API unhealthy"

echo "Diagnostic complete!"
```

## Common Issues and Solutions

### 1. Build and Compilation Errors

#### Issue: "Cannot find module" errors
```bash
Error: Cannot find module '@/components/Example'
```

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules .next
rm pnpm-lock.yaml
pnpm install
pnpm build
```

#### Issue: TypeScript errors during build
```typescript
Type error: Property 'X' does not exist on type 'Y'
```

**Solution:**
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Update type definitions
pnpm add -D @types/node@latest @types/react@latest

# If using custom types, check tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./app/*", "./components/*", "./lib/*"]
    }
  }
}
```

#### Issue: Memory errors during build
```bash
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Solution:**
```bash
# Increase Node memory limit
export NODE_OPTIONS="--max-old-space-size=4096"
pnpm build

# Or add to package.json
{
  "scripts": {
    "build": "NODE_OPTIONS='--max-old-space-size=4096' next build"
  }
}
```

### 2. Database Connection Issues

#### Issue: "Connection refused" error
```
error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
```typescript
// Check Supabase URL format
// Correct format:
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co

// Not:
NEXT_PUBLIC_SUPABASE_URL=[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_URL=http://[project-id].supabase.co
```

#### Issue: RLS policy violations
```
Error: new row violates row-level security policy
```

**Solution:**
```sql
-- Check current user and policies
SELECT current_user, auth.uid();

-- List policies for table
SELECT * FROM pg_policies WHERE tablename = 'initiatives';

-- Temporarily disable RLS for debugging (DEVELOPMENT ONLY)
ALTER TABLE initiatives DISABLE ROW LEVEL SECURITY;

-- Fix policy
DROP POLICY IF EXISTS "tenant_isolation" ON initiatives;
CREATE POLICY "tenant_isolation" ON initiatives
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Re-enable RLS
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
```

#### Issue: Database migrations failing
```bash
Error: migration failed: relation "table_name" already exists
```

**Solution:**
```bash
# Check migration status
supabase migration list

# Reset migrations (CAUTION: This will delete data)
supabase db reset

# Apply specific migration
supabase migration up --version 20240101000001

# Skip problematic migration
supabase migration repair --version 20240101000001
```

### 3. Authentication Problems

#### Issue: "Invalid token" or "JWT expired"
```javascript
Error: Invalid Refresh Token: Refresh Token Not Found
```

**Solution:**
```typescript
// lib/auth-fix.ts
import { createClient } from '@/utils/supabase/client';

export async function refreshSession() {
  const supabase = createClient();
  
  // Force refresh
  const { data: { session }, error } = await supabase.auth.refreshSession();
  
  if (error) {
    // Clear invalid session
    await supabase.auth.signOut();
    
    // Redirect to login
    window.location.href = '/auth/login';
  }
  
  return session;
}

// Add to app layout
useEffect(() => {
  const interval = setInterval(refreshSession, 3300000); // 55 minutes
  return () => clearInterval(interval);
}, []);
```

#### Issue: CORS errors with Supabase
```
Access to fetch at 'https://xxx.supabase.co' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution:**
```typescript
// In Supabase Dashboard > Settings > API
// Add to allowed origins:
http://localhost:3000
http://localhost:3001
https://your-domain.com

// Or in middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
}
```

### 4. Performance Issues

#### Issue: Slow page loads
**Diagnosis:**
```typescript
// app/performance-debug.tsx
'use client';

import { useEffect } from 'react';

export function PerformanceDebugger() {
  useEffect(() => {
    // Log performance metrics
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log(`${entry.name}: ${entry.duration}ms`);
      }
    });
    
    observer.observe({ entryTypes: ['navigation', 'resource', 'measure'] });
    
    // Measure specific operations
    performance.mark('data-fetch-start');
    // ... fetch data
    performance.mark('data-fetch-end');
    performance.measure('data-fetch', 'data-fetch-start', 'data-fetch-end');
  }, []);
  
  return null;
}
```

**Solution:**
```typescript
// Implement lazy loading
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(
  () => import('@/components/HeavyComponent'),
  { 
    loading: () => <Skeleton />,
    ssr: false 
  }
);

// Optimize queries
// Instead of:
const { data } = await supabase
  .from('initiatives')
  .select('*, activities(*), objectives(*)');

// Use:
const { data } = await supabase
  .from('initiatives')
  .select('id, title, progress')
  .limit(10);
```

#### Issue: High memory usage
**Diagnosis:**
```javascript
// Monitor memory usage
console.log('Memory Usage:', process.memoryUsage());

setInterval(() => {
  const usage = process.memoryUsage();
  console.log(`
    RSS: ${Math.round(usage.rss / 1024 / 1024)} MB
    Heap Used: ${Math.round(usage.heapUsed / 1024 / 1024)} MB
    Heap Total: ${Math.round(usage.heapTotal / 1024 / 1024)} MB
  `);
}, 5000);
```

**Solution:**
```typescript
// Clear unused cache
import { cache } from 'react';

// Use React cache for expensive operations
const getExpensiveData = cache(async (id: string) => {
  // Expensive operation
  return data;
});

// Implement cleanup
useEffect(() => {
  return () => {
    // Cleanup subscriptions, timers, etc.
    subscription?.unsubscribe();
    clearInterval(timer);
  };
}, []);
```

### 5. Deployment Issues

#### Issue: Vercel deployment failing
```
Error: The Serverless Function "api/route" is 50MB, which exceeds the maximum size limit of 50MB.
```

**Solution:**
```javascript
// next.config.mjs
export default {
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core-linux-x64-gnu',
        'node_modules/@swc/core-linux-x64-musl',
        'node_modules/@esbuild/linux-x64',
      ],
    },
  },
};

// Or split large functions
// app/api/large-function/route.ts
export { GET } from './get';
export { POST } from './post';
```

#### Issue: Environment variables not working
**Solution:**
```bash
# Verify in Vercel dashboard
vercel env ls

# Pull environment variables
vercel env pull .env.local

# Add missing variable
vercel env add VARIABLE_NAME

# Rebuild with cleared cache
vercel --force
```

### 6. UI/UX Issues

#### Issue: Hydration mismatch
```
Error: Hydration failed because the initial UI does not match what was rendered on the server
```

**Solution:**
```typescript
// Ensure consistent rendering
'use client';

import { useEffect, useState } from 'react';

export function ClientOnlyComponent() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) {
    return <div>Loading...</div>; // Same as server
  }
  
  return <div>{new Date().toLocaleString()}</div>; // Client-specific
}
```

#### Issue: Components not updating
**Solution:**
```typescript
// Force re-render with key
<Component key={data.id} data={data} />

// Use SWR for data fetching
import useSWR from 'swr';

function Component() {
  const { data, error, mutate } = useSWR('/api/data', fetcher);
  
  // Force refresh
  const handleRefresh = () => {
    mutate();
  };
}
```

## Debugging Tools

### 1. Debug Mode Configuration
```typescript
// lib/debug.ts
export const DEBUG = {
  api: process.env.NODE_ENV === 'development',
  database: process.env.DEBUG_DATABASE === 'true',
  auth: process.env.DEBUG_AUTH === 'true',
  performance: process.env.DEBUG_PERFORMANCE === 'true',
};

export function debugLog(category: keyof typeof DEBUG, ...args: any[]) {
  if (DEBUG[category]) {
    console.log(`[${category.toUpperCase()}]`, ...args);
  }
}

// Usage
debugLog('api', 'Request:', request);
debugLog('database', 'Query:', query);
```

### 2. API Request Interceptor
```typescript
// lib/api-interceptor.ts
export function createAPIInterceptor() {
  const originalFetch = global.fetch;
  
  global.fetch = async (...args) => {
    const [url, options] = args;
    
    console.group(`🔵 API Request: ${options?.method || 'GET'} ${url}`);
    console.log('Headers:', options?.headers);
    console.log('Body:', options?.body);
    console.groupEnd();
    
    const startTime = performance.now();
    
    try {
      const response = await originalFetch(...args);
      const duration = performance.now() - startTime;
      
      console.group(`🟢 API Response: ${response.status} (${duration.toFixed(2)}ms)`);
      console.log('Headers:', response.headers);
      console.groupEnd();
      
      return response;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      console.group(`🔴 API Error: (${duration.toFixed(2)}ms)`);
      console.error(error);
      console.groupEnd();
      
      throw error;
    }
  };
}
```

### 3. Database Query Logger
```sql
-- Enable query logging in Supabase
ALTER SYSTEM SET log_statement = 'all';
ALTER SYSTEM SET log_duration = on;
SELECT pg_reload_conf();

-- View recent queries
SELECT 
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### 4. React DevTools Profiler
```typescript
// Wrap components for profiling
import { Profiler } from 'react';

function onRenderCallback(id, phase, actualDuration) {
  console.log(`Component ${id} (${phase}) took ${actualDuration}ms`);
}

<Profiler id="Dashboard" onRender={onRenderCallback}>
  <Dashboard />
</Profiler>
```

## Emergency Procedures

### 1. Application Crash Recovery
```bash
#!/bin/bash
# scripts/emergency-recovery.sh

echo "🚨 Starting emergency recovery..."

# 1. Switch to maintenance mode
echo "Enabling maintenance mode..."
vercel env add NEXT_PUBLIC_MAINTENANCE_MODE true

# 2. Rollback to last working version
echo "Rolling back deployment..."
LAST_GOOD=$(vercel ls --json | jq -r '.[1].uid')
vercel promote $LAST_GOOD

# 3. Clear all caches
echo "Clearing caches..."
curl -X POST https://api.vercel.com/v1/cache/purge \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -d '{"teamId": "'$VERCEL_TEAM_ID'"}'

# 4. Restart services
echo "Restarting services..."
vercel dev --force

# 5. Run health checks
echo "Running health checks..."
curl https://your-app.vercel.app/api/health

echo "✅ Emergency recovery complete"
```

### 2. Data Corruption Recovery
```sql
-- Identify corrupted data
SELECT * FROM initiatives 
WHERE created_at > updated_at 
   OR progress < 0 
   OR progress > 100;

-- Fix common issues
UPDATE initiatives 
SET progress = 0 
WHERE progress < 0;

UPDATE initiatives 
SET progress = 100 
WHERE progress > 100;

-- Verify referential integrity
SELECT i.* FROM initiatives i
LEFT JOIN areas a ON i.area_id = a.id
WHERE a.id IS NULL;

-- Clean orphaned records
DELETE FROM activities 
WHERE initiative_id NOT IN (SELECT id FROM initiatives);
```

## Monitoring and Alerts

### Setup Monitoring
```typescript
// monitoring/setup.ts
import * as Sentry from "@sentry/nextjs";

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  beforeSend(event, hint) {
    // Filter out known issues
    if (event.exception?.values?.[0]?.type === 'NetworkError') {
      return null;
    }
    return event;
  },
});

// Custom error boundary
export function ErrorBoundary({ children }) {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <div>
          <h2>Something went wrong</h2>
          <details>{error.toString()}</details>
          <button onClick={resetError}>Try again</button>
        </div>
      )}
      showDialog
    >
      {children}
    </Sentry.ErrorBoundary>
  );
}
```

### Alert Configuration
```yaml
# alerts.yaml
alerts:
  - name: HighErrorRate
    query: rate(errors[5m]) > 0.05
    severity: critical
    action: page
    
  - name: SlowResponse
    query: histogram_quantile(0.95, http_request_duration) > 2
    severity: warning
    action: notify
    
  - name: DatabaseDown
    query: up{job="postgres"} == 0
    severity: critical
    action: page
    
  - name: LowDiskSpace
    query: disk_free_percent < 10
    severity: warning
    action: notify
```

## Useful Commands Reference

### Development Commands
```bash
# Start development server with debug
DEBUG=* pnpm dev

# Check for outdated packages
pnpm outdated

# Audit for vulnerabilities
pnpm audit

# Clean everything and start fresh
rm -rf node_modules .next
pnpm install
pnpm build
```

### Database Commands
```bash
# Connect to database
npx supabase db remote commit

# Run migrations
npx supabase migration up

# Generate types from database
npx supabase gen types typescript --local > types/database.ts

# Backup database
pg_dump $DATABASE_URL > backup.sql
```

### Deployment Commands
```bash
# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs --follow

# Rollback
vercel rollback
```

## Support Resources

### Internal Resources
- Team Slack: #dev-support
- Wiki: https://wiki.company.com/initiative-dashboard
- Runbooks: /docs/runbooks/

### External Resources
- Next.js Discord: https://discord.gg/nextjs
- Supabase Discord: https://discord.gg/supabase
- Vercel Support: https://vercel.com/support

### Escalation Path
1. Check this troubleshooting guide
2. Search in team documentation
3. Ask in team Slack channel
4. Create support ticket
5. Escalate to team lead
6. Contact vendor support (if applicable)

---

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Maintained by**: DevOps Team