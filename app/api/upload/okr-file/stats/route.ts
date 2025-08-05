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
        { error: 'Only managers can view upload statistics' },
        { status: 403 }
      );
    }

    if (!userProfile.area_id) {
      return NextResponse.json(
        { error: 'Manager must be assigned to an area to view upload statistics' },
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

    // Get upload statistics for the manager's area
    const { data: uploadStats, error: statsError } = await supabase
      .from('file_uploads')
      .select(`
        id,
        upload_status,
        processed_records,
        created_at
      `)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('area_id', userProfile.area_id)
      .eq('uploaded_by', user.id);

    if (statsError) {
      console.error('Error fetching upload stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch upload statistics' },
        { status: 500 }
      );
    }

    // Calculate statistics
    const totalUploads = uploadStats.length;
    const successfulUploads = uploadStats.filter(upload => 
      upload.upload_status === 'completed' || upload.upload_status === 'completed_with_errors'
    ).length;
    const failedUploads = uploadStats.filter(upload => 
      upload.upload_status === 'failed'
    ).length;
    const processingUploads = uploadStats.filter(upload => 
      upload.upload_status === 'processing'
    ).length;
    const totalInitiatives = uploadStats.reduce((sum, upload) => 
      sum + (upload.processed_records || 0), 0
    );

    // Get monthly upload trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const { data: monthlyStats, error: monthlyError } = await supabase
      .from('file_uploads')
      .select(`
        created_at,
        upload_status,
        processed_records
      `)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('area_id', userProfile.area_id)
      .eq('uploaded_by', user.id)
      .gte('created_at', sixMonthsAgo.toISOString());

    let monthlyTrends = [];
    if (!monthlyError && monthlyStats) {
      // Group by month
      const monthlyData: Record<string, { uploads: number; initiatives: number }> = {};
      
      monthlyStats.forEach(upload => {
        const month = new Date(upload.created_at).toISOString().substring(0, 7); // YYYY-MM format
        if (!monthlyData[month]) {
          monthlyData[month] = { uploads: 0, initiatives: 0 };
        }
        monthlyData[month].uploads++;
        monthlyData[month].initiatives += upload.processed_records || 0;
      });

      monthlyTrends = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        uploads: data.uploads,
        initiatives: data.initiatives
      })).sort((a, b) => a.month.localeCompare(b.month));
    }

    // Get recent upload activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: recentUploads, error: recentError } = await supabase
      .from('file_uploads')
      .select(`
        id,
        file_name,
        upload_status,
        processed_records,
        created_at
      `)
      .eq('tenant_id', userProfile.tenant_id)
      .eq('area_id', userProfile.area_id)
      .eq('uploaded_by', user.id)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(5);

    const recentActivity = recentError ? [] : recentUploads.map(upload => ({
      id: upload.id,
      fileName: upload.file_name,
      status: upload.upload_status,
      initiativesCreated: upload.processed_records || 0,
      uploadedAt: upload.created_at
    }));

    // Calculate success rate
    const successRate = totalUploads > 0 ? Math.round((successfulUploads / totalUploads) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        totalUploads,
        successfulUploads,
        failedUploads,
        processingUploads,
        totalInitiatives,
        successRate,
        monthlyTrends,
        recentActivity,
        areaName: userProfile.areas?.name,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Upload stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error while fetching upload statistics' },
      { status: 500 }
    );
  }
}