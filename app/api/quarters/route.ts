import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getUserProfile } from '@/lib/server-user-profile'

export async function GET(request: NextRequest) {
  try {
    const { user, userProfile } = await getUserProfile(request)
    
    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const year = searchParams.get('year')
    const include_stats = searchParams.get('include_stats') === 'true'

    // Build query
    let query = supabase
      .from('quarters')
      .select('*')
      .eq('tenant_id', userProfile.tenant_id)
      .order('start_date', { ascending: true })

    // Filter by year if provided
    if (year) {
      query = query
        .gte('start_date', `${year}-01-01`)
        .lte('end_date', `${year}-12-31`)
    }

    const { data: quarters, error } = await query

    if (error) {
      console.error('Error fetching quarters:', error)
      return NextResponse.json({ error: 'Failed to fetch quarters' }, { status: 500 })
    }

    // Add statistics if requested
    let processedQuarters = quarters || []
    
    if (include_stats && quarters && quarters.length > 0) {
      // Fetch statistics for each quarter
      const quartersWithStats = await Promise.all(
        quarters.map(async (quarter) => {
          // Count objectives
          const { count: objectivesCount } = await supabase
            .from('objective_quarters')
            .select('*', { count: 'exact', head: true })
            .eq('quarter_id', quarter.id)

          // Count initiatives (through objectives)
          const { data: objectives } = await supabase
            .from('objective_quarters')
            .select('objective:objectives!inner(id)')
            .eq('quarter_id', quarter.id)

          let initiativesCount = 0
          if (objectives && objectives.length > 0) {
            const objectiveIds = objectives.map(o => o.objective?.id).filter(Boolean)
            if (objectiveIds.length > 0) {
              const { count } = await supabase
                .from('objective_initiatives')
                .select('*', { count: 'exact', head: true })
                .in('objective_id', objectiveIds)
              initiativesCount = count || 0
            }
          }

          return {
            ...quarter,
            objectives_count: objectivesCount || 0,
            initiatives_count: initiativesCount,
            status: new Date() >= new Date(quarter.start_date) && new Date() <= new Date(quarter.end_date) 
              ? 'active' 
              : new Date() > new Date(quarter.end_date) 
                ? 'completed' 
                : 'upcoming'
          }
        })
      )
      processedQuarters = quartersWithStats
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
    const { user, userProfile } = await getUserProfile(request)
    
    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only CEO and Admin can create quarters
    if (userProfile.role !== 'CEO' && userProfile.role !== 'Admin') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const supabase = await createClient()
    const body = await request.json()
    const { quarter_name, start_date, end_date } = body

    // Validate input
    if (!quarter_name || !start_date || !end_date) {
      return NextResponse.json({ 
        error: 'Missing required fields: quarter_name, start_date, end_date' 
      }, { status: 400 })
    }

    // Check for overlapping quarters
    const { data: existingQuarters } = await supabase
      .from('quarters')
      .select('*')
      .eq('tenant_id', userProfile.tenant_id)
      .or(`and(start_date.lte.${end_date},end_date.gte.${start_date})`)

    if (existingQuarters && existingQuarters.length > 0) {
      return NextResponse.json({ 
        error: 'Quarter dates overlap with existing quarter' 
      }, { status: 400 })
    }

    // Create the quarter
    const { data: quarter, error } = await supabase
      .from('quarters')
      .insert({
        tenant_id: userProfile.tenant_id,
        quarter_name,
        start_date,
        end_date
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating quarter:', error)
      return NextResponse.json({ error: 'Failed to create quarter' }, { status: 500 })
    }

    return NextResponse.json(quarter, { status: 201 })

  } catch (error) {
    console.error('Unexpected error in POST /api/quarters:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}