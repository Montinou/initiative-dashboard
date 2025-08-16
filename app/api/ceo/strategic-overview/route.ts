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
    const timeRange = searchParams.get('time_range') || 'month';
    
    // Calculate date range
    const now = new Date();
    const startDate = new Date();
    switch (timeRange) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setMonth(now.getMonth() - 1);
    }

    // Get current quarter
    const { data: currentQuarter } = await supabase
      .from('quarters')
      .select('*')
      
      .lte('start_date', now.toISOString())
      .gte('end_date', now.toISOString())
      .single();

    // Get objectives with progress
    const { data: objectives, error: objectivesError } = await supabase
      .from('objectives')
      .select(`
        id,
        title,
        description,
        progress,
        status,
        priority,
        target_date,
        area_id,
        areas!objectives_area_id_fkey(
          id,
          name
        )
      `)
      
      .gte('created_at', startDate.toISOString());

    if (objectivesError) throw objectivesError;

    // Get initiatives with details
    const { data: initiatives, error: initiativesError } = await supabase
      .from('initiatives')
      .select(`
        id,
        title,
        progress,
        status,
        area_id,
        due_date,
        completion_date,
        areas!initiatives_area_id_fkey(
          id,
          name
        )
      `)
      
      .gte('created_at', startDate.toISOString());

    if (initiativesError) throw initiativesError;

    // Get activities
    const { data: activities, error: activitiesError } = await supabase
      .from('activities')
      .select(`
        id,
        is_completed,
        initiative_id,
        created_at,
        updated_at
      `);

    if (activitiesError) throw activitiesError;

    // Get recent progress history
    const { data: progressHistory, error: progressError } = await supabase
      .from('progress_history')
      .select(`
        id,
        initiative_id,
        completed_activities_count,
        total_activities_count,
        created_at
      `)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .limit(100);

    if (progressError) throw progressError;

    // Calculate strategic metrics
    const totalObjectives = objectives?.length || 0;
    const completedObjectives = objectives?.filter(o => o.status === 'completed').length || 0;
    const highPriorityObjectives = objectives?.filter(o => o.priority === 'high').length || 0;
    const avgObjectiveProgress = totalObjectives > 0
      ? Math.round(objectives.reduce((sum, o) => sum + (o.progress || 0), 0) / totalObjectives)
      : 0;

    const totalInitiatives = initiatives?.length || 0;
    const completedInitiatives = initiatives?.filter(i => i.status === 'completed').length || 0;
    const avgInitiativeProgress = totalInitiatives > 0
      ? Math.round(initiatives.reduce((sum, i) => sum + (i.progress || 0), 0) / totalInitiatives)
      : 0;

    const totalActivities = activities?.length || 0;
    const completedActivities = activities?.filter(a => a.is_completed).length || 0;

    // Calculate completion trends
    const completionTrend = calculateCompletionTrend(initiatives || [], timeRange);
    const progressTrend = calculateProgressTrend(progressHistory || [], timeRange);

    // Get area performance
    const areaPerformance = calculateAreaPerformance(
      objectives || [],
      initiatives || [],
      activities || []
    );

    // Calculate key achievements (recent completions)
    const recentCompletions = initiatives
      ?.filter(i => i.completion_date && new Date(i.completion_date) >= startDate)
      .map(i => ({
        id: i.id,
        title: i.title,
        area: i.areas?.name,
        completed_date: i.completion_date
      }))
      .slice(0, 5) || [];

    // Calculate upcoming milestones
    const upcomingMilestones = [
      ...objectives?.filter(o => 
        o.target_date && 
        new Date(o.target_date) > now && 
        new Date(o.target_date) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      ).map(o => ({
        id: o.id,
        title: o.title,
        type: 'objective',
        due_date: o.target_date,
        area: o.areas?.name
      })) || [],
      ...initiatives?.filter(i => 
        i.due_date && 
        new Date(i.due_date) > now && 
        new Date(i.due_date) <= new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      ).map(i => ({
        id: i.id,
        title: i.title,
        type: 'initiative',
        due_date: i.due_date,
        area: i.areas?.name
      })) || []
    ].sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

    // Build response
    const overview = {
      period: {
        time_range: timeRange,
        start_date: startDate.toISOString(),
        end_date: now.toISOString(),
        current_quarter: currentQuarter?.quarter_name || null
      },
      summary_metrics: {
        objectives: {
          total: totalObjectives,
          completed: completedObjectives,
          completion_rate: totalObjectives > 0 
            ? Math.round((completedObjectives / totalObjectives) * 100) 
            : 0,
          avg_progress: avgObjectiveProgress,
          high_priority_count: highPriorityObjectives
        },
        initiatives: {
          total: totalInitiatives,
          completed: completedInitiatives,
          completion_rate: totalInitiatives > 0 
            ? Math.round((completedInitiatives / totalInitiatives) * 100) 
            : 0,
          avg_progress: avgInitiativeProgress
        },
        activities: {
          total: totalActivities,
          completed: completedActivities,
          completion_rate: totalActivities > 0 
            ? Math.round((completedActivities / totalActivities) * 100) 
            : 0
        }
      },
      trends: {
        completion_trend: completionTrend,
        progress_trend: progressTrend,
        momentum: calculateMomentum(completionTrend)
      },
      area_performance: areaPerformance,
      recent_achievements: recentCompletions,
      upcoming_milestones: upcomingMilestones,
      health_score: calculateHealthScore(
        avgObjectiveProgress,
        avgInitiativeProgress,
        completedActivities,
        totalActivities
      )
    };

    return NextResponse.json(overview);

  } catch (error: any) {
    console.error('Error fetching strategic overview:', error);
    return NextResponse.json(
      { error: 'Failed to fetch strategic overview data' },
      { status: 500 }
    );
  }
}

