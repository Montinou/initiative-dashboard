/**
 * File Download API Route
 * Handles secure file downloads with access control and audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

// ============================================================================
// MAIN DOWNLOAD HANDLER
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { fileId: string } }
) {
  const startTime = Date.now();
  
  try {
    const { fileId } = params;
    
    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // 1. Initialize Supabase client
    const supabase = await createClient();

    // 2. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 3. Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, tenant_id, area_id, role, is_system_admin')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // 4. Get file details and check permissions
    const { data: fileData, error: fileError } = await supabase
      .from('uploaded_files')
      .select(`
        id,
        tenant_id,
        area_id,
        initiative_id,
        uploaded_by,
        original_filename,
        stored_filename,
        file_path,
        file_size,
        mime_type,
        file_type,
        access_level,
        upload_status,
        metadata
      `)
      .eq('id', fileId)
      .single();

    if (fileError || !fileData) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // 5. Check if file is available for download
    if (fileData.upload_status === 'deleted') {
      return NextResponse.json(
        { error: 'File has been deleted' },
        { status: 410 }
      );
    }

    if (fileData.upload_status !== 'uploaded' && fileData.upload_status !== 'processed') {
      return NextResponse.json(
        { error: 'File is not ready for download' },
        { status: 409 }
      );
    }

    // 6. Check tenant isolation
    if (fileData.tenant_id !== userProfile.tenant_id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // 7. Check download permissions
    const hasPermission = await checkDownloadPermission(
      supabase,
      fileData,
      userProfile
    );

    if (!hasPermission) {
      // Log unauthorized access attempt
      await logFileAccess(supabase, {
        fileId: fileData.id,
        userId: userProfile.id,
        tenantId: userProfile.tenant_id,
        action: 'download_denied',
        success: false,
        ipAddress: getClientIP(request),
        userAgent: request.headers.get('user-agent') || undefined,
        error: 'Insufficient permissions'
      });

      return NextResponse.json(
        { error: 'Insufficient permissions to download this file' },
        { status: 403 }
      );
    }

    // 8. Generate signed download URL
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('uploaded_files')
      .createSignedUrl(fileData.file_path, 3600, {
        download: fileData.original_filename
      });

    if (urlError || !signedUrlData) {
      console.error('Failed to generate download URL:', urlError);
      return NextResponse.json(
        { error: 'Failed to generate download URL' },
        { status: 500 }
      );
    }

    // 9. Log successful download
    await logFileAccess(supabase, {
      fileId: fileData.id,
      userId: userProfile.id,
      tenantId: userProfile.tenant_id,
      action: 'download',
      success: true,
      ipAddress: getClientIP(request),
      userAgent: request.headers.get('user-agent') || undefined,
      metadata: {
        fileSize: fileData.file_size,
        fileName: fileData.original_filename,
        processingTime: Date.now() - startTime
      }
    });

    // 10. Update file access timestamp
    await supabase
      .from('uploaded_files')
      .update({ accessed_at: new Date().toISOString() })
      .eq('id', fileId);

    // 11. Return download URL
    return NextResponse.json({
      success: true,
      data: {
        downloadUrl: signedUrlData.signedUrl,
        fileName: fileData.original_filename,
        fileSize: fileData.file_size,
        mimeType: fileData.mime_type,
        expiresAt: new Date(Date.now() + 3600 * 1000).toISOString() // 1 hour
      }
    });

  } catch (error) {
    console.error('File download error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PERMISSION CHECK HELPER
// ============================================================================

async function checkDownloadPermission(
  supabase: any,
  fileData: any,
  userProfile: any
): Promise<boolean> {
  try {
    // System admin has full access
    if (userProfile.is_system_admin) {
      return true;
    }

    // CEO and Admin can download all tenant files
    if (['CEO', 'Admin'].includes(userProfile.role)) {
      return true;
    }

    // File uploader can always download their own files
    if (fileData.uploaded_by === userProfile.id) {
      return true;
    }

    // Check access level
    switch (fileData.access_level) {
      case 'public':
        return true;
      
      case 'tenant':
        // Any user in the same tenant can access
        return true;
      
      case 'area':
        // Users in the same area can access
        if (fileData.area_id && fileData.area_id === userProfile.area_id) {
          return true;
        }
        break;
      
      case 'private':
        // Only the uploader can access (already checked above)
        break;
    }

    // Check explicit file permissions
    const { data: permissions, error: permError } = await supabase
      .from('file_permissions')
      .select('permission_type')
      .eq('file_id', fileData.id)
      .eq('is_active', true)
      .or(`user_id.eq.${userProfile.id},area_id.eq.${userProfile.area_id},role_name.eq.${userProfile.role}`)
      .in('permission_type', ['view', 'download', 'edit', 'admin'])
      .limit(1);

    if (!permError && permissions && permissions.length > 0) {
      return true;
    }

    // Check if user has access to the file's initiative
    if (fileData.initiative_id) {
      const { data: initiative, error: initError } = await supabase
        .from('initiatives')
        .select('area_id, created_by, owner_id')
        .eq('id', fileData.initiative_id)
        .single();

      if (!initError && initiative) {
        // Check if user is the initiative creator or owner
        if (initiative.created_by === userProfile.id || initiative.owner_id === userProfile.id) {
          return true;
        }

        // Check if user is in the same area as the initiative
        if (initiative.area_id === userProfile.area_id) {
          return true;
        }
      }
    }

    return false;
  } catch (error) {
    console.error('Permission check error:', error);
    return false;
  }
}

// ============================================================================
// ACCESS LOGGING HELPER
// ============================================================================

async function logFileAccess(supabase: any, logData: {
  fileId: string;
  userId: string;
  tenantId: string;
  action: string;
  success: boolean;
  ipAddress?: string;
  userAgent?: string;
  error?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    await supabase.from('file_access_log').insert({
      tenant_id: logData.tenantId,
      file_id: logData.fileId,
      user_id: logData.userId,
      action: logData.action,
      access_method: 'web',
      success: logData.success,
      ip_address: logData.ipAddress,
      user_agent: logData.userAgent,
      error_message: logData.error,
      metadata: logData.metadata || {}
    });
  } catch (error) {
    console.error('Failed to log file access:', error);
    // Don't throw - logging failures shouldn't break the download
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function getClientIP(request: NextRequest): string | undefined {
  // Try different headers to get the client IP
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (xForwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return xForwardedFor.split(',')[0].trim();
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP;
  }
  
  if (xRealIP) {
    return xRealIP;
  }
  
  return undefined;
}