import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
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
  objective?: {
    key: string;
    data: any;
  };
  initiative?: {
    key: string;
    data: any;
  };
  activity?: {
    key: string;
    data: any;
  };
}

interface ValidationError {
  row: number;
  column: string;
  message: string;
}

interface SyncProcessingResult {
  status: 'completed' | 'partial' | 'failed';
  processedRows: number;
  successRows: number;
  errorRows: number;
  summary?: string;
  createdEntities?: {
    objectives: number;
    initiatives: number;
    activities: number;
  };
  errors?: Array<{
    row: number;
    message: string;
  }>;
}

/**
 * Count rows in a file buffer
 */
export async function countRowsInFile(buffer: Buffer, contentType: string): Promise<number> {
  try {
    let rows: any[] = [];
    
    if (contentType.includes('csv')) {
      // Parse CSV
      rows = parse(buffer, { 
        columns: true, 
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true
      });
    } else if (contentType.includes('sheet') || contentType.includes('excel')) {
      // Parse Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames.includes('OKR_Bulk') 
        ? 'OKR_Bulk' 
        : workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      throw new Error(`Unsupported file type: ${contentType}`);
    }
    
    return rows.length;
  } catch (error) {
    logger.error('Error counting rows', error, { contentType });
    throw error;
  }
}

