import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { calculateFileChecksum, calculateCSVChecksum } from '@/lib/utils/checksum';

export interface AreaImportData {
  name: string;
  description?: string;
  manager_email?: string;
  is_active?: boolean;
}

export interface AreaImportResult {
  jobId: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  errors: Array<{
    row: number;
    name: string;
    error: string;
  }>;
  processedAreas: Array<{
    action: 'create' | 'update' | 'skip';
    areaId: string;
    name: string;
  }>;
}

interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
}

export class AreaImportProcessor {
  private supabase: any;
  private tenantId: string;
  private userId: string;
  private jobId?: string;

  constructor(supabase: any, tenantId: string, userId: string) {
    this.supabase = supabase;
    this.tenantId = tenantId;
    this.userId = userId;
  }

  /**
   * Process area import from file buffer
   */
  async processImport(
    fileBuffer: Buffer,
    filename: string,
    contentType: string,
    objectPath: string
  ): Promise<AreaImportResult> {
    try {
      // Create import job
      this.jobId = await this.createImportJob(filename, objectPath, fileBuffer.length, contentType);

      // Parse file based on type
      const areas = await this.parseFile(fileBuffer, contentType);

      // Validate all areas
      const validationErrors = await this.validateAreas(areas);
      if (validationErrors.length > 0) {
        await this.updateJobStatus('failed', {
          error_summary: `Validation failed: ${validationErrors.length} errors found`,
          validation_errors: validationErrors
        });
        throw new Error(`Validation failed with ${validationErrors.length} errors`);
      }

      // Ensure managers exist before processing areas
      await this.ensureManagersExist(areas);

      // Process areas in batches
      const result = await this.processBatch(areas);

      // Update job status
      await this.updateJobStatus('completed', {
        success_rows: result.successRows,
        error_rows: result.errorRows,
        processed_rows: result.totalRows
      });

      return result;
    } catch (error) {
      if (this.jobId) {
        await this.updateJobStatus('failed', {
          error_summary: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      throw error;
    }
  }

  /**
   * Parse CSV or Excel file
   */
  private async parseFile(fileBuffer: Buffer, contentType: string): Promise<AreaImportData[]> {
    const areas: AreaImportData[] = [];

    if (contentType.includes('csv')) {
      // Parse CSV
      const records = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: (value, context) => {
          // Handle boolean fields
          if (context.column === 'is_active') {
            if (value === '') return true; // Default to active
            return value.toLowerCase() === 'true' || value === '1';
          }
          return value;
        }
      });

      for (const record of records) {
        areas.push(this.mapRecordToArea(record));
      }
    } else if (contentType.includes('spreadsheet') || contentType.includes('excel')) {
      // Parse Excel
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const records = XLSX.utils.sheet_to_json(worksheet);

      for (const record of records) {
        areas.push(this.mapRecordToArea(record));
      }
    } else {
      throw new Error(`Unsupported file type: ${contentType}`);
    }

    return areas;
  }

  /**
   * Map raw record to AreaImportData
   */
  private mapRecordToArea(record: any): AreaImportData {
    return {
      name: record.name || record.Name || record.NAME || record.area_name || record['Area Name'],
      description: record.description || record.Description || record.DESCRIPTION,
      manager_email: record.manager_email || record['Manager Email'] || record.manager || record.Manager,
      is_active: record.is_active !== undefined ? record.is_active : true
    };
  }

  /**
   * Validate areas before processing
   */
  private async validateAreas(areas: AreaImportData[]): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const seenNames = new Set<string>();

    for (let i = 0; i < areas.length; i++) {
      const area = areas[i];
      const rowNum = i + 2; // Account for header row

      // Required fields
      if (!area.name) {
        errors.push({
          row: rowNum,
          field: 'name',
          value: area.name,
          message: 'Area name is required'
        });
      } else if (seenNames.has(area.name.toLowerCase())) {
        errors.push({
          row: rowNum,
          field: 'name',
          value: area.name,
          message: 'Duplicate area name in file'
        });
      }
      seenNames.add(area.name.toLowerCase());

      // Validate manager email if provided
      if (area.manager_email && !emailRegex.test(area.manager_email)) {
        errors.push({
          row: rowNum,
          field: 'manager_email',
          value: area.manager_email,
          message: 'Invalid email format for manager'
        });
      }

      // Validate description length
      if (area.description && area.description.length > 1000) {
        errors.push({
          row: rowNum,
          field: 'description',
          value: area.description,
          message: 'Description too long (max 1000 characters)'
        });
      }
    }

    return errors;
  }

  /**
   * Ensure all referenced managers exist (create placeholders if needed)
   */
  private async ensureManagersExist(areas: AreaImportData[]): Promise<void> {
    const managerEmails = [...new Set(
      areas
        .filter(a => a.manager_email)
        .map(a => a.manager_email!.toLowerCase())
    )];

    if (managerEmails.length === 0) return;

    // Check which managers already exist
    const { data: existingUsers } = await this.supabase
      .from('user_profiles')
      .select('email')
      .eq('tenant_id', this.tenantId)
      .in('email', managerEmails);

    const existingEmails = new Set(
      (existingUsers || []).map((u: any) => u.email.toLowerCase())
    );

    // Create placeholder profiles for missing managers
    const missingManagers = managerEmails.filter(email => !existingEmails.has(email));
    
    if (missingManagers.length > 0) {
      const placeholders = missingManagers.map(email => ({
        tenant_id: this.tenantId,
        email: email,
        full_name: email.split('@')[0], // Use email prefix as temporary name
        role: 'Manager',
        is_active: true
      }));

      const { error } = await this.supabase
        .from('user_profiles')
        .insert(placeholders);

      if (error) {
        logger.error('Error creating placeholder managers', error, { 
          jobId: this.jobId,
          placeholderCount: placeholders.length 
        });
        // Continue anyway - areas can be created without managers
      } else {
        logger.info('Created placeholder manager profiles', { 
          jobId: this.jobId,
          count: placeholders.length 
        });
      }
    }
  }

