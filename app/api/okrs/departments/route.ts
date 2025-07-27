import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { authenticateUser, hasRole } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode });
    }

    const currentUser = authResult.user!;

    // Check if user has permission to view OKRs (CEO, Admin, Manager can view)
    if (!hasRole(currentUser, ['CEO', 'Admin', 'Manager'])) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view OKR data' },
        { status: 403 }
      );
    }

    // Get all areas for the tenant with proper schema fields
    const { data: areas, error: areasError } = await supabase
      .from('areas')
      .select(`
        id,
        name,
        description,
        initiatives:initiatives(
          id,
          title,
          description,
          progress,
          status,
          priority,
          created_at,
          target_date,
          completion_date,
          owner_id,
          metadata,
          user_profiles!initiatives_owner_id_fkey(
            full_name,
            email
          ),
          activities:activities(
            id,
            title,
            description,
            progress,
            status,
            assigned_to,
            due_date,
            user_profiles!activities_assigned_to_fkey(
              full_name
            )
          )
        )
      `)
      .eq('tenant_id', currentUser.tenant_id)
      .order('name');

    if (areasError) {
      console.error('Database error:', areasError);
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    if (!areas) {
      return NextResponse.json(
        { error: 'No areas found for tenant' },
        { status: 404 }
      );
    }

    // Transform data for OKR dashboard
    const departmentOKRs = areas.map(area => {
      const initiatives = area.initiatives || [];
      
      // Calculate department metrics using correct schema statuses
      const totalInitiatives = initiatives.length;
      const completedInitiatives = initiatives.filter(i => i.status === 'completed').length;
      const inProgressInitiatives = initiatives.filter(i => i.status === 'in_progress').length;
      const planningInitiatives = initiatives.filter(i => i.status === 'planning').length;
      const onHoldInitiatives = initiatives.filter(i => i.status === 'on_hold').length;
      
      // Calculate average progress
      const avgProgress = totalInitiatives > 0 ? 
        Math.round(initiatives.reduce((sum, init) => sum + (init.progress || 0), 0) / totalInitiatives) : 0;
      
      // Get critical initiatives (high priority or on hold)
      const criticalInitiatives = initiatives.filter(i => 
        i.priority === 'high' || i.status === 'on_hold'
      );
      
      // Count total activities across all initiatives
      const totalActivities = initiatives.reduce((sum, init) => 
        sum + (init.activities?.length || 0), 0
      );
      
      // Determine department status
      let departmentStatus = '🟢'; // Green by default
      if (onHoldInitiatives > 0 || avgProgress < 40) {
        departmentStatus = '🔴'; // Red if any on hold or low progress
      } else if (avgProgress < 75 || planningInitiatives > totalInitiatives * 0.3) {
        departmentStatus = '🟡'; // Yellow if medium progress or too many in planning
      }
      
      return {
        id: area.id,
        name: area.name,
        description: area.description,
        status: departmentStatus,
        progress: avgProgress,
        metrics: {
          totalInitiatives,
          completedInitiatives,
          inProgressInitiatives,
          planningInitiatives,
          onHoldInitiatives,
          totalActivities,
          criticalCount: criticalInitiatives.length
        },
        initiatives: initiatives.map(init => ({
          id: init.id,
          name: init.title, // Use title from schema
          description: init.description,
          progress: init.progress || 0,
          status: init.status,
          priority: init.priority,
          leader: init.user_profiles?.full_name || init.user_profiles?.email || 'Unassigned',
          startDate: init.created_at,
          targetDate: init.target_date,
          completionDate: init.completion_date,
          obstacles: init.metadata?.obstacles || '',
          enablers: init.metadata?.enablers || '',
          activitiesCount: init.activities?.length || 0,
          activities: (init.activities || []).map(activity => ({
            id: activity.id,
            title: activity.title,
            description: activity.description,
            progress: activity.progress || 0,
            status: activity.status,
            responsiblePerson: activity.user_profiles?.full_name || 'Unassigned',
            dueDate: activity.due_date
          }))
        })),
        criticalInitiatives: criticalInitiatives.map(init => ({
          id: init.id,
          name: init.title,
          status: init.status,
          priority: init.priority,
          progress: init.progress || 0,
          leader: init.user_profiles?.full_name || init.user_profiles?.email || 'Unassigned'
        }))
      };
    });

    // Calculate tenant-wide summary
    const tenantSummary = {
      totalDepartments: departmentOKRs.length,
      totalInitiatives: departmentOKRs.reduce((sum, dept) => sum + dept.metrics.totalInitiatives, 0),
      totalActivities: departmentOKRs.reduce((sum, dept) => sum + dept.metrics.totalActivities, 0),
      avgTenantProgress: departmentOKRs.length > 0 ? 
        Math.round(departmentOKRs.reduce((sum, dept) => sum + dept.progress, 0) / departmentOKRs.length) : 0,
      departmentsByStatus: {
        green: departmentOKRs.filter(d => d.status === '🟢').length,
        yellow: departmentOKRs.filter(d => d.status === '🟡').length,
        red: departmentOKRs.filter(d => d.status === '🔴').length
      },
      criticalInitiatives: departmentOKRs.reduce((sum, dept) => sum + dept.metrics.criticalCount, 0)
    };

    return NextResponse.json({
      success: true,
      data: {
        departments: departmentOKRs,
        summary: tenantSummary,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('OKR departments API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}