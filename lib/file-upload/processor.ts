/**
 * File Upload Processing System
 * Handles file processing, job management, and database operations
 */

import { createClient } from '@/utils/supabase/server';
import { 
  FileSecurityCheck, 
  UserPermissionContext, 
  calculateFileHash,
  checkFileDuplication,
  generateSecureFileName,
  sanitizeFileName
} from './security';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface FileUploadResult {
  success: boolean;
  fileId?: string;
  fileName?: string;
  fileSize?: number;
  fileHash?: string;
  processingJobId?: string;
  errors: string[];
  warnings: string[];
  metadata: Record<string, any>;
}

export interface ProcessingJobConfig {
  jobType: 'virus_scan' | 'data_extraction' | 'validation' | 'ai_analysis' | 'format_conversion' | 'thumbnail_generation' | 'backup';
  priority: number; // 1-10, 1 is highest
  params: Record<string, any>;
  maxRetries?: number;
  expiresIn?: number; // seconds
}

export interface FileUploadOptions {
  areaId?: string;
  initiativeId?: string;
  fileCategory?: string;
  accessLevel?: 'private' | 'area' | 'tenant' | 'public';
  retentionPolicy?: 'temporary' | 'standard' | 'archive' | 'permanent';
  expiresIn?: number; // seconds from now
  autoProcess?: boolean;
  processingJobs?: ProcessingJobConfig[];
  metadata?: Record<string, any>;
}

export interface FileStorageConfig {
  bucketName: string;
  pathPrefix: string;
  useTimestampFolder: boolean;
  preserveOriginalName: boolean;
}

// ============================================================================
// MAIN FILE UPLOAD PROCESSOR
// ============================================================================

export class FileUploadProcessor {
  private supabase: any;
  private storageConfig: FileStorageConfig;

  constructor(storageConfig?: Partial<FileStorageConfig>) {
    this.supabase = createClient();
    this.storageConfig = {
      bucketName: 'file-uploads',
      pathPrefix: 'uploads',
      useTimestampFolder: true,
      preserveOriginalName: false,
      ...storageConfig
    };
  }

