# Performance Optimization Guide

## Overview

This guide covers performance optimization techniques for the Initiative Dashboard, including bundle optimization, runtime performance, database query optimization, and monitoring strategies.

## Performance Metrics

### Core Web Vitals Targets

| Metric | Target | Good | Needs Improvement | Poor |
|--------|--------|------|-------------------|------|
| **LCP** (Largest Contentful Paint) | < 2.5s | < 2.5s | 2.5s - 4.0s | > 4.0s |
| **FID** (First Input Delay) | < 100ms | < 100ms | 100ms - 300ms | > 300ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | < 0.1 | 0.1 - 0.25 | > 0.25 |
| **TTFB** (Time to First Byte) | < 600ms | < 600ms | 600ms - 1.5s | > 1.5s |
| **FCP** (First Contentful Paint) | < 1.8s | < 1.8s | 1.8s - 3.0s | > 3.0s |

## Bundle Optimization

### Code Splitting

```typescript
// Dynamic imports for route-based splitting
const DashboardPage = dynamic(() => import('./dashboard/page'), {
  loading: () => <DashboardSkeleton />,
  ssr: true,
});

// Component-level splitting
const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), {
  loading: () => <ChartSkeleton />,
  ssr: false, // Client-only component
});

// Conditional loading
const AdminPanel = dynamic(() => 
  import('@/components/admin/AdminPanel').then(mod => mod.AdminPanel),
  {
    loading: () => <AdminPanelSkeleton />,
  }
);
```

### Tree Shaking

```typescript
// ❌ Bad - Imports entire library
import * as Icons from 'lucide-react';

// ✅ Good - Imports only what's needed
import { Home, Settings, User } from 'lucide-react';

// For libraries without tree shaking
// Use babel-plugin-transform-imports or next-transpile-modules
```

### Bundle Analysis

```bash
# Analyze bundle size
npm run perf:analyze

# Build with bundle analyzer
ANALYZE=true npm run build
```

```javascript
// next.config.mjs - Bundle analyzer configuration
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';

export default {
  webpack: (config, { isServer }) => {
    if (process.env.ANALYZE) {
      config.plugins.push(
        new BundleAnalyzerPlugin({
          analyzerMode: 'static',
          reportFilename: isServer 
            ? '../analyze/server.html' 
            : './analyze/client.html',
        })
      );
    }
    return config;
  },
};
```

### Optimized Imports

```typescript
// lib/performance/optimized-imports.ts
// Barrel file optimization
export { Button } from './button';
export { Card } from './card';
// Instead of export * from './components';

// Lazy load heavy dependencies
const loadChartLibrary = () => import('recharts');
const loadExcelLibrary = () => import('xlsx');
const loadPdfLibrary = () => import('pdfjs-dist');

// Use when needed
export async function generateChart(data: ChartData) {
  const { LineChart, Line, XAxis, YAxis } = await loadChartLibrary();
  // Use chart components
}
```

## React Performance

### Component Optimization

```typescript
// Memoization for expensive components
const ExpensiveComponent = memo(({ data, onAction }) => {
  // Component logic
  return <div>{/* Render */}</div>;
}, (prevProps, nextProps) => {
  // Custom comparison - return true if equal
  return (
    prevProps.data.id === nextProps.data.id &&
    prevProps.data.updatedAt === nextProps.data.updatedAt
  );
});

// UseMemo for expensive computations
function Dashboard({ initiatives }) {
  const metrics = useMemo(() => {
    return calculateComplexMetrics(initiatives);
  }, [initiatives]);

  const sortedInitiatives = useMemo(() => {
    return [...initiatives].sort((a, b) => b.progress - a.progress);
  }, [initiatives]);

  return <MetricsDisplay metrics={metrics} />;
}

// UseCallback for stable references
function InitiativeList({ initiatives }) {
  const handleEdit = useCallback((id: string) => {
    router.push(`/initiatives/${id}/edit`);
  }, [router]);

  return initiatives.map(initiative => (
    <InitiativeCard
      key={initiative.id}
      {...initiative}
      onEdit={handleEdit}
    />
  ));
}
```

