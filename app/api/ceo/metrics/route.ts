import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { getUserProfile } from "@/lib/server-user-profile"

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    // Date range parameters (instead of quarters)
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')
    const timeRange = searchParams.get('time_range') || 'month'
    
    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile with role validation
    const userProfile = await getUserProfile(supabase, user.id)
    
    if (!userProfile || (userProfile.role !== 'CEO' && userProfile.role !== 'Admin')) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    // Build date filter conditions
    let dateFilter = ''
    if (startDate && endDate) {
      dateFilter = `start_date >= '${startDate}' AND due_date <= '${endDate}'`
    } else if (timeRange) {
      const now = new Date()
      let start = new Date()
      
      switch (timeRange) {
        case 'week':
          start.setDate(now.getDate() - 7)
          break
        case 'month':
          start.setMonth(now.getMonth() - 1)
          break
        case 'quarter':
          start.setMonth(now.getMonth() - 3)
          break
        case 'year':
          start.setFullYear(now.getFullYear() - 1)
          break
      }
      
      dateFilter = `start_date >= '${start.toISOString().split('T')[0]}'`
    }

    // Fetch comprehensive metrics data
    const [
      initiativesResult,
      objectivesResult,
      areasResult,
      usersResult,
      progressHistoryResult
    ] = await Promise.all([
      // Initiatives with detailed stats
      supabase
        .from('initiatives')
        .select(`
          id,
          title,
          progress,
          status,
          start_date,
          due_date,
          completion_date,
          created_at,
          updated_at,
          area:areas(id, name),
          activities:activities(id, is_completed),
          objective_initiatives:objective_initiatives(
            objective:objectives(id, title)
          )
        `)
        .eq('tenant_id', userProfile.tenant_id)
        .gte('created_at', dateFilter ? undefined : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),

      // Objectives with progress
      supabase
        .from('objectives')
        .select(`
          id,
          title,
          status,
          priority,
          progress,
          start_date,
          end_date,
          target_date,
          created_at,
          area:areas(id, name),
          objective_initiatives:objective_initiatives(
            initiative:initiatives(id, progress, status)
          )
        `)
        .eq('tenant_id', userProfile.tenant_id),

      // Areas with team information
      supabase
        .from('areas')
        .select(`
          id,
          name,
          description,
          is_active,
          manager:user_profiles!areas_manager_id_fkey(id, full_name, email),
          initiatives:initiatives(id, status, progress),
          objectives:objectives(id, status, progress),
          team_members:user_profiles!user_profiles_area_id_fkey(id, full_name, role)
        `)
        .eq('tenant_id', userProfile.tenant_id)
        .eq('is_active', true),

      // Active users count
      supabase
        .from('user_profiles')
        .select('id, role, is_active, last_login')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('is_active', true),

      // Recent progress updates
      supabase
        .from('progress_history')
        .select(`
          id,
          completed_activities_count,
          total_activities_count,
          notes,
          created_at,
          updated_by:user_profiles(full_name),
          initiative:initiatives(id, title, area:areas(name))
        `)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10)
    ])

    const initiatives = initiativesResult.data || []
    const objectives = objectivesResult.data || []
    const areas = areasResult.data || []
    const users = usersResult.data || []
    const recentProgress = progressHistoryResult.data || []

    // Calculate comprehensive metrics
    const totalInitiatives = initiatives.length
    const completedInitiatives = initiatives.filter(i => i.status === 'completed').length
    const inProgressInitiatives = initiatives.filter(i => i.status === 'in_progress').length
    const overDueInitiatives = initiatives.filter(i => 
      i.due_date && new Date(i.due_date) < new Date() && i.status !== 'completed'
    ).length

    const totalObjectives = objectives.length
    const completedObjectives = objectives.filter(o => o.status === 'completed').length
    const onTrackObjectives = objectives.filter(o => o.progress >= 75 && o.status !== 'completed').length

    const averageProgress = initiatives.length > 0 
      ? Math.round(initiatives.reduce((sum, i) => sum + (i.progress || 0), 0) / initiatives.length)
      : 0

    const teamMembers = users.length
    const activeAreas = areas.filter(a => a.is_active).length

    // Calculate trends (simplified - compare with previous period)
    const now = new Date()
    const previousPeriodStart = new Date()
    previousPeriodStart.setDate(now.getDate() - (timeRange === 'week' ? 14 : timeRange === 'month' ? 60 : 90))

    const previousInitiatives = initiatives.filter(i => 
      new Date(i.created_at) < previousPeriodStart
    )
    
    const initiativesTrend = previousInitiatives.length > 0 
      ? Math.round(((totalInitiatives - previousInitiatives.length) / previousInitiatives.length) * 100)
      : 0

    // Risk analysis
    const atRiskInitiatives = initiatives.filter(i => {
      if (i.status === 'completed') return false
      if (!i.due_date) return false
      
      const dueDate = new Date(i.due_date)
      const today = new Date()
      const daysUntilDue = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      
      return (i.progress || 0) < 50 && daysUntilDue <= 30
    })

    // Performance insights
    const insights = []
    
    if (completedInitiatives / totalInitiatives > 0.8) {
      insights.push(`Excellent completion rate of ${Math.round((completedInitiatives / totalInitiatives) * 100)}%`)
    } else if (completedInitiatives / totalInitiatives < 0.4) {
      insights.push(`Low completion rate of ${Math.round((completedInitiatives / totalInitiatives) * 100)}% needs attention`)
    }

    if (atRiskInitiatives.length > 0) {
      insights.push(`${atRiskInitiatives.length} initiatives are at risk and need immediate attention`)
    }

    if (overDueInitiatives.length > 0) {
      insights.push(`${overDueInitiatives.length} initiatives are overdue`)
    }

    const topPerformingArea = areas.reduce((best, area) => {
      const areaProgress = area.initiatives?.reduce((sum: number, init: any) => sum + (init.progress || 0), 0) || 0
      const avgProgress = area.initiatives?.length ? areaProgress / area.initiatives.length : 0
      
      return avgProgress > (best.avgProgress || 0) ? { ...area, avgProgress } : best
    }, { avgProgress: 0 })

    if (topPerformingArea.name) {
      insights.push(`${topPerformingArea.name} is the top performing area with ${Math.round(topPerformingArea.avgProgress)}% average progress`)
    }

    // Area performance breakdown
    const areaBreakdown = areas.map(area => {
      const areaInitiatives = initiatives.filter(i => i.area?.id === area.id)
      const areaObjectives = objectives.filter(o => o.area?.id === area.id)
      
      return {
        id: area.id,
        name: area.name,
        manager: area.manager?.full_name || 'Unassigned',
        totalInitiatives: areaInitiatives.length,
        completedInitiatives: areaInitiatives.filter(i => i.status === 'completed').length,
        averageProgress: areaInitiatives.length > 0 
          ? Math.round(areaInitiatives.reduce((sum, i) => sum + (i.progress || 0), 0) / areaInitiatives.length)
          : 0,
        totalObjectives: areaObjectives.length,
        completedObjectives: areaObjectives.filter(o => o.status === 'completed').length,
        teamMembers: area.team_members?.length || 0,
        atRisk: areaInitiatives.filter(i => {
          if (!i.due_date || i.status === 'completed') return false
          const daysUntilDue = Math.ceil((new Date(i.due_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          return (i.progress || 0) < 50 && daysUntilDue <= 30
        }).length
      }
    })

    // Timeline data for charts
    const timelineData = recentProgress.map(p => ({
      date: p.created_at.split('T')[0],
      initiative: p.initiative?.title || 'Unknown',
      area: p.initiative?.area?.name || 'Unknown',
      progress: Math.round((p.completed_activities_count / p.total_activities_count) * 100),
      notes: p.notes
    }))

    const metrics = {
      totalInitiatives,
      completedInitiatives,
      inProgressInitiatives,
      overDueInitiatives,
      averageProgress,
      totalObjectives,
      completedObjectives,
      onTrackObjectives,
      activeAreas,
      teamMembers,
      atRiskCount: atRiskInitiatives.length,
      completionRate: Math.round((completedInitiatives / totalInitiatives) * 100),
      onTrackPercentage: Math.round((onTrackObjectives / totalObjectives) * 100),
      trends: {
        initiatives: initiativesTrend,
        objectives: Math.round(((totalObjectives - objectives.filter(o => new Date(o.created_at) < previousPeriodStart).length) / totalObjectives) * 100),
        progress: averageProgress > 70 ? 5 : averageProgress < 40 ? -3 : 2
      },
      insights,
      areaBreakdown,
      timelineData,
      recentActivity: recentProgress.slice(0, 5).map(p => ({
        id: p.id,
        title: `${p.initiative?.title} progress updated`,
        description: p.notes || `Progress: ${Math.round((p.completed_activities_count / p.total_activities_count) * 100)}%`,
        area: p.initiative?.area?.name,
        timestamp: p.created_at,
        updatedBy: p.updated_by?.full_name
      })),
      // Additional CEO-specific metrics
      efficiency: Math.round((completedInitiatives / totalInitiatives) * 100),
      utilization: Math.round((inProgressInitiatives / totalInitiatives) * 100),
      riskScore: atRiskInitiatives.length + overDueInitiatives.length,
      performanceScore: Math.round(
        (completedInitiatives / totalInitiatives * 0.4 + 
         averageProgress / 100 * 0.3 + 
         (1 - atRiskInitiatives.length / totalInitiatives) * 0.3) * 100
      )
    }

    return NextResponse.json(metrics)

  } catch (error) {
    console.error('CEO metrics error:', error)
    return NextResponse.json(
      { error: "Failed to fetch CEO metrics" },
      { status: 500 }
    )
  }
}