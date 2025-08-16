# Monitoring and Logging Integration Documentation

## Overview
The Initiative Dashboard implements comprehensive monitoring and logging to ensure system reliability, performance tracking, and debugging capabilities across all integrated services.

## Logging Architecture

### Structured Logging
```typescript
// lib/logging/logger.ts
export interface LogEntry {
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  message: string;
  timestamp: string;
  service: string;
  userId?: string;
  tenantId?: string;
  correlationId?: string;
  metadata?: Record<string, any>;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

export class Logger {
  private service: string;
  
  constructor(service: string) {
    this.service = service;
  }
  
  private log(level: LogEntry['level'], message: string, metadata?: any) {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      service: this.service,
      correlationId: getCorrelationId(),
      ...metadata,
    };
    
    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify(entry, null, 2));
    }
    
    // Send to logging service
    this.sendToLoggingService(entry);
  }
  
  debug(message: string, metadata?: any) {
    this.log('debug', message, metadata);
  }
  
  info(message: string, metadata?: any) {
    this.log('info', message, metadata);
  }
  
  error(message: string, error?: Error, metadata?: any) {
    this.log('error', message, {
      ...metadata,
      error: {
        message: error?.message,
        stack: error?.stack,
        code: (error as any)?.code,
      },
    });
  }
}
```

## Google Cloud Logging

### Setup
```typescript
// lib/logging/gcp-logging.ts
import { Logging } from '@google-cloud/logging';

const logging = new Logging({
  projectId: 'insaight-backend',
});

const log = logging.log('initiative-dashboard');

export async function sendToGCP(entry: LogEntry) {
  const gcpEntry = log.entry({
    severity: mapSeverity(entry.level),
    resource: {
      type: 'global',
      labels: {
        service: entry.service,
      },
    },
    labels: {
      userId: entry.userId,
      tenantId: entry.tenantId,
      correlationId: entry.correlationId,
    },
    jsonPayload: {
      message: entry.message,
      ...entry.metadata,
    },
  });
  
  await log.write(gcpEntry);
}

function mapSeverity(level: string): string {
  const severityMap = {
    debug: 'DEBUG',
    info: 'INFO',
    warn: 'WARNING',
    error: 'ERROR',
    critical: 'CRITICAL',
  };
  return severityMap[level] || 'DEFAULT';
}
```

## Performance Monitoring

### API Performance Tracking
```typescript
// lib/monitoring/performance.ts
export class PerformanceMonitor {
  private metrics: Map<string, Metric[]> = new Map();
  
  async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();
    let success = true;
    
    try {
      const result = await fn();
      return result;
    } catch (error) {
      success = false;
      throw error;
    } finally {
      const duration = performance.now() - start;
      
      this.recordMetric(operation, {
        duration,
        success,
        timestamp: Date.now(),
      });
      
      // Log slow operations
      if (duration > 1000) {
        logger.warn(`Slow operation: ${operation}`, {
          duration,
          threshold: 1000,
        });
      }
    }
  }
  
  private recordMetric(operation: string, metric: Metric) {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    
    const metrics = this.metrics.get(operation)!;
    metrics.push(metric);
    
    // Keep only last 1000 metrics
    if (metrics.length > 1000) {
      metrics.shift();
    }
  }
  
  getStats(operation: string): OperationStats {
    const metrics = this.metrics.get(operation) || [];
    
    if (metrics.length === 0) {
      return null;
    }
    
    const durations = metrics.map(m => m.duration);
    const successCount = metrics.filter(m => m.success).length;
    
    return {
      count: metrics.length,
      avgDuration: average(durations),
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
      successRate: (successCount / metrics.length) * 100,
    };
  }
}
```

### Database Query Monitoring
```typescript
// lib/monitoring/database-monitor.ts
export function monitorQuery(queryName: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const start = Date.now();
      const logger = new Logger('database');
      
      try {
        const result = await originalMethod.apply(this, args);
        
        const duration = Date.now() - start;
        
        logger.debug(`Query executed: ${queryName}`, {
          duration,
          rowCount: result?.length || 0,
        });
        
        // Track slow queries
        if (duration > 500) {
          logger.warn(`Slow query detected: ${queryName}`, {
            duration,
            query: queryName,
            args: args.slice(0, 2), // Log first 2 args only
          });
        }
        
        return result;
      } catch (error) {
        logger.error(`Query failed: ${queryName}`, error as Error);
        throw error;
      }
    };
    
    return descriptor;
  };
}

// Usage
class InitiativeRepository {
  @monitorQuery('getInitiativesByArea')
  async getByArea(areaId: string) {
    // Query implementation
  }
}
```

## Health Checks