  /**
   * Process a file upload with comprehensive security and validation
   */
  async processFileUpload(
    file: File,
    userContext: UserPermissionContext,
    securityCheck: FileSecurityCheck,
    options: FileUploadOptions = {}
  ): Promise<FileUploadResult> {
    const result: FileUploadResult = {
      success: false,
      errors: [],
      warnings: [],
      metadata: {}
    };

    try {
      // 1. Validate security check passed
      if (!securityCheck.isValid) {
        result.errors.push(...securityCheck.errors);
        result.warnings.push(...securityCheck.warnings);
        return result;
      }

      // 2. Calculate file hash for deduplication
      const fileHash = await calculateFileHash(file);
      result.fileHash = fileHash;

      // 3. Check for duplicates
      const duplicationCheck = await checkFileDuplication(
        fileHash, 
        userContext.tenantId, 
        options.areaId
      );

      if (duplicationCheck.isDuplicate && options.metadata?.allowDuplicates !== true) {
        result.warnings.push(`File already exists (uploaded ${duplicationCheck.existingFile?.created_at})`);
        result.metadata.existingFileId = duplicationCheck.existingFile?.id;
        // Continue with upload if user explicitly allows duplicates
      }

      // 4. Generate secure file paths
      const secureFileName = generateSecureFileName(file.name, userContext.userId);
      const sanitizedOriginalName = sanitizeFileName(file.name);
      
      const filePath = this.generateFilePath(secureFileName, userContext.tenantId, options.areaId);
      
      // 5. Upload file to storage
      const storageResult = await this.uploadToStorage(file, filePath);
      if (!storageResult.success) {
        result.errors.push(`Storage upload failed: ${storageResult.error}`);
        return result;
      }

      // 6. Create database record
      const fileRecord = await this.createFileRecord(
        file,
        userContext,
        secureFileName,
        sanitizedOriginalName,
        filePath,
        fileHash,
        options
      );

      if (!fileRecord.success) {
        // Cleanup uploaded file if database insert fails
        await this.cleanupStorageFile(filePath);
        result.errors.push(`Database record creation failed: ${fileRecord.error}`);
        return result;
      }

      result.success = true;
      result.fileId = fileRecord.fileId;
      result.fileName = sanitizedOriginalName;
      result.fileSize = file.size;
      result.metadata = {
        ...result.metadata,
        storagePath: filePath,
        secureFileName,
        category: this.determineFileCategory(file.type),
        uploadedAt: new Date().toISOString()
      };

      // 7. Create processing jobs if requested
      if (options.autoProcess !== false) {
        const defaultJobs = this.getDefaultProcessingJobs(file.type);
        const allJobs = [...defaultJobs, ...(options.processingJobs || [])];
        
        for (const jobConfig of allJobs) {
          const jobResult = await this.createProcessingJob(
            fileRecord.fileId!,
            userContext.tenantId,
            jobConfig
          );
          
          if (jobResult.success) {
            result.metadata.processingJobs = result.metadata.processingJobs || [];
            result.metadata.processingJobs.push({
              jobId: jobResult.jobId,
              jobType: jobConfig.jobType,
              status: 'queued'
            });
          } else {
            result.warnings.push(`Failed to create ${jobConfig.jobType} job: ${jobResult.error}`);
          }
        }
      }

      // 8. Log successful upload
      await this.logFileAccess(
        fileRecord.fileId!,
        userContext.userId,
        'upload',
        { success: true, fileSize: file.size }
      );

    } catch (error) {
      result.errors.push(`File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      console.error('File upload processing error:', error);
    }

    return result;
  }

  /**
   * Upload file to Supabase storage
   */
  private async uploadToStorage(file: File, filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await this.supabase.storage
        .from(this.storageConfig.bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Storage upload failed' 
      };
    }
  }

  /**
   * Create file record in database
   */
  private async createFileRecord(
    file: File,
    userContext: UserPermissionContext,
    secureFileName: string,
    originalFileName: string,
    filePath: string,
    fileHash: string,
    options: FileUploadOptions
  ): Promise<{ success: boolean; fileId?: string; error?: string }> {
    try {
      const fileCategory = this.determineFileCategory(file.type);
      const accessLevel = options.accessLevel || (options.areaId ? 'area' : 'tenant');
      
      const fileData = {
        tenant_id: userContext.tenantId,
        area_id: options.areaId || null,
        initiative_id: options.initiativeId || null,
        uploaded_by: userContext.userId,
        original_filename: originalFileName,
        stored_filename: secureFileName,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        file_hash: fileHash,
        file_type: this.mapFileType(file.type),
        file_category: options.fileCategory || fileCategory,
        upload_status: 'uploaded',
        processing_status: 'pending',
        virus_scan_status: 'pending',
        validation_status: 'pending',
        access_level: accessLevel,
        retention_policy: options.retentionPolicy || 'standard',
        expires_at: options.expiresIn ? new Date(Date.now() + options.expiresIn * 1000).toISOString() : null,
        metadata: {
          originalSize: file.size,
          uploadedBy: userContext.userId,
          uploadedAt: new Date().toISOString(),
          userAgent: globalThis?.navigator?.userAgent || 'unknown',
          ...options.metadata
        }
      };

      const { data, error } = await this.supabase
        .from('uploaded_files')
        .insert(fileData)
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, fileId: data.id };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Database insert failed' 
      };
    }
  }

  /**
   * Create a processing job for a file
   */
  private async createProcessingJob(
    fileId: string,
    tenantId: string,
    config: ProcessingJobConfig
  ): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      const jobData = {
        tenant_id: tenantId,
        file_id: fileId,
        job_type: config.jobType,
        job_status: 'queued',
        priority: config.priority,
        job_params: config.params,
        max_retries: config.maxRetries || 3,
        expires_at: config.expiresIn ? 
          new Date(Date.now() + config.expiresIn * 1000).toISOString() : 
          new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours default
      };

      const { data, error } = await this.supabase
        .from('file_processing_jobs')
        .insert(jobData)
        .select('id')
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, jobId: data.id };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Job creation failed' 
      };
    }
  }

  /**
   * Log file access for audit trail
   */
  private async logFileAccess(
    fileId: string,
    userId: string,
    action: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      // Get tenant_id from the file
      const { data: fileData } = await this.supabase
        .from('uploaded_files')
        .select('tenant_id')
        .eq('id', fileId)
        .single();

      if (!fileData) return;

      await this.supabase
        .from('file_access_log')
        .insert({
          tenant_id: fileData.tenant_id,
          file_id: fileId,
          user_id: userId,
          action,
          access_method: 'web',
          success: true,
          metadata
        });
    } catch (error) {
      console.error('Failed to log file access:', error);
      // Don't throw - logging failures shouldn't break the main flow
    }
  }

  /**
   * Cleanup storage file (used when database operations fail)
   */
  private async cleanupStorageFile(filePath: string): Promise<void> {
    try {
      await this.supabase.storage
        .from(this.storageConfig.bucketName)
        .remove([filePath]);
    } catch (error) {
      console.error('Failed to cleanup storage file:', error);
    }
  }

  /**
   * Generate file path for storage
   */
  private generateFilePath(fileName: string, tenantId: string, areaId?: string): string {
    const parts = [this.storageConfig.pathPrefix];
    
    // Add tenant isolation
    parts.push(tenantId.substring(0, 8));
    
    // Add area isolation if specified
    if (areaId) {
      parts.push(areaId.substring(0, 8));
    }
    
    // Add timestamp folder if enabled
    if (this.storageConfig.useTimestampFolder) {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      parts.push(`${year}`, `${month}`, `${day}`);
    }
    
    parts.push(fileName);
    
    return parts.join('/');
  }

  /**
   * Determine file category from MIME type
   */
  private determineFileCategory(mimeType: string): string {
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
      return 'okr_data';
    }
    if (mimeType.includes('pdf')) {
      return 'document';
    }
    if (mimeType.includes('image')) {
      return 'image';
    }
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return 'presentation';
    }
    return 'general';
  }

  /**
   * Map MIME type to file type enum
   */
  private mapFileType(mimeType: string): string {
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
      return 'spreadsheet';
    }
    if (mimeType.includes('pdf')) {
      return 'pdf';
    }
    if (mimeType.includes('image')) {
      return 'image';
    }
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return 'presentation';
    }
    if (mimeType.includes('word') || mimeType.includes('document') || mimeType.includes('text')) {
      return 'document';
    }
    return 'other';
  }

  /**
   * Get default processing jobs for file type
   */
  private getDefaultProcessingJobs(mimeType: string): ProcessingJobConfig[] {
    const jobs: ProcessingJobConfig[] = [];

    // Always add virus scan
    jobs.push({
      jobType: 'virus_scan',
      priority: 1,
      params: { engine: 'default' }
    });

    // Add validation for all files
    jobs.push({
      jobType: 'validation',
      priority: 3,
      params: { validateStructure: true, validateContent: true }
    });

    // Add data extraction for spreadsheets
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel') || mimeType.includes('csv')) {
      jobs.push({
        jobType: 'data_extraction',
        priority: 2,
        params: { extractOKRData: true, validateHeaders: true }
      });
    }

    // Add thumbnail generation for images
    if (mimeType.includes('image')) {
      jobs.push({
        jobType: 'thumbnail_generation',
        priority: 5,
        params: { sizes: [150, 300, 600], format: 'webp' }
      });
    }

    return jobs;
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get file download URL with access control
 */
export async function getFileDownloadUrl(
  fileId: string,
  userId: string,
  expiresIn: number = 3600
): Promise<{ url?: string; error?: string }> {
  try {
    const supabase = createClient();

    // Check if user has download permission
    const { data: hasPermission } = await supabase
      .rpc('user_has_file_permission', {
        p_file_id: fileId,
        p_user_id: userId,
        p_permission: 'download'
      });

    if (!hasPermission) {
      return { error: 'Access denied' };
    }

    // Get file path
    const { data: fileData, error: fileError } = await supabase
      .from('uploaded_files')
      .select('file_path, original_filename')
      .eq('id', fileId)
      .single();

    if (fileError || !fileData) {
      return { error: 'File not found' };
    }

    // Generate signed URL
    const { data, error } = await supabase.storage
      .from('uploaded_files')
      .createSignedUrl(fileData.file_path, expiresIn);

    if (error) {
      return { error: error.message };
    }

    // Log access
    await supabase
      .rpc('log_file_access', {
        p_file_id: fileId,
        p_user_id: userId,
        p_action: 'download'
      });

    return { url: data.signedUrl };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Delete file with cleanup
 */
export async function deleteFile(
  fileId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();

    // Check if user has delete permission
    const { data: hasPermission } = await supabase
      .rpc('user_has_file_permission', {
        p_file_id: fileId,
        p_user_id: userId,
        p_permission: 'delete'
      });

    if (!hasPermission) {
      return { success: false, error: 'Access denied' };
    }

    // Get file data for cleanup
    const { data: fileData, error: fileError } = await supabase
      .from('uploaded_files')
      .select('file_path, tenant_id')
      .eq('id', fileId)
      .single();

    if (fileError || !fileData) {
      return { success: false, error: 'File not found' };
    }

    // Soft delete in database (update status to 'deleted')
    const { error: updateError } = await supabase
      .from('uploaded_files')
      .update({ 
        upload_status: 'deleted',
        updated_at: new Date().toISOString()
      })
      .eq('id', fileId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Delete from storage (async, don't wait)
    supabase.storage
      .from('uploaded_files')
      .remove([fileData.file_path])
      .catch((error: any) => console.error('Storage cleanup error:', error));

    // Cancel any pending processing jobs
    supabase
      .from('file_processing_jobs')
      .update({ job_status: 'cancelled' })
      .eq('file_id', fileId)
      .in('job_status', ['queued', 'running'])
      .catch((error: any) => console.error('Job cancellation error:', error));

    // Log deletion
    await supabase
      .rpc('log_file_access', {
        p_file_id: fileId,
        p_user_id: userId,
        p_action: 'delete'
      });

    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}