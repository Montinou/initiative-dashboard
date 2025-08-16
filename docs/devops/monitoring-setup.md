# Monitoring and Observability Setup

## Overview

Comprehensive monitoring strategy for the Initiative Dashboard application covering application performance, infrastructure health, user experience, and business metrics.

## Monitoring Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                         │
│  - Next.js Metrics      - API Performance                    │
│  - Client-side Errors   - Server-side Logs                  │
├─────────────────────────────────────────────────────────────┤
│                    Infrastructure Layer                      │
│  - Vercel Functions     - Supabase Database                 │
│  - GCS Storage          - CDN Performance                    │
├─────────────────────────────────────────────────────────────┤
│                    Monitoring Tools                          │
│  - Sentry (Errors)      - Datadog (APM)                     │
│  - Grafana (Metrics)    - LogDNA (Logs)                     │
└─────────────────────────────────────────────────────────────┘
```

## Application Performance Monitoring (APM)

### 1. Client-Side Monitoring

#### Web Vitals Tracking
```typescript
// app/components/WebVitals.tsx
import { useReportWebVitals } from 'next/web-vitals';

export function WebVitals() {
  useReportWebVitals((metric) => {
    const body = JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });

    // Send to analytics endpoint
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics', body);
    } else {
      fetch('/api/analytics', {
        body,
        method: 'POST',
        keepalive: true
      });
    }
  });

  return null;
}
```

#### Performance Observer
```typescript
// lib/performance-monitor.ts
export class PerformanceMonitor {
  private observer: PerformanceObserver;
  private metrics: Map<string, number[]> = new Map();

  constructor() {
    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric(entry);
      }
    });

    // Observe different entry types
    this.observer.observe({ 
      entryTypes: ['navigation', 'resource', 'paint', 'largest-contentful-paint'] 
    });
  }

  private recordMetric(entry: PerformanceEntry) {
    const metrics = this.metrics.get(entry.entryType) || [];
    metrics.push(entry.duration || entry.startTime);
    this.metrics.set(entry.entryType, metrics);

    // Send metrics batch every 10 seconds
    if (metrics.length >= 10) {
      this.flush(entry.entryType);
    }
  }

  private flush(entryType: string) {
    const metrics = this.metrics.get(entryType);
    if (!metrics || metrics.length === 0) return;

    const data = {
      type: entryType,
      metrics: {
        min: Math.min(...metrics),
        max: Math.max(...metrics),
        avg: metrics.reduce((a, b) => a + b, 0) / metrics.length,
        p50: this.percentile(metrics, 0.5),
        p95: this.percentile(metrics, 0.95),
        p99: this.percentile(metrics, 0.99)
      },
      count: metrics.length,
      timestamp: new Date().toISOString()
    };

    // Send to monitoring service
    fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    // Clear metrics
    this.metrics.set(entryType, []);
  }

  private percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }
}
```

### 2. Server-Side Monitoring

#### API Route Monitoring
```typescript
// middleware/monitoring.ts
import { NextRequest, NextResponse } from 'next/server';

export function withMonitoring(handler: Function) {
  return async (req: NextRequest, ...args: any[]) => {
    const start = Date.now();
    const requestId = crypto.randomUUID();
    
    // Add request ID to headers
    const headers = new Headers(req.headers);
    headers.set('x-request-id', requestId);

    // Log request
    console.log({
      type: 'request',
      requestId,
      method: req.method,
      url: req.url,
      timestamp: new Date().toISOString()
    });

    try {
      const response = await handler(req, ...args);
      const duration = Date.now() - start;

      // Log response
      console.log({
        type: 'response',
        requestId,
        status: response.status,
        duration,
        timestamp: new Date().toISOString()
      });

      // Add performance headers
      response.headers.set('x-request-id', requestId);
      response.headers.set('x-response-time', `${duration}ms`);

      // Record metrics
      await recordMetric({
        endpoint: req.url,
        method: req.method,
        status: response.status,
        duration,
        timestamp: new Date()
      });

      return response;
    } catch (error) {
      const duration = Date.now() - start;

      // Log error
      console.error({
        type: 'error',
        requestId,
        error: error.message,
        stack: error.stack,
        duration,
        timestamp: new Date().toISOString()
      });

      // Record error metric
      await recordMetric({
        endpoint: req.url,
        method: req.method,
        status: 500,
        duration,
        error: true,
        timestamp: new Date()
      });

      throw error;
    }
  };
}
```

#### Database Query Monitoring
```typescript
// lib/database-monitor.ts
import { createClient } from '@/utils/supabase/server';

export class DatabaseMonitor {
  private queryMetrics: Map<string, any[]> = new Map();