  /**
   * Process areas in batches using bulk_upsert_areas function
   */
  private async processBatch(areas: AreaImportData[]): Promise<AreaImportResult> {
    const BATCH_SIZE = 100;
    const result: AreaImportResult = {
      jobId: this.jobId!,
      totalRows: areas.length,
      successRows: 0,
      errorRows: 0,
      errors: [],
      processedAreas: []
    };

    // Process in batches
    for (let i = 0; i < areas.length; i += BATCH_SIZE) {
      const batch = areas.slice(i, Math.min(i + BATCH_SIZE, areas.length));
      
      try {
        // Prepare batch data for bulk function
        const batchData = batch.map(area => ({
          name: area.name,
          description: area.description,
          manager_email: area.manager_email,
          is_active: area.is_active
        }));

        // Call bulk_upsert_areas function
        const { data: batchResult, error } = await this.supabase
          .rpc('bulk_upsert_areas', {
            p_tenant_id: this.tenantId,
            p_areas: batchData
          });

        if (error) {
          logger.error('Batch processing error', error, { batchIndex: i, jobId: this.jobId });
          // Record errors for all areas in batch
          batch.forEach((area, idx) => {
            result.errors.push({
              row: i + idx + 2,
              name: area.name,
              error: error.message
            });
            result.errorRows++;
          });
        } else if (batchResult) {
          // Process batch results
          for (const row of batchResult) {
            if (row.error) {
              result.errors.push({
                row: i + batch.findIndex(a => a.name === row.area_name) + 2,
                name: row.area_name,
                error: row.error
              });
              result.errorRows++;
            } else {
              result.processedAreas.push({
                action: row.action as 'create' | 'update',
                areaId: row.area_id,
                name: row.area_name
              });
              result.successRows++;

              // Record in job items table
              await this.recordJobItem(
                i + batch.findIndex(a => a.name === row.area_name) + 2,
                batch.find(a => a.name === row.area_name)!,
                row.action,
                row.area_id,
                null
              );
            }
          }
        }

        // Update job progress
        if (this.jobId) {
          await this.updateJobProgress(Math.min(i + BATCH_SIZE, areas.length));
        }
      } catch (error) {
        logger.error('Batch processing exception', error, { jobId: this.jobId });
        // Record errors for remaining areas in batch
        batch.forEach((area, idx) => {
          result.errors.push({
            row: i + idx + 2,
            name: area.name,
            error: error instanceof Error ? error.message : 'Processing error'
          });
          result.errorRows++;
        });
      }
    }

    return result;
  }

  /**
   * Create import job record
   */
  private async createImportJob(
    filename: string,
    objectPath: string,
    fileSize: number,
    contentType: string,
    fileBuffer?: Buffer
  ): Promise<string> {
    // Calculate checksum if buffer is provided
    const fileChecksum = fileBuffer ? calculateFileChecksum(fileBuffer) : '';
    
    const { data, error } = await this.supabase
      .from('area_import_jobs')
      .insert({
        tenant_id: this.tenantId,
        imported_by: this.userId,
        original_filename: filename,
        object_path: objectPath,
        file_checksum: fileChecksum,
        file_size_bytes: fileSize,
        content_type: contentType,
        status: 'processing',
        started_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id;
  }

  /**
   * Record individual job item
   */
  private async recordJobItem(
    rowNumber: number,
    area: AreaImportData,
    action: string,
    areaId: string | null,
    errorMessage: string | null
  ): Promise<void> {
    await this.supabase
      .from('area_import_job_items')
      .insert({
        job_id: this.jobId,
        row_number: rowNumber,
        area_name: area.name,
        description: area.description,
        manager_email: area.manager_email,
        is_active: area.is_active,
        action: action,
        status: errorMessage ? 'error' : 'success',
        area_id: areaId,
        error_message: errorMessage,
        row_data: area,
        processed_at: new Date().toISOString()
      });
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(processedRows: number): Promise<void> {
    if (!this.jobId) return;

    await this.supabase
      .from('area_import_jobs')
      .update({
        processed_rows: processedRows,
        updated_at: new Date().toISOString()
      })
      .eq('id', this.jobId);
  }

  /**
   * Update job status
   */
  private async updateJobStatus(status: string, metadata: any = {}): Promise<void> {
    if (!this.jobId) return;

    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
      ...metadata
    };

    if (status === 'completed' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    await this.supabase
      .from('area_import_jobs')
      .update(updateData)
      .eq('id', this.jobId);
  }

  /**
   * Get import preview (first 10 rows)
   */
  static async getPreview(
    fileBuffer: Buffer,
    contentType: string
  ): Promise<{
    headers: string[];
    rows: any[];
    totalRows: number;
  }> {
    const processor = new AreaImportProcessor(null as any, '', '');
    const areas = await processor.parseFile(fileBuffer, contentType);
    
    const headers = ['name', 'description', 'manager_email', 'is_active'];
    const rows = areas.slice(0, 10).map(area => ([
      area.name,
      area.description || '',
      area.manager_email || '',
      area.is_active ? 'true' : 'false'
    ]));

    return {
      headers,
      rows,
      totalRows: areas.length
    };
  }
}