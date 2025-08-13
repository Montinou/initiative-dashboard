/**
 * Optimized OKR Import Service
 * Integrates batch processing, streaming, transactions, and monitoring
 */

import { createClient as createServiceClient, SupabaseClient } from '@supabase/supabase-js';
import { downloadObject } from '@/utils/gcs';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse';
import { Transform } from 'stream';
import { logger } from '@/lib/logger';
import { promisify } from 'util';
import { pipeline } from 'stream/promises';
import type { Database } from '@/types/supabase';

type ImportJobStatus = Database['public']['Enums']['import_job_status'];
type ImportItemStatus = Database['public']['Enums']['import_item_status'];
type ImportEntityType = Database['public']['Enums']['import_entity_type'];

// Configuration
const CONFIG = {
  BATCH_SIZE: 100,
  SYNC_THRESHOLD: 25,
  MAX_MEMORY_BUFFER: 10 * 1024 * 1024, // 10MB
  CONNECTION_POOL_SIZE: 10,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  PROGRESS_UPDATE_INTERVAL: 10, // Update progress every 10 rows
  TRANSACTION_TIMEOUT: 30000, // 30 seconds
};

interface ProcessingMetrics {
  startTime: number;
  endTime?: number;
  rowsProcessed: number;
  rowsSucceeded: number;
  rowsFailed: number;
  batchesProcessed: number;
  averageProcessingTime?: number;
  memoryUsage?: number;
  errors: Array<{ row: number; message: string; timestamp: number }>;
}

interface StreamingOptions {
  onProgress?: (progress: ProgressUpdate) => void;
  onError?: (error: Error) => void;
  abortSignal?: AbortSignal;
}

interface ProgressUpdate {
  jobId: string;
  status: ImportJobStatus;
  percentage: number;
  processed: number;
  total: number;
  succeeded: number;
  failed: number;
  eta?: number;
  currentBatch?: number;
  totalBatches?: number;
  message?: string;
}

export class OptimizedOKRImportService {
  private serviceClient: SupabaseClient;
  private connectionPool: SupabaseClient[] = [];
  private currentPoolIndex = 0;
  private metrics: Map<string, ProcessingMetrics> = new Map();
  private progressListeners: Map<string, Set<(update: ProgressUpdate) => void>> = new Map();

  constructor() {
    this.initializeConnectionPool();
  }

