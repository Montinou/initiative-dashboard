# Scaling and Performance Guide

## Overview

This guide provides strategies and implementation details for scaling the Initiative Dashboard application to handle increased load, optimize performance, and maintain reliability at scale.

## Scaling Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CDN Layer (Vercel Edge)                   │
│  - Static assets caching    - Edge functions                 │
│  - Geographic distribution  - DDoS protection                │
├─────────────────────────────────────────────────────────────┤
│                 Application Layer (Next.js)                  │
│  - Horizontal scaling       - Load balancing                 │
│  - Auto-scaling policies    - Connection pooling             │
├─────────────────────────────────────────────────────────────┤
│                   Caching Layer (Redis)                      │
│  - Session storage          - Query caching                  │
│  - Rate limiting            - Pub/sub messaging              │
├─────────────────────────────────────────────────────────────┤
│                Database Layer (Supabase/PostgreSQL)          │
│  - Read replicas            - Connection pooling             │
│  - Partitioning             - Materialized views             │
└─────────────────────────────────────────────────────────────┘
```

## Performance Optimization Strategies

### 1. Frontend Optimization

#### Code Splitting and Lazy Loading
```typescript
// app/dashboard/page.tsx
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

// Lazy load heavy components
const DashboardCharts = dynamic(
  () => import('@/components/dashboard/Charts'),
  {
    loading: () => <ChartSkeleton />,
    ssr: false // Disable SSR for client-only components
  }
);

const InitiativesList = dynamic(
  () => import('@/components/initiatives/List'),
  {
    loading: () => <ListSkeleton />
  }
);

export default function Dashboard() {
  return (
    <div>
      <Suspense fallback={<Loading />}>
        <DashboardCharts />
      </Suspense>
      <Suspense fallback={<Loading />}>
        <InitiativesList />
      </Suspense>
    </div>
  );
}
```

#### Bundle Optimization
```javascript
// next.config.mjs
export default {
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-*',
      'lucide-react',
      'recharts',
      'date-fns',
    ],
  },
  
  webpack: (config, { dev, isServer }) => {
    // Split vendor chunks for better caching
    if (!dev && !isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          framework: {
            name: 'framework',
            chunks: 'all',
            test: /(?<!node_modules.*)[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
            priority: 40,
            enforce: true,
          },
          lib: {
            test(module) {
              return module.size() > 160000 &&
                /node_modules[/\\]/.test(module.identifier());
            },
            name(module) {
              const hash = crypto.createHash('sha1');
              hash.update(module.identifier());
              return hash.digest('hex').substring(0, 8);
            },
            priority: 30,
            minChunks: 1,
            reuseExistingChunk: true,
          },
          commons: {
            name: 'commons',
            minChunks: 2,
            priority: 20,
          },
          shared: {
            name(module, chunks) {
              return crypto
                .createHash('sha1')
                .update(chunks.reduce((acc, chunk) => acc + chunk.name, ''))
                .digest('hex') + '_shared';
            },
            priority: 10,
            minChunks: 2,
            reuseExistingChunk: true,
          },
        },
        maxAsyncRequests: 25,
        maxInitialRequests: 25,
      };
    }
    return config;
  },
};
```

#### Image Optimization
```typescript
// components/OptimizedImage.tsx
import Image from 'next/image';

const imageLoader = ({ src, width, quality }) => {
  // Use Cloudinary or similar service for on-the-fly optimization
  return `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD}/image/upload/w_${width},q_${quality || 75}/v1/${src}`;
};

export function OptimizedImage({ src, alt, ...props }) {
  return (
    <Image
      loader={imageLoader}
      src={src}
      alt={alt}
      loading="lazy"
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
      {...props}
    />
  );
}
```

### 2. Backend Optimization

#### API Response Caching
```typescript
// lib/cache.ts
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL);

export class CacheManager {
  private defaultTTL = 300; // 5 minutes

  async get<T>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = this.defaultTTL): Promise<void> {
    try {
      await redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidation error:', error);
    }
  }

  // Cache-aside pattern implementation
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = this.defaultTTL
  ): Promise<T> {
    // Try to get from cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // If not in cache, get from source
    const value = await factory();
    
    // Store in cache
    await this.set(key, value, ttl);
    
    return value;
  }
}

