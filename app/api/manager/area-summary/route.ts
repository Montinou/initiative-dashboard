import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';
import { getManagerDataScope, validateManagerAreaAccess } from '@/lib/manager-permissions';

/**
 * GET /api/manager/area-summary
 * 
 * Returns comprehensive area summary data for the authenticated manager
 * 
 * Features:
 * - Area-scoped data access with proper isolation
 * - Real-time metrics calculation
 * - Tenant and area validation
 * - Error handling and logging
 */
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

    // Get user profile with area information
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        tenant_id,
        role,
        area_id,
        is_active,
        areas!user_profiles_area_id_fkey (
          id,
          name,
          description,
          is_active
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      console.error('Failed to fetch user profile:', profileError);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Validate manager role and area access
    if (profile.role !== 'Manager' || !profile.area_id) {
      return NextResponse.json(
        { error: 'Manager access required' },
        { status: 403 }
      );
    }

    if (!profile.is_active) {
      return NextResponse.json(
        { error: 'Account is inactive' },
        { status: 403 }
      );
    }

    const dataScope = getManagerDataScope(profile.role, profile.tenant_id, profile.area_id);
    
    if (!dataScope) {
      return NextResponse.json(
        { error: 'Data access not available' },
        { status: 403 }
      );
    }

    // Fetch initiatives with subtasks for the area
    const { data: initiatives, error: initiativesError } = await supabase
      .from('initiatives_with_subtasks_summary')
      .select('*')
      .eq('tenant_id', dataScope.tenantId)
      .eq('area_id', dataScope.areaId)
      .order('created_at', { ascending: false });

    if (initiativesError) {
      console.error('Error fetching initiatives:', initiativesError);
      return NextResponse.json(
        { error: 'Failed to fetch initiatives' },
        { status: 500 }
      );
    }

    // Calculate core metrics
    const totalInitiatives = initiatives?.length || 0;
    const activeInitiatives = initiatives?.filter(i => 
      i.status === 'in_progress' || i.status === 'planning'
    ).length || 0;
    const completedInitiatives = initiatives?.filter(i => 
      i.status === 'completed'
    ).length || 0;
    const onHoldInitiatives = initiatives?.filter(i => 
      i.status === 'on_hold'
    ).length || 0;

    const averageProgress = totalInitiatives > 0 
      ? Math.round(initiatives.reduce((sum, i) => sum + (i.initiative_progress || 0), 0) / totalInitiatives)
      : 0;

    const totalSubtasks = initiatives?.reduce((sum, i) => sum + (i.subtask_count || 0), 0) || 0;
    const completedSubtasks = initiatives?.reduce((sum, i) => sum + (i.completed_subtask_count || 0), 0) || 0;
    const subtaskCompletionRate = totalSubtasks > 0 
      ? Math.round((completedSubtasks / totalSubtasks) * 100)
      : 0;

    // Time-based metrics
    const today = new Date();
    const overDueInitiatives = initiatives?.filter(i => 
      i.target_date && new Date(i.target_date) < today && i.status !== 'completed'
    ).length || 0;

    const upcomingDeadlines = initiatives?.filter(i => {
      if (!i.target_date || i.status === 'completed') return false;
      const targetDate = new Date(i.target_date);
      const nextWeek = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));
      return targetDate >= today && targetDate <= nextWeek;
    }).length || 0;

    // Fetch recent file uploads
    const { data: recentUploads, error: uploadsError } = await supabase
      .from('uploaded_files')
      .select('id, original_filename, upload_status, created_at')
      .eq('tenant_id', dataScope.tenantId)
      .eq('area_id', dataScope.areaId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
      .order('created_at', { ascending: false })
      .limit(10);

    const totalRecentUploads = recentUploads?.length || 0;
    const successfulUploads = recentUploads?.filter(u => u.upload_status === 'completed').length || 0;
    const failedUploads = recentUploads?.filter(u => u.upload_status === 'failed').length || 0;

    // Fetch recent activity
    const { data: recentActivity, error: activityError } = await supabase
      .from('audit_log')
      .select(`
        id,
        action,
        resource_type,
        created_at,
        user_profiles!audit_log_user_id_fkey (
          full_name
        )
      `)
      .eq('tenant_id', dataScope.tenantId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Status distribution
    const statusDistribution = [
      { status: 'planning', count: initiatives?.filter(i => i.status === 'planning').length || 0 },
      { status: 'in_progress', count: initiatives?.filter(i => i.status === 'in_progress').length || 0 },
      { status: 'completed', count: initiatives?.filter(i => i.status === 'completed').length || 0 },
      { status: 'on_hold', count: initiatives?.filter(i => i.status === 'on_hold').length || 0 }
    ].map(item => ({
      ...item,
      percentage: totalInitiatives > 0 ? Math.round((item.count / totalInitiatives) * 100) : 0
    }));

    // Build response
    const summary = {
      area: {
        id: profile.areas?.id,
        name: profile.areas?.name,
        description: profile.areas?.description,
        isActive: profile.areas?.is_active
      },
      
      metrics: {
        initiatives: {
          total: totalInitiatives,
          active: activeInitiatives,
          completed: completedInitiatives,
          onHold: onHoldInitiatives,
          averageProgress
        },
        
        subtasks: {
          total: totalSubtasks,
          completed: completedSubtasks,
          completionRate: subtaskCompletionRate
        },
        
        timeline: {
          overdue: overDueInitiatives,
          upcomingDeadlines
        },
        
        uploads: {
          recent: totalRecentUploads,
          successful: successfulUploads,
          failed: failedUploads
        }
      },
      
      statusDistribution,
      
      recentActivity: recentActivity?.map(activity => ({
        id: activity.id,
        action: activity.action,
        resourceType: activity.resource_type,
        userName: activity.user_profiles?.full_name || 'Unknown',
        createdAt: activity.created_at
      })) || [],
      
      recentUploads: recentUploads?.map(upload => ({
        id: upload.id,
        filename: upload.original_filename,
        status: upload.upload_status,
        createdAt: upload.created_at
      })) || [],
      
      metadata: {
        generatedAt: new Date().toISOString(),
        dataScope: {
          tenantId: dataScope.tenantId,
          areaId: dataScope.areaId,
          canViewAllAreas: dataScope.canViewAllAreas
        }
      }
    };

    return NextResponse.json({ summary });

  } catch (error) {
    console.error('Error in area-summary endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/manager/area-summary/refresh
 * 
 * Triggers a data refresh and returns updated summary
 * Useful for real-time updates after data changes
 */
export async function POST(request: NextRequest) {
  // For now, just return the same as GET
  // In the future, could implement cache invalidation here
  return GET(request);
}