### System Health Check Endpoint
```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkExternalAPIs(),
    checkStorage(),
  ]);
  
  const results = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: formatCheckResult(checks[0]),
      redis: formatCheckResult(checks[1]),
      external_apis: formatCheckResult(checks[2]),
      storage: formatCheckResult(checks[3]),
    },
  };
  
  // Determine overall status
  const hasFailure = Object.values(results.checks).some(
    check => check.status === 'unhealthy'
  );
  
  if (hasFailure) {
    results.status = 'degraded';
  }
  
  return NextResponse.json(results, {
    status: hasFailure ? 503 : 200,
  });
}

async function checkDatabase(): Promise<HealthCheckResult> {
  try {
    const start = Date.now();
    const { data, error } = await supabase
      .from('health_check')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    
    return {
      status: 'healthy',
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: (error as Error).message,
    };
  }
}
```

### Service-Specific Health Checks
```typescript
// lib/monitoring/health-checks.ts
export const healthChecks = {
  async supabase(): Promise<HealthStatus> {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    
    return {
      service: 'supabase',
      status: error ? 'unhealthy' : 'healthy',
      message: error?.message,
    };
  },
  
  async redis(): Promise<HealthStatus> {
    const client = await getRedisClient();
    if (!client) {
      return {
        service: 'redis',
        status: 'unhealthy',
        message: 'Redis not configured',
      };
    }
    
    await client.ping();
    return {
      service: 'redis',
      status: 'healthy',
    };
  },
  
  async gemini(): Promise<HealthStatus> {
    try {
      const response = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models',
        {
          headers: {
            'x-goog-api-key': process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
          },
        }
      );
      
      return {
        service: 'gemini',
        status: response.ok ? 'healthy' : 'unhealthy',
        statusCode: response.status,
      };
    } catch (error) {
      return {
        service: 'gemini',
        status: 'unhealthy',
        message: (error as Error).message,
      };
    }
  },
};
```

## Error Tracking

### Global Error Handler
```typescript
// lib/monitoring/error-tracker.ts
export class ErrorTracker {
  private static instance: ErrorTracker;
  private errors: ErrorRecord[] = [];
  
  static getInstance(): ErrorTracker {
    if (!this.instance) {
      this.instance = new ErrorTracker();
    }
    return this.instance;
  }
  
  trackError(error: Error, context?: ErrorContext) {
    const errorRecord: ErrorRecord = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      message: error.message,
      stack: error.stack,
      name: error.name,
      context: {
        ...context,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      },
    };
    
    this.errors.push(errorRecord);
    
    // Send to monitoring service
    this.sendToMonitoring(errorRecord);
    
    // Log locally
    logger.error('Error tracked', error, context);
  }
  
  private async sendToMonitoring(error: ErrorRecord) {
    // Send to external service (e.g., Sentry, Rollbar)
    if (process.env.SENTRY_DSN) {
      // Sentry integration
    }
    
    // Store critical errors in database
    if (this.isCriticalError(error)) {
      await this.storeInDatabase(error);
    }
  }
  
  private isCriticalError(error: ErrorRecord): boolean {
    const criticalPatterns = [
      /database.*connection/i,
      /authentication.*failed/i,
      /payment.*error/i,
    ];
    
    return criticalPatterns.some(pattern => 
      pattern.test(error.message)
    );
  }
}
```

### React Error Boundary
```typescript
// components/ErrorBoundary.tsx
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    ErrorTracker.getInstance().trackError(error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback
          error={this.state.error}
          resetError={() => this.setState({ hasError: false })}
        />
      );
    }
    
    return this.props.children;
  }
}
```

## Metrics Collection

### Application Metrics
```typescript
// lib/monitoring/metrics.ts
export class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  
  incrementCounter(name: string, value: number = 1) {
    const current = this.counters.get(name) || 0;
    this.counters.set(name, current + value);
  }
  
  setGauge(name: string, value: number) {
    this.gauges.set(name, value);
  }
  
  recordHistogram(name: string, value: number) {
    if (!this.histograms.has(name)) {
      this.histograms.set(name, []);
    }
    this.histograms.get(name)!.push(value);
  }
  
  async flush() {
    const metrics = {
      counters: Object.fromEntries(this.counters),
      gauges: Object.fromEntries(this.gauges),
      histograms: this.calculateHistogramStats(),
      timestamp: Date.now(),
    };
    
    // Send to monitoring service
    await this.sendMetrics(metrics);
    
    // Reset counters
    this.counters.clear();
  }
  
  private calculateHistogramStats() {
    const stats: Record<string, any> = {};
    
    for (const [name, values] of this.histograms) {
      if (values.length > 0) {
        stats[name] = {
          count: values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          avg: average(values),
          p50: percentile(values, 50),
          p95: percentile(values, 95),
          p99: percentile(values, 99),
        };
      }
    }
    
    return stats;
  }
}

// Global metrics instance
export const metrics = new MetricsCollector();

// Flush metrics periodically
if (typeof window === 'undefined') {
  setInterval(() => metrics.flush(), 60000); // Every minute
}
```