### Virtual Scrolling

```typescript
// components/VirtualList.tsx
import { useVirtualizer } from '@tanstack/react-virtual';

export function VirtualList({ items, renderItem }) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 100, // Estimated item height
    overscan: 5, // Number of items to render outside viewport
  });

  return (
    <div ref={parentRef} className="h-[600px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index])}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Lazy Loading

```typescript
// Intersection Observer for lazy loading
export function LazyImage({ src, alt, ...props }) {
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <img
      ref={imgRef}
      src={isInView ? src : undefined}
      alt={alt}
      loading="lazy"
      {...props}
    />
  );
}

// Lazy load components on scroll
export function LazySection({ children }) {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { rootMargin: '100px' }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={sectionRef}>
      {isVisible ? children : <SectionSkeleton />}
    </div>
  );
}
```

## Database Optimization

### Query Optimization

```typescript
// Efficient query with selective fields
const { data } = await supabase
  .from('initiatives')
  .select(`
    id,
    title,
    progress,
    area:areas!inner(id, name),
    activities:activities(count)
  `)
  .eq('status', 'in_progress')
  .order('created_at', { ascending: false })
  .limit(10);

// Use database functions for complex queries
const { data } = await supabase.rpc('get_dashboard_metrics', {
  tenant_id: tenantId,
  date_from: startDate,
  date_to: endDate,
});

// Batch operations
const updates = initiatives.map(i => ({
  id: i.id,
  progress: i.newProgress,
}));

const { error } = await supabase
  .from('initiatives')
  .upsert(updates);
```

### Database Indexes

```sql
-- Performance indexes
CREATE INDEX idx_initiatives_tenant_area 
  ON initiatives(tenant_id, area_id) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_activities_initiative 
  ON activities(initiative_id) 
  INCLUDE (is_completed);

CREATE INDEX idx_audit_log_entity 
  ON audit_log(entity_type, entity_id, created_at DESC);

-- Composite indexes for common queries
CREATE INDEX idx_initiatives_status_progress 
  ON initiatives(status, progress) 
  WHERE status != 'completed';

-- Partial indexes for filtered queries
CREATE INDEX idx_active_initiatives 
  ON initiatives(tenant_id, created_at DESC) 
  WHERE status = 'in_progress';
```

### Connection Pooling

```typescript
// utils/supabase/server.ts
import { createServerClient } from '@supabase/ssr';

// Connection pool configuration
const supabaseConfig = {
  db: {
    poolSize: 10, // Number of connections
    maxIdleTime: 30000, // 30 seconds
    connectionTimeout: 5000, // 5 seconds
  },
  global: {
    headers: {
      'x-application-name': 'initiative-dashboard',
    },
  },
};

export async function createClient() {
  // Implementation with pooling
}
```

## API Performance

### Response Caching

```typescript
// app/api/initiatives/route.ts
export async function GET(request: NextRequest) {
  const cacheKey = request.url;
  
  // Check cache first
  const cached = await cache.get(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: {
        'X-Cache': 'HIT',
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
      },
    });
  }

  // Fetch data
  const data = await fetchInitiatives();
  
  // Cache for 60 seconds
  await cache.set(cacheKey, data, 60);
  
  return NextResponse.json(data, {
    headers: {
      'X-Cache': 'MISS',
      'Cache-Control': 'public, max-age=60, stale-while-revalidate=30',
    },
  });
}
```

### Pagination

```typescript
// Cursor-based pagination for large datasets
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  let query = supabase
    .from('initiatives')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query;

  const nextCursor = data?.[data.length - 1]?.created_at || null;

  return NextResponse.json({
    data,
    nextCursor,
    hasMore: data?.length === limit,
  });
}
```

### Request Deduplication

```typescript
// lib/api/request-deduplication.ts
const pendingRequests = new Map<string, Promise<any>>();

