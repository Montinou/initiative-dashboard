import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getManagerPermissions } from '@/lib/server/manager-permissions';
import { validateManagerArea } from '@/lib/server/query-validation';
import { handleApiError } from '@/lib/error-handling';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const areaId = searchParams.get('areaId');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!areaId) {
      return NextResponse.json(
        { error: 'Area ID is required' },
        { status: 400 }
      );
    }

    if (limit > 100) {
      return NextResponse.json(
        { error: 'Limit cannot exceed 100 records' },
        { status: 400 }
      );
    }

    // Validate manager permissions
    const permissions = await getManagerPermissions(user.id, areaId);
    if (!permissions.canView) {
      return NextResponse.json(
        { error: 'Access denied to this area' },
        { status: 403 }
      );
    }

    // Validate area relationship
    const areaValidation = await validateManagerArea(user.id, areaId);
    if (!areaValidation.isValid) {
      return NextResponse.json(
        { error: areaValidation.error },
        { status: 403 }
      );
    }

    // Get recent file-related audit log entries
    const { data: auditLogs, error: auditError } = await supabase
      .from('audit_log')
      .select(`
        id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        created_at,
        user_profiles!audit_log_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq('tenant_id', areaValidation.tenantId)
      .in('resource_type', ['file_upload', 'initiative', 'subtask'])
      .in('action', [
        'upload_file',
        'process_file',
        'delete_file',
        'create_initiative_from_file',
        'file_processing_error',
        'create_subtask_from_file',
        'file_validation_error'
      ])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (auditError) {
      console.error('Error fetching audit logs:', auditError);
      return NextResponse.json(
        { error: 'Failed to fetch activity logs' },
        { status: 500 }
      );
    }

    // Transform audit logs into activity format
    const recentActivity = (auditLogs || []).map(log => {
      const userName = log.user_profiles?.full_name || log.user_profiles?.email || 'Unknown User';
      let message = '';
      let status: 'success' | 'warning' | 'error' | 'info' = 'info';
      let type: 'upload' | 'process' | 'delete' | 'error' = 'process';

      switch (log.action) {
        case 'upload_file':
          message = `${userName} uploaded file: ${log.new_values?.fileName || 'Unknown file'}`;
          status = 'success';
          type = 'upload';
          break;
        
        case 'process_file':
          const recordsProcessed = log.new_values?.processedRecords || 0;
          const initiativesCreated = log.new_values?.initiativesCreated || 0;
          message = `File processing completed: ${recordsProcessed} records processed, ${initiativesCreated} initiatives created`;
          status = 'success';
          type = 'process';
          break;
        
        case 'delete_file':
          message = `${userName} deleted file: ${log.old_values?.fileName || 'Unknown file'}`;
          status = 'warning';
          type = 'delete';
          break;
        
        case 'create_initiative_from_file':
          const initiativeTitle = log.new_values?.title || 'Untitled Initiative';
          message = `Created initiative from file: ${initiativeTitle}`;
          status = 'success';
          type = 'process';
          break;
        
        case 'file_processing_error':
          const errorMsg = log.new_values?.error || 'Unknown error';
          message = `File processing failed: ${errorMsg}`;
          status = 'error';
          type = 'error';
          break;
        
        case 'create_subtask_from_file':
          const subtaskCount = log.new_values?.subtaskCount || 1;
          message = `Created ${subtaskCount} subtask${subtaskCount === 1 ? '' : 's'} from file`;
          status = 'success';
          type = 'process';
          break;
        
        case 'file_validation_error':
          const validationError = log.new_values?.error || 'Validation failed';
          message = `File validation failed: ${validationError}`;
          status = 'error';
          type = 'error';
          break;
        
        default:
          message = `${log.action}: ${log.resource_type}`;
          status = 'info';
          type = 'process';
      }

      return {
        id: log.id,
        type,
        message,
        timestamp: log.created_at,
        status,
        user: userName,
        details: {
          action: log.action,
          resourceType: log.resource_type,
          resourceId: log.resource_id,
          oldValues: log.old_values,
          newValues: log.new_values
        }
      };
    });

    // Also get recent file uploads for additional context
    const { data: recentUploads, error: uploadsError } = await supabase
      .from('uploaded_files')
      .select(`
        id,
        file_name,
        upload_status,
        processed_records,
        error_message,
        uploaded_at
      `)
      .eq('tenant_id', areaValidation.tenantId)
      .eq('area_id', areaId)
      .order('uploaded_at', { ascending: false })
      .limit(5);

    if (uploadsError) {
      console.error('Error fetching recent uploads:', uploadsError);
    }

    // Add recent uploads to activity if not already in audit logs
    if (recentUploads) {
      const uploadActivities = recentUploads.map(upload => ({
        id: `upload-${upload.id}`,
        type: 'upload' as const,
        message: `File uploaded: ${upload.file_name} (${upload.upload_status})`,
        timestamp: upload.uploaded_at,
        status: upload.upload_status === 'completed' ? 'success' as const : 
                upload.upload_status === 'failed' ? 'error' as const : 
                'info' as const,
        user: 'System',
        details: {
          uploadId: upload.id,
          fileName: upload.file_name,
          status: upload.upload_status,
          processedRecords: upload.processed_records,
          errorMessage: upload.error_message
        }
      }));

      // Merge and sort by timestamp
      const allActivity = [...recentActivity, ...uploadActivities]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);

      // Log successful access
      await supabase
        .from('audit_log')
        .insert({
          tenant_id: areaValidation.tenantId,
          user_id: areaValidation.userProfileId,
          action: 'view_file_activity',
          resource_type: 'file_activity',
          resource_id: areaId,
          new_values: { area_id: areaId, activity_requested: true, limit },
          ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        });

      return NextResponse.json({
        success: true,
        data: allActivity
      });
    }

    // Log successful access
    await supabase
      .from('audit_log')
      .insert({
        tenant_id: areaValidation.tenantId,
        user_id: areaValidation.userProfileId,
        action: 'view_file_activity',
        resource_type: 'file_activity',
        resource_id: areaId,
        new_values: { area_id: areaId, activity_requested: true, limit },
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    return NextResponse.json({
      success: true,
      data: recentActivity
    });

  } catch (error) {
    return handleApiError(error, 'file-activity');
  }
}