import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getUserProfile } from '@/lib/server-user-profile'
import { objectiveCreateSchema } from '@/lib/validation/schemas'
import { z } from 'zod'

export async function GET(request: NextRequest) {
  try {
    // Use getUserProfile for authentication
    const { user, userProfile } = await getUserProfile(request)
    
    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const tenant_id = searchParams.get('tenant_id') || userProfile.tenant_id
    const area_id = searchParams.get('area_id')
    const quarter_id = searchParams.get('quarter_id')
    const include_initiatives = searchParams.get('include_initiatives') === 'true'

    // Build query
    let selectQuery = `
      *,
      area:areas!objectives_area_id_fkey(id, name),
      created_by_profile:user_profiles!objectives_created_by_fkey(id, full_name, email)
    `
    
    if (include_initiatives) {
      selectQuery += `, objective_initiatives(initiative_id, initiatives(id, title, progress))`
    }
    
    if (quarter_id) {
      selectQuery += `, objective_quarters!inner(quarter_id)`
    }
    
    let query = supabase
      .from('objectives')
      .select(selectQuery)
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (area_id) {
      query = query.eq('area_id', area_id)
    } else if (userProfile.role === 'Manager' && userProfile.area_id) {
      // Managers only see their area's objectives
      query = query.eq('area_id', userProfile.area_id)
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
    const processedObjectives = objectives?.map(obj => {
      // Extract initiatives from the junction table structure - handle both single object and array
      let initiatives: any[] = []
      if (obj.objective_initiatives) {
        // Handle if it's an array
        if (Array.isArray(obj.objective_initiatives)) {
          initiatives = obj.objective_initiatives
            .map((oi: any) => oi.initiatives)
            .filter(Boolean)
            .flat() // Flatten in case initiatives is also nested
        } else if (obj.objective_initiatives.initiatives) {
          // Handle if it's a single object
          initiatives = [obj.objective_initiatives.initiatives]
        }
      }
      
      return {
        ...obj,
        area_name: obj.area?.name,
        created_by_name: obj.created_by_profile?.full_name,
        initiatives_count: initiatives.length,
        initiatives: include_initiatives ? initiatives : undefined,
        // Calculate overall progress based on linked initiatives
        overall_progress: initiatives.length > 0 
          ? Math.round(initiatives.reduce((sum: number, init: any) => sum + (init.progress || 0), 0) / initiatives.length)
          : 0,
        is_on_track: initiatives.length > 0 
          ? initiatives.reduce((sum: number, init: any) => sum + (init.progress || 0), 0) / initiatives.length >= 70
          : true
      }
    })

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
    // Use getUserProfile for authentication
    const { user, userProfile } = await getUserProfile(request)
    
    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

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

    // Check permissions - only CEO, Admin, and area managers can create objectives
    if (userProfile.role !== 'CEO' && userProfile.role !== 'Admin') {
      if (userProfile.role === 'Manager' && userProfile.area_id !== area_id) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
      if (userProfile.role !== 'Manager') {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
      }
    }

    // Create the objective
    const { data: objective, error: createError } = await supabase
      .from('objectives')
      .insert({
        title,
        description,
        area_id: area_id || userProfile.area_id,
        tenant_id: userProfile.tenant_id,
        created_by: userProfile.id
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
      tenant_id: userProfile.tenant_id,
      user_id: userProfile.id,
      entity_type: 'objective',
      entity_id: objective.id,
      action: 'create',
      changes: {
        title,
        description,
        area_id: area_id || userProfile.area_id
      }
    })

    return NextResponse.json(objective, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in POST /api/objectives:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}