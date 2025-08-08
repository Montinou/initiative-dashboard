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
      .from('areas')
      .select(`
        id,
        name,
        manager_id,
        created_at,
        updated_at,
        objectives (
          id,
          title,
          description
        ),
        initiatives (
          id,
          title,
          progress
        ),
        user_profiles!areas_manager_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('tenant_id', profile.tenant_id)

    // If manager, filter by their area
    if (profile.role === 'Manager' && profile.area_id) {
      query = query.eq('id', profile.area_id)
    }

    const { data: areas, error } = await query

    if (error) throw error

    // Transform data to include computed fields
    const transformedAreas = areas?.map(area => ({
      ...area,
      manager: area.user_profiles,
      totalObjectives: area.objectives?.length || 0,
      totalInitiatives: area.initiatives?.length || 0,
      averageProgress: area.initiatives?.length > 0
        ? Math.round(area.initiatives.reduce((sum, i) => sum + i.progress, 0) / area.initiatives.length)
        : 0,
      completedInitiatives: area.initiatives?.filter(i => i.progress === 100).length || 0
    }))

    return NextResponse.json(transformedAreas || [])

  } catch (error) {
    console.error('Dashboard areas error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}