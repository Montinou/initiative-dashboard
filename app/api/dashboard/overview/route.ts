import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/api-auth-helper'
import { logger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user profile and supabase client
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request)
    
    if (authError || !supabase) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      )
    }
    
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Debug log for tenant_id
    console.log('[Dashboard Overview] User profile:', {
      email: userProfile.email,
      tenant_id: userProfile.tenant_id,
      role: userProfile.role
    })

    // Build query based on user role
    // RLS automatically filters by tenant_id
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

    // If manager, filter by area
    if (userProfile.role === 'Manager' && userProfile.area_id) {
      initiativesQuery = initiativesQuery.eq('area_id', userProfile.area_id)
      areasQuery = areasQuery.eq('id', userProfile.area_id)
    }

    // Execute queries
    const [
      { data: initiatives, error: initiativesError },
      { data: areas, error: areasError }
    ] = await Promise.all([
      initiativesQuery,
      areasQuery
    ])
    
    // Debug log query results
    console.log('[Dashboard Overview] Query results:', {
      initiatives_count: initiatives?.length || 0,
      initiatives_error: initiativesError?.message,
      areas_count: areas?.length || 0,
      areas_error: areasError?.message
    })
    
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
