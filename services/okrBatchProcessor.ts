/**
 * OKR Batch Processor
 * Optimized batch processing for OKR imports with support for bulk operations
 */

import { createClient as createServiceClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

type ImportJobStatus = Database['public']['Enums']['import_job_status'];
type ImportItemStatus = Database['public']['Enums']['import_item_status'];
type ImportEntityType = Database['public']['Enums']['import_entity_type'];

interface BatchProcessingOptions {
  batchSize?: number;
  maxRetries?: number;
  parallelBatches?: number;
  validateBeforeInsert?: boolean;
}

interface BatchResult {
  success: boolean;
  processed: number;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{
    index: number;
    message: string;
    data?: any;
  }>;
}

interface ProcessedEntity {
  id: string;
  title: string;
  action: 'create' | 'update' | 'skip';
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class OKRBatchProcessor {
  private serviceClient: any;
  private options: Required<BatchProcessingOptions>;

  constructor(options: BatchProcessingOptions = {}) {
    this.serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    this.options = {
      batchSize: options.batchSize || 50,
      maxRetries: options.maxRetries || 3,
      parallelBatches: options.parallelBatches || 2,
      validateBeforeInsert: options.validateBeforeInsert !== false,
    };
  }

  /**
   * Process OKR data in optimized batches
   */
  async processBatch(
    jobId: string,
    tenantId: string,
    areaId: string | null,
    userId: string,
    rows: any[]
  ): Promise<BatchResult> {
    const startTime = Date.now();
    const result: BatchResult = {
      success: true,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Record batch start
      const { data: batchMetric } = await this.serviceClient
        .from('okr_import_batch_metrics')
        .insert({
          job_id: jobId,
          batch_number: 1,
          batch_size: rows.length,
          start_time: new Date().toISOString(),
        })
        .select()
        .single();

      // Group rows by entity type for batch processing
      const { objectives, initiatives, activities } = this.groupRowsByEntity(rows);

      // Process objectives in batch
      const objectiveResults = await this.batchProcessObjectives(
        tenantId,
        areaId,
        userId,
        objectives
      );

      // Process initiatives in batch (with objective linkage)
      const initiativeResults = await this.batchProcessInitiatives(
        tenantId,
        areaId,
        userId,
        initiatives,
        objectiveResults
      );

      // Process activities in batch
      const activityResults = await this.batchProcessActivities(
        tenantId,
        activities,
        initiativeResults
      );

      // Aggregate results
      result.created = objectiveResults.created + initiativeResults.created + activityResults.created;
      result.updated = objectiveResults.updated + initiativeResults.updated + activityResults.updated;
      result.skipped = objectiveResults.skipped + initiativeResults.skipped + activityResults.skipped;
      result.processed = result.created + result.updated + result.skipped;
      result.errors = [
        ...objectiveResults.errors,
        ...initiativeResults.errors,
        ...activityResults.errors,
      ];

      // Update batch metrics
      if (batchMetric) {
        await this.serviceClient
          .from('okr_import_batch_metrics')
          .update({
            end_time: new Date().toISOString(),
            rows_processed: result.processed,
            rows_succeeded: result.created + result.updated,
            rows_failed: result.errors.length,
            processing_time_ms: Date.now() - startTime,
          })
          .eq('id', batchMetric.id);
      }

      result.success = result.errors.length === 0;
    } catch (error) {
      result.success = false;
      result.errors.push({
        index: -1,
        message: error instanceof Error ? error.message : 'Batch processing failed',
      });
    }

    return result;
  }

  /**
   * Group rows by entity type for efficient batch processing
   */
  private groupRowsByEntity(rows: any[]) {
    const objectives = new Map<string, any>();
    const initiatives = new Map<string, any>();
    const activities: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      row._index = i; // Keep track of original row index

      // Process objective
      if (row.objective_title) {
        const key = row.objective_title.toUpperCase().trim();
        if (!objectives.has(key)) {
          objectives.set(key, {
            title: row.objective_title,
            description: row.objective_description,
            priority: row.objective_priority,
            status: row.objective_status,
            progress: row.objective_progress,
            start_date: row.objective_start_date,
            end_date: row.objective_end_date,
            target_date: row.objective_target_date,
            metrics: row.objective_metrics ? JSON.parse(row.objective_metrics) : [],
            _indices: [i],
          });
        } else {
          objectives.get(key)._indices.push(i);
        }
      }

      // Process initiative
      if (row.initiative_title) {
        const objKey = row.objective_title?.toUpperCase().trim() || '';
        const initKey = `${objKey}::${row.initiative_title.toUpperCase().trim()}`;
        if (!initiatives.has(initKey)) {
          initiatives.set(initKey, {
            title: row.initiative_title,
            description: row.initiative_description,
            objective_title: row.objective_title,
            status: row.initiative_status,
            progress: row.initiative_progress,
            start_date: row.initiative_start_date,
            due_date: row.initiative_due_date,
            completion_date: row.initiative_completion_date,
            _indices: [i],
          });
        } else {
          initiatives.get(initKey)._indices.push(i);
        }
      }

      // Process activity
      if (row.activity_title) {
        activities.push({
          title: row.activity_title,
          description: row.activity_description,
          initiative_title: row.initiative_title,
          objective_title: row.objective_title,
          is_completed: row.activity_is_completed,
          assigned_to_email: row.activity_assigned_to_email,
          _index: i,
        });
      }
    }

    return {
      objectives: Array.from(objectives.values()),
      initiatives: Array.from(initiatives.values()),
      activities,
    };
  }

  /**
   * Batch process objectives using database function
   */
  private async batchProcessObjectives(
    tenantId: string,
    areaId: string | null,
    userId: string,
    objectives: any[]
  ): Promise<BatchResult> {
    const result: BatchResult = {
      success: true,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    if (objectives.length === 0) return result;

    try {
      // Validate objectives if enabled
      if (this.options.validateBeforeInsert) {
        for (const obj of objectives) {
          const validation = this.validateObjective(obj);
          if (!validation.valid) {
            result.errors.push({
              index: obj._indices[0],
              message: validation.errors.join('; '),
              data: obj,
            });
            continue;
          }
        }
      }

      // Prepare batch data
      const batchData = objectives
        .filter(obj => !result.errors.some(e => obj._indices.includes(e.index)))
        .map(obj => ({
          title: obj.title,
          description: obj.description,
          priority: this.normalizeEnum(obj.priority, ['high', 'medium', 'low'], 'medium'),
          status: this.normalizeEnum(obj.status, ['planning', 'in_progress', 'completed', 'overdue'], 'planning'),
          progress: this.parseInteger(obj.progress, 0, 100),
          start_date: this.parseDate(obj.start_date),
          end_date: this.parseDate(obj.end_date),
          target_date: this.parseDate(obj.target_date),
          metrics: obj.metrics || [],
        }));

      // Call batch insert function
      const { data: insertResults, error } = await this.serviceClient
        .rpc('batch_insert_objectives', {
          p_tenant_id: tenantId,
          p_area_id: areaId,
          p_created_by: userId,
          p_objectives: batchData,
        });

      if (error) throw error;

      // Process results
      if (insertResults) {
        for (const item of insertResults) {
          result.processed++;
          if (item.action === 'create') {
            result.created++;
          } else if (item.action === 'update') {
            result.updated++;
          }
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        index: -1,
        message: `Batch objective processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  /**
   * Batch process initiatives with objective linkage
   */
  private async batchProcessInitiatives(
    tenantId: string,
    areaId: string | null,
    userId: string,
    initiatives: any[],
    objectiveResults: BatchResult
  ): Promise<BatchResult> {
    const result: BatchResult = {
      success: true,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    if (initiatives.length === 0) return result;

    try {
      // First, resolve objective IDs
      const objectiveTitleToId = new Map<string, string>();
      
      for (const init of initiatives) {
        if (init.objective_title) {
          const objTitle = init.objective_title.toUpperCase().trim();
          if (!objectiveTitleToId.has(objTitle)) {
            const { data: obj } = await this.serviceClient
              .from('objectives')
              .select('id')
              .eq('tenant_id', tenantId)
              .ilike('title', objTitle)
              .single();
            
            if (obj) {
              objectiveTitleToId.set(objTitle, obj.id);
            }
          }
        }
      }

      // Validate initiatives
      if (this.options.validateBeforeInsert) {
        for (const init of initiatives) {
          const validation = this.validateInitiative(init);
          if (!validation.valid) {
            result.errors.push({
              index: init._indices[0],
              message: validation.errors.join('; '),
              data: init,
            });
            continue;
          }
        }
      }

      // Prepare batch data
      const batchData = initiatives
        .filter(init => !result.errors.some(e => init._indices.includes(e.index)))
        .map(init => ({
          title: init.title,
          description: init.description,
          objective_id: init.objective_title ? 
            objectiveTitleToId.get(init.objective_title.toUpperCase().trim()) : null,
          status: this.normalizeEnum(init.status, ['planning', 'in_progress', 'completed', 'on_hold'], 'in_progress'),
          progress: this.parseInteger(init.progress, 0, 100),
          start_date: this.parseDate(init.start_date),
          due_date: this.parseDate(init.due_date),
          completion_date: this.parseDate(init.completion_date),
        }));

      // Call batch insert function
      const { data: insertResults, error } = await this.serviceClient
        .rpc('batch_insert_initiatives', {
          p_tenant_id: tenantId,
          p_area_id: areaId,
          p_created_by: userId,
          p_initiatives: batchData,
        });

      if (error) throw error;

      // Process results
      if (insertResults) {
        for (const item of insertResults) {
          result.processed++;
          if (item.action === 'create') {
            result.created++;
          } else if (item.action === 'update') {
            result.updated++;
          }
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        index: -1,
        message: `Batch initiative processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  /**
   * Batch process activities
   */
  private async batchProcessActivities(
    tenantId: string,
    activities: any[],
    initiativeResults: BatchResult
  ): Promise<BatchResult> {
    const result: BatchResult = {
      success: true,
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    if (activities.length === 0) return result;

    try {
      // Resolve initiative IDs
      const initiativeTitleToId = new Map<string, string>();
      
      for (const activity of activities) {
        if (activity.initiative_title) {
          const initTitle = activity.initiative_title.toUpperCase().trim();
          if (!initiativeTitleToId.has(initTitle)) {
            const { data: init } = await this.serviceClient
              .from('initiatives')
              .select('id')
              .eq('tenant_id', tenantId)
              .ilike('title', initTitle)
              .single();
            
            if (init) {
              initiativeTitleToId.set(initTitle, init.id);
            }
          }
        }
      }

      // Validate activities
      if (this.options.validateBeforeInsert) {
        for (const activity of activities) {
          const validation = this.validateActivity(activity);
          if (!validation.valid) {
            result.errors.push({
              index: activity._index,
              message: validation.errors.join('; '),
              data: activity,
            });
            continue;
          }
        }
      }

      // Prepare batch data
      const batchData = activities
        .filter(act => {
          const hasInitiative = act.initiative_title && 
            initiativeTitleToId.has(act.initiative_title.toUpperCase().trim());
          if (!hasInitiative) {
            result.errors.push({
              index: act._index,
              message: `Initiative not found: ${act.initiative_title}`,
              data: act,
            });
            return false;
          }
          return !result.errors.some(e => e.index === act._index);
        })
        .map(act => ({
          title: act.title,
          description: act.description,
          initiative_id: initiativeTitleToId.get(act.initiative_title.toUpperCase().trim()),
          is_completed: this.parseBoolean(act.is_completed),
          assigned_to_email: act.assigned_to_email,
        }));

      // Call batch insert function
      const { data: insertResults, error } = await this.serviceClient
        .rpc('batch_insert_activities', {
          p_tenant_id: tenantId,
          p_activities: batchData,
        });

      if (error) throw error;

      // Process results
      if (insertResults) {
        for (const item of insertResults) {
          result.processed++;
          if (item.action === 'create') {
            result.created++;
          } else if (item.action === 'update') {
            result.updated++;
          }
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push({
        index: -1,
        message: `Batch activity processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return result;
  }

  /**
   * Validation methods
   */
  private validateObjective(obj: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!obj.title || obj.title.trim() === '') {
      errors.push('Objective title is required');
    }

    if (obj.progress !== undefined && obj.progress !== null) {
      const progress = parseInt(obj.progress);
      if (isNaN(progress) || progress < 0 || progress > 100) {
        errors.push('Progress must be between 0 and 100');
      }
    }

    if (obj.start_date && obj.end_date) {
      const start = new Date(obj.start_date);
      const end = new Date(obj.end_date);
      if (start > end) {
        errors.push('Start date cannot be after end date');
      }
    }

    if (obj.priority && !['high', 'medium', 'low'].includes(obj.priority.toLowerCase())) {
      warnings.push(`Invalid priority "${obj.priority}", using default "medium"`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateInitiative(init: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!init.title || init.title.trim() === '') {
      errors.push('Initiative title is required');
    }

    if (init.progress !== undefined && init.progress !== null) {
      const progress = parseInt(init.progress);
      if (isNaN(progress) || progress < 0 || progress > 100) {
        errors.push('Progress must be between 0 and 100');
      }
    }

    if (init.start_date && init.due_date) {
      const start = new Date(init.start_date);
      const due = new Date(init.due_date);
      if (start > due) {
        errors.push('Start date cannot be after due date');
      }
    }

    if (init.status && !['planning', 'in_progress', 'completed', 'on_hold'].includes(init.status.toLowerCase())) {
      warnings.push(`Invalid status "${init.status}", using default "in_progress"`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateActivity(activity: any): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!activity.title || activity.title.trim() === '') {
      errors.push('Activity title is required');
    }

    if (!activity.initiative_title) {
      errors.push('Initiative title is required for activity');
    }

    if (activity.assigned_to_email && !this.isValidEmail(activity.assigned_to_email)) {
      warnings.push(`Invalid email format: ${activity.assigned_to_email}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Utility methods
   */
  private normalizeEnum(value: any, validValues: string[], defaultValue: string): string {
    if (!value) return defaultValue;
    const normalized = String(value).toLowerCase().trim();
    return validValues.includes(normalized) ? normalized : defaultValue;
  }

  private parseInteger(value: any, min: number = 0, max: number = 100): number {
    if (value === null || value === undefined || value === '') return 0;
    const parsed = parseInt(String(value));
    if (isNaN(parsed)) return 0;
    return Math.max(min, Math.min(max, parsed));
  }

  private parseDate(value: any): string | null {
    if (!value) return null;
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;
      return date.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  private parseBoolean(value: any): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') {
      const normalized = value.toLowerCase().trim();
      return normalized === 'true' || normalized === 'yes' || normalized === '1';
    }
    return false;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$/;
    return emailRegex.test(email);
  }
}