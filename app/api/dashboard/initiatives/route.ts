import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

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

    // Build query
    let query = supabase
      .from('initiatives')
      .select(`
        id,
        title,
        description,
        progress,
        start_date,
        due_date,
        area_id,
        created_at,
        updated_at,
        areas (
          id,
          name
        ),
        activities (
          id,
          title,
          is_completed
        ),
        objective_initiatives (
          objectives (
            id,
            title
          )
        )
      `)
      
      .order('created_at', { ascending: false })

    // If manager, filter by area
    if (profile.role === 'Manager' && profile.area_id) {
      query = query.eq('area_id', profile.area_id)
    }

    const { data: initiatives, error } = await query

    if (error) throw error

    // Transform data to include computed fields
    const transformedInitiatives = initiatives?.map(initiative => ({
      ...initiative,
      completedActivities: initiative.activities?.filter(a => a.is_completed).length || 0,
      totalActivities: initiative.activities?.length || 0,
      objectives: initiative.objective_initiatives?.map(oi => oi.objectives).filter(Boolean) || []
    }))

    return NextResponse.json(transformedInitiatives || [])

  } catch (error) {
    console.error('Dashboard initiatives error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}