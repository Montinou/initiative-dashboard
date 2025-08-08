import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getUserProfile } from '@/lib/server-user-profile'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user and get profile - pass request parameter for consistency
    const userProfile = await getUserProfile(request)
    
    if (!userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Create Supabase client
    const supabase = await createClient()

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const search = searchParams.get('search') || ''
    const includeStats = searchParams.get('includeStats') === 'true'

    const offset = (page - 1) * limit

    // Build query for areas in the same tenant
    let query = supabase
      .from('areas')
      .select(`
        id,
        name,
        manager_id,
        created_at,
        updated_at
      `, { count: 'exact' })
      .eq('tenant_id', userProfile.tenant_id)
      .order('created_at', { ascending: false })

    // Apply search filter
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    // Get paginated results with count
    const { data: areas, error: areasError, count: totalCount } = await query
      .range(offset, offset + limit - 1)

    if (areasError) {
      console.error('Areas query error:', areasError)
      return NextResponse.json({ error: 'Failed to fetch areas' }, { status: 500 })
    }

    let areasWithStats = areas || []

    // If stats are requested, get initiative data for each area
    if (includeStats && areas && areas.length > 0) {
      const areaIds = areas.map(area => area.id)
      
      const { data: initiativeData, error: statsError } = await supabase
        .from('initiatives')
        .select('area_id, status, progress')
        .in('area_id', areaIds)
        .eq('tenant_id', userProfile.tenant_id)

      if (!statsError && initiativeData) {
        // Group by area_id and calculate stats
        const statsByArea = initiativeData.reduce((acc, initiative) => {
          if (!acc[initiative.area_id]) {
            acc[initiative.area_id] = {
              total: 0,
              planning: 0,
              in_progress: 0,
              completed: 0,
              on_hold: 0,
              totalProgress: 0,
              averageProgress: 0
            }
          }
          acc[initiative.area_id].total++
          acc[initiative.area_id][initiative.status] = (acc[initiative.area_id][initiative.status] || 0) + 1
          acc[initiative.area_id].totalProgress += initiative.progress || 0
          return acc
        }, {} as Record<string, any>)

        // Calculate average progress for each area
        Object.keys(statsByArea).forEach(areaId => {
          const stats = statsByArea[areaId]
          stats.averageProgress = stats.total > 0 ? Math.round(stats.totalProgress / stats.total) : 0
        })

        // Add stats to areas
        areasWithStats = areas.map(area => ({
          ...area,
          manager: null, // Manager relationship not available in current schema
          stats: statsByArea[area.id] || {
            total: 0,
            planning: 0,
            in_progress: 0,
            completed: 0,
            on_hold: 0,
            totalProgress: 0,
            averageProgress: 0
          }
        }))
      }
    }

    return NextResponse.json({
      areas: areasWithStats,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages: Math.ceil((totalCount || 0) / limit)
      }
    })

  } catch (error) {
    console.error('Areas API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Authenticate user and get profile - pass request parameter for consistency
    const userProfile = await getUserProfile(request)
    
    if (!userProfile) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Only CEO and Admin roles can create areas
    if (!['CEO', 'Admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, manager_id } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // Create Supabase client
    const supabase = await createClient()

    // If manager_id is provided, verify it's a valid user in the same tenant
    if (manager_id) {
      const { data: manager, error: managerError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', manager_id)
        .eq('tenant_id', userProfile.tenant_id)
        // .eq('is_active', true)  // Column doesn't exist in current schema
        .single()

      if (managerError || !manager) {
        return NextResponse.json({ 
          error: 'Invalid manager ID or manager not found' 
        }, { status: 400 })
      }
    }

    const { data: newArea, error: createError } = await supabase
      .from('areas')
      .insert({
        tenant_id: userProfile.tenant_id,
        name: name.trim(),
        manager_id: manager_id || null
      })
      .select('*')
      .single()

    if (createError) {
      console.error('Area creation error:', createError)
      return NextResponse.json({ error: 'Failed to create area' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Area created successfully',
      area: newArea
    }, { status: 201 })

  } catch (error) {
    console.error('Create area error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
