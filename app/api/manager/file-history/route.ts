import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getManagerAreaId } from '@/lib/server/manager-permissions';

export async function GET(request: NextRequest) {
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
        { error: 'Only managers can access file history' },
        { status: 403 }
      );
    }

    if (!userProfile.area_id) {
      return NextResponse.json(
        { error: 'Manager must be assigned to an area to view file history' },
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

    // Parse query parameters
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const status = url.searchParams.get('status');
    const searchTerm = url.searchParams.get('search');
    
    const offset = (page - 1) * limit;

    // Build query for file uploads in manager's area
    let query = supabase
      .from('uploaded_files')
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
        uploaded_by_profiles:uploaded_by (
          id,
          full_name,
          email
        )
      `)
      
      .eq('area_id', userProfile.area_id)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status && ['pending', 'processing', 'completed', 'failed', 'completed_with_errors'].includes(status)) {
      query = query.eq('upload_status', status);
    }

    if (searchTerm) {
      query = query.ilike('file_name', `%${searchTerm}%`);
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('uploaded_files')
      .select('*', { count: 'exact', head: true })
      
      .eq('area_id', userProfile.area_id)
      .then(result => {
        let filteredQuery = supabase
          .from('uploaded_files')
          .select('*', { count: 'exact', head: true })
          
          .eq('area_id', userProfile.area_id);

        if (status && ['pending', 'processing', 'completed', 'failed', 'completed_with_errors'].includes(status)) {
          filteredQuery = filteredQuery.eq('upload_status', status);
        }

        if (searchTerm) {
          filteredQuery = filteredQuery.ilike('file_name', `%${searchTerm}%`);
        }

        return filteredQuery;
      });

    // Execute paginated query
    const { data: fileHistory, error: historyError } = await query
      .range(offset, offset + limit - 1);

    if (historyError) {
      console.error('File history query error:', historyError);
      return NextResponse.json(
        { error: 'Failed to fetch file history' },
        { status: 500 }
      );
    }

    // Calculate summary statistics
    const { data: summaryData } = await supabase
      .from('uploaded_files')
      .select('upload_status, processed_records')
      
      .eq('area_id', userProfile.area_id);

    const summary = {
      totalUploads: summaryData?.length || 0,
      completedUploads: summaryData?.filter(f => f.upload_status === 'completed').length || 0,
      failedUploads: summaryData?.filter(f => f.upload_status === 'failed').length || 0,
      processingUploads: summaryData?.filter(f => f.upload_status === 'processing').length || 0,
      totalRecordsProcessed: summaryData?.reduce((sum, f) => sum + (f.processed_records || 0), 0) || 0
    };

    // Format file history for response
    const formattedHistory = fileHistory?.map(file => ({
      id: file.id,
      fileName: file.file_name,
      fileSize: file.file_size,
      fileType: file.file_type,
      status: file.upload_status,
      processedRecords: file.processed_records,
      errorMessage: file.error_message,
      uploadedAt: file.created_at,
      processedAt: file.processed_at,
      uploadedBy: {
        id: file.uploaded_by_profiles?.id,
        name: file.uploaded_by_profiles?.full_name,
        email: file.uploaded_by_profiles?.email
      },
      // Calculate processing time if both timestamps exist
      processingTime: file.created_at && file.processed_at ? 
        Math.round((new Date(file.processed_at).getTime() - new Date(file.created_at).getTime()) / 1000) : null
    })) || [];

    const totalPages = Math.ceil((totalCount || 0) / limit);

    return NextResponse.json({
      success: true,
      data: {
        files: formattedHistory,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalCount || 0,
          itemsPerPage: limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        },
        summary,
        areaInfo: {
          id: userProfile.area_id,
          name: userProfile.areas?.name
        },
        filters: {
          status,
          searchTerm
        }
      }
    });

  } catch (error) {
    console.error('File history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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
      .select('id, tenant_id, area_id, role')
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
        { error: 'Only managers can delete file records' },
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

    const url = new URL(request.url);
    const fileId = url.searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Verify file belongs to manager's area
    const { data: fileRecord, error: fetchError } = await supabase
      .from('uploaded_files')
      .select('id, tenant_id, area_id, file_name, upload_status')
      .eq('id', fileId)
      
      .eq('area_id', userProfile.area_id)
      .single();

    if (fetchError || !fileRecord) {
      return NextResponse.json(
        { error: 'File not found or access denied' },
        { status: 404 }
      );
    }

    // Prevent deletion of currently processing files
    if (fileRecord.upload_status === 'processing') {
      return NextResponse.json(
        { error: 'Cannot delete file that is currently being processed' },
        { status: 400 }
      );
    }

    // Delete file record (soft delete by updating status)
    const { error: deleteError } = await supabase
      .from('uploaded_files')
      .update({ 
        upload_status: 'deleted',
        error_message: `Deleted by manager on ${new Date().toISOString()}`
      })
      .eq('id', fileId);

    if (deleteError) {
      console.error('File deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete file record' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'File record deleted successfully',
      data: {
        fileId: fileRecord.id,
        fileName: fileRecord.file_name
      }
    });

  } catch (error) {
    console.error('File deletion API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}