// Usage in API route
export async function GET(request: NextRequest) {
  const cache = new CacheManager();
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenant_id');
  
  const cacheKey = `initiatives:${tenantId}`;
  
  const data = await cache.getOrSet(
    cacheKey,
    async () => {
      // Expensive database query
      const supabase = await createClient();
      const { data } = await supabase
        .from('initiatives')
        .select('*')
        .eq('tenant_id', tenantId);
      return data;
    },
    600 // 10 minutes TTL
  );

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
    }
  });
}
```

#### Database Query Optimization
```typescript
// lib/database-optimizer.ts
export class DatabaseOptimizer {
  // Use database views for complex queries
  async getManagerDashboard(areaId: string) {
    const supabase = await createClient();
    
    // Use materialized view instead of complex joins
    const { data, error } = await supabase
      .from('manager_dashboard_view')
      .select('*')
      .eq('area_id', areaId)
      .single();
    
    return { data, error };
  }

  // Batch operations for bulk updates
  async batchUpdateProgress(updates: Array<{ id: string; progress: number }>) {
    const supabase = await createClient();
    
    // Use a stored procedure for batch updates
    const { data, error } = await supabase.rpc('batch_update_progress', {
      updates: updates
    });
    
    return { data, error };
  }

  // Use connection pooling
  async withConnection<T>(
    operation: (client: any) => Promise<T>
  ): Promise<T> {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    const client = await pool.connect();
    try {
      return await operation(client);
    } finally {
      client.release();
    }
  }
}
```

### 3. Database Scaling

#### Read Replica Configuration
```sql
-- Create read replica for reporting queries
CREATE PUBLICATION reporting_pub FOR TABLE 
  initiatives, activities, objectives, user_profiles;

-- On replica server
CREATE SUBSCRIPTION reporting_sub
  CONNECTION 'host=primary.db.host dbname=mydb user=replicator'
  PUBLICATION reporting_pub;
```

#### Table Partitioning
```sql
-- Partition audit_log table by month
CREATE TABLE audit_log_2025_01 PARTITION OF audit_log
  FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE audit_log_2025_02 PARTITION OF audit_log
  FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

-- Create index on partitioned table
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at);
```

#### Materialized Views for Analytics
```sql
-- Create materialized view for dashboard metrics
CREATE MATERIALIZED VIEW dashboard_metrics AS
SELECT 
  t.id as tenant_id,
  t.subdomain,
  COUNT(DISTINCT i.id) as total_initiatives,
  COUNT(DISTINCT a.id) as total_activities,
  AVG(i.progress) as avg_progress,
  COUNT(DISTINCT CASE WHEN i.status = 'completed' THEN i.id END) as completed_initiatives
FROM tenants t
LEFT JOIN initiatives i ON t.id = i.tenant_id
LEFT JOIN activities a ON i.id = a.initiative_id
GROUP BY t.id, t.subdomain;

-- Create index for fast lookups
CREATE UNIQUE INDEX idx_dashboard_metrics_tenant ON dashboard_metrics(tenant_id);

-- Refresh periodically
CREATE OR REPLACE FUNCTION refresh_dashboard_metrics()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_metrics;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh every hour
SELECT cron.schedule('refresh-dashboard-metrics', '0 * * * *', 'SELECT refresh_dashboard_metrics()');
```

## Caching Strategy

### Multi-Level Caching
```typescript
// lib/multi-level-cache.ts
export class MultiLevelCache {
  private memoryCache = new Map<string, { value: any; expires: number }>();
  private redis: Redis;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL);
  }

  async get<T>(key: string): Promise<T | null> {
    // Level 1: Memory cache
    const memCached = this.memoryCache.get(key);
    if (memCached && memCached.expires > Date.now()) {
      return memCached.value;
    }

    // Level 2: Redis cache
    const redisCached = await this.redis.get(key);
    if (redisCached) {
      const value = JSON.parse(redisCached);
      // Populate memory cache
      this.memoryCache.set(key, {
        value,
        expires: Date.now() + 60000 // 1 minute in memory
      });
      return value;
    }

    return null;
  }

  async set(key: string, value: any, ttl: number = 300): Promise<void> {
    // Set in both caches
    this.memoryCache.set(key, {
      value,
      expires: Date.now() + Math.min(ttl * 1000, 60000)
    });
    
    await this.redis.setex(key, ttl, JSON.stringify(value));
  }

  // Implement cache warming
  async warm(keys: string[], factory: (key: string) => Promise<any>): Promise<void> {
    const promises = keys.map(async (key) => {
      const value = await factory(key);
      await this.set(key, value);
    });
    
    await Promise.all(promises);
  }
}
```

### Edge Caching with Vercel
```typescript
// app/api/cached/[...path]/route.ts
export async function GET(request: NextRequest) {
  const { pathname } = new URL(request.url);
  
  // Determine cache strategy based on path
  const cacheStrategy = getCacheStrategy(pathname);
  
  const response = await handleRequest(request);
  
  // Set cache headers based on strategy
  response.headers.set('Cache-Control', cacheStrategy.cacheControl);
  response.headers.set('CDN-Cache-Control', cacheStrategy.cdnCacheControl);
  response.headers.set('Vercel-CDN-Cache-Control', cacheStrategy.vercelCacheControl);
  
  return response;
}