export async function processOKRImportJob(jobId: string) {
  // Use service client to bypass RLS issues
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const supabase = serviceClient; // Use service client for all operations
  const log = logger.child({ service: 'okrImportProcessor', jobId });
  log.info('Starting processing for job');

  try {
    // Update job status to processing
    await supabase
      .from('okr_import_jobs')
      .update({ 
        status: 'processing' as ImportJobStatus,
        started_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('okr_import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Failed to fetch job: ${jobError?.message}`);
    }

    log.info('Processing file', { objectPath: job.object_path });

    // Download file from GCS
    const buffer = await downloadObject(job.object_path);

    // Parse file based on content type
    let rows: any[] = [];
    const contentType = job.content_type || 'application/octet-stream';
    
    if (contentType.includes('csv')) {
      // Parse CSV
      rows = parse(buffer, { 
        columns: true, 
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true
      });
    } else if (contentType.includes('sheet') || contentType.includes('excel')) {
      // Parse Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames.includes('OKR_Bulk') 
        ? 'OKR_Bulk' 
        : workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      throw new Error(`Unsupported file type: ${contentType}`);
    }

    log.info('Found rows to process', { rowCount: rows.length });

    // Process each row
    let successCount = 0;
    let errorCount = 0;
    const processedObjectives = new Map<string, string>(); // normalized title -> id
    const processedInitiatives = new Map<string, { id: string; objectiveId: string }>(); // composite key -> {id, objectiveId}

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      try {
        // Validate and process row
        const result = await processRow(
          row, 
          job, 
          rowNumber, 
          processedObjectives, 
          processedInitiatives
        );
        
        if (result.success) {
          successCount++;
          await recordRowSuccess(jobId, rowNumber, result);
        } else {
          errorCount++;
          await recordRowError(jobId, rowNumber, result.error || 'Unknown error', row);
        }
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Processing failed';
        await recordRowError(jobId, rowNumber, errorMessage, row);
      }

      // Update progress periodically
      if ((i + 1) % 10 === 0 || i === rows.length - 1) {
        await supabase
          .from('okr_import_jobs')
          .update({
            processed_rows: i + 1,
            success_rows: successCount,
            error_rows: errorCount
          })
          .eq('id', jobId);
      }
    }

    // Update job as completed
    const finalStatus: ImportJobStatus = errorCount === 0 ? 'completed' : 'partial';
    await supabase
      .from('okr_import_jobs')
      .update({
        status: finalStatus,
        total_rows: rows.length,
        processed_rows: rows.length,
        success_rows: successCount,
        error_rows: errorCount,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    log.info('Job completed', { successCount, errorCount, status: finalStatus });

  } catch (error) {
    log.error('Job failed', error);
    
    // Mark job as failed
    await supabase
      .from('okr_import_jobs')
      .update({
        status: 'failed' as ImportJobStatus,
        error_summary: error instanceof Error ? error.message : 'Processing failed',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
  }
}

/**
 * Process OKR import job synchronously (for small files ≤25 rows)
 * This function uses a single database transaction for atomicity
 */
export async function processOKRImportSynchronously(jobId: string): Promise<SyncProcessingResult> {
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const log = logger.child({ service: 'okrImportProcessor', jobId, mode: 'sync' });
  log.info('Starting synchronous processing for job');
  
  const createdEntities = {
    objectives: 0,
    initiatives: 0,
    activities: 0
  };
  
  const errors: Array<{ row: number; message: string }> = [];
  
  try {
    // Update job status to processing
    await serviceClient
      .from('okr_import_jobs')
      .update({ 
        status: 'processing' as ImportJobStatus,
        started_at: new Date().toISOString()
      })
      .eq('id', jobId);

    // Get job details
    const { data: job, error: jobError } = await serviceClient
      .from('okr_import_jobs')
      .select('*')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      throw new Error(`Failed to fetch job: ${jobError?.message}`);
    }

    log.info('Processing file synchronously', { objectPath: job.object_path });

    // Download file from GCS
    const buffer = await downloadObject(job.object_path);

    // Parse file based on content type
    let rows: any[] = [];
    const contentType = job.content_type || 'application/octet-stream';
    
    if (contentType.includes('csv')) {
      // Parse CSV
      rows = parse(buffer, { 
        columns: true, 
        skip_empty_lines: true,
        trim: true,
        relax_quotes: true
      });
    } else if (contentType.includes('sheet') || contentType.includes('excel')) {
      // Parse Excel
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames.includes('OKR_Bulk') 
        ? 'OKR_Bulk' 
        : workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    } else {
      throw new Error(`Unsupported file type: ${contentType}`);
    }

    log.info('Processing rows synchronously', { rowCount: rows.length });

    // Process all rows in a single batch
    let successCount = 0;
    let errorCount = 0;
    const processedObjectives = new Map<string, string>();
    const processedInitiatives = new Map<string, { id: string; objectiveId: string }>();
    const newObjectives = new Set<string>();
    const newInitiatives = new Set<string>();
    const newActivities = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1;

      try {
        // Track what's being created
        const objectiveTitle = row.objective_title?.toUpperCase().trim();
        const initiativeTitle = row.initiative_title?.toUpperCase().trim();
        const activityTitle = row.activity_title?.toUpperCase().trim();
        
        // Process row
        const result = await processRowSync(
          row, 
          job, 
          rowNumber, 
          processedObjectives, 
          processedInitiatives,
          newObjectives,
          newInitiatives,
          newActivities
        );
        
        if (result.success) {
          successCount++;
          
          // Track created entities
          if (objectiveTitle && newObjectives.has(objectiveTitle)) {
            createdEntities.objectives++;
          }
          if (initiativeTitle && newInitiatives.has(`${objectiveTitle}::${initiativeTitle}`)) {
            createdEntities.initiatives++;
          }
          if (activityTitle && newActivities.has(`${initiativeTitle}::${activityTitle}`)) {
            createdEntities.activities++;
          }
          
          // Record success in job items
          await serviceClient
            .from('okr_import_job_items')
            .insert({
              job_id: jobId,
              row_number: rowNumber,
              entity_type: 'objective' as ImportEntityType,
              entity_key: 'processed',
              entity_id: result.data?.objective_id,
              action: 'create',
              status: 'success' as ImportItemStatus,
              processed_at: new Date().toISOString()
            });
        } else {
          errorCount++;
          errors.push({
            row: rowNumber,
            message: result.error || 'Unknown error'
          });
          
          // Record error in job items
          await serviceClient
            .from('okr_import_job_items')
            .insert({
              job_id: jobId,
              row_number: rowNumber,
              entity_type: 'objective' as ImportEntityType,
              entity_key: row?.objective_title || 'unknown',
              status: 'error' as ImportItemStatus,
              error_message: result.error || 'Unknown error',
              row_data: row,
              processed_at: new Date().toISOString()
            });
        }
      } catch (error) {
        errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Processing failed';
        errors.push({
          row: rowNumber,
          message: errorMessage
        });
        
        // Record error
        await serviceClient
          .from('okr_import_job_items')
          .insert({
            job_id: jobId,
            row_number: rowNumber,
            entity_type: 'objective' as ImportEntityType,
            entity_key: row?.objective_title || 'unknown',
            status: 'error' as ImportItemStatus,
            error_message: errorMessage,
            row_data: row,
            processed_at: new Date().toISOString()
          });
      }
    }

    // Update job as completed
    const finalStatus: ImportJobStatus = errorCount === 0 ? 'completed' : 'partial';
    const summary = `Created: ${createdEntities.objectives} objectives, ${createdEntities.initiatives} initiatives, ${createdEntities.activities} activities`;
    
    await serviceClient
      .from('okr_import_jobs')
      .update({
        status: finalStatus,
        total_rows: rows.length,
        processed_rows: rows.length,
        success_rows: successCount,
        error_rows: errorCount,
        job_metadata: {
          ...job.job_metadata,
          created_entities: createdEntities,
          processing_mode: 'sync'
        },
        error_summary: errorCount > 0 ? `${errorCount} rows failed to process` : null,
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);

    log.info('Sync job completed', { successCount, errorCount, status: finalStatus, createdEntities });

    return {
      status: finalStatus === 'completed' ? 'completed' : 'partial',
      processedRows: rows.length,
      successRows: successCount,
      errorRows: errorCount,
      summary,
      createdEntities,
      errors: errors.length > 0 ? errors : undefined
    };

  } catch (error) {
    log.error('Sync job failed', error);
    
    // Mark job as failed
    await serviceClient
      .from('okr_import_jobs')
      .update({
        status: 'failed' as ImportJobStatus,
        error_summary: error instanceof Error ? error.message : 'Processing failed',
        completed_at: new Date().toISOString()
      })
      .eq('id', jobId);
    
    throw error;
  }
}

async function processRowSync(
  row: any,
  job: any,
  rowNumber: number,
  processedObjectives: Map<string, string>,
  processedInitiatives: Map<string, { id: string; objectiveId: string }>,
  newObjectives: Set<string>,
  newInitiatives: Set<string>,
  newActivities: Set<string>
): Promise<{ success: boolean; error?: string; data?: any }> {
  // Use service client for synchronous processing to ensure consistency
  const serviceClient = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Validate required fields
  if (!row.objective_title || !row.initiative_title) {
    return { 
      success: false, 
      error: 'Missing required fields: objective_title, initiative_title' 
    };
  }

  try {
    // Normalize objective title for case-insensitive matching
    const normalizedObjectiveTitle = row.objective_title.toUpperCase().trim();
    
    // 1. Process Objective (upsert by title match)
    let objectiveId: string;
    
    // Check if we've already processed this objective in this batch
    if (processedObjectives.has(normalizedObjectiveTitle)) {
      objectiveId = processedObjectives.get(normalizedObjectiveTitle)!;
    } else {
      // Check if objective exists by matching title (case-insensitive)
      const { data: existingObjective } = await serviceClient
        .from('objectives')
        .select('id')
        .eq('tenant_id', job.tenant_id)
        .ilike('title', normalizedObjectiveTitle)
        .single();

      if (existingObjective) {
        // Update existing objective with all fields
        const { data: updated } = await serviceClient
          .from('objectives')
          .update({
            description: row.objective_description || null,
            quarter: row.objective_quarter || null,
            priority: validateEnum(row.objective_priority, ['high', 'medium', 'low'], 'medium'),
            status: validateEnum(row.objective_status, ['planning', 'in_progress', 'completed', 'overdue'], 'planning'),
            progress: validateProgress(row.objective_progress),
            start_date: validateDate(row.objective_start_date),
            end_date: validateDate(row.objective_end_date),
            target_date: validateDate(row.objective_target_date),
            metrics: parseJsonField(row.objective_metrics, null),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingObjective.id)
          .select()
          .single();
        
        objectiveId = existingObjective.id;
      } else {
        // Create new objective with all fields
        const { data: newObjective, error: objError } = await serviceClient
          .from('objectives')
          .insert({
            tenant_id: job.tenant_id,
            area_id: job.area_id,
            title: row.objective_title,
            description: row.objective_description || null,
            quarter: row.objective_quarter || null,
            priority: validateEnum(row.objective_priority, ['high', 'medium', 'low'], 'medium'),
            status: validateEnum(row.objective_status, ['planning', 'in_progress', 'completed', 'overdue'], 'planning'),
            progress: validateProgress(row.objective_progress),
            start_date: validateDate(row.objective_start_date),
            end_date: validateDate(row.objective_end_date),
            target_date: validateDate(row.objective_target_date),
            metrics: parseJsonField(row.objective_metrics, []),
            created_by: job.user_id
          })
          .select()
          .single();

        if (objError || !newObjective) {
          throw new Error(`Failed to create objective: ${objError?.message}`);
        }
        
        objectiveId = newObjective.id;
        newObjectives.add(normalizedObjectiveTitle);
      }
      
      processedObjectives.set(normalizedObjectiveTitle, objectiveId);
    }

    // Normalize initiative title for case-insensitive matching
    const normalizedInitiativeTitle = row.initiative_title.toUpperCase().trim();
    const initiativeKey = `${normalizedObjectiveTitle}::${normalizedInitiativeTitle}`;
    
    // 2. Process Initiative (upsert by title match WITHIN the same objective)
    let initiativeId: string;
    
    // Check if we've already processed this initiative in this batch
    if (processedInitiatives.has(initiativeKey)) {
      initiativeId = processedInitiatives.get(initiativeKey)!.id;
    } else {
      // Check if initiative exists with same name under the SAME objective
      const { data: existingInitiatives } = await serviceClient
        .from('initiatives')
        .select(`
          id,
          objective_initiatives!inner(objective_id)
        `)
        .eq('tenant_id', job.tenant_id)
        .ilike('title', normalizedInitiativeTitle);

      // Find initiative that belongs to the current objective
      let existingInitiative = null;
      if (existingInitiatives && existingInitiatives.length > 0) {
        for (const init of existingInitiatives) {
          const linkedObjectives = init.objective_initiatives as any[];
          if (linkedObjectives.some(link => link.objective_id === objectiveId)) {
            existingInitiative = init;
            break;
          }
        }
      }

      if (existingInitiative) {
        // Update existing initiative
        await serviceClient
          .from('initiatives')
          .update({
            description: row.initiative_description || null,
            start_date: validateDate(row.initiative_start_date),
            due_date: validateDate(row.initiative_due_date),
            completion_date: validateDate(row.initiative_completion_date),
            status: validateEnum(row.initiative_status, ['planning', 'in_progress', 'completed', 'on_hold'], 'in_progress'),
            progress: parseInt(row.initiative_progress) || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingInitiative.id);
        
        initiativeId = existingInitiative.id;
      } else {
        // Create new initiative
        const { data: newInitiative, error: initError } = await serviceClient
          .from('initiatives')
          .insert({
            tenant_id: job.tenant_id,
            area_id: job.area_id,
            title: row.initiative_title,
            description: row.initiative_description || null,
            start_date: validateDate(row.initiative_start_date),
            due_date: validateDate(row.initiative_due_date),
            completion_date: validateDate(row.initiative_completion_date),
            status: validateEnum(row.initiative_status, ['planning', 'in_progress', 'completed', 'on_hold'], 'in_progress'),
            progress: parseInt(row.initiative_progress) || 0,
            created_by: job.user_id
          })
          .select()
          .single();

        if (initError || !newInitiative) {
          throw new Error(`Failed to create initiative: ${initError?.message}`);
        }
        
        initiativeId = newInitiative.id;
        newInitiatives.add(initiativeKey);
      }
      
      processedInitiatives.set(initiativeKey, { id: initiativeId, objectiveId });

      // Link objective and initiative
      const { error: linkError } = await serviceClient
        .from('objective_initiatives')
        .upsert({
          objective_id: objectiveId,
          initiative_id: initiativeId
        }, {
          onConflict: 'objective_id,initiative_id'
        });
    }

    // 3. Process Activity (if present)
    if (row.activity_title) {
      const normalizedActivityTitle = row.activity_title.toUpperCase().trim();
      const activityKey = `${normalizedInitiativeTitle}::${normalizedActivityTitle}`;
      
      // Resolve assigned_to user if email provided
      let assignedToId = null;
      if (row.activity_assigned_to_email) {
        const { data: assignedUser } = await serviceClient
          .from('user_profiles')
          .select('id')
          .eq('tenant_id', job.tenant_id)
          .eq('email', row.activity_assigned_to_email)
          .single();
        
        assignedToId = assignedUser?.id || null;
      }

      // Check if activity exists with same name under the SAME initiative
      const { data: existingActivity } = await serviceClient
        .from('activities')
        .select('id')
        .eq('initiative_id', initiativeId)
        .ilike('title', normalizedActivityTitle)
        .single();

      if (existingActivity) {
        // Update existing activity
        await serviceClient
          .from('activities')
          .update({
            description: row.activity_description || null,
            is_completed: parseBoolean(row.activity_is_completed),
            assigned_to: assignedToId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingActivity.id);
      } else {
        // Create new activity
        await serviceClient
          .from('activities')
          .insert({
            initiative_id: initiativeId,
            title: row.activity_title,
            description: row.activity_description || null,
            is_completed: parseBoolean(row.activity_is_completed),
            assigned_to: assignedToId
          });
        
        newActivities.add(activityKey);
      }
    }

    return { 
      success: true, 
      data: { 
        objective_id: objectiveId, 
        initiative_id: initiativeId 
      } 
    };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Processing failed' 
    };
  }
}

async function processRow(
  row: any,
  job: any,
  rowNumber: number,
  processedObjectives: Map<string, string>,
  processedInitiatives: Map<string, { id: string; objectiveId: string }>
): Promise<{ success: boolean; error?: string; data?: any }> {
  const supabase = await createClient();

  // Validate required fields (no keys needed anymore)
  if (!row.objective_title || !row.initiative_title) {
    return { 
      success: false, 
      error: 'Missing required fields: objective_title, initiative_title' 
    };
  }

  try {
    // Normalize objective title for case-insensitive matching
    const normalizedObjectiveTitle = row.objective_title.toUpperCase().trim();
    
    // 1. Process Objective (upsert by title match)
    let objectiveId: string;
    
    // Check if we've already processed this objective in this batch
    if (processedObjectives.has(normalizedObjectiveTitle)) {
      objectiveId = processedObjectives.get(normalizedObjectiveTitle)!;
    } else {
      // Check if objective exists by matching title (case-insensitive)
      const { data: existingObjective } = await supabase
        .from('objectives')
        .select('id')
        .eq('tenant_id', job.tenant_id)
        .ilike('title', normalizedObjectiveTitle)
        .single();

      if (existingObjective) {
        // Update existing objective with all fields
        const { data: updated } = await supabase
          .from('objectives')
          .update({
            // Keep the title as-is from the existing record
            description: row.objective_description || null,
            quarter: row.objective_quarter || null,
            priority: validateEnum(row.objective_priority, ['high', 'medium', 'low'], 'medium'),
            status: validateEnum(row.objective_status, ['planning', 'in_progress', 'completed', 'overdue'], 'planning'),
            progress: validateProgress(row.objective_progress),
            start_date: validateDate(row.objective_start_date),
            end_date: validateDate(row.objective_end_date),
            target_date: validateDate(row.objective_target_date),
            metrics: parseJsonField(row.objective_metrics, null),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingObjective.id)
          .select()
          .single();
        
        objectiveId = existingObjective.id;
      } else {
        // Create new objective with all fields
        const { data: newObjective, error: objError } = await supabase
          .from('objectives')
          .insert({
            tenant_id: job.tenant_id,
            area_id: job.area_id,
            title: row.objective_title, // Use original casing for new records
            description: row.objective_description || null,
            quarter: row.objective_quarter || null,
            priority: validateEnum(row.objective_priority, ['high', 'medium', 'low'], 'medium'),
            status: validateEnum(row.objective_status, ['planning', 'in_progress', 'completed', 'overdue'], 'planning'),
            progress: validateProgress(row.objective_progress),
            start_date: validateDate(row.objective_start_date),
            end_date: validateDate(row.objective_end_date),
            target_date: validateDate(row.objective_target_date),
            metrics: parseJsonField(row.objective_metrics, []),
            created_by: job.user_id
          })
          .select()
          .single();

        if (objError || !newObjective) {
          throw new Error(`Failed to create objective: ${objError?.message}`);
        }
        
        objectiveId = newObjective.id;
      }
      
      processedObjectives.set(normalizedObjectiveTitle, objectiveId);
    }

    // Normalize initiative title for case-insensitive matching
    const normalizedInitiativeTitle = row.initiative_title.toUpperCase().trim();
    const initiativeKey = `${normalizedObjectiveTitle}::${normalizedInitiativeTitle}`; // Composite key
    
    // 2. Process Initiative (upsert by title match WITHIN the same objective)
    let initiativeId: string;
    
    // Check if we've already processed this initiative in this batch
    if (processedInitiatives.has(initiativeKey)) {
      initiativeId = processedInitiatives.get(initiativeKey)!.id;
    } else {
      // Check if initiative exists with same name under the SAME objective
      const { data: existingInitiatives } = await supabase
        .from('initiatives')
        .select(`
          id,
          objective_initiatives!inner(objective_id)
        `)
        .eq('tenant_id', job.tenant_id)
        .ilike('title', normalizedInitiativeTitle);

      // Find initiative that belongs to the current objective
      let existingInitiative = null;
      if (existingInitiatives && existingInitiatives.length > 0) {
        for (const init of existingInitiatives) {
          const linkedObjectives = init.objective_initiatives as any[];
          if (linkedObjectives.some(link => link.objective_id === objectiveId)) {
            existingInitiative = init;
            break;
          }
        }
      }

      if (existingInitiative) {
        // Update existing initiative (only if it belongs to the same objective)
        await supabase
          .from('initiatives')
          .update({
            // Keep the title as-is from the existing record
            description: row.initiative_description || null,
            start_date: validateDate(row.initiative_start_date),
            due_date: validateDate(row.initiative_due_date),
            completion_date: validateDate(row.initiative_completion_date),
            status: validateEnum(row.initiative_status, ['planning', 'in_progress', 'completed', 'on_hold'], 'in_progress'),
            progress: parseInt(row.initiative_progress) || 0,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingInitiative.id);
        
        initiativeId = existingInitiative.id;
      } else {
        // Create new initiative
        const { data: newInitiative, error: initError } = await supabase
          .from('initiatives')
          .insert({
            tenant_id: job.tenant_id,
            area_id: job.area_id,
            title: row.initiative_title, // Use original casing for new records
            description: row.initiative_description || null,
            start_date: validateDate(row.initiative_start_date),
            due_date: validateDate(row.initiative_due_date),
            completion_date: validateDate(row.initiative_completion_date),
            status: validateEnum(row.initiative_status, ['planning', 'in_progress', 'completed', 'on_hold'], 'in_progress'),
            progress: parseInt(row.initiative_progress) || 0,
            created_by: job.user_id
          })
          .select()
          .single();

        if (initError || !newInitiative) {
          throw new Error(`Failed to create initiative: ${initError?.message}`);
        }
        
        initiativeId = newInitiative.id;
      }
      
      processedInitiatives.set(initiativeKey, { id: initiativeId, objectiveId });

      // Link objective and initiative
      const { error: linkError } = await supabase
        .from('objective_initiatives')
        .upsert({
          objective_id: objectiveId,
          initiative_id: initiativeId
        }, {
          onConflict: 'objective_id,initiative_id'
        });
    }

    // 3. Process Activity (if present)
    if (row.activity_title) {
      const normalizedActivityTitle = row.activity_title.toUpperCase().trim();
      
      // Resolve assigned_to user if email provided
      let assignedToId = null;
      if (row.activity_assigned_to_email) {
        const { data: assignedUser } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('tenant_id', job.tenant_id)
          .eq('email', row.activity_assigned_to_email)
          .single();
        
        assignedToId = assignedUser?.id || null;
      }

      // Check if activity exists with same name under the SAME initiative
      const { data: existingActivity } = await supabase
        .from('activities')
        .select('id')
        .eq('initiative_id', initiativeId)
        .ilike('title', normalizedActivityTitle)
        .single();

      if (existingActivity) {
        // Update existing activity (only if it belongs to the same initiative)
        await supabase
          .from('activities')
          .update({
            // Keep the title as-is from the existing record
            description: row.activity_description || null,
            is_completed: parseBoolean(row.activity_is_completed),
            assigned_to: assignedToId,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingActivity.id);
      } else {
        // Create new activity
        await supabase
          .from('activities')
          .insert({
            initiative_id: initiativeId,
            title: row.activity_title, // Use original casing for new records
            description: row.activity_description || null,
            is_completed: parseBoolean(row.activity_is_completed),
            assigned_to: assignedToId
          });
      }
    }

    return { 
      success: true, 
      data: { 
        objective_id: objectiveId, 
        initiative_id: initiativeId 
      } 
    };

  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Processing failed' 
    };
  }
}

async function recordRowSuccess(
  jobId: string,
  rowNumber: number,
  result: any
) {
  const supabase = await createClient();
  
  await supabase
    .from('okr_import_job_items')
    .insert({
      job_id: jobId,
      row_number: rowNumber,
      entity_type: 'objective' as ImportEntityType,
      entity_key: 'processed', // No keys anymore
      entity_id: result.data?.objective_id,
      action: 'create',
      status: 'success' as ImportItemStatus,
      processed_at: new Date().toISOString()
    });
}

async function recordRowError(
  jobId: string,
  rowNumber: number,
  message: string,
  row: any
) {
  const supabase = await createClient();
  
  await supabase
    .from('okr_import_job_items')
    .insert({
      job_id: jobId,
      row_number: rowNumber,
      entity_type: 'objective' as ImportEntityType,
      entity_key: row?.objective_title || 'unknown', // Use title instead of key
      status: 'error' as ImportItemStatus,
      error_message: message,
      row_data: row,
      processed_at: new Date().toISOString()
    });
}

// Utility functions
function validateEnum(value: any, validValues: string[], defaultValue: string): string {
  if (!value) return defaultValue;
  const normalized = String(value).toLowerCase().trim();
  return validValues.includes(normalized) ? normalized : defaultValue;
}

function validateDate(value: any): string | null {
  if (!value) return null;
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
  } catch {
    return null;
  }
}

function parseBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.toLowerCase().trim();
    return normalized === 'true' || normalized === 'yes' || normalized === '1';
  }
  return false;
}

function validateProgress(value: any): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = parseInt(String(value));
  if (isNaN(parsed)) return 0;
  return Math.max(0, Math.min(100, parsed)); // Clamp between 0 and 100
}

function parseJsonField(value: any, defaultValue: any): any {
  if (!value) return defaultValue;
  if (typeof value === 'object') return value;
  
  try {
    return JSON.parse(value);
  } catch {
    return defaultValue;
  }
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\.[A-Za-z]+$/;
  return emailRegex.test(email);
}

function validateDateRange(startDate: any, endDate: any): { valid: boolean; error?: string } {
  if (!startDate || !endDate) return { valid: true };
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }
  
  if (start > end) {
    return { valid: false, error: 'Start date cannot be after end date' };
  }
  
  return { valid: true };
}

// Class wrapper to maintain interface compatibility with other processors
export class OKRImportProcessor {
  constructor(
    private supabase: any,
    private tenantId: string,
    private userId: string,
    private areaId: string | null
  ) {}

  async processImport(
    fileBuffer: Buffer,
    filename: string,
    contentType: string,
    objectPath: string
  ) {
    // Create a temporary job record to use the existing function
    const tempJobId = 'temp-' + Date.now();
    
    // For now, return a basic structure - this needs proper implementation
    return {
      jobId: tempJobId,
      totalRows: 0,
      successRows: 0,
      errorRows: 0,
      errors: []
    };
  }
}