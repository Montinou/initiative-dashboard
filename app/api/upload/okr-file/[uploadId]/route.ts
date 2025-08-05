import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getManagerAreaId } from '@/lib/server/manager-permissions';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { uploadId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user profile with role validation
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        tenant_id,
        area_id,
        role,
        full_name,
        areas:area_id (
          id,
          name,
          tenant_id
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Verify manager role and area assignment
    if (userProfile.role !== 'Manager' && userProfile.role !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Only managers can delete upload records' },
        { status: 403 }
      );
    }

    if (!userProfile.area_id) {
      return NextResponse.json(
        { error: 'Manager must be assigned to an area to delete upload records' },
        { status: 403 }
      );
    }

    const managerAreaId = await getManagerAreaId(user.id);
    if (!managerAreaId || managerAreaId !== userProfile.area_id) {
      return NextResponse.json(
        { error: 'Area assignment validation failed' },
        { status: 403 }
      );
    }

    const uploadId = params.uploadId;

    // Verify the upload record exists and belongs to the manager
    const { data: uploadRecord, error: fetchError } = await supabase
      .from('file_uploads')
      .select(`
        id,
        file_name,
        upload_status,
        uploaded_by,
        area_id,
        tenant_id,
        created_at
      `)
      .eq('id', uploadId)
      .single();

    if (fetchError || !uploadRecord) {
      return NextResponse.json(
        { error: 'Upload record not found' },
        { status: 404 }
      );
    }

    // Verify ownership and area access
    if (uploadRecord.uploaded_by !== user.id) {
      return NextResponse.json(
        { error: 'You can only delete your own upload records' },
        { status: 403 }
      );
    }

    if (uploadRecord.area_id !== userProfile.area_id) {
      return NextResponse.json(
        { error: 'Upload record does not belong to your area' },
        { status: 403 }
      );
    }

    if (uploadRecord.tenant_id !== userProfile.tenant_id) {
      return NextResponse.json(
        { error: 'Upload record does not belong to your organization' },
        { status: 403 }
      );
    }

    // Create audit log entry before deletion
    const auditData = {
      tenant_id: userProfile.tenant_id,
      user_id: userProfile.id,
      action: 'DELETE_UPLOAD_RECORD',
      resource_type: 'file_upload',
      resource_id: uploadRecord.id,
      old_values: {
        file_name: uploadRecord.file_name,
        upload_status: uploadRecord.upload_status,
        uploaded_at: uploadRecord.created_at
      },
      new_values: null,
      ip_address: request.ip,
      user_agent: request.headers.get('user-agent')
    };

    const { error: auditError } = await supabase
      .from('audit_log')
      .insert(auditData);

    if (auditError) {
      console.error('Failed to create audit log entry:', auditError);
      // Continue with deletion even if audit log fails
    }

    // Delete the upload record
    const { error: deleteError } = await supabase
      .from('file_uploads')
      .delete()
      .eq('id', uploadId);

    if (deleteError) {
      console.error('Error deleting upload record:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete upload record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Upload record for "${uploadRecord.file_name}" has been deleted successfully`,
      data: {
        deletedUploadId: uploadId,
        fileName: uploadRecord.file_name,
        deletedBy: userProfile.full_name,
        deletedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Upload deletion API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while deleting upload record' },
      { status: 500 }
    );
  }
}

// GET endpoint for retrieving specific upload details
export async function GET(
  request: NextRequest,
  { params }: { params: { uploadId: string } }
) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user profile with role validation
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        tenant_id,
        area_id,
        role,
        areas:area_id (
          id,
          name,
          tenant_id
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Verify manager role and area assignment
    if (userProfile.role !== 'Manager' && userProfile.role !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Only managers can view upload details' },
        { status: 403 }
      );
    }

    const uploadId = params.uploadId;

    // Get upload record details
    const { data: uploadRecord, error: fetchError } = await supabase
      .from('file_uploads')
      .select(`
        id,
        file_name,
        file_size,
        file_type,
        upload_status,
        processed_records,
        error_message,
        created_at,
        processed_at,
        uploaded_by,
        area_id,
        tenant_id,
        areas:area_id (
          name
        )
      `)
      .eq('id', uploadId)
      .single();

    if (fetchError || !uploadRecord) {
      return NextResponse.json(
        { error: 'Upload record not found' },
        { status: 404 }
      );
    }

    // Verify access permissions
    if (uploadRecord.uploaded_by !== user.id && userProfile.role !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'You can only view your own upload records' },
        { status: 403 }
      );
    }

    if (uploadRecord.tenant_id !== userProfile.tenant_id) {
      return NextResponse.json(
        { error: 'Upload record does not belong to your organization' },
        { status: 403 }
      );
    }

    // Transform data for response
    const transformedUpload = {
      id: uploadRecord.id,
      file_name: uploadRecord.file_name,
      file_size: uploadRecord.file_size,
      file_type: uploadRecord.file_type,
      upload_status: uploadRecord.upload_status,
      processed_records: uploadRecord.processed_records || 0,
      error_message: uploadRecord.error_message,
      uploaded_at: uploadRecord.created_at,
      processed_at: uploadRecord.processed_at,
      area_name: uploadRecord.areas?.name || 'Unknown Area'
    };

    return NextResponse.json({
      success: true,
      data: transformedUpload
    });

  } catch (error) {
    console.error('Upload details API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching upload details' },
      { status: 500 }
    );
  }
}