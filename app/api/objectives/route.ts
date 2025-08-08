import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { objectiveCreateSchema } from '@/lib/validation/schemas'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile for tenant context
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const tenant_id = searchParams.get('tenant_id') || profile.tenant_id
    const area_id = searchParams.get('area_id')
    const quarter_id = searchParams.get('quarter_id')
    const include_initiatives = searchParams.get('include_initiatives') === 'true'

    // Build query
    let query = supabase
      .from('objectives')
      .select(`
        *,
        area:areas!objectives_area_id_fkey(id, name),
        created_by_profile:user_profiles!objectives_created_by_fkey(id, full_name, email)
        ${include_initiatives ? ', initiatives(*)' : ''}
        ${quarter_id ? ', objective_quarters!inner(quarter_id)' : ''}
      `)
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (area_id) {
      query = query.eq('area_id', area_id)
    } else if (profile.role === 'Manager' && profile.area_id) {
      // Managers only see their area's objectives
      query = query.eq('area_id', profile.area_id)
    }

    if (quarter_id) {
      query = query.eq('objective_quarters.quarter_id', quarter_id)
    }

    const { data: objectives, error } = await query

    if (error) {
      console.error('Error fetching objectives:', error)
      return NextResponse.json({ error: 'Failed to fetch objectives' }, { status: 500 })
    }

    // Process objectives to include additional metadata
    const processedObjectives = objectives?.map(obj => ({
      ...obj,
      area_name: obj.area?.name,
      created_by_name: obj.created_by_profile?.full_name,
      initiatives_count: obj.initiatives?.length || 0
    }))

    return NextResponse.json({ 
      objectives: processedObjectives || [],
      total: processedObjectives?.length || 0
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/objectives:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 })
    }

    // Parse and validate request body
    const body = await request.json()
    
    // Validate input
    const validationResult = objectiveCreateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { title, description, area_id, quarter_ids } = validationResult.data

    // Check permissions - only Executives, Admins, and area managers can create objectives
    if (profile.role !== 'Executive' && profile.role !== 'Admin') {
      if (profile.role === 'Manager' && profile.area_id !== area_id) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
      if (profile.role !== 'Manager') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Create the objective
    const { data: objective, error: createError } = await supabase
      .from('objectives')
      .insert({
        title,
        description,
        area_id: area_id || profile.area_id,
        tenant_id: profile.tenant_id,
        created_by: profile.id
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating objective:', createError)
      return NextResponse.json({ error: 'Failed to create objective' }, { status: 500 })
    }

    // Link to quarters if provided
    if (quarter_ids && quarter_ids.length > 0) {
      const quarterLinks = quarter_ids.map(quarter_id => ({
        objective_id: objective.id,
        quarter_id
      }))

      const { error: linkError } = await supabase
        .from('objective_quarters')
        .insert(quarterLinks)

      if (linkError) {
        console.error('Error linking objective to quarters:', linkError)
        // Non-critical error, objective was created
      }
    }

    // Log the action in audit log
    await supabase.from('audit_log').insert({
      tenant_id: profile.tenant_id,
      user_id: profile.id,
      entity_type: 'objective',
      entity_id: objective.id,
      action: 'create',
      changes: {
        title,
        description,
        area_id: area_id || profile.area_id
      }
    })

    return NextResponse.json(objective, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in POST /api/objectives:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}