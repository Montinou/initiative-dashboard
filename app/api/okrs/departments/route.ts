import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserProfile } from '@/lib/server-user-profile';

export async function GET(request: NextRequest) {
  try {
    // Authenticate user and get profile
    const { user, userProfile } = await getUserProfile();
    
    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('OKR Departments API - User info:', {
      userId: userProfile.id,
      email: userProfile.email,
      userTenantId: userProfile.tenant_id,
      role: userProfile.role
    });

    // Check if user has permission to view OKRs (CEO, Admin, Manager can view)
    if (!['CEO', 'Admin', 'Manager'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view OKR data' },
        { status: 403 }
      );
    }

    // Create Supabase client
    const supabase = await createClient();

    // Use user's actual tenant_id for secure tenant isolation
    const tenantId = userProfile.tenant_id;

    // Get all areas for the tenant (simplified query to avoid complex joins)
    const { data: areas, error: areasError } = await supabase
      .from('areas')
      .select('id, name, description')
      .eq('tenant_id', tenantId)
      .order('name');

    console.log('Areas query result:', {
      userTenantId: userProfile.tenant_id,
      domainTenantId: tenantId,
      areasCount: areas?.length || 0,
      error: areasError?.message
    });

    if (areasError) {
      console.error('Database error:', areasError);
      return NextResponse.json(
        { error: 'Database connection failed' },
        { status: 500 }
      );
    }

    if (!areas || areas.length === 0) {
      return NextResponse.json(
        { error: 'No areas found for tenant' },
        { status: 404 }
      );
    }

    // Get all initiatives for these areas
    const { data: initiatives, error: initiativesError } = await supabase
      .from('initiatives')
      .select(`
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
        area_id
      `)
      .eq('tenant_id', tenantId)
      .in('area_id', areas.map(area => area.id));

    if (initiativesError) {
      console.error('Initiatives fetch error:', initiativesError);
      return NextResponse.json(
        { error: 'Failed to fetch initiatives' },
        { status: 500 }
      );
    }

    // Get all activities for these initiatives
    const initiativeIds = initiatives?.map(init => init.id) || [];
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        title,
        description,
        progress,
        status,
        assigned_to,
        due_date,
        initiative_id
      `)
      .in('initiative_id', initiativeIds);

    if (activitiesError) {
      console.error('Activities fetch error:', activitiesError);
      // Don't fail if activities can't be fetched, just continue without them
    }

    // Get user profiles for owners and assignees
    const userIds = [
      ...(initiatives?.map(init => init.owner_id).filter(Boolean) || []),
      ...(activities?.map(act => act.assigned_to).filter(Boolean) || [])
    ];
    const uniqueUserIds = [...new Set(userIds)];
    
    const { data: userProfiles, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, full_name, email')
      .in('id', uniqueUserIds);

    if (usersError) {
      console.error('User profiles fetch error:', usersError);
      // Don't fail if user profiles can't be fetched
    }

    // Create user lookup map
    const userMap = (userProfiles || []).reduce((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {} as Record<string, any>);

    // Group initiatives by area
    const initiativesByArea = (initiatives || []).reduce((acc, init) => {
      if (!acc[init.area_id]) {
        acc[init.area_id] = [];
      }
      acc[init.area_id].push(init);
      return acc;
    }, {} as Record<string, any[]>);

    // Group activities by initiative
    const activitiesByInitiative = (activities || []).reduce((acc, activity) => {
      if (!acc[activity.initiative_id]) {
        acc[activity.initiative_id] = [];
      }
      acc[activity.initiative_id].push(activity);
      return acc;
    }, {} as Record<string, any[]>);

    // Transform data for OKR dashboard
    const departmentOKRs = areas.map(area => {
      const areaInitiatives = initiativesByArea[area.id] || [];
      
      // Calculate department metrics using correct schema statuses
      const totalInitiatives = areaInitiatives.length;
      const completedInitiatives = areaInitiatives.filter(i => i.status === 'completed').length;
      const inProgressInitiatives = areaInitiatives.filter(i => i.status === 'in_progress').length;
      const planningInitiatives = areaInitiatives.filter(i => i.status === 'planning').length;
      const onHoldInitiatives = areaInitiatives.filter(i => i.status === 'on_hold').length;
      
      // Calculate average progress
      const avgProgress = totalInitiatives > 0 ? 
        Math.round(areaInitiatives.reduce((sum, init) => sum + (init.progress || 0), 0) / totalInitiatives) : 0;
      
      // Get critical initiatives (high priority or on hold)
      const criticalInitiatives = areaInitiatives.filter(i => 
        i.priority === 'high' || i.status === 'on_hold'
      );
      
      // Count total activities across all initiatives
      const totalActivities = areaInitiatives.reduce((sum, init) => 
        sum + (activitiesByInitiative[init.id]?.length || 0), 0
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
        initiatives: areaInitiatives.map(init => {
          const initActivities = activitiesByInitiative[init.id] || [];
          const owner = userMap[init.owner_id];
          
          return {
            id: init.id,
            name: init.title, // Use title from schema
            description: init.description,
            progress: init.progress || 0,
            status: init.status,
            priority: init.priority,
            leader: owner?.full_name || owner?.email || 'Unassigned',
            startDate: init.created_at,
            targetDate: init.target_date,
            completionDate: init.completion_date,
            obstacles: init.metadata?.obstacles || '',
            enablers: init.metadata?.enablers || '',
            activitiesCount: initActivities.length,
            activities: initActivities.map(activity => {
              const assignee = userMap[activity.assigned_to];
              return {
                id: activity.id,
                title: activity.title,
                description: activity.description,
                progress: activity.progress || 0,
                status: activity.status,
                responsiblePerson: assignee?.full_name || 'Unassigned',
                dueDate: activity.due_date
              };
            })
          };
        }),
        criticalInitiatives: criticalInitiatives.map(init => {
          const owner = userMap[init.owner_id];
          return {
            id: init.id,
            name: init.title,
            status: init.status,
            priority: init.priority,
            progress: init.progress || 0,
            leader: owner?.full_name || owner?.email || 'Unassigned'
          };
        })
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