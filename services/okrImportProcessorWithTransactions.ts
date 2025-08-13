/**
 * Enhanced OKR Import Processor with Transaction Support
 * Wraps multi-entity operations in database transactions for data integrity
 */

import { createClient as createServiceClient, SupabaseClient } from '@supabase/supabase-js';
import { TransactionManager, withTransaction, batchInsertWithTransaction } from './transactionUtils';
import { downloadObject } from '@/utils/gcs';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import type { Database } from '@/types/supabase';
import { logger } from '@/lib/logger';
import { calculateFileChecksum } from '@/lib/utils/checksum';

type ImportJobStatus = Database['public']['Enums']['import_job_status'];
type ImportItemStatus = Database['public']['Enums']['import_item_status'];
type ImportEntityType = Database['public']['Enums']['import_entity_type'];

interface ProcessedRow {
  rowNumber: number;
  objective?: { key: string; data: any };
  initiative?: { key: string; data: any };
  activity?: { key: string; data: any };
  user?: { key: string; data: any };
  area?: { key: string; data: any };
}

interface EntityBatch {
  objectives: any[];
  initiatives: any[];
  activities: any[];
  users: any[];
  areas: any[];
  objectiveInitiatives: any[];
}

export class TransactionalOKRProcessor {
  private serviceClient: SupabaseClient;
  private transactionManager: TransactionManager;

  constructor() {
    this.serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    this.transactionManager = new TransactionManager(this.serviceClient);
  }

  /**
   * Process import job with full transaction support
   */
  async processImportJob(jobId: string): Promise<void> {
    const log = logger.child({ service: 'TransactionalOKRProcessor', jobId });
    log.info('Starting transactional processing for job');

    try {
      // Get job details
      const { data: job, error: jobError } = await this.serviceClient
        .from('okr_import_jobs')
        .select('*')
        .eq('id', jobId)
        .single();

      if (jobError || !job) throw new Error('Job not found');

      // Update job status
      await this.updateJobStatus(jobId, 'processing');

      // Download and parse file
      const buffer = await downloadObject(job.object_path);
      const rows = await this.parseFile(buffer, job.content_type);

      // Process in transaction based on size
      if (rows.length <= 25) {
        await this.processSynchronouslyWithTransaction(jobId, job, rows);
      } else {
        await this.processBatchesWithTransactions(jobId, job, rows);
      }

      await this.updateJobStatus(jobId, 'completed');
    } catch (error) {
      logger.error('Processing error', error, { jobId });
      await this.updateJobStatus(jobId, 'failed', String(error));
      throw error;
    }
  }

  /**
   * Process small files in a single transaction
   */
  private async processSynchronouslyWithTransaction(
    jobId: string,
    job: any,
    rows: any[]
  ): Promise<void> {
    const result = await this.transactionManager.executeInTransaction(
      async (client) => {
        const processedRows: ProcessedRow[] = [];
        const entityBatch: EntityBatch = {
          objectives: [],
          initiatives: [],
          activities: [],
          users: [],
          areas: [],
          objectiveInitiatives: []
        };

        // Process all rows
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const processed = await this.processRowData(row, i + 1, job.tenant_id);
          processedRows.push(processed);

          // Collect entities
          if (processed.objective) {
            entityBatch.objectives.push(processed.objective.data);
          }
          if (processed.initiative) {
            entityBatch.initiatives.push(processed.initiative.data);
          }
          if (processed.activity) {
            entityBatch.activities.push(processed.activity.data);
          }
          if (processed.user) {
            entityBatch.users.push(processed.user.data);
          }
          if (processed.area) {
            entityBatch.areas.push(processed.area.data);
          }
        }

        // Insert all entities in order with proper relationships
        const createdIds = await this.insertEntitiesInTransaction(client, entityBatch, job.tenant_id);

        // Record job items
        await this.recordJobItems(client, jobId, processedRows, createdIds);

        // Update job metrics
        await this.updateJobMetrics(client, jobId, {
          total_rows: rows.length,
          processed_rows: rows.length,
          success_rows: processedRows.filter(r => r.objective || r.initiative || r.activity).length,
          error_rows: 0
        });

        return createdIds;
      },
      {
        retries: 3,
        retryDelay: 1000,
        timeout: 60000,
        isolationLevel: 'read_committed'
      }
    );

