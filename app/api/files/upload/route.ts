/**
 * Comprehensive File Upload API Route
 * Handles secure file uploads with validation, processing, and audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { 
  validateFileUploadSecurity, 
  UserPermissionContext,
  FileSecurityCheck
} from '@/lib/file-upload/security';
import { 
  FileUploadProcessor, 
  FileUploadOptions,
  FileUploadResult 
} from '@/lib/file-upload/processor';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface UploadRequestBody {
  areaId?: string;
  initiativeId?: string;
  fileCategory?: string;
  accessLevel?: 'private' | 'area' | 'tenant' | 'public';
  retentionPolicy?: 'temporary' | 'standard' | 'archive' | 'permanent';
  autoProcess?: boolean;
  metadata?: Record<string, any>;
}

// ============================================================================
// MAIN UPLOAD HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let uploadResult: FileUploadResult | null = null;
  let securityCheck: FileSecurityCheck | null = null;
  let userContext: UserPermissionContext | null = null;

  try {
    // 1. Initialize Supabase client
    const supabase = await createClient();

    // 2. Authenticate user
    const authResult = await authenticateUser(supabase);
    if (!authResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: authResult.error,
          code: 'AUTH_FAILED'
        },
        { status: 401 }
      );
    }

    userContext = authResult.userContext!;

    // 3. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No file provided',
          code: 'NO_FILE'
        },
        { status: 400 }
      );
    }

    // 4. Parse upload options
    const options: FileUploadOptions = {
      areaId: formData.get('areaId') as string || undefined,
      initiativeId: formData.get('initiativeId') as string || undefined,
      fileCategory: formData.get('fileCategory') as string || undefined,
      accessLevel: (formData.get('accessLevel') as any) || 'area',
      retentionPolicy: (formData.get('retentionPolicy') as any) || 'standard',
      autoProcess: formData.get('autoProcess') !== 'false',
      metadata: parseMetadata(formData.get('metadata') as string)
    };

    // 5. Validate file upload permissions and security
    securityCheck = await validateFileUploadSecurity(
      file,
      userContext,
      options.areaId,
      options.initiativeId
    );

    if (!securityCheck.isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'File validation failed',
          details: {
            errors: securityCheck.errors,
            warnings: securityCheck.warnings,
            securityScore: securityCheck.securityScore,
            checks: securityCheck.checks
          },
          code: 'VALIDATION_FAILED'
        },
        { status: 400 }
      );
    }

    // 6. Process file upload
    const processor = new FileUploadProcessor({
      bucketName: 'file-uploads',
      pathPrefix: 'uploads',
      useTimestampFolder: true,
      preserveOriginalName: false
    });

    uploadResult = await processor.processFileUpload(
      file,
      userContext,
      securityCheck,
      options
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'File upload failed',
          details: {
            errors: uploadResult.errors,
            warnings: uploadResult.warnings
          },
          code: 'UPLOAD_FAILED'
        },
        { status: 500 }
      );
    }

    // 7. Log successful upload
    await logUploadMetrics(supabase, {
      userId: userContext.userId,
      tenantId: userContext.tenantId,
      areaId: options.areaId,
      fileId: uploadResult.fileId!,
      fileName: file.name,
      fileSize: file.size,
      processingTime: Date.now() - startTime,
      securityScore: securityCheck.securityScore,
      success: true
    });

    // 8. Return success response
    return NextResponse.json({
      success: true,
      data: {
        fileId: uploadResult.fileId,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        fileHash: uploadResult.fileHash,
        uploadedAt: new Date().toISOString(),
        processingJobs: uploadResult.metadata.processingJobs || [],
        securityScore: securityCheck.securityScore,
        warnings: [...securityCheck.warnings, ...uploadResult.warnings],
        metadata: uploadResult.metadata
      },
      code: 'UPLOAD_SUCCESS'
    });

  } catch (error) {
    console.error('File upload error:', error);

    // Log failed upload
    if (userContext) {
      await logUploadMetrics(supabase, {
        userId: userContext.userId,
        tenantId: userContext.tenantId,
        areaId: (formData?.get('areaId') as string) || undefined,
        fileName: file?.name || 'unknown',
        fileSize: file?.size || 0,
        processingTime: Date.now() - startTime,
        securityScore: securityCheck?.securityScore || 0,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }).catch(console.error);
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during file upload',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// AUTHENTICATION HELPER
// ============================================================================

async function authenticateUser(supabase: any): Promise<{
  success: boolean;
  error?: string;
  userContext?: UserPermissionContext;
}> {
  try {
    // Get user session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get user profile with role and permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        tenant_id,
        area_id,
        role,
        is_system_admin,
        full_name,
        email
      `)
      .eq('user_id', user.id)
user_id      .single();

    if (profileError || !userProfile) {
      return { success: false, error: 'User profile not found' };
    }

    // Check if user account is active
    if (!userProfile.is_active) {
      return { success: false, error: 'User account is inactive' };
    }

    return {
      success: true,
      userContext: {
        userId: userProfile.id,
        tenantId: userProfile.tenant_id,
        areaId: userProfile.area_id,
        role: userProfile.role,
        isSystemAdmin: userProfile.is_system_admin || false
      }
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

// ============================================================================
// METADATA PARSING HELPER
// ============================================================================

function parseMetadata(metadataString: string | null): Record<string, any> {
  if (!metadataString) return {};
  
  try {
    return JSON.parse(metadataString);
  } catch (error) {
    console.warn('Failed to parse metadata:', error);
    return {};
  }
}

// ============================================================================
// UPLOAD METRICS LOGGING
// ============================================================================

async function logUploadMetrics(supabase: any, metrics: {
  userId: string;
  tenantId: string;
  areaId?: string;
  fileId?: string;
  fileName: string;
  fileSize: number;
  processingTime: number;
  securityScore: number;
  success: boolean;
  error?: string;
}): Promise<void> {
  try {
    // Log to audit trail
    await supabase.from('audit_log').insert({
      tenant_id: metrics.tenantId,
      user_id: metrics.userId,
      action: 'FILE_UPLOAD',
      resource_type: 'uploaded_file',
      resource_id: metrics.fileId || null,
      new_values: {
        fileName: metrics.fileName,
        fileSize: metrics.fileSize,
        processingTime: metrics.processingTime,
        securityScore: metrics.securityScore,
        success: metrics.success,
        error: metrics.error,
        areaId: metrics.areaId,
        timestamp: new Date().toISOString()
      }
    });

    // Log detailed metrics for monitoring (optional separate table)
    // This could be useful for analytics and performance monitoring
    if (process.env.NODE_ENV === 'production') {
      // In production, you might want to send metrics to a monitoring service
      // like DataDog, New Relic, or a custom analytics endpoint
      console.log('Upload metrics:', {
        ...metrics,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error('Failed to log upload metrics:', error);
    // Don't throw - metrics logging failures shouldn't break uploads
  }
}

// ============================================================================
// RATE LIMITING (will be implemented when required by load testing)
// ============================================================================

// async function checkRateLimit(userId: string, tenantId: string): Promise<{
//   allowed: boolean;
//   remainingRequests?: number;
//   resetTime?: Date;
// }> {
//   // Rate limiting will be implemented based on user/tenant when needed
//   // This could use Redis, database, or external service
//   return { allowed: true };
// }

// ============================================================================
// FILE SIZE LIMITS BY ROLE (will be implemented based on role requirements)
// ============================================================================

// function getFileSizeLimitForRole(role: string): number {
//   const limits = {
//     'Analyst': 50 * 1024 * 1024,      // 50MB
//     'Manager': 100 * 1024 * 1024,     // 100MB
//     'Admin': 500 * 1024 * 1024,       // 500MB
//     'CEO': 1000 * 1024 * 1024,        // 1GB
//   };
//   
//   return limits[role as keyof typeof limits] || limits.Analyst;
// }