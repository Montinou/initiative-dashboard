import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { logger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('tenant_id, role, area_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Build query based on user role
    let initiativesQuery = supabase
      .from('initiatives')
      .select(`
        id,
        title,
        description,
        progress,
        start_date,
        due_date,
        area_id,
        areas (
          id,
          name
        )
      `)
      .eq('tenant_id', profile.tenant_id)

    let areasQuery = supabase
      .from('areas')
      .select(`
        id,
        name,
        manager_id,
        objectives (
          id,
          title
        )
      `)
      .eq('tenant_id', profile.tenant_id)

    // If manager, filter by area
    if (profile.role === 'Manager' && profile.area_id) {
      initiativesQuery = initiativesQuery.eq('area_id', profile.area_id)
      areasQuery = areasQuery.eq('id', profile.area_id)
    }

    // Execute queries
    const [
      { data: initiatives, error: initiativesError },
      { data: areas, error: areasError }
    ] = await Promise.all([
      initiativesQuery,
      areasQuery
    ])
    
    // Get activities for the tenant's initiatives only
    let activities: any[] = []
    if (initiatives && initiatives.length > 0) {
      const initiativeIds = initiatives.map(i => i.id)
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('activities')
        .select('id, is_completed, initiative_id')
        .in('initiative_id', initiativeIds)
      
      activities = activitiesData || []
    }

    if (initiativesError) throw initiativesError
    if (areasError) throw areasError

    // Calculate statistics
    const totalInitiatives = initiatives?.length || 0
    const completedInitiatives = initiatives?.filter(i => i.progress === 100).length || 0
    const inProgressInitiatives = initiatives?.filter(i => i.progress > 0 && i.progress < 100).length || 0
    const averageProgress = totalInitiatives > 0 
      ? Math.round(initiatives.reduce((sum, i) => sum + i.progress, 0) / totalInitiatives)
      : 0

    return NextResponse.json({
      initiatives: initiatives || [],
      areas: areas || [],
      activities: activities || [],
      stats: {
        totalInitiatives,
        completedInitiatives,
        inProgressInitiatives,
        averageProgress,
        totalAreas: areas?.length || 0,
        totalActivities: activities?.length || 0,
        completedActivities: activities?.filter(a => a.is_completed).length || 0
      }
    })

  } catch (error) {
    logger.error('Dashboard overview error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