### Custom Metrics
```typescript
// Track API usage
export async function trackAPIUsage(
  endpoint: string,
  method: string,
  statusCode: number,
  duration: number
) {
  metrics.incrementCounter(`api.${method}.${endpoint}.${statusCode}`);
  metrics.recordHistogram(`api.${endpoint}.duration`, duration);
  
  // Track by tenant
  const tenantId = getCurrentTenantId();
  if (tenantId) {
    metrics.incrementCounter(`tenant.${tenantId}.api_calls`);
  }
}

// Track feature usage
export function trackFeatureUsage(feature: string, userId?: string) {
  metrics.incrementCounter(`feature.${feature}.usage`);
  
  if (userId) {
    metrics.setGauge(`user.${userId}.last_active`, Date.now());
  }
}
```

## Audit Logging

### Audit Log Implementation
```typescript
// lib/monitoring/audit-logger.ts
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  tenantId: string;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, any>;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogger {
  async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) {
    const fullEntry: AuditLogEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    
    // Store in database
    await supabase.from('audit_log').insert(fullEntry);
    
    // Log sensitive actions
    if (this.isSensitiveAction(entry.action)) {
      logger.warn('Sensitive action performed', fullEntry);
    }
  }
  
  private isSensitiveAction(action: string): boolean {
    const sensitiveActions = [
      'user.delete',
      'role.change',
      'data.export',
      'settings.security.update',
    ];
    
    return sensitiveActions.includes(action);
  }
}

// Middleware for automatic audit logging
export function auditMiddleware(action: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const startTime = Date.now();
      const auditLogger = new AuditLogger();
      
      try {
        const result = await originalMethod.apply(this, args);
        
        await auditLogger.log({
          userId: getCurrentUserId(),
          tenantId: getCurrentTenantId(),
          action,
          resource: target.constructor.name,
          resourceId: args[0], // Assuming first arg is often ID
          metadata: {
            duration: Date.now() - startTime,
            success: true,
          },
        });
        
        return result;
      } catch (error) {
        await auditLogger.log({
          userId: getCurrentUserId(),
          tenantId: getCurrentTenantId(),
          action,
          resource: target.constructor.name,
          resourceId: args[0],
          metadata: {
            duration: Date.now() - startTime,
            success: false,
            error: (error as Error).message,
          },
        });
        
        throw error;
      }
    };
    
    return descriptor;
  };
}
```

## Distributed Tracing

### Correlation ID Management
```typescript
// lib/monitoring/correlation.ts
import { AsyncLocalStorage } from 'async_hooks';

const correlationStorage = new AsyncLocalStorage<string>();

export function withCorrelationId<T>(
  correlationId: string,
  fn: () => T
): T {
  return correlationStorage.run(correlationId, fn);
}

export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore();
}

// Middleware to add correlation ID
export function correlationMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const correlationId = 
    req.headers['x-correlation-id'] || 
    crypto.randomUUID();
  
  withCorrelationId(correlationId, () => {
    res.setHeader('x-correlation-id', correlationId);
    next();
  });
}
```

### Request Tracing
```typescript
// lib/monitoring/request-trace.ts
export interface TraceSpan {
  id: string;
  parentId?: string;
  correlationId: string;
  operation: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
  status: 'started' | 'completed' | 'failed';
}

export class RequestTracer {
  private spans: Map<string, TraceSpan> = new Map();
  
  startSpan(operation: string, parentId?: string): string {
    const spanId = crypto.randomUUID();
    const span: TraceSpan = {
      id: spanId,
      parentId,
      correlationId: getCorrelationId() || 'unknown',
      operation,
      startTime: performance.now(),
      status: 'started',
    };
    
    this.spans.set(spanId, span);
    return spanId;
  }
  
  endSpan(spanId: string, metadata?: Record<string, any>) {
    const span = this.spans.get(spanId);
    if (!span) return;
    
    span.endTime = performance.now();
    span.duration = span.endTime - span.startTime;
    span.status = 'completed';
    span.metadata = metadata;
    
    // Log slow spans
    if (span.duration > 1000) {
      logger.warn('Slow span detected', span);
    }
  }
  
  failSpan(spanId: string, error: Error) {
    const span = this.spans.get(spanId);
    if (!span) return;
    
    span.endTime = performance.now();
    span.duration = span.endTime - span.startTime;
    span.status = 'failed';
    span.metadata = {
      error: error.message,
      stack: error.stack,
    };
  }
  
  getTrace(correlationId: string): TraceSpan[] {
    return Array.from(this.spans.values())
      .filter(span => span.correlationId === correlationId)
      .sort((a, b) => a.startTime - b.startTime);
  }
}
```

