# Production Deployment Guide

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Security audit completed
- [ ] Performance optimizations applied
- [ ] Error tracking configured
- [ ] Monitoring setup

## Build Process

### 1. Install Production Dependencies

```bash
npm ci --production
```

### 2. Build Application

```bash
npm run build
```

### 3. Verify Build

```bash
npm run build:analyze
```

## Deployment Options

### Option 1: Vercel (Recommended)

#### Setup

1. Connect GitHub repository to Vercel
2. Configure environment variables
3. Deploy

```bash
vercel --prod
```

#### Configuration

```json
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "devCommand": "npm run dev",
  "installCommand": "npm install"
}
```

### Option 2: Docker

#### Dockerfile

```dockerfile
FROM node:18-alpine AS base

# Dependencies
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Builder
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### Build & Run

```bash
docker build -t initiative-dashboard .
docker run -p 3000:3000 --env-file .env.production initiative-dashboard
```

### Option 3: Traditional Server

#### PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'initiative-dashboard',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 'max',
    exec_mode: 'cluster',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

#### Start Application

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Database Setup

### 1. Production Database

Create production Supabase project:

1. Go to https://app.supabase.com
2. Create new project
3. Note connection details

### 2. Run Migrations

Execute all migrations in order through Supabase SQL Editor.

### 3. Configure RLS

Enable Row Level Security for production:

```sql
-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
```

## Security Configuration

### 1. CORS Settings

Configure in Supabase dashboard:
- Allowed origins
- Allowed headers
- Credentials policy

### 2. Rate Limiting

```typescript
// middleware.ts
import { rateLimiter } from '@/lib/rate-limiter';

export async function middleware(request: Request) {
  const identifier = request.ip ?? 'anonymous';
  const result = await rateLimiter.check(identifier, 10); // 10 requests per minute
  
  if (!result.success) {
    return new Response('Too Many Requests', { status: 429 });
  }
}
```

### 3. Security Headers

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
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
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains'
          }
        ]
      }
    ];
  }
};
```

## Performance Optimization

### 1. Enable Caching

```typescript
// app/api/[...]/route.ts
export async function GET(request: Request) {
  // ... fetch data
  
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=59'
    }
  });
}
```

### 2. Image Optimization

```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['your-cdn.com'],
    formats: ['image/avif', 'image/webp']
  }
};
```

### 3. Bundle Optimization

```javascript
// next.config.js
module.exports = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/
          }
        }
      };
    }
    return config;
  }
};
```

## Monitoring

### 1. Application Monitoring

```typescript
// lib/monitoring.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 2. Health Check Endpoint

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    auth: await checkAuth(),
    storage: await checkStorage(),
  };
  
  const healthy = Object.values(checks).every(v => v);
  
  return NextResponse.json(
    { status: healthy ? 'healthy' : 'unhealthy', checks },
    { status: healthy ? 200 : 503 }
  );
}
```

### 3. Logging

```typescript
// lib/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

## Post-Deployment

### 1. Verify Deployment

- [ ] Application accessible
- [ ] Authentication working
- [ ] API endpoints responding
- [ ] Database queries executing
- [ ] Static assets loading

### 2. Configure DNS

```
A     @     YOUR_IP
CNAME www   YOUR_DOMAIN
```

### 3. SSL Certificate

- Vercel: Automatic
- Docker/PM2: Use Let's Encrypt with Nginx

### 4. Set Up Backups

Configure automated database backups in Supabase dashboard.

## Rollback Strategy

### Quick Rollback

```bash
# Vercel
vercel rollback

# Docker
docker run -p 3000:3000 initiative-dashboard:previous

# PM2
pm2 reload ecosystem.config.js --update-env
```

### Database Rollback

Keep migration rollback scripts ready:

```sql
-- rollback_migration_x.sql
-- Reverse migration changes
```

## Troubleshooting

### Application Not Starting

1. Check logs: `npm run logs`
2. Verify environment variables
3. Check port availability
4. Verify database connection

### Performance Issues

1. Check database queries
2. Review API response times
3. Analyze bundle size
4. Check memory usage

### Authentication Failures

1. Verify Supabase configuration
2. Check CORS settings
3. Review auth middleware
4. Check session management