export async function deduplicatedFetch(key: string, fetcher: () => Promise<any>) {
  // Check if request is already pending
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  // Create new request
  const promise = fetcher().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// Usage
const data = await deduplicatedFetch(
  `initiatives-${userId}`,
  () => fetch('/api/initiatives').then(r => r.json())
);
```

## Image Optimization

### Next.js Image Component

```typescript
import Image from 'next/image';

export function OptimizedImage({ src, alt }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={800}
      height={600}
      quality={85}
      placeholder="blur"
      blurDataURL={blurDataUrl}
      loading="lazy"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}

// Generate blur placeholder
import { getPlaiceholder } from 'plaiceholder';

export async function getBlurDataUrl(src: string) {
  const { base64 } = await getPlaiceholder(src);
  return base64;
}
```

### Responsive Images

```typescript
export function ResponsiveImage({ src, alt }) {
  return (
    <picture>
      <source
        media="(max-width: 640px)"
        srcSet={`${src}?w=640&q=75 1x, ${src}?w=1280&q=75 2x`}
      />
      <source
        media="(max-width: 1024px)"
        srcSet={`${src}?w=1024&q=80 1x, ${src}?w=2048&q=80 2x`}
      />
      <img
        src={`${src}?w=1920&q=85`}
        alt={alt}
        loading="lazy"
        decoding="async"
      />
    </picture>
  );
}
```

## CSS Optimization

### Critical CSS

```typescript
// Extract and inline critical CSS
// next.config.mjs
export default {
  experimental: {
    optimizeCss: true,
  },
};

// Or use critters
import Critters from 'critters';

const critters = new Critters({
  path: 'out',
  publicPath: '/',
});
```

### Tailwind Optimization

```javascript
// tailwind.config.ts
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  // Remove unused styles
  purge: {
    enabled: process.env.NODE_ENV === 'production',
    content: ['./app/**/*.{js,ts,jsx,tsx}'],
    options: {
      safelist: [
        // Dynamic classes that shouldn't be purged
        /^bg-/,
        /^text-/,
      ],
    },
  },
};
```

## Web Workers

### Offload Heavy Computations

```typescript
// workers/dataProcessor.worker.ts
self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  switch (type) {
    case 'PROCESS_LARGE_DATASET':
      const result = processLargeDataset(data);
      self.postMessage({ type: 'RESULT', data: result });
      break;
    
    case 'GENERATE_REPORT':
      const report = generateComplexReport(data);
      self.postMessage({ type: 'REPORT', data: report });
      break;
  }
});

// hooks/useWebWorker.ts
export function useWebWorker() {
  const workerRef = useRef<Worker>();

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('../workers/dataProcessor.worker.ts', import.meta.url)
    );

    return () => workerRef.current?.terminate();
  }, []);

  const processData = useCallback((data: any) => {
    return new Promise((resolve) => {
      workerRef.current?.postMessage({ type: 'PROCESS_LARGE_DATASET', data });
      workerRef.current?.addEventListener('message', (event) => {
        if (event.data.type === 'RESULT') {
          resolve(event.data.data);
        }
      });
    });
  }, []);

  return { processData };
}
```

## Performance Monitoring

### Web Vitals Tracking

```typescript
// lib/performance/web-vitals.ts
import { onCLS, onFID, onLCP, onTTFB, onFCP } from 'web-vitals';

export function reportWebVitals() {
  onCLS(sendToAnalytics);
  onFID(sendToAnalytics);
  onLCP(sendToAnalytics);
  onTTFB(sendToAnalytics);
  onFCP(sendToAnalytics);
}

