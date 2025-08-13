/**
 * Import Monitoring Service
 * Provides health checks, metrics collection, and alerting for OKR imports
 */

import { createClient as createServiceClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: {
    database: CheckResult;
    storage: CheckResult;
    processing: CheckResult;
    memory: CheckResult;
  };
  metrics: SystemMetrics;
}

interface CheckResult {
  status: 'ok' | 'warning' | 'error';
  message?: string;
  latency?: number;
  details?: any;
}

interface SystemMetrics {
  activeJobs: number;
  pendingJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  successRate: number;
  errorRate: number;
  throughput: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  uptime: number;
}

interface ImportMetrics {
  jobId: string;
  startTime: number;
  endTime?: number;
  rowsPerSecond?: number;
  errorRate?: number;
  retryCount: number;
  batchSizes: number[];
  memorySnapshots: number[];
  errors: Array<{
    timestamp: number;
    type: string;
    message: string;
  }>;
}

interface AlertThresholds {
  maxErrorRate: number;
  maxProcessingTime: number;
  maxMemoryUsage: number;
  maxCpuUsage: number;
  minSuccessRate: number;
  maxConcurrentJobs: number;
}

export class ImportMonitoringService {
  private serviceClient: SupabaseClient;
  private metrics: Map<string, ImportMetrics> = new Map();
  private alertThresholds: AlertThresholds;
  private alertHandlers: Set<(alert: Alert) => void> = new Set();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private metricsCollectionInterval: NodeJS.Timeout | null = null;

  constructor(thresholds?: Partial<AlertThresholds>) {
    this.serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    this.alertThresholds = {
      maxErrorRate: thresholds?.maxErrorRate || 0.1, // 10%
      maxProcessingTime: thresholds?.maxProcessingTime || 300000, // 5 minutes
      maxMemoryUsage: thresholds?.maxMemoryUsage || 512 * 1024 * 1024, // 512MB
      maxCpuUsage: thresholds?.maxCpuUsage || 80, // 80%
      minSuccessRate: thresholds?.minSuccessRate || 0.9, // 90%
      maxConcurrentJobs: thresholds?.maxConcurrentJobs || 10,
    };
  }

  /**
   * Start monitoring services
   */
  startMonitoring() {
    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000);

    // Metrics collection every 10 seconds
    this.metricsCollectionInterval = setInterval(() => {
      this.collectMetrics();
    }, 10000);