function calculateCompletionTrend(initiatives: any[], timeRange: string): number[] {
  // Simple trend calculation - could be enhanced
  const periods = timeRange === 'week' ? 7 : timeRange === 'month' ? 4 : 12;
  const trend: number[] = new Array(periods).fill(0);
  
  initiatives.forEach(initiative => {
    if (initiative.completion_date) {
      const completedDate = new Date(initiative.completion_date);
      const now = new Date();
      const daysAgo = Math.floor((now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      let periodIndex = -1;
      if (timeRange === 'week' && daysAgo < 7) {
        periodIndex = 6 - daysAgo;
      } else if (timeRange === 'month' && daysAgo < 30) {
        periodIndex = Math.floor((29 - daysAgo) / 7);
      }
      
      if (periodIndex >= 0 && periodIndex < periods) {
        trend[periodIndex]++;
      }
    }
  });
  
  return trend;
}

function calculateProgressTrend(history: any[], timeRange: string): number[] {
  // Calculate average progress over time periods
  const periods = timeRange === 'week' ? 7 : timeRange === 'month' ? 4 : 12;
  const trend: number[] = new Array(periods).fill(0);
  const counts: number[] = new Array(periods).fill(0);
  
  history.forEach(record => {
    const recordDate = new Date(record.created_at);
    const now = new Date();
    const daysAgo = Math.floor((now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24));
    
    let periodIndex = -1;
    if (timeRange === 'week' && daysAgo < 7) {
      periodIndex = 6 - daysAgo;
    } else if (timeRange === 'month' && daysAgo < 30) {
      periodIndex = Math.floor((29 - daysAgo) / 7);
    }
    
    if (periodIndex >= 0 && periodIndex < periods) {
      const progress = record.total_activities_count > 0
        ? (record.completed_activities_count / record.total_activities_count) * 100
        : 0;
      trend[periodIndex] += progress;
      counts[periodIndex]++;
    }
  });
  
  // Calculate averages
  return trend.map((sum, i) => counts[i] > 0 ? Math.round(sum / counts[i]) : 0);
}

function calculateAreaPerformance(objectives: any[], initiatives: any[], activities: any[]): any[] {
  const areaMap = new Map<string, any>();
  
  // Group by area
  objectives.forEach(obj => {
    const areaName = obj.areas?.name || 'Unknown';
    if (!areaMap.has(areaName)) {
      areaMap.set(areaName, {
        area_name: areaName,
        objectives: [],
        initiatives: [],
        total_progress: 0,
        count: 0
      });
    }
    const area = areaMap.get(areaName);
    area.objectives.push(obj);
    area.total_progress += obj.progress || 0;
    area.count++;
  });
  
  initiatives.forEach(init => {
    const areaName = init.areas?.name || 'Unknown';
    if (!areaMap.has(areaName)) {
      areaMap.set(areaName, {
        area_name: areaName,
        objectives: [],
        initiatives: [],
        total_progress: 0,
        count: 0
      });
    }
    const area = areaMap.get(areaName);
    area.initiatives.push(init);
    area.total_progress += init.progress || 0;
    area.count++;
  });
  
  // Calculate performance metrics
  return Array.from(areaMap.values()).map(area => ({
    area_name: area.area_name,
    metrics: {
      objectives_count: area.objectives.length,
      initiatives_count: area.initiatives.length,
      avg_progress: area.count > 0 ? Math.round(area.total_progress / area.count) : 0,
      completed_objectives: area.objectives.filter((o: any) => o.status === 'completed').length,
      completed_initiatives: area.initiatives.filter((i: any) => i.status === 'completed').length
    }
  }));
}

function calculateMomentum(trend: number[]): string {
  if (trend.length < 2) return 'stable';
  
  const recent = trend.slice(-2);
  const earlier = trend.slice(0, 2);
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  
  if (recentAvg > earlierAvg * 1.2) return 'accelerating';
  if (recentAvg < earlierAvg * 0.8) return 'decelerating';
  return 'stable';
}

function calculateHealthScore(
  objProgress: number,
  initProgress: number,
  completedActivities: number,
  totalActivities: number
): number {
  const activityRate = totalActivities > 0 
    ? (completedActivities / totalActivities) * 100 
    : 0;
  
  // Weighted average
  const score = (objProgress * 0.3) + (initProgress * 0.4) + (activityRate * 0.3);
  
  return Math.round(score);
}