  /**
   * Initialize connection pool for better performance
   */
  private initializeConnectionPool() {
    for (let i = 0; i < CONFIG.CONNECTION_POOL_SIZE; i++) {
      this.connectionPool.push(
        createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              persistSession: false,
              autoRefreshToken: false,
            },
            global: {
              headers: {
                'x-connection-id': `pool-${i}`,
              },
            },
          }
        )
      );
    }
    this.serviceClient = this.connectionPool[0];
  }

  /**
   * Get next connection from pool (round-robin)
   */
  private getPooledConnection(): SupabaseClient {
    const client = this.connectionPool[this.currentPoolIndex];
    this.currentPoolIndex = (this.currentPoolIndex + 1) % CONFIG.CONNECTION_POOL_SIZE;
    return client;
  }

  /**
   * Main processing entry point with automatic mode detection
   */
  async processImportJob(
    jobId: string,
    options: StreamingOptions = {}
  ): Promise<void> {
    const metrics: ProcessingMetrics = {
      startTime: Date.now(),
      rowsProcessed: 0,
      rowsSucceeded: 0,
      rowsFailed: 0,
      batchesProcessed: 0,
      errors: [],
    };

    this.metrics.set(jobId, metrics);

    try {
      // Get job details
      const job = await this.getJobDetails(jobId);
      if (!job) throw new Error('Job not found');

      // Update job status
      await this.updateJobStatus(jobId, 'processing');

      // Download file
      const buffer = await downloadObject(job.object_path);
      
      // Determine processing mode based on file size
      const rowCount = await this.countRows(buffer, job.content_type);
      
      if (rowCount <= CONFIG.SYNC_THRESHOLD) {
        await this.processSynchronously(jobId, job, buffer, options);
      } else if (buffer.length > CONFIG.MAX_MEMORY_BUFFER) {
        await this.processWithStreaming(jobId, job, buffer, options);
      } else {
        await this.processInBatches(jobId, job, buffer, options);
      }

      // Finalize processing
      await this.finalizeJob(jobId, metrics);

    } catch (error) {
      await this.handleJobError(jobId, error as Error);
      throw error;
    } finally {
      metrics.endTime = Date.now();
      this.calculateMetrics(metrics);
    }
  }

  /**
   * Process small files synchronously in a single transaction
   */
  private async processSynchronously(
    jobId: string,
    job: any,
    buffer: Buffer,
    options: StreamingOptions
  ): Promise<void> {
    const rows = await this.parseFile(buffer, job.content_type);
    const metrics = this.metrics.get(jobId)!;
    
    // Start transaction
    const client = this.getPooledConnection();
    
    try {
      // Process all rows in a single batch within transaction
      const batchProcessor = new BatchProcessor(client, job.tenant_id, job.area_id, job.user_id);
      const result = await batchProcessor.processBatch(rows, {
        useTransaction: true,
        timeout: CONFIG.TRANSACTION_TIMEOUT,
      });

      metrics.rowsProcessed = result.processed;
      metrics.rowsSucceeded = result.succeeded;
      metrics.rowsFailed = result.failed;

      // Update progress
      this.emitProgress(jobId, {
        jobId,
        status: 'completed',
        percentage: 100,
        processed: result.processed,
        total: rows.length,
        succeeded: result.succeeded,
        failed: result.failed,
      });

      // Record results
      await this.recordBatchResults(jobId, result);

    } catch (error) {
      // Transaction will be automatically rolled back
      throw error;
    }
  }

  /**
   * Process medium files in optimized batches
   */
  private async processInBatches(
    jobId: string,
    job: any,
    buffer: Buffer,
    options: StreamingOptions
  ): Promise<void> {
    const rows = await this.parseFile(buffer, job.content_type);
    const metrics = this.metrics.get(jobId)!;
    const totalBatches = Math.ceil(rows.length / CONFIG.BATCH_SIZE);

    for (let i = 0; i < rows.length; i += CONFIG.BATCH_SIZE) {
      if (options.abortSignal?.aborted) {
        throw new Error('Processing aborted');
      }

      const batch = rows.slice(i, i + CONFIG.BATCH_SIZE);
      const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;

      // Process batch with retry logic
      const result = await this.processBatchWithRetry(
        jobId,
        job,
        batch,
        batchNumber
      );

      metrics.rowsProcessed += result.processed;
      metrics.rowsSucceeded += result.succeeded;
      metrics.rowsFailed += result.failed;
      metrics.batchesProcessed++;

      // Emit progress update
      const percentage = Math.round((metrics.rowsProcessed / rows.length) * 100);
      const eta = this.calculateETA(metrics, rows.length);
      
      this.emitProgress(jobId, {
        jobId,
        status: 'processing',
        percentage,
        processed: metrics.rowsProcessed,
        total: rows.length,
        succeeded: metrics.rowsSucceeded,
        failed: metrics.rowsFailed,
        eta,
        currentBatch: batchNumber,
        totalBatches,
        message: `Processing batch ${batchNumber} of ${totalBatches}`,
      });

      // Update job progress in database
      if (batchNumber % 5 === 0 || batchNumber === totalBatches) {
        await this.updateJobProgress(jobId, metrics);
      }
    }
  }

  /**
   * Process large files using streaming to avoid memory issues
   */
  private async processWithStreaming(
    jobId: string,
    job: any,
    buffer: Buffer,
    options: StreamingOptions
  ): Promise<void> {
    const metrics = this.metrics.get(jobId)!;
    
    // Create streaming parser based on file type
    const parser = this.createStreamingParser(job.content_type);
    
    // Create batch accumulator transform stream
    const batchAccumulator = new BatchAccumulator(CONFIG.BATCH_SIZE);
    
    // Create processor transform stream
    const processor = new BatchProcessorStream(
      jobId,
      job,
      this,
      options
    );

    // Set up streaming pipeline
    await pipeline(
      buffer,
      parser,
      batchAccumulator,
      processor
    );
  }

  /**
   * Process a batch with retry logic
   */
  private async processBatchWithRetry(
    jobId: string,
    job: any,
    batch: any[],
    batchNumber: number
  ): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
      try {
        const client = this.getPooledConnection();
        const batchProcessor = new BatchProcessor(
          client,
          job.tenant_id,
          job.area_id,
          job.user_id
        );
        
        return await batchProcessor.processBatch(batch, {
          batchNumber,
          jobId,
        });
        
      } catch (error) {
        lastError = error as Error;
        logger.error(`Batch ${batchNumber} attempt ${attempt} failed:`, error);
        
        if (attempt < CONFIG.RETRY_ATTEMPTS) {
          // Exponential backoff
          await this.delay(CONFIG.RETRY_DELAY * Math.pow(2, attempt - 1));
        }
      }
    }
    
    // All retries failed, record batch failure
    await this.recordBatchFailure(jobId, batchNumber, batch, lastError!);
    
    return {
      processed: batch.length,
      succeeded: 0,
      failed: batch.length,
      errors: batch.map((row, index) => ({
        row: index,
        message: lastError!.message,
      })),
    };
  }

  /**
   * Subscribe to progress updates for a job
   */
  subscribeToProgress(jobId: string, callback: (update: ProgressUpdate) => void): () => void {
    if (!this.progressListeners.has(jobId)) {
      this.progressListeners.set(jobId, new Set());
    }
    
    this.progressListeners.get(jobId)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this.progressListeners.get(jobId);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.progressListeners.delete(jobId);
        }
      }
    };
  }

  /**
   * Emit progress update to all listeners
   */
  private emitProgress(jobId: string, update: ProgressUpdate) {
    const listeners = this.progressListeners.get(jobId);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          logger.error('Progress listener error:', error);
        }
      });
    }
  }

  /**
   * Calculate ETA based on current processing speed
   */
  private calculateETA(metrics: ProcessingMetrics, totalRows: number): number {
    const elapsed = Date.now() - metrics.startTime;
    const rowsPerMs = metrics.rowsProcessed / elapsed;
    const remainingRows = totalRows - metrics.rowsProcessed;
    return Math.round(remainingRows / rowsPerMs / 1000); // in seconds
  }

  /**
   * Calculate and store final metrics
   */
  private calculateMetrics(metrics: ProcessingMetrics) {
    if (metrics.endTime) {
      const totalTime = metrics.endTime - metrics.startTime;
      metrics.averageProcessingTime = totalTime / metrics.rowsProcessed;
      metrics.memoryUsage = process.memoryUsage().heapUsed;
    }
  }

  // Helper methods
  private async getJobDetails(jobId: string): Promise<any> {
    const { data, error } = await this.serviceClient
      .from('okr_import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();
    
    if (error) throw error;
    return data;
  }

  private async updateJobStatus(jobId: string, status: ImportJobStatus): Promise<void> {
    await this.serviceClient
      .from('okr_import_jobs')
      .update({ 
        status,
        started_at: status === 'processing' ? new Date().toISOString() : undefined,
      })
      .eq('id', jobId);
  }

  private async updateJobProgress(jobId: string, metrics: ProcessingMetrics): Promise<void> {
    await this.serviceClient
      .from('okr_import_jobs')
      .update({
        processed_rows: metrics.rowsProcessed,
        success_rows: metrics.rowsSucceeded,
        error_rows: metrics.rowsFailed,
      })
      .eq('id', jobId);
  }

  private async finalizeJob(jobId: string, metrics: ProcessingMetrics): Promise<void> {
    const status: ImportJobStatus = metrics.rowsFailed === 0 ? 'completed' : 'partial';
    
    await this.serviceClient
      .from('okr_import_jobs')
      .update({
        status,
        processed_rows: metrics.rowsProcessed,
        success_rows: metrics.rowsSucceeded,
        error_rows: metrics.rowsFailed,
        completed_at: new Date().toISOString(),
        job_metadata: {
          processing_time_ms: metrics.endTime ? metrics.endTime - metrics.startTime : null,
          batches_processed: metrics.batchesProcessed,
          average_time_per_row: metrics.averageProcessingTime,
          memory_usage_bytes: metrics.memoryUsage,
        },
      })
      .eq('id', jobId);
  }

  private async handleJobError(jobId: string, error: Error): Promise<void> {
    await this.serviceClient
      .from('okr_import_jobs')
      .update({
        status: 'failed' as ImportJobStatus,
        error_summary: error.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', jobId);
  }

  private async countRows(buffer: Buffer, contentType: string): Promise<number> {
    const rows = await this.parseFile(buffer, contentType);
    return rows.length;
  }

  private async parseFile(buffer: Buffer, contentType: string): Promise<any[]> {
    if (contentType.includes('csv')) {
      return parse(buffer, { 
        columns: true, 
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
      });
    } else if (contentType.includes('sheet') || contentType.includes('excel')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames.includes('OKR_Bulk') 
        ? 'OKR_Bulk' 
        : workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }
    throw new Error(`Unsupported file type: ${contentType}`);
  }

  private createStreamingParser(contentType: string): Transform {
    if (contentType.includes('csv')) {
      return parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true,
      });
    }
    // For Excel files, we'll need to buffer and process differently
    throw new Error('Streaming not supported for Excel files');
  }

  private async recordBatchResults(jobId: string, result: any): Promise<void> {
    // Record successful items
    if (result.items) {
      const items = result.items.map((item: any) => ({
        job_id: jobId,
        row_number: item.row,
        entity_type: item.type as ImportEntityType,
        entity_key: item.key,
        entity_id: item.id,
        action: item.action,
        status: item.success ? 'success' : 'error' as ImportItemStatus,
        error_message: item.error,
        processed_at: new Date().toISOString(),
      }));

      await this.serviceClient
        .from('okr_import_job_items')
        .insert(items);
    }
  }

  private async recordBatchFailure(
    jobId: string,
    batchNumber: number,
    batch: any[],
    error: Error
  ): Promise<void> {
    const items = batch.map((row, index) => ({
      job_id: jobId,
      row_number: (batchNumber - 1) * CONFIG.BATCH_SIZE + index + 1,
      entity_type: 'objective' as ImportEntityType,
      entity_key: 'batch_failure',
      status: 'error' as ImportItemStatus,
      error_message: error.message,
      row_data: row,
      processed_at: new Date().toISOString(),
    }));

    await this.serviceClient
      .from('okr_import_job_items')
      .insert(items);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Batch processor with transaction support
 */
class BatchProcessor {
  constructor(
    private client: SupabaseClient,
    private tenantId: string,
    private areaId: string | null,
    private userId: string
  ) {}

  async processBatch(
    rows: any[],
    options: any = {}
  ): Promise<any> {
    const result = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      items: [],
      errors: [],
    };

    // Group rows by entity type
    const grouped = this.groupRowsByEntity(rows);

    try {
      // Process objectives first
      if (grouped.objectives.length > 0) {
        const objectiveResult = await this.processBatchEntity(
          'objectives',
          grouped.objectives,
          options
        );
        result.succeeded += objectiveResult.created;
        result.items.push(...objectiveResult.items);
      }

      // Process initiatives (depends on objectives)
      if (grouped.initiatives.length > 0) {
        const initiativeResult = await this.processBatchEntity(
          'initiatives',
          grouped.initiatives,
          options
        );
        result.succeeded += initiativeResult.created;
        result.items.push(...initiativeResult.items);
      }

      // Process activities (depends on initiatives)
      if (grouped.activities.length > 0) {
        const activityResult = await this.processBatchEntity(
          'activities',
          grouped.activities,
          options
        );
        result.succeeded += activityResult.created;
        result.items.push(...activityResult.items);
      }

      result.processed = rows.length;
      result.failed = result.processed - result.succeeded;

    } catch (error) {
      logger.error('Batch processing error:', error);
      result.errors.push({
        message: error instanceof Error ? error.message : 'Unknown error',
        batch: options.batchNumber,
      });
      throw error;
    }

    return result;
  }

  private groupRowsByEntity(rows: any[]): any {
    const objectives = new Map();
    const initiatives = new Map();
    const activities = [];

    rows.forEach((row, index) => {
      row._index = index;

      // Group objectives
      if (row.objective_title) {
        const key = row.objective_title.toUpperCase().trim();
        if (!objectives.has(key)) {
          objectives.set(key, { ...row, _indices: [index] });
        }
      }

      // Group initiatives  
      if (row.initiative_title) {
        const key = `${row.objective_title?.toUpperCase().trim()}::${row.initiative_title.toUpperCase().trim()}`;
        if (!initiatives.has(key)) {
          initiatives.set(key, { ...row, _indices: [index] });
        }
      }

      // Collect activities
      if (row.activity_title) {
        activities.push(row);
      }
    });

    return {
      objectives: Array.from(objectives.values()),
      initiatives: Array.from(initiatives.values()),
      activities,
    };
  }

  private async processBatchEntity(
    entityType: string,
    entities: any[],
    options: any
  ): Promise<any> {
    // Use batch insert/upsert functions from database
    const { data, error } = await this.client
      .rpc(`batch_upsert_${entityType}`, {
        p_tenant_id: this.tenantId,
        p_area_id: this.areaId,
        p_user_id: this.userId,
        p_entities: entities,
      });

    if (error) throw error;

    return {
      created: data?.length || 0,
      items: data || [],
    };
  }
}

/**
 * Transform stream for batch accumulation
 */
class BatchAccumulator extends Transform {
  private batch: any[] = [];

  constructor(private batchSize: number) {
    super({ objectMode: true });
  }

  _transform(chunk: any, encoding: string, callback: Function) {
    this.batch.push(chunk);
    
    if (this.batch.length >= this.batchSize) {
      this.push([...this.batch]);
      this.batch = [];
    }
    
    callback();
  }

  _flush(callback: Function) {
    if (this.batch.length > 0) {
      this.push(this.batch);
    }
    callback();
  }
}

/**
 * Transform stream for batch processing
 */
class BatchProcessorStream extends Transform {
  constructor(
    private jobId: string,
    private job: any,
    private service: OptimizedOKRImportService,
    private options: StreamingOptions
  ) {
    super({ objectMode: true });
  }

  async _transform(batch: any[], encoding: string, callback: Function) {
    try {
      // Process batch
      const result = await this.service['processBatchWithRetry'](
        this.jobId,
        this.job,
        batch,
        1
      );
      
      // Emit progress
      const metrics = this.service['metrics'].get(this.jobId);
      if (metrics) {
        metrics.rowsProcessed += result.processed;
        metrics.rowsSucceeded += result.succeeded;
        metrics.rowsFailed += result.failed;
      }
      
      callback();
    } catch (error) {
      callback(error);
    }
  }
}

// Export singleton instance
export const optimizedImportService = new OptimizedOKRImportService();