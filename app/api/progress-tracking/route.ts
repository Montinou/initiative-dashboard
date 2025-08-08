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
    const tenant_id = searchParams.get('tenant_id') || profile.tenant_id
    const initiative_id = searchParams.get('initiative_id')
    const area_id = searchParams.get('area_id')
    const objective_id = searchParams.get('objective_id')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const limit = parseInt(searchParams.get('limit') || '100')

    // Build query
    let query = supabase
      .from('initiative_progress_history')
      .select(`
        *,
        initiative:initiatives!initiative_progress_history_initiative_id_fkey(
          id,
          title,
          area_id,
          objective_id
        ),
        changed_by_profile:user_profiles!initiative_progress_history_changed_by_fkey(
          id,
          full_name,
          email
        )
      `)
      .order('changed_at', { ascending: false })
      .limit(limit)

    // Apply filters based on tenant context
    if (initiative_id) {
      query = query.eq('initiative_id', initiative_id)
    } else {
      // Need to filter by tenant through initiatives
      const { data: tenantInitiatives } = await supabase
        .from('initiatives')
        .select('id')
        .eq('tenant_id', tenant_id)
      
      if (tenantInitiatives && tenantInitiatives.length > 0) {
        const initiativeIds = tenantInitiatives.map(i => i.id)
        query = query.in('initiative_id', initiativeIds)
      }
    }

    // Filter by area if provided
    if (area_id) {
      const { data: areaInitiatives } = await supabase
        .from('initiatives')
        .select('id')
        .eq('area_id', area_id)
        .eq('tenant_id', tenant_id)
      
      if (areaInitiatives && areaInitiatives.length > 0) {
        const initiativeIds = areaInitiatives.map(i => i.id)
        query = query.in('initiative_id', initiativeIds)
      }
    }

    // Filter by objective if provided
    if (objective_id) {
      const { data: objectiveInitiatives } = await supabase
        .from('initiatives')
        .select('id')
        .eq('objective_id', objective_id)
        .eq('tenant_id', tenant_id)
      
      if (objectiveInitiatives && objectiveInitiatives.length > 0) {
        const initiativeIds = objectiveInitiatives.map(i => i.id)
        query = query.in('initiative_id', initiativeIds)
      }
    }

    // Date filters
    if (date_from) {
      query = query.gte('changed_at', date_from)
    }
    if (date_to) {
      query = query.lte('changed_at', date_to)
    }

    // Managers only see their area's progress
    if (profile.role === 'Manager' && profile.area_id) {
      const { data: managerInitiatives } = await supabase
        .from('initiatives')
        .select('id')
        .eq('area_id', profile.area_id)
        .eq('tenant_id', tenant_id)
      
      if (managerInitiatives && managerInitiatives.length > 0) {
        const initiativeIds = managerInitiatives.map(i => i.id)
        query = query.in('initiative_id', initiativeIds)
      }
    }

    const { data: history, error } = await query

    if (error) {
      console.error('Error fetching progress history:', error)
      return NextResponse.json({ error: 'Failed to fetch progress history' }, { status: 500 })
    }

    return NextResponse.json({ 
      history: history || [],
      total: history?.length || 0
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/progress-tracking:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json()
    const { initiative_id, progress_value, change_notes } = body

    // Validate required fields
    if (!initiative_id || progress_value === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: initiative_id, progress_value' },
        { status: 400 }
      )
    }

    // Validate progress value range
    if (progress_value < 0 || progress_value > 100) {
      return NextResponse.json(
        { error: 'Progress value must be between 0 and 100' },
        { status: 400 }
      )
    }

    // Check if user has permission to update this initiative
    const { data: initiative, error: initiativeError } = await supabase
      .from('initiatives')
      .select('*, area:areas!initiatives_area_id_fkey(*)')
      .eq('id', initiative_id)
      .single()

    if (initiativeError || !initiative) {
      return NextResponse.json({ error: 'Initiative not found' }, { status: 404 })
    }

    // Check permissions
    const canEdit = profile.role === 'Executive' || 
                   profile.role === 'Admin' ||
                   (profile.role === 'Manager' && profile.area_id === initiative.area_id) ||
                   (profile.role === 'Individual Contributor' && initiative.created_by === profile.id)

    if (!canEdit) {
      return NextResponse.json({ error: 'Insufficient permissions to update this initiative' }, { status: 403 })
    }

    // Get the previous progress value
    const previousProgress = initiative.progress || 0

    // Update the initiative's progress
    const { error: updateError } = await supabase
      .from('initiatives')
      .update({ 
        progress: progress_value,
        updated_at: new Date().toISOString()
      })
      .eq('id', initiative_id)

    if (updateError) {
      console.error('Error updating initiative progress:', updateError)
      return NextResponse.json({ error: 'Failed to update initiative progress' }, { status: 500 })
    }

    // Record the progress history
    const { data: progressEntry, error: historyError } = await supabase
      .from('initiative_progress_history')
      .insert({
        initiative_id,
        progress_value,
        previous_value: previousProgress,
        changed_by: profile.id,
        change_notes
      })
      .select()
      .single()

    if (historyError) {
      console.error('Error recording progress history:', historyError)
      // Non-critical error, progress was updated
    }

    // Log the action in audit log
    await supabase.from('audit_log').insert({
      tenant_id: profile.tenant_id,
      user_id: profile.id,
      entity_type: 'initiative',
      entity_id: initiative_id,
      action: 'update',
      changes: {
        progress: {
          old: previousProgress,
          new: progress_value
        }
      },
      metadata: {
        notes: change_notes
      }
    })

    return NextResponse.json({
      ...progressEntry,
      initiative_title: initiative.title,
      area_name: initiative.area?.name
    }, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in POST /api/progress-tracking:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}