function getCacheStrategy(path: string) {
  // Static data - long cache
  if (path.includes('/api/static/')) {
    return {
      cacheControl: 'public, max-age=31536000, immutable',
      cdnCacheControl: 'public, max-age=31536000',
      vercelCacheControl: 'public, max-age=31536000',
    };
  }
  
  // User-specific data - no cache
  if (path.includes('/api/user/')) {
    return {
      cacheControl: 'private, no-cache, no-store, must-revalidate',
      cdnCacheControl: 'no-cache',
      vercelCacheControl: 'no-cache',
    };
  }
  
  // Default - short cache with revalidation
  return {
    cacheControl: 'public, s-maxage=60, stale-while-revalidate=300',
    cdnCacheControl: 'public, s-maxage=60',
    vercelCacheControl: 'public, s-maxage=60, stale-while-revalidate=300',
  };
}
```

## Load Balancing

### Application Load Balancing
```typescript
// lib/load-balancer.ts
export class LoadBalancer {
  private instances: string[];
  private currentIndex = 0;
  private healthChecks = new Map<string, boolean>();

  constructor(instances: string[]) {
    this.instances = instances;
    this.startHealthChecks();
  }

  // Round-robin with health checks
  getNextInstance(): string | null {
    const healthyInstances = this.instances.filter(
      instance => this.healthChecks.get(instance) !== false
    );

    if (healthyInstances.length === 0) {
      throw new Error('No healthy instances available');
    }

    const instance = healthyInstances[this.currentIndex % healthyInstances.length];
    this.currentIndex++;
    
    return instance;
  }

  // Weighted round-robin based on response times
  async getOptimalInstance(): Promise<string> {
    const metrics = await this.getInstanceMetrics();
    
    // Sort by response time
    const sorted = metrics.sort((a, b) => a.avgResponseTime - b.avgResponseTime);
    
    // Prefer instances with lower response times
    const weights = sorted.map((m, i) => ({
      instance: m.instance,
      weight: sorted.length - i
    }));

    // Weighted random selection
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const w of weights) {
      random -= w.weight;
      if (random <= 0) {
        return w.instance;
      }
    }
    
