import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const area_id = searchParams.get('area_id') || profile.area_id
    const tenant_id = searchParams.get('tenant_id') || profile.tenant_id
    const quarter_id = searchParams.get('quarter_id')
    const include_team = searchParams.get('include_team') === 'true'
    const include_updates = searchParams.get('include_updates') === 'true'

    // Verify the user has access to this area
    if (!area_id) {
      return NextResponse.json({ error: 'Area ID is required' }, { status: 400 })
    }

    // Check permissions
    const hasAccess = profile.role === 'Executive' || 
                     profile.role === 'Admin' ||
                     (profile.role === 'Manager' && profile.area_id === area_id)

    if (!hasAccess) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Fetch area details
    const { data: area, error: areaError } = await supabase
      .from('areas')
      .select('*')
      .eq('id', area_id)
      .eq('tenant_id', tenant_id)
      .single()

    if (areaError || !area) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 })
    }

    // Fetch team members if requested
    let teamMembers = []
    if (include_team) {
      const { data: members } = await supabase
        .from('user_profiles')
        .select(`
          *,
          activities:activities!activities_assigned_to_fkey(count)
        `)
        .eq('area_id', area_id)
        .eq('tenant_id', tenant_id)

      if (members) {
        // Get activity statistics for each member
        for (const member of members) {
          const { data: activityStats } = await supabase
            .from('activities')
            .select('is_completed')
            .eq('assigned_to', member.id)

          const completedCount = activityStats?.filter(a => a.is_completed).length || 0
          const totalAssigned = activityStats?.length || 0

          teamMembers.push({
            ...member,
            assigned_activities: totalAssigned,
            completed_activities: completedCount,
            active_initiatives: 0 // Would need additional query
          })
        }
      }
    }

    // Fetch initiatives with progress
    let initiativesQuery = supabase
      .from('initiatives')
      .select(`
        *,
        objective:objectives!initiatives_objective_id_fkey(id, title),
        activities(*)
      `)
      .eq('area_id', area_id)
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })

    const { data: initiatives } = await initiativesQuery

    // Process initiatives
    const processedInitiatives = (initiatives || []).map(initiative => {
      const activities = initiative.activities || []
      const completedActivities = activities.filter((a: any) => a.is_completed).length
      const daysRemaining = initiative.due_date 
        ? Math.floor((new Date(initiative.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : null

      const isAtRisk = (daysRemaining !== null && daysRemaining < 7 && initiative.progress < 80) ||
                       (initiative.progress < 30 && daysRemaining !== null && daysRemaining < 30)

      return {
        ...initiative,
        objective_title: initiative.objective?.title,
        activities_count: activities.length,
        completed_activities: completedActivities,
        days_remaining: daysRemaining,
        is_at_risk: isAtRisk,
        team_members_involved: [...new Set(activities.map((a: any) => a.assigned_to).filter(Boolean))]
      }
    })

    // Fetch objectives
    let objectivesQuery = supabase
      .from('objectives')
      .select(`
        *,
        initiatives(id, progress)
      `)
      .eq('area_id', area_id)
      .eq('tenant_id', tenant_id)

    if (quarter_id) {
      // Filter objectives by quarter
      const { data: quarterObjectives } = await supabase
        .from('objective_quarters')
        .select('objective_id')
        .eq('quarter_id', quarter_id)

      if (quarterObjectives) {
        const objectiveIds = quarterObjectives.map(o => o.objective_id)
        objectivesQuery = objectivesQuery.in('id', objectiveIds)
      }
    }

    const { data: objectives } = await objectivesQuery

    // Process objectives
    const processedObjectives = (objectives || []).map(objective => {
      const initiativesList = objective.initiatives || []
      const overallProgress = initiativesList.length > 0
        ? initiativesList.reduce((sum: number, init: any) => sum + (init.progress || 0), 0) / initiativesList.length
        : 0

      return {
        ...objective,
        initiatives_count: initiativesList.length,
        overall_progress: Math.round(overallProgress),
        is_on_track: overallProgress >= 60
      }
    })

    // Fetch activities
    const { data: activities } = await supabase
      .from('activities')
      .select(`
        *,
        initiative:initiatives!activities_initiative_id_fkey(id, title),
        assigned_user:user_profiles!activities_assigned_to_fkey(id, full_name)
      `)
      .in('initiative_id', processedInitiatives.map(i => i.id))
      .order('created_at', { ascending: false })

    // Process activities
    const processedActivities = (activities || []).map(activity => {
      const daysOverdue = activity.due_date && !activity.is_completed
        ? Math.max(0, Math.floor((new Date().getTime() - new Date(activity.due_date).getTime()) / (1000 * 60 * 60 * 24)))
        : null

      const priority = daysOverdue && daysOverdue > 0 ? 'high' :
                      daysOverdue === 0 ? 'medium' : 'low'

      return {
        ...activity,
        assigned_to_name: activity.assigned_user?.full_name,
        initiative_title: activity.initiative?.title,
        days_overdue: daysOverdue,
        priority
      }
    })

    // Fetch quarters if needed
    let quarters = []
    if (quarter_id) {
      const { data: quarterData } = await supabase
        .from('quarters')
        .select('*')
        .eq('id', quarter_id)
        .eq('tenant_id', tenant_id)

      if (quarterData) {
        quarters = quarterData
      }
    }

    // Calculate statistics
    const statistics = {
      total_team_members: teamMembers.length,
      total_initiatives: processedInitiatives.length,
      total_activities: processedActivities.length,
      completed_activities: processedActivities.filter((a: any) => a.is_completed).length,
      overdue_activities: processedActivities.filter((a: any) => a.days_overdue && a.days_overdue > 0).length,
      average_progress: processedInitiatives.length > 0
        ? Math.round(processedInitiatives.reduce((sum, i) => sum + (i.progress || 0), 0) / processedInitiatives.length)
        : 0,
      team_utilization: processedActivities.length > 0
        ? Math.round((processedActivities.filter((a: any) => a.assigned_to).length / processedActivities.length) * 100)
        : 0,
      initiatives_at_risk: processedInitiatives.filter(i => i.is_at_risk).length,
      upcoming_deadlines: processedActivities.filter((a: any) => {
        if (!a.due_date || a.is_completed) return false
        const daysUntil = Math.floor((new Date(a.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        return daysUntil >= 0 && daysUntil <= 7
      }).length
    }

    // Fetch recent updates if requested
    let recentUpdates = []
    if (include_updates) {
      const { data: auditLogs } = await supabase
        .from('audit_log')
        .select(`
          *,
          user:user_profiles!audit_log_user_id_fkey(id, full_name)
        `)
        .eq('tenant_id', tenant_id)
        .or(`metadata->area_id.eq.${area_id}`)
        .order('created_at', { ascending: false })
        .limit(10)

      if (auditLogs) {
        recentUpdates = auditLogs.map(log => ({
          id: log.id,
          type: log.entity_type,
          title: `${log.action} ${log.entity_type}`,
          description: JSON.stringify(log.changes),
          timestamp: log.created_at,
          user_name: log.user?.full_name,
          impact: 'medium' // Could be calculated based on entity type and action
        }))
      }
    }

    return NextResponse.json({
      area,
      team_members: teamMembers,
      initiatives: processedInitiatives,
      objectives: processedObjectives,
      activities: processedActivities,
      quarters,
      statistics,
      recent_updates: recentUpdates
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/manager-dashboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}