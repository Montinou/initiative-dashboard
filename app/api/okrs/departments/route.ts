import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // Get user session from request
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get auth token from headers
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Get user profile to access tenant_id and role
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check if user has permission to view OKRs
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to view OKR data' },
        { status: 403 }
      );
    }

    const tenantId = userProfile.tenant_id;

    // Get all areas for the tenant
    const { data: areas, error: areasError } = await supabase
      .from('areas')
      .select(`
        id,
        name,
        description,
        initiatives:initiatives(
          id,
          name,
          description,
          progress,
          status,
          priority,
          start_date,
          target_date,
          leader,
          obstacles,
          enablers,
          activities:activities(
            id,
            name,
            description,
            progress,
            status,
            responsible_person,
            due_date
          )
        )
      `)
      .eq('tenant_id', tenantId)
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
      
      // Calculate department metrics
      const totalInitiatives = initiatives.length;
      const completedInitiatives = initiatives.filter(i => i.status === 'completed').length;
      const inProgressInitiatives = initiatives.filter(i => i.status === 'in_progress').length;
      const atRiskInitiatives = initiatives.filter(i => i.status === 'at_risk').length;
      const pausedInitiatives = initiatives.filter(i => i.status === 'paused').length;
      
      // Calculate average progress
      const avgProgress = totalInitiatives > 0 ? 
        Math.round(initiatives.reduce((sum, init) => sum + (init.progress || 0), 0) / totalInitiatives) : 0;
      
      // Get critical initiatives (high priority or at risk)
      const criticalInitiatives = initiatives.filter(i => 
        i.priority === 'high' || i.status === 'at_risk'
      );
      
      // Count total activities across all initiatives
      const totalActivities = initiatives.reduce((sum, init) => 
        sum + (init.activities?.length || 0), 0
      );
      
      // Determine department status
      let departmentStatus = '🟢'; // Green by default
      if (atRiskInitiatives > 0 || avgProgress < 40) {
        departmentStatus = '🔴'; // Red if any at risk or low progress
      } else if (avgProgress < 75 || pausedInitiatives > 0) {
        departmentStatus = '🟡'; // Yellow if medium progress or paused items
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
          atRiskInitiatives,
          pausedInitiatives,
          totalActivities,
          criticalCount: criticalInitiatives.length
        },
        initiatives: initiatives.map(init => ({
          id: init.id,
          name: init.name,
          description: init.description,
          progress: init.progress || 0,
          status: init.status,
          priority: init.priority,
          leader: init.leader,
          startDate: init.start_date,
          targetDate: init.target_date,
          obstacles: init.obstacles,
          enablers: init.enablers,
          activitiesCount: init.activities?.length || 0,
          activities: init.activities || []
        })),
        criticalInitiatives: criticalInitiatives.map(init => ({
          id: init.id,
          name: init.name,
          status: init.status,
          priority: init.priority,
          progress: init.progress || 0,
          leader: init.leader
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