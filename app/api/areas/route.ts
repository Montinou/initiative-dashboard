import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { authenticateUser, hasRole, validateInput } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode })
    }

    const currentUser = authResult.user!

    // Create Supabase client
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

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
        description,
        manager_id,
        is_active,
        created_at,
        updated_at,
        user_profiles!areas_manager_id_fkey(
          id,
          full_name,
          email
        )
      `, { count: 'exact' })
      .eq('tenant_id', currentUser.tenant_id)
      .order('created_at', { ascending: false })

    // Apply search filter
    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
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
        .select('area_id, status, progress_percentage')
        .in('area_id', areaIds)
        .eq('tenant_id', currentUser.tenant_id)

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
          acc[initiative.area_id].totalProgress += initiative.progress_percentage || 0
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
    // Authenticate user
    const authResult = await authenticateUser(request)
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.statusCode })
    }

    const currentUser = authResult.user!

    // Create Supabase client
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)

    // Only CEO and Admin roles can create areas
    if (!hasRole(currentUser, ['CEO', 'Admin'])) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, manager_id } = body

    // Validate input
    const validation = validateInput(body, ['name'])
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // If manager_id is provided, verify it's a valid user in the same tenant
    if (manager_id) {
      const { data: manager, error: managerError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', manager_id)
        .eq('tenant_id', currentUser.tenant_id)
        .eq('is_active', true)
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
        tenant_id: currentUser.tenant_id,
        name: name.trim(),
        description: description?.trim() || null,
        manager_id: manager_id || null,
        is_active: true
      })
      .select(`
        *,
        user_profiles!areas_manager_id_fkey(
          id,
          full_name,
          email
        )
      `)
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