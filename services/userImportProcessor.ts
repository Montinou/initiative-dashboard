import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { createClient } from '@/utils/supabase/server';
import { logger } from '@/lib/logger';
import { calculateFileChecksum, calculateCSVChecksum } from '@/lib/utils/checksum';

export interface UserImportData {
  email: string;
  full_name: string;
  role: 'CEO' | 'Admin' | 'Manager';
  area_name?: string;
  phone?: string;
  is_active?: boolean;
}

export interface UserImportResult {
  jobId: string;
  totalRows: number;
  successRows: number;
  errorRows: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
  processedUsers: Array<{
    action: 'create' | 'update' | 'skip';
    userId: string;
    email: string;
  }>;
}

interface ValidationError {
  row: number;
  field: string;
  value: any;
  message: string;
}

export class UserImportProcessor {
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
   * Process user import from file buffer
   */
  async processImport(
    fileBuffer: Buffer,
    filename: string,
    contentType: string,
    objectPath: string
  ): Promise<UserImportResult> {
    try {
      // Create import job
      this.jobId = await this.createImportJob(filename, objectPath, fileBuffer.length, contentType);

      // Parse file based on type
      const users = await this.parseFile(fileBuffer, contentType);

      // Validate all users
      const validationErrors = await this.validateUsers(users);
      if (validationErrors.length > 0) {
        await this.updateJobStatus('failed', {
          error_summary: `Validation failed: ${validationErrors.length} errors found`,
          validation_errors: validationErrors
        });
        throw new Error(`Validation failed with ${validationErrors.length} errors`);
      }

      // Process users in batches
      const result = await this.processBatch(users);

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
  private async parseFile(fileBuffer: Buffer, contentType: string): Promise<UserImportData[]> {
    const users: UserImportData[] = [];

    if (contentType.includes('csv')) {
      // Parse CSV
      const records = parse(fileBuffer, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        cast: (value, context) => {
          // Handle boolean fields
          if (context.column === 'is_active') {
            return value.toLowerCase() === 'true' || value === '1';
          }
          return value;
        }
      });

      for (const record of records) {
        users.push(this.mapRecordToUser(record));
      }
    } else if (contentType.includes('spreadsheet') || contentType.includes('excel')) {
      // Parse Excel
      const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const records = XLSX.utils.sheet_to_json(worksheet);

      for (const record of records) {
        users.push(this.mapRecordToUser(record));
      }
    } else {
      throw new Error(`Unsupported file type: ${contentType}`);
    }

    return users;
  }

  /**
   * Map raw record to UserImportData
   */
  private mapRecordToUser(record: any): UserImportData {
    return {
      email: record.email || record.Email || record.EMAIL,
      full_name: record.full_name || record['Full Name'] || record.name || record.Name,
      role: this.normalizeRole(record.role || record.Role || record.ROLE || 'Manager'),
      area_name: record.area_name || record['Area Name'] || record.area || record.Area,
      phone: record.phone || record.Phone || record.PHONE,
      is_active: record.is_active !== undefined ? record.is_active : true
    };
  }

  /**
   * Normalize role value
   */
  private normalizeRole(role: string): 'CEO' | 'Admin' | 'Manager' {
    const normalized = role.trim().toLowerCase();
    if (normalized === 'ceo') return 'CEO';
    if (normalized === 'admin' || normalized === 'administrator') return 'Admin';
    return 'Manager';
  }

  /**
   * Validate users before processing
   */
  private async validateUsers(users: UserImportData[]): Promise<ValidationError[]> {
    const errors: ValidationError[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const seenEmails = new Set<string>();

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const rowNum = i + 2; // Account for header row

      // Required fields
      if (!user.email) {
        errors.push({
          row: rowNum,
          field: 'email',
          value: user.email,
          message: 'Email is required'
        });
      } else if (!emailRegex.test(user.email)) {
        errors.push({
          row: rowNum,
          field: 'email',
          value: user.email,
          message: 'Invalid email format'
        });
      } else if (seenEmails.has(user.email.toLowerCase())) {
        errors.push({
          row: rowNum,
          field: 'email',
          value: user.email,
          message: 'Duplicate email in file'
        });
      }
      seenEmails.add(user.email.toLowerCase());

      if (!user.full_name) {
        errors.push({
          row: rowNum,
          field: 'full_name',
          value: user.full_name,
          message: 'Full name is required'
        });
      }

      if (!['CEO', 'Admin', 'Manager'].includes(user.role)) {
        errors.push({
          row: rowNum,
          field: 'role',
          value: user.role,
          message: 'Invalid role. Must be CEO, Admin, or Manager'
        });
      }

      // Validate area exists if specified
      if (user.area_name) {
        const { data: area } = await this.supabase
          .from('areas')
          .select('id')
          .eq('tenant_id', this.tenantId)
          .ilike('name', user.area_name)
          .single();

        if (!area && user.role === 'Manager') {
          errors.push({
            row: rowNum,
            field: 'area_name',
            value: user.area_name,
            message: 'Area not found. Managers must be assigned to an existing area'
          });
        }
      } else if (user.role === 'Manager') {
        // Managers should have an area, but it's not strictly required
        logger.warn(`Row ${rowNum}: Manager without area assignment`);
      }
    }

    return errors;
  }

  /**
   * Process users in batches using bulk_upsert_users function
   */
  private async processBatch(users: UserImportData[]): Promise<UserImportResult> {
    const BATCH_SIZE = 100;
    const result: UserImportResult = {
      jobId: this.jobId!,
      totalRows: users.length,
      successRows: 0,
      errorRows: 0,
      errors: [],
      processedUsers: []
    };

    // Process in batches
    for (let i = 0; i < users.length; i += BATCH_SIZE) {
      const batch = users.slice(i, Math.min(i + BATCH_SIZE, users.length));
      
      try {
        // Prepare batch data for bulk function
        const batchData = batch.map(user => ({
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          area_name: user.area_name,
          phone: user.phone,
          is_active: user.is_active
        }));

        // Call bulk_upsert_users function
        const { data: batchResult, error } = await this.supabase
          .rpc('bulk_upsert_users', {
            p_tenant_id: this.tenantId,
            p_users: batchData
          });

        if (error) {
          logger.error('Batch processing error', error, { batchIndex: i, jobId: this.jobId });
          // Record errors for all users in batch
          batch.forEach((user, idx) => {
            result.errors.push({
              row: i + idx + 2,
              email: user.email,
              error: error.message
            });
            result.errorRows++;
          });
        } else if (batchResult) {
          // Process batch results
          for (const row of batchResult) {
            if (row.error) {
              result.errors.push({
                row: i + batch.findIndex(u => u.email === row.email) + 2,
                email: row.email,
                error: row.error
              });
              result.errorRows++;
            } else {
              result.processedUsers.push({
                action: row.action as 'create' | 'update',
                userId: row.user_id,
                email: row.email
              });
              result.successRows++;

              // Record in job items table
              await this.recordJobItem(
                i + batch.findIndex(u => u.email === row.email) + 2,
                batch.find(u => u.email === row.email)!,
                row.action,
                row.user_id,
                null
              );
            }
          }
        }

        // Update job progress
        if (this.jobId) {
          await this.updateJobProgress(Math.min(i + BATCH_SIZE, users.length));
        }
      } catch (error) {
        logger.error('Batch processing exception', error, { jobId: this.jobId });
        // Record errors for remaining users in batch
        batch.forEach((user, idx) => {
          result.errors.push({
            row: i + idx + 2,
            email: user.email,
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
      .from('user_import_jobs')
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
    user: UserImportData,
    action: string,
    userProfileId: string | null,
    errorMessage: string | null
  ): Promise<void> {
    await this.supabase
      .from('user_import_job_items')
      .insert({
        job_id: this.jobId,
        row_number: rowNumber,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        area_name: user.area_name,
        phone: user.phone,
        action: action,
        status: errorMessage ? 'error' : 'success',
        user_profile_id: userProfileId,
        error_message: errorMessage,
        row_data: user,
        processed_at: new Date().toISOString()
      });
  }

  /**
   * Update job progress
   */
  private async updateJobProgress(processedRows: number): Promise<void> {
    if (!this.jobId) return;

    await this.supabase
      .from('user_import_jobs')
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
      .from('user_import_jobs')
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
    const processor = new UserImportProcessor(null as any, '', '');
    const users = await processor.parseFile(fileBuffer, contentType);
    
    const headers = ['email', 'full_name', 'role', 'area_name', 'phone', 'is_active'];
    const rows = users.slice(0, 10).map(user => ([
      user.email,
      user.full_name,
      user.role,
      user.area_name || '',
      user.phone || '',
      user.is_active ? 'true' : 'false'
    ]));

    return {
      headers,
      rows,
      totalRows: users.length
    };
  }
}