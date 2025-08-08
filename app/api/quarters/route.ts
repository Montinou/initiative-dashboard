import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { quarterCreateSchema } from '@/lib/validation/schemas'

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
    const year = searchParams.get('year')
    const include_stats = searchParams.get('include_stats') === 'true'

    // Build query
    let query = supabase
      .from('quarters')
      .select('*')
      .eq('tenant_id', tenant_id)
      .order('start_date', { ascending: true })

    // Filter by year if provided
    if (year) {
      const yearStart = `${year}-01-01`
      const yearEnd = `${year}-12-31`
      query = query.gte('start_date', yearStart).lte('end_date', yearEnd)
    }

    const { data: quarters, error } = await query

    if (error) {
      console.error('Error fetching quarters:', error)
      return NextResponse.json({ error: 'Failed to fetch quarters' }, { status: 500 })
    }

    // If stats requested, fetch additional data
    let processedQuarters = quarters || []
    
    if (include_stats && processedQuarters.length > 0) {
      const quarterIds = processedQuarters.map(q => q.id)
      
      // Fetch objective counts
      const { data: objectiveStats } = await supabase
        .from('objective_quarters')
        .select('quarter_id, objective_id')
        .in('quarter_id', quarterIds)
      
      // Fetch initiative counts and progress
      const { data: initiatives } = await supabase
        .from('initiatives')
        .select('id, progress, objective_id')
        .eq('tenant_id', tenant_id)
      
      // Process quarters with stats
      processedQuarters = processedQuarters.map(quarter => {
        const quarterObjectives = objectiveStats?.filter(o => o.quarter_id === quarter.id) || []
        const objectiveIds = quarterObjectives.map(o => o.objective_id)
        const quarterInitiatives = initiatives?.filter(i => 
          i.objective_id && objectiveIds.includes(i.objective_id)
        ) || []
        
        const avgProgress = quarterInitiatives.length > 0
          ? quarterInitiatives.reduce((sum, i) => sum + (i.progress || 0), 0) / quarterInitiatives.length
          : 0
        
        return {
          ...quarter,
          objectives_count: quarterObjectives.length,
          initiatives_count: quarterInitiatives.length,
          activities_count: 0, // Would need additional query
          average_progress: Math.round(avgProgress)
        }
      })
    }

    return NextResponse.json({ 
      quarters: processedQuarters,
      total: processedQuarters.length
    })

  } catch (error) {
    console.error('Unexpected error in GET /api/quarters:', error)
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

    // Check permissions - only Executives and Admins can create quarters
    if (profile.role !== 'Executive' && profile.role !== 'Admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse and validate request body
    const body = await request.json()
    
    const validationResult = quarterCreateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { quarter_name, start_date, end_date } = validationResult.data

    // Check if quarter already exists for this year
    const year = new Date(start_date).getFullYear()
    const { data: existingQuarters } = await supabase
      .from('quarters')
      .select('id')
      .eq('tenant_id', profile.tenant_id)
      .eq('quarter_name', quarter_name)
      .gte('start_date', `${year}-01-01`)
      .lte('end_date', `${year}-12-31`)

    if (existingQuarters && existingQuarters.length > 0) {
      return NextResponse.json(
        { error: `Quarter ${quarter_name} already exists for year ${year}` },
        { status: 409 }
      )
    }

    // Create the quarter
    const { data: quarter, error: createError } = await supabase
      .from('quarters')
      .insert({
        tenant_id: profile.tenant_id,
        quarter_name,
        start_date,
        end_date
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating quarter:', createError)
      return NextResponse.json({ error: 'Failed to create quarter' }, { status: 500 })
    }

    // Log the action
    await supabase.from('audit_log').insert({
      tenant_id: profile.tenant_id,
      user_id: profile.id,
      entity_type: 'quarter',
      entity_id: quarter.id,
      action: 'create',
      changes: {
        quarter_name,
        start_date,
        end_date
      }
    })

    return NextResponse.json(quarter, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in POST /api/quarters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}