  async executeQuery<T>(
    table: string,
    operation: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    const queryId = crypto.randomUUID();

    try {
      const result = await queryFn();
      const duration = Date.now() - start;

      // Log successful query
      this.logQuery({
        queryId,
        table,
        operation,
        duration,
        success: true,
        timestamp: new Date()
      });

      // Alert on slow queries
      if (duration > 1000) {
        console.warn(`Slow query detected: ${table}.${operation} took ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - start;

      // Log failed query
      this.logQuery({
        queryId,
        table,
        operation,
        duration,
        success: false,
        error: error.message,
        timestamp: new Date()
      });

      throw error;
    }
  }

  private logQuery(metric: any) {
    const key = `${metric.table}.${metric.operation}`;
    const metrics = this.queryMetrics.get(key) || [];
    metrics.push(metric);
    this.queryMetrics.set(key, metrics);

    // Flush metrics periodically
    if (metrics.length >= 100) {
      this.flushMetrics(key);
    }
  }

  private async flushMetrics(key: string) {
    const metrics = this.queryMetrics.get(key);
    if (!metrics || metrics.length === 0) return;

    // Calculate aggregates
    const durations = metrics.map(m => m.duration);
    const successCount = metrics.filter(m => m.success).length;

    const aggregate = {
      query: key,
      count: metrics.length,
      successRate: (successCount / metrics.length) * 100,
      performance: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        p95: this.percentile(durations, 0.95)
      },
      timestamp: new Date().toISOString()
    };

    // Send to monitoring service
    await fetch('/api/metrics/database', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(aggregate)
    });

    // Clear metrics
    this.queryMetrics.set(key, []);
  }

  private percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = Math.ceil(sorted.length * p) - 1;
    return sorted[index];
  }
}
```

## Error Tracking

### Sentry Configuration
```typescript
// sentry.client.config.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  
  // Performance Monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  tracePropagationTargets: ["localhost", /^https:\/\/siga-turismo\.vercel\.app/],
  
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  
  // Release tracking
  release: process.env.NEXT_PUBLIC_APP_VERSION,
  
  // Integrations
  integrations: [
    Sentry.replayIntegration({
      maskAllText: false,
      blockAllMedia: false,
      maskAllInputs: true,
      maskTextContent: false,
    }),
    Sentry.browserTracingIntegration(),
  ],
  
  // Filtering
  beforeSend(event, hint) {
    // Filter out known issues
    if (event.exception?.values?.[0]?.type === 'NetworkError') {
      return null;
    }
    
    // Add user context
    if (typeof window !== 'undefined') {
      event.user = {
        id: localStorage.getItem('userId'),
        email: localStorage.getItem('userEmail'),
        tenant: window.location.hostname.split('.')[0]
      };
    }
    
    return event;
  },
});
```

### Custom Error Boundary
```typescript
// app/components/ErrorBoundary.tsx
import React from 'react';
import * as Sentry from '@sentry/nextjs';

interface Props {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to Sentry
    Sentry.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack,
        },
      },
      tags: {
        component: 'ErrorBoundary',
      },
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by boundary:', error, errorInfo);
    }
  }

  reset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const Fallback = this.props.fallback;
      
      if (Fallback) {
        return <Fallback error={this.state.error} reset={this.reset} />;
      }

      return (
        <div className="error-boundary-default">
          <h2>Something went wrong</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error.toString()}
          </details>
          <button onClick={this.reset}>Try again</button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

## Logging Strategy

### Structured Logging
```typescript
// lib/logger.ts
import winston from 'winston';
import { LoggingWinston } from '@google-cloud/logging-winston';

const loggingWinston = new LoggingWinston({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: 'path/to/keyfile.json',
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'initiative-dashboard',
    environment: process.env.NODE_ENV,
    version: process.env.APP_VERSION,
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      silent: process.env.NODE_ENV === 'test',
    }),
    // File transport for production
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Google Cloud Logging
    loggingWinston,
  ],
});

// Helper methods
export const logInfo = (message: string, meta?: any) => {
  logger.info(message, meta);
};

export const logError = (message: string, error?: Error, meta?: any) => {
  logger.error(message, {
    ...meta,
    error: error?.message,
    stack: error?.stack,
  });
};

export const logWarning = (message: string, meta?: any) => {
  logger.warn(message, meta);
};

export const logDebug = (message: string, meta?: any) => {
  logger.debug(message, meta);
};
```

### Audit Logging
```typescript
// lib/audit-logger.ts
export class AuditLogger {
  async log(event: {
    userId: string;
    action: string;
    resource: string;
    resourceId?: string;
    metadata?: any;
    ip?: string;
    userAgent?: string;
  }) {
    const auditEntry = {
      ...event,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId(),
      tenantId: this.getTenantId(),
    };

    // Store in database
    const supabase = await createClient();
    const { error } = await supabase
      .from('audit_log')
      .insert(auditEntry);

    if (error) {
      console.error('Failed to write audit log:', error);
      // Fallback to file logging
      logger.error('Audit log write failed', { auditEntry, error });
    }

    // Also send to SIEM if configured
    if (process.env.SIEM_ENDPOINT) {
      fetch(process.env.SIEM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SIEM_TOKEN}`
        },
        body: JSON.stringify(auditEntry)
      }).catch(err => {
        logger.error('Failed to send audit log to SIEM', err);
      });
    }
  }

  private getSessionId(): string {
    // Implementation to get current session ID
    return '';
  }

  private getTenantId(): string {
    // Implementation to get current tenant ID
    return '';
  }
}
```

## Infrastructure Monitoring

### Vercel Monitoring
```typescript
// app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  const checks = {
    app: 'unknown',
    database: 'unknown',
    auth: 'unknown',
    storage: 'unknown',
    cache: 'unknown',
  };

  const checkPromises = [
    // Database check
    checkDatabase().then(result => { checks.database = result; }),
    // Auth check
    checkAuth().then(result => { checks.auth = result; }),
    // Storage check
    checkStorage().then(result => { checks.storage = result; }),
    // Cache check
    checkCache().then(result => { checks.cache = result; }),
  ];

  // Set a timeout for all checks
  await Promise.race([
    Promise.all(checkPromises),
    new Promise(resolve => setTimeout(resolve, 5000))
  ]);

  // Determine overall health
  checks.app = 'healthy';
  const hasUnhealthy = Object.values(checks).includes('unhealthy');
  const hasUnknown = Object.values(checks).includes('unknown');
  
  let status = 'healthy';
  if (hasUnhealthy) status = 'unhealthy';
  else if (hasUnknown) status = 'degraded';

  return NextResponse.json(
    {
      status,
      checks,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.env.APP_VERSION || 'unknown'
    },
    { 
      status: status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    }
  );
}

async function checkDatabase(): Promise<string> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single();
    
    return error ? 'unhealthy' : 'healthy';
  } catch {
    return 'unhealthy';
  }
}

async function checkAuth(): Promise<string> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.getSession();
    return error ? 'unhealthy' : 'healthy';
  } catch {
    return 'unhealthy';
  }
}

async function checkStorage(): Promise<string> {
  try {
    // Check GCS connectivity
    const response = await fetch('https://storage.googleapis.com/storage/v1/b', {
      headers: {
        'Authorization': `Bearer ${await getGCPToken()}`
      }
    });
    return response.ok ? 'healthy' : 'unhealthy';
  } catch {
    return 'unhealthy';
  }
}

async function checkCache(): Promise<string> {
  try {
    // Check Redis connectivity if configured
    if (process.env.REDIS_URL) {
      // Implement Redis health check
      return 'healthy';
    }
    return 'not_configured';
  } catch {
    return 'unhealthy';
  }
}
```

### Custom Metrics Dashboard
```typescript
// app/api/metrics/dashboard/route.ts
export async function GET() {
  const metrics = await collectMetrics();
  
  return NextResponse.json({
    application: {
      requests: {
        total: metrics.requests.total,
        success: metrics.requests.success,
        errors: metrics.requests.errors,
        rate: metrics.requests.rate,
      },
      latency: {
        p50: metrics.latency.p50,
        p95: metrics.latency.p95,
        p99: metrics.latency.p99,
      },
      errors: {
        rate: metrics.errors.rate,
        types: metrics.errors.types,
      }
    },
    infrastructure: {
      cpu: {
        usage: metrics.cpu.usage,
        limit: metrics.cpu.limit,
      },
      memory: {
        usage: metrics.memory.usage,
        limit: metrics.memory.limit,
      },
      disk: {
        usage: metrics.disk.usage,
        limit: metrics.disk.limit,
      }
    },
    business: {
      activeUsers: metrics.business.activeUsers,
      activeTenants: metrics.business.activeTenants,
      initiatives: {
        total: metrics.business.initiatives.total,
        completed: metrics.business.initiatives.completed,
        inProgress: metrics.business.initiatives.inProgress,
      }
    },
    timestamp: new Date().toISOString()
  });
}
```

## Alerting Configuration

### Alert Rules
```yaml
# monitoring/alerts.yaml
alerts:
  - name: HighErrorRate
    condition: error_rate > 0.01
    duration: 5m
    severity: critical
    channels: [pagerduty, slack]
    
  - name: HighLatency
    condition: p95_latency > 2000
    duration: 10m
    severity: warning
    channels: [slack]
    
  - name: DatabaseConnectionFailure
    condition: database_health == "unhealthy"
    duration: 1m
    severity: critical
    channels: [pagerduty, slack, email]
    
  - name: LowDiskSpace
    condition: disk_usage > 0.9
    duration: 5m
    severity: warning
    channels: [slack, email]
    
  - name: HighMemoryUsage
    condition: memory_usage > 0.85
    duration: 10m
    severity: warning
    channels: [slack]
    
  - name: DeploymentFailure
    condition: deployment_status == "failed"
    duration: 0m
    severity: critical
    channels: [slack, email]
```

### Alert Channels
```typescript
// lib/alerting.ts
export class AlertManager {
  async sendAlert(alert: {
    name: string;
    severity: 'info' | 'warning' | 'critical';
    message: string;
    metadata?: any;
  }) {
    const channels = this.getChannelsForSeverity(alert.severity);
    
    await Promise.all(channels.map(channel => 
      this.sendToChannel(channel, alert)
    ));
  }

  private async sendToChannel(channel: string, alert: any) {
    switch (channel) {
      case 'slack':
        await this.sendSlackAlert(alert);
        break;
      case 'pagerduty':
        await this.sendPagerDutyAlert(alert);
        break;
      case 'email':
        await this.sendEmailAlert(alert);
        break;
    }
  }

  private async sendSlackAlert(alert: any) {
    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (!webhook) return;

    await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `🚨 ${alert.severity.toUpperCase()}: ${alert.name}`,
        attachments: [{
          color: this.getSeverityColor(alert.severity),
          fields: [
            {
              title: 'Message',
              value: alert.message,
              short: false
            },
            {
              title: 'Time',
              value: new Date().toISOString(),
              short: true
            }
          ]
        }]
      })
    });
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'warning': return 'warning';
      default: return 'good';
    }
  }

  private getChannelsForSeverity(severity: string): string[] {
    switch (severity) {
      case 'critical': return ['pagerduty', 'slack', 'email'];
      case 'warning': return ['slack'];
      default: return ['slack'];
    }
  }
}
```

## Performance Budgets

### Budget Configuration
```javascript
// performance-budget.json
{
  "timings": {
    "firstContentfulPaint": 2000,
    "largestContentfulPaint": 2500,
    "firstInputDelay": 100,
    "cumulativeLayoutShift": 0.1,
    "timeToInteractive": 3500
  },
  "sizes": {
    "bundle": {
      "javascript": 200000,
      "css": 50000,
      "images": 500000,
      "fonts": 100000,
      "total": 1000000
    }
  },
  "requests": {
    "total": 50,
    "javascript": 10,
    "css": 5,
    "images": 20,
    "api": 15
  }
}
```

### Budget Monitoring
```typescript
// scripts/check-performance-budget.ts
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';
import budgetConfig from './performance-budget.json';

async function checkPerformanceBudget(url: string) {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  const options = {
    logLevel: 'info',
    output: 'json',
    onlyCategories: ['performance'],
    port: chrome.port
  };

  const runnerResult = await lighthouse(url, options);
  await chrome.kill();

  const metrics = runnerResult.lhr.audits;
  const violations = [];

  // Check timing budgets
  Object.entries(budgetConfig.timings).forEach(([metric, budget]) => {
    const actual = metrics[metric]?.numericValue;
    if (actual && actual > budget) {
      violations.push({
        metric,
        budget,
        actual,
        exceeded: actual - budget
      });
    }
  });

  if (violations.length > 0) {
    console.error('Performance budget violations:', violations);
    process.exit(1);
  }

  console.log('✅ All performance budgets met!');
}

checkPerformanceBudget(process.env.URL || 'https://siga-turismo.vercel.app');
```

## Dashboard Templates

### Grafana Dashboard Config
```json
{
  "dashboard": {
    "title": "Initiative Dashboard Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total[5m])",
            "legendFormat": "{{method}} {{endpoint}}"
          }
        ]
      },
      {
        "title": "Error Rate",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~'5..'}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))",
            "legendFormat": "p95"
          }
        ]
      },
      {
        "title": "Database Query Performance",
        "type": "heatmap",
        "targets": [
          {
            "expr": "rate(database_query_duration_seconds_bucket[5m])",
            "legendFormat": "{{table}} {{operation}}"
          }
        ]
      }
    ]
  }
}
```

---

**Last Updated**: January 2025  
**Version**: 2.0.0  
**Maintained by**: DevOps Team