import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Authenticate user - use getUser for server-side
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();
    
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Check if user is CEO or Admin
    if (profile.role !== 'CEO' && profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);

    // Get all areas with their managers
    const { data: areas, error: areasError } = await supabase
      .from('areas')
      .select(`
        id,
        name,
        manager_id,
        manager:user_profiles!areas_manager_id_fkey(
          id,
          full_name,
          email,
          avatar_url
        )
      `)
      
      .eq('is_active', true);

    if (areasError) throw areasError;

    // Get team members count per area
    const { data: teamMembers, error: teamError } = await supabase
      .from('user_profiles')
      .select('area_id')
      
      .not('area_id', 'is', null);

    if (teamError) throw teamError;

    // Get initiatives per area with progress
    const { data: initiatives, error: initiativesError } = await supabase
      .from('initiatives')
      .select(`
        id,
        area_id,
        title,
        progress,
        status,
        due_date
      `)
      ;

    if (initiativesError) throw initiativesError;

    // Get activities completion rate
    // RLS automatically filters by tenant_id
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        is_completed,
        initiative_id,
        initiatives!inner(area_id)
      `);

    if (activitiesError) throw activitiesError;

    // Process data for each area
    const teamPerformance = areas?.map(area => {
      const areaInitiatives = initiatives?.filter(i => i.area_id === area.id) || [];
      const areaActivities = activities?.filter(a => 
        initiatives?.find(i => i.id === a.initiative_id && i.area_id === area.id)
      ) || [];
      
      const teamMemberCount = teamMembers?.filter(tm => tm.area_id === area.id).length || 0;
      const completedActivities = areaActivities.filter(a => a.is_completed).length;
      const totalActivities = areaActivities.length;
      
      const avgProgress = areaInitiatives.length > 0
        ? Math.round(areaInitiatives.reduce((sum, i) => sum + (i.progress || 0), 0) / areaInitiatives.length)
        : 0;

      const overdueInitiatives = areaInitiatives.filter(i => 
        i.due_date && new Date(i.due_date) < new Date() && i.status !== 'completed'
      ).length;

      return {
        area_id: area.id,
        area_name: area.name,
        manager: area.manager,
        team_size: teamMemberCount,
        initiatives: {
          total: areaInitiatives.length,
          completed: areaInitiatives.filter(i => i.status === 'completed').length,
          in_progress: areaInitiatives.filter(i => i.status === 'in_progress').length,
          overdue: overdueInitiatives
        },
        activities: {
          total: totalActivities,
          completed: completedActivities,
          completion_rate: totalActivities > 0 
            ? Math.round((completedActivities / totalActivities) * 100) 
            : 0
        },
        performance: {
          avg_progress: avgProgress,
          efficiency_score: calculateEfficiencyScore(
            avgProgress,
            overdueInitiatives,
            areaInitiatives.length
          ),
          status: getPerformanceStatus(avgProgress, overdueInitiatives)
        }
      };
    }) || [];

    // Calculate overall team performance
    const overallStats = {
      total_areas: teamPerformance.length,
      total_team_members: teamMembers?.length || 0,
      total_initiatives: initiatives?.length || 0,
      avg_completion_rate: teamPerformance.length > 0
        ? Math.round(teamPerformance.reduce((sum, tp) => sum + tp.activities.completion_rate, 0) / teamPerformance.length)
        : 0,
      top_performers: teamPerformance
        .sort((a, b) => b.performance.efficiency_score - a.performance.efficiency_score)
        .slice(0, 3)
        .map(tp => ({
          area_name: tp.area_name,
          manager_name: tp.manager?.full_name || 'Unknown',
          efficiency_score: tp.performance.efficiency_score
        }))
    };

    return NextResponse.json({
      team_performance: teamPerformance,
      overall_stats: overallStats,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error fetching team performance:', error);
    return NextResponse.json(
      { error: 'Failed to fetch team performance data' },
      { status: 500 }
    );
  }
}

function calculateEfficiencyScore(avgProgress: number, overdueCount: number, totalInitiatives: number): number {
  if (totalInitiatives === 0) return 0;
  
  const progressScore = avgProgress;
  const overdueePenalty = overdueCount > 0 ? (overdueCount / totalInitiatives) * 20 : 0;
  
  return Math.max(0, Math.round(progressScore - overdueePenalty));
}

function getPerformanceStatus(avgProgress: number, overdueCount: number): string {
  if (avgProgress >= 80 && overdueCount === 0) return 'excellent';
  if (avgProgress >= 60 && overdueCount <= 1) return 'good';
  if (avgProgress >= 40) return 'average';
  if (overdueCount > 2) return 'at_risk';
  return 'needs_improvement';
}