    return weights[0].instance;
  }

  private async startHealthChecks() {
    setInterval(async () => {
      for (const instance of this.instances) {
        try {
          const response = await fetch(`${instance}/api/health`, {
            signal: AbortSignal.timeout(5000)
          });
          this.healthChecks.set(instance, response.ok);
        } catch {
          this.healthChecks.set(instance, false);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private async getInstanceMetrics() {
    // Implementation to get metrics from each instance
    return this.instances.map(instance => ({
      instance,
      avgResponseTime: Math.random() * 100 // Placeholder
    }));
  }
}
```

## Auto-Scaling Configuration

### Vercel Auto-Scaling
```json
{
  "functions": {
    "app/api/heavy-computation/route.ts": {
      "maxDuration": 60,
      "memory": 3008,
      "regions": ["iad1", "sfo1"],
      "scale": {
        "min": 1,
        "max": 100,
        "target": 50 // Target CPU utilization
      }
    }
  }
}
```

### Custom Auto-Scaling Logic
```typescript
// lib/auto-scaler.ts
export class AutoScaler {
  private minInstances = 2;
  private maxInstances = 20;
  private targetUtilization = 0.7;
  private scaleUpThreshold = 0.8;
  private scaleDownThreshold = 0.3;
  private cooldownPeriod = 300000; // 5 minutes
  private lastScaleAction = 0;

  async evaluateScaling(metrics: {
    cpu: number;
    memory: number;
    requestRate: number;
    responseTime: number;
    activeInstances: number;
  }): Promise<'scale-up' | 'scale-down' | 'no-action'> {
    // Check cooldown period
    if (Date.now() - this.lastScaleAction < this.cooldownPeriod) {
      return 'no-action';
    }

    // Calculate overall utilization
    const utilization = this.calculateUtilization(metrics);

    // Determine scaling action
    if (utilization > this.scaleUpThreshold && 
        metrics.activeInstances < this.maxInstances) {
      this.lastScaleAction = Date.now();
      return 'scale-up';
    }

    if (utilization < this.scaleDownThreshold && 
        metrics.activeInstances > this.minInstances) {
      this.lastScaleAction = Date.now();
      return 'scale-down';
    }

    return 'no-action';
  }

  private calculateUtilization(metrics: any): number {
    // Weighted average of different metrics
    const weights = {
      cpu: 0.3,
      memory: 0.2,
      requestRate: 0.3,
      responseTime: 0.2
    };

    const normalized = {
      cpu: metrics.cpu,
      memory: metrics.memory,
      requestRate: Math.min(metrics.requestRate / 1000, 1), // Normalize to 0-1
      responseTime: Math.min(metrics.responseTime / 2000, 1) // Normalize to 0-1
    };

    return Object.entries(weights).reduce(
      (sum, [key, weight]) => sum + normalized[key] * weight,
      0
    );
  }

  async scale(action: 'scale-up' | 'scale-down', currentInstances: number): Promise<number> {
    if (action === 'scale-up') {
      // Scale up by 50% or at least 1 instance
      const increment = Math.max(Math.ceil(currentInstances * 0.5), 1);
      return Math.min(currentInstances + increment, this.maxInstances);
    } else {
      // Scale down by 25%
      const decrement = Math.max(Math.floor(currentInstances * 0.25), 1);
      return Math.max(currentInstances - decrement, this.minInstances);
    }
  }
}
```

## Rate Limiting

### API Rate Limiting
```typescript
// middleware/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

// Create different rate limiters for different tiers
const rateLimiters = {
  free: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 h'),
    analytics: true,
  }),
  pro: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, '1 h'),
    analytics: true,
  }),
  enterprise: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10000, '1 h'),
    analytics: true,
  }),
};

export async function rateLimit(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const userTier = await getUserTier(request);
  
  const limiter = rateLimiters[userTier] || rateLimiters.free;
  const { success, limit, reset, remaining } = await limiter.limit(ip);

  return {
    success,
    headers: {
      'X-RateLimit-Limit': limit.toString(),
      'X-RateLimit-Remaining': remaining.toString(),
      'X-RateLimit-Reset': new Date(reset).toISOString(),
    },
  };
}

// Middleware implementation
export async function middleware(request: NextRequest) {
  // Skip rate limiting for static assets
  if (request.nextUrl.pathname.startsWith('/_next/')) {
    return NextResponse.next();
  }

  const { success, headers } = await rateLimit(request);

  if (!success) {
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers,
    });
  }

  const response = NextResponse.next();
  
  // Add rate limit headers to response
  Object.entries(headers).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  return response;
}
```

## Connection Pooling

### Database Connection Pool
```typescript
// lib/connection-pool.ts
import { Pool } from 'pg';

class ConnectionPool {
  private static instance: Pool;
  
  static getInstance(): Pool {
    if (!this.instance) {
      this.instance = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 20, // Maximum number of clients
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        maxUses: 7500, // Close connection after this many uses
        allowExitOnIdle: true,
      });

      // Error handling
      this.instance.on('error', (err, client) => {
        console.error('Unexpected error on idle client', err);
      });

      // Connection tracking
      this.instance.on('connect', (client) => {
        console.log('New client connected to pool');
      });

