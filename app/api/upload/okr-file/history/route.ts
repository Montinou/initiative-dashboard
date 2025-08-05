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
        { error: 'Only managers can view upload history' },
        { status: 403 }
      );
    }

    if (!userProfile.area_id) {
      return NextResponse.json(
        { error: 'Manager must be assigned to an area to view upload history' },
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
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');

    // Build query for file uploads in manager's area
    let query = supabase
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
        areas:area_id (
          name
        )
      `)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('area_id', userProfile.area_id)
      .eq('uploaded_by', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply status filter if provided
    if (status && status !== 'all') {
      query = query.eq('upload_status', status);
    }

    const { data: uploads, error: uploadsError } = await query;

    if (uploadsError) {
      console.error('Error fetching upload history:', uploadsError);
      return NextResponse.json(
        { error: 'Failed to fetch upload history' },
        { status: 500 }
      );
    }

    // Transform data to include area name
    const transformedUploads = uploads.map(upload => ({
      id: upload.id,
      file_name: upload.file_name,
      file_size: upload.file_size,
      file_type: upload.file_type,
      upload_status: upload.upload_status,
      processed_records: upload.processed_records || 0,
      error_message: upload.error_message,
      uploaded_at: upload.created_at,
      processed_at: upload.processed_at,
      area_name: upload.areas?.name || userProfile.areas?.name || 'Unknown Area'
    }));

    // Get total count for pagination
    const { count, error: countError } = await supabase
      .from('file_uploads')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', userProfile.tenant_id)
      .eq('area_id', userProfile.area_id)
      .eq('uploaded_by', user.id);

    if (countError) {
      console.error('Error counting uploads:', countError);
      // Continue without count
    }

    return NextResponse.json({
      success: true,
      data: transformedUploads,
      pagination: {
        limit,
        offset,
        total: count || transformedUploads.length,
        hasMore: transformedUploads.length === limit
      },
      metadata: {
        areaName: userProfile.areas?.name,
        managerName: userProfile.full_name,
        tenantId: userProfile.tenant_id
      }
    });

  } catch (error) {
    console.error('Upload history API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching upload history' },
      { status: 500 }
    );
  }
}