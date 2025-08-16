# Complete Deployment Guide

## Table of Contents
1. [Deployment Architecture](#deployment-architecture)
2. [Infrastructure Requirements](#infrastructure-requirements)
3. [Deployment Strategies](#deployment-strategies)
4. [Step-by-Step Deployment](#step-by-step-deployment)
5. [Multi-Environment Setup](#multi-environment-setup)
6. [Health Checks & Monitoring](#health-checks--monitoring)

## Deployment Architecture

### System Overview
```
┌─────────────────────────────────────────────────────────────┐
│                         Vercel Edge                          │
├─────────────────────────────────────────────────────────────┤
│                    Next.js 15 Application                    │
│  - Server Components     - API Routes                        │
│  - Static Assets         - Edge Functions                    │
├─────────────────────────────────────────────────────────────┤
│                    Supabase Backend                          │
│  - PostgreSQL Database   - Authentication                    │
│  - Realtime              - Storage (GCS)                     │
├─────────────────────────────────────────────────────────────┤
│                 Google Cloud Platform                        │
│  - Cloud Storage         - Secret Manager                    │
│  - Dialogflow CX         - Vertex AI                        │
└─────────────────────────────────────────────────────────────┘
```

## Infrastructure Requirements

### Minimum Requirements
- **Node.js**: v22.x (required)
- **npm/pnpm**: npm 10.x or pnpm 10.x
- **Memory**: 2GB RAM minimum, 4GB recommended
- **CPU**: 2 vCPUs minimum
- **Storage**: 10GB for application and dependencies

### Service Dependencies
```yaml
Required Services:
  Supabase:
    - PostgreSQL 15+
    - Authentication service
    - Realtime subscriptions
    - Row Level Security (RLS)
  
  Google Cloud:
    - Cloud Storage bucket
    - Secret Manager
    - Service Account with appropriate IAM roles
    - Dialogflow CX (optional for AI features)
    - Vertex AI (optional for AI features)
  
  Vercel:
    - Edge network
    - Serverless functions
    - CDN for static assets
```

## Deployment Strategies

### 1. Production Deployment (Vercel - Recommended)

#### Prerequisites
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login
```

#### Initial Setup
```bash
# Link project to Vercel
vercel link

# Configure environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add GOOGLE_CLIENT_EMAIL
vercel env add GOOGLE_PRIVATE_KEY
vercel env add GOOGLE_PRIVATE_KEY_ID
vercel env add GCP_PROJECT_ID
```

#### Deployment Commands
```bash
# Preview deployment
vercel

# Production deployment
vercel --prod

# Deploy with specific environment
vercel --prod --env production
```

### 2. Staging Environment

#### Configuration
```javascript
// vercel.staging.json
{
  "name": "initiative-dashboard-staging",
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "env": {
    "NODE_ENV": "staging",
    "NEXT_PUBLIC_APP_URL": "https://staging.siga-turismo.vercel.app"
  },
  "functions": {
    "app/api/upload/okr-file/notify/route.ts": {
      "maxDuration": 60
    },
    "app/api/upload/okr-file/process/route.ts": {
      "maxDuration": 60
    }
  }
}
```

#### Deploy to Staging
```bash
vercel --prod -c vercel.staging.json
```

### 3. Docker Deployment

#### Multi-Stage Dockerfile
```dockerfile
# Dependencies stage
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY pnpm-lock.yaml* ./

# Install dependencies
RUN corepack enable pnpm && pnpm install --frozen-lockfile

# Builder stage
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Runner stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

#### Docker Compose Configuration
```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${NEXT_PUBLIC_SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

## Step-by-Step Deployment

### Phase 1: Pre-Deployment
```bash
# 1. Run tests
npm run test:run
npm run test:e2e

# 2. Build locally to verify
npm run build

# 3. Check bundle size
npm run perf:analyze

# 4. Lint and type check
npm run lint
npx tsc --noEmit
```

### Phase 2: Database Setup
```bash
# 1. Create production Supabase project
# Visit: https://app.supabase.com

# 2. Run migrations (in Supabase SQL Editor)
# Execute each migration file in order from supabase/migrations/

# 3. Verify RLS policies
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';

# 4. Seed initial data (if needed)
npm run db:seed
```

### Phase 3: Environment Configuration
```bash
# 1. Create .env.production
cp .env.example .env.production

# 2. Configure production values
# Edit .env.production with production credentials

# 3. Validate environment
node scripts/validate-env.js
```

### Phase 4: Deploy Application
```bash
# 1. Push to main branch
git add .
git commit -m "Deploy to production"
git push origin main

# 2. Vercel auto-deployment (if configured)
# Or manual deployment
vercel --prod

# 3. Monitor deployment
vercel logs --follow
```

### Phase 5: Post-Deployment Verification
```bash
# 1. Health check
curl https://siga-turismo.vercel.app/api/health

# 2. Test authentication
# Use Playwright to verify login flow
npm run test:e2e:production

# 3. Monitor performance
npm run perf:monitor

# 4. Check error tracking
# Review Sentry or logging service
```

## Multi-Environment Setup

### Environment Configuration Matrix
```yaml
Development:
  URL: http://localhost:3000
  Database: Local Supabase
  Storage: Local filesystem
  Features: All enabled, debug on

Staging:
  URL: https://staging.siga-turismo.vercel.app
  Database: Staging Supabase project
  Storage: Staging GCS bucket
  Features: All enabled, debug off

Production:
  URL: https://siga-turismo.vercel.app
  Database: Production Supabase project
  Storage: Production GCS bucket
  Features: Selective, debug off
```

### Environment Variables Template
```bash
# Base Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://siga-turismo.vercel.app

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[SERVICE_ROLE_KEY]

# Google Cloud
GCP_PROJECT_ID=[PROJECT_ID]
GOOGLE_CLIENT_EMAIL=[SERVICE_ACCOUNT_EMAIL]
GOOGLE_PRIVATE_KEY=[PRIVATE_KEY]
GOOGLE_PRIVATE_KEY_ID=[KEY_ID]

# Feature Flags
NEXT_PUBLIC_ENABLE_STRATIX=true
NEXT_PUBLIC_DF_ENABLED=true

# Security
WEBHOOK_SECRET_TOKEN=[RANDOM_TOKEN]
SYNC_API_TOKEN=[RANDOM_TOKEN]
```

## Health Checks & Monitoring

### Health Check Endpoint
```typescript
// app/api/health/route.ts
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const checks = {
    app: true,
    database: false,
    auth: false,
    storage: false,
    timestamp: new Date().toISOString()
  };

  try {
    // Check database
    const supabase = await createClient();
    const { error: dbError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1);
    checks.database = !dbError;

    // Check auth
    const { error: authError } = await supabase.auth.getUser();
    checks.auth = !authError;

    // Overall health
    const healthy = checks.database && checks.auth;

    return NextResponse.json(
      { 
        status: healthy ? 'healthy' : 'degraded',
        checks 
      },
      { status: healthy ? 200 : 503 }
    );
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'unhealthy',
        checks,
        error: error.message 
      },
      { status: 503 }
    );
  }
}
```

### Monitoring Setup
```javascript
// lib/monitoring.ts
export class MetricsCollector {
  private metrics = {
    requests: 0,
    errors: 0,
    latency: []
  };

  trackRequest(duration: number, success: boolean) {
    this.metrics.requests++;
    if (!success) this.metrics.errors++;
    this.metrics.latency.push(duration);
    
    // Send to monitoring service
    if (this.metrics.requests % 100 === 0) {
      this.flush();
    }
  }

  flush() {
    // Send metrics to monitoring service
    console.log('Metrics:', {
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      avgLatency: this.calculateAvgLatency(),
      p95Latency: this.calculateP95Latency()
    });
    
    // Reset metrics
    this.metrics = {
      requests: 0,
      errors: 0,
      latency: []
    };
  }

  private calculateAvgLatency() {
    if (this.metrics.latency.length === 0) return 0;
    const sum = this.metrics.latency.reduce((a, b) => a + b, 0);
    return sum / this.metrics.latency.length;
  }

  private calculateP95Latency() {
    if (this.metrics.latency.length === 0) return 0;
    const sorted = [...this.metrics.latency].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * 0.95);
    return sorted[index];
  }
}
```

## Deployment Scripts

### Automated Deployment Script
```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting deployment process..."

# Run tests
echo "📝 Running tests..."
npm run test:run

# Build application
echo "🔨 Building application..."
npm run build

# Deploy to Vercel
echo "☁️ Deploying to Vercel..."
vercel --prod --yes

# Wait for deployment
echo "⏳ Waiting for deployment to complete..."
sleep 30

# Verify deployment
echo "✅ Verifying deployment..."
curl -f https://siga-turismo.vercel.app/api/health || {
  echo "❌ Health check failed!"
  exit 1
}

echo "✨ Deployment successful!"
```

### Rollback Script
```bash
#!/bin/bash
# rollback.sh

set -e

echo "⏮️ Starting rollback process..."

# Get previous deployment
PREV_DEPLOYMENT=$(vercel ls --json | jq -r '.[1].uid')

echo "📦 Rolling back to deployment: $PREV_DEPLOYMENT"

# Promote previous deployment
vercel promote $PREV_DEPLOYMENT --yes

echo "✅ Rollback complete!"
```

## Security Considerations

### Production Security Checklist
- [ ] All environment variables properly set
- [ ] RLS policies enabled on all tables
- [ ] HTTPS enforced
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Security headers configured
- [ ] Secrets stored in Secret Manager
- [ ] Service accounts with minimal permissions
- [ ] Regular security audits scheduled

### Security Headers Configuration
```javascript
// next.config.mjs
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];
```

## Troubleshooting

### Common Issues and Solutions

#### Build Failures
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

#### Database Connection Issues
```bash
# Test connection
npx supabase db remote commit --dry-run

# Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'your_table';
```

#### Performance Issues
```bash
# Analyze bundle
npm run perf:analyze

# Check for large dependencies
npx bundle-buddy
```

---

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Maintained by**: DevOps Team