      this.instance.on('remove', (client) => {
        console.log('Client removed from pool');
      });
    }
    
    return this.instance;
  }

  static async query<T>(text: string, params?: any[]): Promise<T> {
    const pool = this.getInstance();
    const start = Date.now();
    
    try {
      const result = await pool.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn('Slow query detected:', { text, duration, rows: result.rowCount });
      }
      
      return result.rows as T;
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  static async transaction<T>(
    callback: (client: any) => Promise<T>
  ): Promise<T> {
    const pool = this.getInstance();
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

export default ConnectionPool;
```

## Performance Monitoring

### Real-time Performance Metrics
```typescript
// lib/performance-metrics.ts
export class PerformanceMetrics {
  private metrics = {
    requests: new Map<string, number[]>(),
    database: new Map<string, number[]>(),
    cache: new Map<string, { hits: number; misses: number }>(),
  };

  recordRequest(endpoint: string, duration: number) {
    const times = this.metrics.requests.get(endpoint) || [];
    times.push(duration);
    
    // Keep only last 1000 measurements
    if (times.length > 1000) {
      times.shift();
    }
    
    this.metrics.requests.set(endpoint, times);
  }

  recordDatabaseQuery(query: string, duration: number) {
    const times = this.metrics.database.get(query) || [];
    times.push(duration);
    
    if (times.length > 1000) {
      times.shift();
    }
    
    this.metrics.database.set(query, times);
  }

  recordCacheAccess(key: string, hit: boolean) {
    const stats = this.metrics.cache.get(key) || { hits: 0, misses: 0 };
    
    if (hit) {
      stats.hits++;
    } else {
      stats.misses++;
    }
    
    this.metrics.cache.set(key, stats);
  }

  getReport() {
    const report = {
      requests: {},
      database: {},
      cache: {},
    };

    // Process request metrics
    this.metrics.requests.forEach((times, endpoint) => {
      report.requests[endpoint] = this.calculateStats(times);
    });

    // Process database metrics
    this.metrics.database.forEach((times, query) => {
      report.database[query] = this.calculateStats(times);
    });

    // Process cache metrics
    this.metrics.cache.forEach((stats, key) => {
      const total = stats.hits + stats.misses;
      report.cache[key] = {
        hitRate: total > 0 ? (stats.hits / total) * 100 : 0,
        hits: stats.hits,
        misses: stats.misses,
      };
    });

    return report;
  }

  private calculateStats(times: number[]) {
    if (times.length === 0) {
      return { min: 0, max: 0, avg: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...times].sort((a, b) => a - b);
    
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: times.reduce((a, b) => a + b, 0) / times.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
}
```

## Capacity Planning

### Load Testing Script
```typescript
// scripts/load-test.ts
import { check } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.01'],   // Error rate under 1%
  },
};

export default function () {
  const BASE_URL = 'https://siga-turismo.vercel.app';

  // Test different endpoints
  const endpoints = [
    '/api/health',
    '/api/initiatives',
    '/api/objectives',
    '/api/dashboard',
  ];

  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const response = http.get(`${BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': 'Bearer ${__ENV.AUTH_TOKEN}',
    },
  });

  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
```

### Capacity Estimation
```typescript
// scripts/capacity-estimator.ts
export class CapacityEstimator {
  estimate(params: {
    avgRequestsPerUser: number;
    avgSessionDuration: number; // minutes
    peakConcurrentUsers: number;
    avgPayloadSize: number; // bytes
    cacheHitRate: number; // 0-1
  }) {
    const requestsPerMinute = params.peakConcurrentUsers * params.avgRequestsPerUser;
    const requestsPerSecond = requestsPerMinute / 60;
    
    // Database load (accounting for cache)
    const dbRequestsPerSecond = requestsPerSecond * (1 - params.cacheHitRate);
    
    // Bandwidth requirements (Mbps)
    const bandwidthMbps = (requestsPerSecond * params.avgPayloadSize * 8) / 1_000_000;
    
    // Memory requirements (rough estimate)
    const memoryPerUser = 10 * 1024 * 1024; // 10MB per user
    const totalMemoryGB = (params.peakConcurrentUsers * memoryPerUser) / (1024 * 1024 * 1024);
    
    // CPU cores (rough estimate - 1 core per 100 RPS)
    const cpuCores = Math.ceil(requestsPerSecond / 100);
    
    return {
      requestsPerSecond,
      dbRequestsPerSecond,
      bandwidthMbps,
      totalMemoryGB,
      cpuCores,
      recommendations: this.getRecommendations({
        requestsPerSecond,
        dbRequestsPerSecond,
        bandwidthMbps,
        totalMemoryGB,
        cpuCores,
      }),
    };
  }

  private getRecommendations(metrics: any) {
    const recommendations = [];
    
    if (metrics.requestsPerSecond > 1000) {
      recommendations.push('Consider implementing a CDN for static assets');
      recommendations.push('Enable horizontal scaling with load balancing');
    }
    
    if (metrics.dbRequestsPerSecond > 100) {
      recommendations.push('Implement read replicas for database');
      recommendations.push('Consider database sharding');
    }
    
    if (metrics.totalMemoryGB > 16) {
      recommendations.push('Implement memory-efficient caching strategies');
      recommendations.push('Consider using Redis for session storage');
    }
    
    return recommendations;
  }
}
```

---

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Maintained by**: DevOps Team