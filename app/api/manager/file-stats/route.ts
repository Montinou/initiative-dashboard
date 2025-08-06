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

    if (!areaId) {
      return NextResponse.json(
        { error: 'Area ID is required' },
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

    // Get file upload statistics
    const { data: uploadStats, error: statsError } = await supabase
      .from('file_uploads')
      .select(`
        id,
        file_size,
        upload_status,
        processed_records,
        error_message,
        uploaded_at,
        processed_at
      `)
      .eq('tenant_id', areaValidation.tenantId)
      .eq('area_id', areaId);

    if (statsError) {
      console.error('Error fetching upload stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch file statistics' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const totalUploads = uploadStats?.length || 0;
    const successfulUploads = uploadStats?.filter(u => u.upload_status === 'completed').length || 0;
    const failedUploads = uploadStats?.filter(u => u.upload_status === 'failed').length || 0;
    const processingUploads = uploadStats?.filter(u => u.upload_status === 'processing').length || 0;
    const uploadsWithErrors = uploadStats?.filter(u => u.upload_status === 'completed_with_errors').length || 0;

    // Calculate total records processed and initiatives created
    const totalRecordsProcessed = uploadStats?.reduce((sum, upload) => sum + (upload.processed_records || 0), 0) || 0;
    
    // Get total initiatives created from this area
    const { data: initiativeStats, error: initiativeError } = await supabase
      .from('initiatives')
      .select('id, created_at')
      .eq('tenant_id', areaValidation.tenantId)
      .eq('area_id', areaId);

    if (initiativeError) {
      console.error('Error fetching initiative stats:', initiativeError);
    }

    const totalInitiativesCreated = initiativeStats?.length || 0;

    // Calculate average processing time
    const completedUploads = uploadStats?.filter(u => u.processed_at && u.uploaded_at) || [];
    let avgProcessingTime = 0;
    
    if (completedUploads.length > 0) {
      const totalProcessingTime = completedUploads.reduce((sum, upload) => {
        const uploadTime = new Date(upload.uploaded_at).getTime();
        const processTime = new Date(upload.processed_at!).getTime();
        return sum + (processTime - uploadTime);
      }, 0);
      avgProcessingTime = Math.round(totalProcessingTime / completedUploads.length / 1000); // in seconds
    }

    // Calculate disk space used
    const diskSpaceUsed = uploadStats?.reduce((sum, upload) => sum + (upload.file_size || 0), 0) || 0;

    // Get last upload date
    const lastUploadDate = uploadStats && uploadStats.length > 0 
      ? uploadStats.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())[0].uploaded_at
      : null;

    const fileStats = {
      totalUploads,
      successfulUploads,
      failedUploads,
      processingUploads,
      uploadsWithErrors,
      totalRecordsProcessed,
      totalInitiativesCreated,
      avgProcessingTime,
      lastUploadDate,
      diskSpaceUsed
    };

    // Log successful access
    await supabase
      .from('audit_log')
      .insert({
        tenant_id: areaValidation.tenantId,
        user_id: areaValidation.userProfileId,
        action: 'view_file_stats',
        resource_type: 'file_stats',
        resource_id: areaId,
        new_values: { area_id: areaId, stats_requested: true },
        ip_address: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      });

    return NextResponse.json({
      success: true,
      data: fileStats
    });

  } catch (error) {
    return handleApiError(error, 'file-stats');
  }
}