    log.info('Synchronous processing completed with transaction');
  }

  /**
   * Process large files in batches with transactions
   */
  private async processBatchesWithTransactions(
    jobId: string,
    job: any,
    rows: any[]
  ): Promise<void> {
    const BATCH_SIZE = 50;
    const batches = this.createBatches(rows, BATCH_SIZE);
    let totalProcessed = 0;
    let totalSuccess = 0;
    let totalErrors = 0;

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];

      try {
        // Process each batch in its own transaction
        await this.transactionManager.executeInTransaction(
          async (client) => {
            const processedRows: ProcessedRow[] = [];
            const entityBatch: EntityBatch = {
              objectives: [],
              initiatives: [],
              activities: [],
              users: [],
              areas: [],
              objectiveInitiatives: []
            };

            // Process batch rows
            for (let i = 0; i < batch.length; i++) {
              const rowIndex = batchIndex * BATCH_SIZE + i + 1;
              const processed = await this.processRowData(batch[i], rowIndex, job.tenant_id);
              processedRows.push(processed);

              // Collect entities
              if (processed.objective) entityBatch.objectives.push(processed.objective.data);
              if (processed.initiative) entityBatch.initiatives.push(processed.initiative.data);
              if (processed.activity) entityBatch.activities.push(processed.activity.data);
              if (processed.user) entityBatch.users.push(processed.user.data);
              if (processed.area) entityBatch.areas.push(processed.area.data);
            }

            // Insert batch entities
            const createdIds = await this.insertEntitiesInTransaction(client, entityBatch, job.tenant_id);

            // Record job items for this batch
            await this.recordJobItems(client, jobId, processedRows, createdIds);

            totalSuccess += processedRows.filter(r => r.objective || r.initiative || r.activity).length;

            return createdIds;
          },
          {
            retries: 2,
            retryDelay: 500,
            timeout: 30000,
            isolationLevel: 'read_committed'
          }
        );

        totalProcessed += batch.length;

        // Update progress
        await this.updateJobMetrics(this.serviceClient, jobId, {
          processed_rows: totalProcessed,
          success_rows: totalSuccess,
          error_rows: totalErrors
        });

      } catch (error) {
        logger.error(`Batch ${batchIndex} failed`, error, { jobId, batchIndex });
        totalErrors += batch.length;
        
        // Create savepoint for partial recovery
        await this.recordBatchError(jobId, batchIndex, batch, error);
      }
    }

    logger.info('Batch processing completed', { jobId, totalSuccess, totalErrors });
  }

  /**
   * Insert entities within a transaction with proper relationship handling
   */
  private async insertEntitiesInTransaction(
    client: SupabaseClient,
    batch: EntityBatch,
    tenantId: string
  ): Promise<any> {
    const createdIds = {
      objectives: [],
      initiatives: [],
      activities: [],
      users: [],
      areas: []
    };

    // 1. First, handle users and areas (no dependencies)
    if (batch.users.length > 0) {
      const { data: userData } = await client.rpc('bulk_upsert_users', {
        p_tenant_id: tenantId,
        p_users: batch.users
      });
      createdIds.users = userData || [];
    }

    if (batch.areas.length > 0) {
      const { data: areaData } = await client.rpc('bulk_upsert_areas', {
        p_tenant_id: tenantId,
        p_areas: batch.areas
      });
      createdIds.areas = areaData || [];
    }

    // 2. Create objectives
    if (batch.objectives.length > 0) {
      const { data: objData, error: objError } = await client
        .from('objectives')
        .insert(batch.objectives)
        .select('id, title');
      
      if (objError) throw objError;
      createdIds.objectives = objData || [];
    }

    // 3. Create initiatives with objective references
    if (batch.initiatives.length > 0) {
      const { data: initData, error: initError } = await client
        .from('initiatives')
        .insert(batch.initiatives)
        .select('id, title');
      
      if (initError) throw initError;
      createdIds.initiatives = initData || [];

      // Link initiatives to objectives if needed
      if (batch.objectiveInitiatives.length > 0) {
        const { error: linkError } = await client
          .from('objective_initiatives')
          .insert(batch.objectiveInitiatives);
        
        if (linkError) logger.error('Failed to link objectives to initiatives', linkError);
      }
    }

    // 4. Create activities with initiative references
    if (batch.activities.length > 0) {
      const { data: actData, error: actError } = await client
        .from('activities')
        .insert(batch.activities)
        .select('id, title');
      
      if (actError) throw actError;
      createdIds.activities = actData || [];
    }

    return createdIds;
  }

  /**
   * Process row data and prepare entities
   */
  private async processRowData(
    row: any,
    rowNumber: number,
    tenantId: string
  ): Promise<ProcessedRow> {
    const processed: ProcessedRow = { rowNumber };

    // Process user data if present
    if (row['User Email'] || row['user_email']) {
      processed.user = {
        key: row['User Email'] || row['user_email'],
        data: {
          email: row['User Email'] || row['user_email'],
          full_name: row['User Name'] || row['user_name'] || row['full_name'],
          role: row['User Role'] || row['role'] || 'Manager',
          area_name: row['User Area'] || row['area_name'],
          phone: row['User Phone'] || row['phone']
        }
      };
    }

    // Process area data if present
    if (row['Area Name'] || row['area_name']) {
      processed.area = {
        key: row['Area Name'] || row['area_name'],
        data: {
          name: row['Area Name'] || row['area_name'],
          description: row['Area Description'] || row['description'],
          manager_email: row['Manager Email'] || row['manager_email'],
          is_active: row['Is Active'] !== undefined ? row['Is Active'] : true
        }
      };
    }

    // Process objective data if present
    if (row['Objective Title'] || row['objective_title']) {
      processed.objective = {
        key: row['Objective Title'] || row['objective_title'],
        data: {
          tenant_id: tenantId,
          title: row['Objective Title'] || row['objective_title'],
          description: row['Objective Description'] || row['objective_description'],
          start_date: this.parseDate(row['Objective Start Date'] || row['start_date']),
          end_date: this.parseDate(row['Objective End Date'] || row['end_date']),
          target_date: this.parseDate(row['Objective Target Date'] || row['target_date']),
          priority: row['Objective Priority'] || row['priority'] || 'medium',
          status: row['Objective Status'] || row['status'] || 'planning',
          progress: this.parseProgress(row['Objective Progress'] || row['progress']),
          metrics: this.parseJsonField(row['Objective Metrics'] || row['metrics'])
        }
      };
    }

    // Process initiative data if present
    if (row['Initiative Title'] || row['initiative_title']) {
      processed.initiative = {
        key: row['Initiative Title'] || row['initiative_title'],
        data: {
          tenant_id: tenantId,
          title: row['Initiative Title'] || row['initiative_title'],
          description: row['Initiative Description'] || row['initiative_description'],
          start_date: this.parseDate(row['Initiative Start Date'] || row['start_date']),
          due_date: this.parseDate(row['Initiative Due Date'] || row['due_date']),
          progress: this.parseProgress(row['Initiative Progress'] || row['progress']),
          status: row['Initiative Status'] || row['status'] || 'in_progress'
        }
      };
    }

    // Process activity data if present
    if (row['Activity Title'] || row['activity_title']) {
      processed.activity = {
        key: row['Activity Title'] || row['activity_title'],
        data: {
          title: row['Activity Title'] || row['activity_title'],
          description: row['Activity Description'] || row['activity_description'],
          is_completed: this.parseBoolean(row['Activity Completed'] || row['is_completed']),
          assigned_to: null // Will be resolved after user creation
        }
      };
    }

    return processed;
  }

  /**
   * Helper methods for data parsing
   */
  private parseFile(buffer: Buffer, contentType: string): any[] {
    if (contentType.includes('csv')) {
      return parse(buffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true
      });
    } else if (contentType.includes('sheet') || contentType.includes('excel')) {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(sheet, { defval: '' });
    }
    throw new Error(`Unsupported file type: ${contentType}`);
  }

  private parseDate(value: any): string | null {
    if (!value) return null;
    try {
      const date = new Date(value);
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  private parseProgress(value: any): number {
    const progress = parseInt(value, 10);
    return isNaN(progress) ? 0 : Math.min(100, Math.max(0, progress));
  }

  private parseBoolean(value: any): boolean {
    return value === true || value === 'true' || value === '1' || value === 'yes';
  }

  private parseJsonField(value: any): any {
    if (!value) return null;
    if (typeof value === 'object') return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Helper methods for job management
   */
  private async updateJobStatus(
    jobId: string,
    status: ImportJobStatus,
    errorMessage?: string
  ): Promise<void> {
    const updates: any = { status };
    if (status === 'processing') updates.started_at = new Date().toISOString();
    if (status === 'completed' || status === 'failed') updates.completed_at = new Date().toISOString();
    if (errorMessage) updates.error_summary = errorMessage;

    await this.serviceClient
      .from('okr_import_jobs')
      .update(updates)
      .eq('id', jobId);
  }

  private async updateJobMetrics(
    client: SupabaseClient,
    jobId: string,
    metrics: any
  ): Promise<void> {
    await client
      .from('okr_import_jobs')
      .update(metrics)
      .eq('id', jobId);
  }

  private async recordJobItems(
    client: SupabaseClient,
    jobId: string,
    processedRows: ProcessedRow[],
    createdIds: any
  ): Promise<void> {
    const items = processedRows.map(row => ({
      job_id: jobId,
      row_number: row.rowNumber,
      entity_type: row.objective ? 'objective' : row.initiative ? 'initiative' : 'activity',
      entity_key: row.objective?.key || row.initiative?.key || row.activity?.key || '',
      action: 'create',
      status: 'completed' as ImportItemStatus,
      processed_at: new Date().toISOString()
    }));

    if (items.length > 0) {
      await batchInsertWithTransaction(client, 'okr_import_job_items', items, 100);
    }
  }

  private async recordBatchError(
    jobId: string,
    batchIndex: number,
    batch: any[],
    error: any
  ): Promise<void> {
    const errorItems = batch.map((row, index) => ({
      job_id: jobId,
      row_number: batchIndex * 50 + index + 1,
      entity_type: 'unknown' as ImportEntityType,
      entity_key: 'batch_error',
      action: 'skip',
      status: 'error' as ImportItemStatus,
      error_message: String(error),
      processed_at: new Date().toISOString()
    }));

    await this.serviceClient
      .from('okr_import_job_items')
      .insert(errorItems);
  }
}

/**
 * Export main processing function
 */
export async function processOKRImportJobWithTransactions(jobId: string): Promise<void> {
  const processor = new TransactionalOKRProcessor();
  return processor.processImportJob(jobId);
}