## Alerting

### Alert Configuration
```typescript
// lib/monitoring/alerts.ts
export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: any) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  channels: AlertChannel[];
  cooldown: number; // Minutes
}

export class AlertManager {
  private rules: AlertRule[] = [];
  private lastAlerted: Map<string, number> = new Map();
  
  addRule(rule: AlertRule) {
    this.rules.push(rule);
  }
  
  async checkAlerts(metrics: any) {
    for (const rule of this.rules) {
      if (this.shouldAlert(rule) && rule.condition(metrics)) {
        await this.sendAlert(rule, metrics);
        this.lastAlerted.set(rule.id, Date.now());
      }
    }
  }
  
  private shouldAlert(rule: AlertRule): boolean {
    const lastAlert = this.lastAlerted.get(rule.id);
    if (!lastAlert) return true;
    
    const cooldownMs = rule.cooldown * 60 * 1000;
    return Date.now() - lastAlert > cooldownMs;
  }
  
  private async sendAlert(rule: AlertRule, metrics: any) {
    const alert = {
      rule: rule.name,
      severity: rule.severity,
      timestamp: new Date().toISOString(),
      metrics,
    };
    
    for (const channel of rule.channels) {
      await channel.send(alert);
    }
  }
}

// Alert rules configuration
const alertManager = new AlertManager();

alertManager.addRule({
  id: 'high-error-rate',
  name: 'High Error Rate',
  condition: (metrics) => metrics.errorRate > 5,
  severity: 'high',
  channels: [new EmailAlertChannel(), new SlackAlertChannel()],
  cooldown: 15,
});

alertManager.addRule({
  id: 'database-slow',
  name: 'Database Performance Degradation',
  condition: (metrics) => metrics.dbLatency > 500,
  severity: 'medium',
  channels: [new SlackAlertChannel()],
  cooldown: 30,
});
```

## Dashboard Monitoring

### Monitoring Dashboard Component
```typescript
// components/monitoring/MonitoringDashboard.tsx
export function MonitoringDashboard() {
  const [metrics, setMetrics] = useState<SystemMetrics>();
  const [health, setHealth] = useState<HealthStatus>();
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const [metricsRes, healthRes] = await Promise.all([
        fetch('/api/monitoring/metrics'),
        fetch('/api/health'),
      ]);
      
      setMetrics(await metricsRes.json());
      setHealth(await healthRes.json());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="monitoring-dashboard">
      <HealthStatusGrid health={health} />
      <MetricsCharts metrics={metrics} />
      <RecentErrors />
      <ActiveAlerts />
    </div>
  );
}
```

## Best Practices

1. **Use structured logging** for better searchability
2. **Implement correlation IDs** for request tracing
3. **Monitor key business metrics**, not just technical ones
4. **Set up alerts** for critical issues
5. **Regular review** of logs and metrics
6. **Implement log retention policies**
7. **Use sampling** for high-volume operations
8. **Secure sensitive data** in logs
9. **Monitor third-party service dependencies**
10. **Create runbooks** for common issues

## Troubleshooting

### Debug Mode
```typescript
// Enable detailed logging
export const DEBUG_MODE = process.env.DEBUG === 'true';

if (DEBUG_MODE) {
  logger.setLevel('debug');
  // Enable verbose logging for all services
}
```

### Log Analysis Queries
```sql
-- Find slow queries
SELECT * FROM logs
WHERE service = 'database'
  AND duration > 500
ORDER BY timestamp DESC
LIMIT 100;

-- Error frequency by endpoint
SELECT 
  endpoint,
  COUNT(*) as error_count,
  AVG(duration) as avg_duration
FROM api_logs
WHERE status_code >= 400
  AND timestamp > NOW() - INTERVAL '1 hour'
GROUP BY endpoint
ORDER BY error_count DESC;

-- User activity patterns
SELECT 
  DATE_TRUNC('hour', timestamp) as hour,
  COUNT(DISTINCT user_id) as active_users,
  COUNT(*) as total_requests
FROM audit_log
WHERE timestamp > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour;
```

## References

- [Google Cloud Logging](https://cloud.google.com/logging/docs)
- [OpenTelemetry](https://opentelemetry.io/docs/)
- [Prometheus Best Practices](https://prometheus.io/docs/practices/)
- [ELK Stack Documentation](https://www.elastic.co/guide/)