function sendToAnalytics(metric: Metric) {
  // Send to your analytics service
  if (window.gtag) {
    window.gtag('event', metric.name, {
      value: Math.round(metric.value),
      metric_id: metric.id,
      metric_delta: metric.delta,
    });
  }

  // Or send to custom endpoint
  fetch('/api/analytics/performance', {
    method: 'POST',
    body: JSON.stringify(metric),
    headers: { 'Content-Type': 'application/json' },
  });
}
```

### Performance Observer

```typescript
// components/PerformanceMonitor.tsx
export function PerformanceMonitor() {
  useEffect(() => {
    // Long tasks
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 50) {
          console.warn('Long task detected:', entry);
        }
      }
    });
    
    observer.observe({ entryTypes: ['longtask'] });

    // Resource timing
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 1000) {
          console.warn('Slow resource:', entry.name, entry.duration);
        }
      }
    });
    
    resourceObserver.observe({ entryTypes: ['resource'] });

    return () => {
      observer.disconnect();
      resourceObserver.disconnect();
    };
  }, []);

  return null;
}
```

### Custom Performance Marks

```typescript
// Track custom metrics
export function measureApiCall(name: string, fn: () => Promise<any>) {
  performance.mark(`${name}-start`);
  
  return fn().finally(() => {
    performance.mark(`${name}-end`);
    performance.measure(name, `${name}-start`, `${name}-end`);
    
    const measure = performance.getEntriesByName(name)[0];
    console.log(`${name} took ${measure.duration}ms`);
    
    // Clean up
    performance.clearMarks(`${name}-start`);
    performance.clearMarks(`${name}-end`);
    performance.clearMeasures(name);
  });
}

// Usage
await measureApiCall('fetch-initiatives', async () => {
  return fetch('/api/initiatives');
});
```

## Build Optimization

### Next.js Configuration

```javascript
// next.config.mjs
export default {
  // Enable SWC minification
  swcMinify: true,
  
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60 * 60 * 24 * 365, // 1 year
  },
  
  // Compression
  compress: true,
  
  // Generate source maps only in development
  productionBrowserSourceMaps: false,
  
  // Strict mode for better performance
  reactStrictMode: true,
  
  // Experimental features
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
};
```

### Environment-Specific Optimization

```typescript
// Different strategies for dev/prod
const isDevelopment = process.env.NODE_ENV === 'development';

export const config = {
  cache: {
    ttl: isDevelopment ? 0 : 60 * 60, // No cache in dev
  },
  
  optimization: {
    preload: !isDevelopment,
    prefetch: !isDevelopment,
    lazyLoad: true,
  },
  
  monitoring: {
    enabled: !isDevelopment,
    sampleRate: isDevelopment ? 1 : 0.1, // 10% in production
  },
};
```

## Debugging Performance

### React DevTools Profiler

```typescript
// Wrap components with Profiler
import { Profiler } from 'react';

function onRenderCallback(id, phase, actualDuration) {
  console.log(`${id} (${phase}) took ${actualDuration}ms`);
}

<Profiler id="Dashboard" onRender={onRenderCallback}>
  <Dashboard />
</Profiler>
```

### Chrome DevTools

```typescript
// Add performance marks for Chrome DevTools
performance.mark('myapp:dashboard:start');
// ... component logic
performance.mark('myapp:dashboard:end');
performance.measure(
  'myapp:dashboard',
  'myapp:dashboard:start',
  'myapp:dashboard:end'
);
```

## Performance Checklist

### Before Deployment

- [ ] Run bundle analyzer and check sizes
- [ ] Test Core Web Vitals scores
- [ ] Verify lazy loading is working
- [ ] Check image optimization
- [ ] Review database queries and indexes
- [ ] Enable caching headers
- [ ] Minify and compress assets
- [ ] Remove console.logs and debug code
- [ ] Test on slow network (3G)
- [ ] Test on low-end devices
- [ ] Monitor memory leaks
- [ ] Verify SSR/SSG is working correctly