    logger.info('Import monitoring service started', { 
      thresholds: this.alertThresholds 
    });
  }

  /**
   * Stop monitoring services
   */
  stopMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }

    logger.info('Import monitoring service stopped');
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      status: 'healthy',
      timestamp: Date.now(),
      checks: {
        database: await this.checkDatabase(),
        storage: await this.checkStorage(),
        processing: await this.checkProcessing(),
        memory: this.checkMemory(),
      },
      metrics: await this.getSystemMetrics(),
    };

    // Determine overall health status
    const checks = Object.values(result.checks);
    if (checks.some(c => c.status === 'error')) {
      result.status = 'unhealthy';
    } else if (checks.some(c => c.status === 'warning')) {
      result.status = 'degraded';
    }

    // Check for alerts
    this.checkAlertConditions(result);

    // Store health check result
    await this.storeHealthCheck(result);

    return result;
  }

  /**
   * Check database connectivity and performance
   */
  private async checkDatabase(): Promise<CheckResult> {
    const startTime = Date.now();
    
    try {
      const { data, error } = await this.serviceClient
        .from('okr_import_jobs')
        .select('count')
        .limit(1)
        .single();

      const latency = Date.now() - startTime;

      if (error) {
        return {
          status: 'error',
          message: `Database error: ${error.message}`,
          latency,
        };
      }

      if (latency > 1000) {
        return {
          status: 'warning',
          message: `High database latency: ${latency}ms`,
          latency,
        };
      }

      return {
        status: 'ok',
        latency,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Database check failed: ${error}`,
        latency: Date.now() - startTime,
      };
    }
  }

  /**
   * Check storage (GCS) connectivity
   */
  private async checkStorage(): Promise<CheckResult> {
    try {
      // Import GCS utility
      const { Storage } = await import('@google-cloud/storage');
      
      // Initialize GCS client
      const projectId = process.env.GCP_PROJECT_ID;
      const bucketName = process.env.GCS_BUCKET_NAME;
      
      if (!projectId || !bucketName) {
        return {
          status: 'error',
          message: 'GCS configuration missing',
        };
      }
      
      let storage: any;
      if (process.env.GCP_SERVICE_ACCOUNT_KEY) {
        const credentials = JSON.parse(process.env.GCP_SERVICE_ACCOUNT_KEY);
        storage = new Storage({ projectId, credentials });
      } else {
        storage = new Storage({ projectId });
      }
      
      // Test bucket access
      const bucket = storage.bucket(bucketName);
      const [exists] = await bucket.exists();
      
      if (!exists) {
        return {
          status: 'error',
          message: `Bucket ${bucketName} not accessible`,
        };
      }
      
      // Test by listing files (limited to 1)
      const [files] = await bucket.getFiles({ maxResults: 1 });
      
      return {
        status: 'ok',
        message: `Storage accessible (bucket: ${bucketName})`,
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Storage check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Check processing system health
   */
  private async checkProcessing(): Promise<CheckResult> {
    try {
      // Check for stuck jobs
      const { data: stuckJobs } = await this.serviceClient
        .from('okr_import_jobs')
        .select('id, started_at')
        .eq('status', 'processing')
        .lt('started_at', new Date(Date.now() - this.alertThresholds.maxProcessingTime).toISOString());

      if (stuckJobs && stuckJobs.length > 0) {
        return {
          status: 'warning',
          message: `${stuckJobs.length} jobs appear to be stuck`,
          details: stuckJobs.map(j => j.id),
        };
      }

      // Check concurrent jobs
      const { data: activeJobs } = await this.serviceClient
        .from('okr_import_jobs')
        .select('count')
        .eq('status', 'processing');

      const activeCount = activeJobs?.[0]?.count || 0;

      if (activeCount > this.alertThresholds.maxConcurrentJobs) {
        return {
          status: 'warning',
          message: `High number of concurrent jobs: ${activeCount}`,
        };
      }

      return {
        status: 'ok',
        details: { activeJobs: activeCount },
      };
    } catch (error) {
      return {
        status: 'error',
        message: `Processing check failed: ${error}`,
      };
    }
  }

  /**
   * Check memory usage
   */
  private checkMemory(): CheckResult {
    const memUsage = process.memoryUsage();
    const heapUsed = memUsage.heapUsed;

    if (heapUsed > this.alertThresholds.maxMemoryUsage) {
      return {
        status: 'warning',
        message: `High memory usage: ${Math.round(heapUsed / 1024 / 1024)}MB`,
        details: memUsage,
      };
    }

    return {
      status: 'ok',
      details: memUsage,
    };
  }

  /**
   * Get system-wide metrics
   */
  private async getSystemMetrics(): Promise<SystemMetrics> {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get job statistics
    const { data: jobStats } = await this.serviceClient
      .from('okr_import_jobs')
      .select('status')
      .gte('created_at', oneDayAgo.toISOString());

    const stats = {
      activeJobs: 0,
      pendingJobs: 0,
      failedJobs: 0,
      completedJobs: 0,
    };

    jobStats?.forEach(job => {
      switch (job.status) {
        case 'processing':
          stats.activeJobs++;
          break;
        case 'pending':
          stats.pendingJobs++;
          break;
        case 'failed':
          stats.failedJobs++;
          break;
        case 'completed':
        case 'partial':
          stats.completedJobs++;
          break;
      }
    });

    // Calculate metrics
    const totalJobs = jobStats?.length || 0;
    const successRate = totalJobs > 0 ? stats.completedJobs / totalJobs : 1;
    const errorRate = totalJobs > 0 ? stats.failedJobs / totalJobs : 0;

    // Get average processing time
    const { data: timings } = await this.serviceClient
      .from('okr_import_jobs')
      .select('started_at, completed_at')
      .not('started_at', 'is', null)
      .not('completed_at', 'is', null)
      .gte('created_at', oneDayAgo.toISOString());

    let totalProcessingTime = 0;
    let processedCount = 0;

    timings?.forEach(timing => {
      const duration = new Date(timing.completed_at).getTime() - new Date(timing.started_at).getTime();
      totalProcessingTime += duration;
      processedCount++;
    });

    const averageProcessingTime = processedCount > 0 ? totalProcessingTime / processedCount : 0;

    // Calculate throughput (jobs per hour)
    const hoursElapsed = (now.getTime() - oneDayAgo.getTime()) / (1000 * 60 * 60);
    const throughput = stats.completedJobs / hoursElapsed;

    return {
      activeJobs: stats.activeJobs,
      pendingJobs: stats.pendingJobs,
      failedJobs: stats.failedJobs,
      averageProcessingTime,
      successRate,
      errorRate,
      throughput,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      uptime: process.uptime(),
    };
  }

  /**
   * Collect metrics for active jobs
   */
  private async collectMetrics() {
    // Get active jobs
    const { data: activeJobs } = await this.serviceClient
      .from('okr_import_jobs')
      .select('id, processed_rows, total_rows, started_at')
      .eq('status', 'processing');

    activeJobs?.forEach(job => {
      if (!this.metrics.has(job.id)) {
        this.metrics.set(job.id, {
          jobId: job.id,
          startTime: new Date(job.started_at).getTime(),
          retryCount: 0,
          batchSizes: [],
          memorySnapshots: [],
          errors: [],
        });
      }

      const metrics = this.metrics.get(job.id)!;
      
      // Calculate processing speed
      if (job.processed_rows > 0 && metrics.startTime) {
        const elapsed = Date.now() - metrics.startTime;
        metrics.rowsPerSecond = (job.processed_rows / elapsed) * 1000;
      }

      // Record memory snapshot
      metrics.memorySnapshots.push(process.memoryUsage().heapUsed);
      
      // Keep only last 100 snapshots
      if (metrics.memorySnapshots.length > 100) {
        metrics.memorySnapshots.shift();
      }
    });

    // Clean up metrics for completed jobs
    this.metrics.forEach((metrics, jobId) => {
      if (!activeJobs?.some(j => j.id === jobId)) {
        // Job completed, store final metrics
        this.storeFinalMetrics(jobId, metrics);
        this.metrics.delete(jobId);
      }
    });
  }

  /**
   * Check for alert conditions
   */
  private checkAlertConditions(healthCheck: HealthCheckResult) {
    const alerts: Alert[] = [];

    // Check error rate
    if (healthCheck.metrics.errorRate > this.alertThresholds.maxErrorRate) {
      alerts.push({
        type: 'error_rate',
        severity: 'high',
        message: `Error rate ${(healthCheck.metrics.errorRate * 100).toFixed(1)}% exceeds threshold`,
        threshold: this.alertThresholds.maxErrorRate,
        value: healthCheck.metrics.errorRate,
        timestamp: Date.now(),
      });
    }

    // Check success rate
    if (healthCheck.metrics.successRate < this.alertThresholds.minSuccessRate) {
      alerts.push({
        type: 'success_rate',
        severity: 'high',
        message: `Success rate ${(healthCheck.metrics.successRate * 100).toFixed(1)}% below threshold`,
        threshold: this.alertThresholds.minSuccessRate,
        value: healthCheck.metrics.successRate,
        timestamp: Date.now(),
      });
    }

    // Check memory usage
    const memoryUsage = healthCheck.metrics.memoryUsage.heapUsed;
    if (memoryUsage > this.alertThresholds.maxMemoryUsage) {
      alerts.push({
        type: 'memory',
        severity: 'medium',
        message: `Memory usage ${Math.round(memoryUsage / 1024 / 1024)}MB exceeds threshold`,
        threshold: this.alertThresholds.maxMemoryUsage,
        value: memoryUsage,
        timestamp: Date.now(),
      });
    }

    // Send alerts
    alerts.forEach(alert => this.sendAlert(alert));
  }

  /**
   * Send alert to registered handlers
   */
  private sendAlert(alert: Alert) {
    this.alertHandlers.forEach(handler => {
      try {
        handler(alert);
      } catch (error) {
        logger.error('Alert handler error', error);
      }
    });

    // Log alert
    logger.warn('Import Alert:', alert);

    // Store alert in database
    this.storeAlert(alert);
  }

  /**
   * Register alert handler
   */
  onAlert(handler: (alert: Alert) => void): () => void {
    this.alertHandlers.add(handler);
    return () => this.alertHandlers.delete(handler);
  }

  /**
   * Store health check result in database
   */
  private async storeHealthCheck(result: HealthCheckResult) {
    try {
      await this.serviceClient
        .from('import_health_checks')
        .insert({
          status: result.status,
          checks: result.checks,
          metrics: result.metrics,
          created_at: new Date(result.timestamp).toISOString(),
        });
    } catch (error) {
      logger.error('Failed to store health check', error);
    }
  }

  /**
   * Store alert in database
   */
  private async storeAlert(alert: Alert) {
    try {
      await this.serviceClient
        .from('import_alerts')
        .insert({
          type: alert.type,
          severity: alert.severity,
          message: alert.message,
          threshold: alert.threshold,
          value: alert.value,
          created_at: new Date(alert.timestamp).toISOString(),
        });
    } catch (error) {
      logger.error('Failed to store alert', error);
    }
  }

  /**
   * Store final metrics for a completed job
   */
  private async storeFinalMetrics(jobId: string, metrics: ImportMetrics) {
    try {
      const avgMemory = metrics.memorySnapshots.length > 0
        ? metrics.memorySnapshots.reduce((a, b) => a + b, 0) / metrics.memorySnapshots.length
        : 0;

      await this.serviceClient
        .from('okr_import_jobs')
        .update({
          job_metadata: {
            performance_metrics: {
              rows_per_second: metrics.rowsPerSecond,
              error_rate: metrics.errorRate,
              retry_count: metrics.retryCount,
              average_memory_usage: avgMemory,
              peak_memory_usage: Math.max(...metrics.memorySnapshots),
              error_count: metrics.errors.length,
            },
          },
        })
        .eq('id', jobId);
    } catch (error) {
      logger.error('Failed to store final metrics', error, { jobId });
    }
  }

  /**
   * Get current health status
   */
  async getHealth(): Promise<HealthCheckResult> {
    return this.performHealthCheck();
  }

  /**
   * Get metrics for a specific job
   */
  getJobMetrics(jobId: string): ImportMetrics | undefined {
    return this.metrics.get(jobId);
  }

  /**
   * Get all active job metrics
   */
  getAllMetrics(): Map<string, ImportMetrics> {
    return new Map(this.metrics);
  }
}

interface Alert {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  threshold: number;
  value: number;
  timestamp: number;
}

// Export singleton instance
export const importMonitoring = new ImportMonitoringService();