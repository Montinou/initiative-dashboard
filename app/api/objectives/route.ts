import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getUserProfile } from '@/lib/server-user-profile'
import { objectiveCreateSchema } from '@/lib/validation/schemas'
import { logger } from '@/lib/logger'
import { z } from 'zod'
import { 
  validateUuid,
  searchStringSchema,
  progressSchema,
  dateSchema,
  createEnumSchema,
  standardQueryParamsSchema
} from '@/lib/validation/api-validators'

// Valid enum values for objectives
const VALID_OBJECTIVE_STATUSES = ['planning', 'in_progress', 'completed', 'overdue'] as const
const VALID_PRIORITIES = ['high', 'medium', 'low'] as const
const VALID_SORT_FIELDS = ['created_at', 'updated_at', 'title', 'priority', 'status', 'progress'] as const
const VALID_SORT_ORDERS = ['asc', 'desc'] as const

export async function GET(request: NextRequest) {
  try {
    // Use getUserProfile for authentication
    const { user, userProfile } = await getUserProfile(request)
    
    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }



    const supabase = await createClient()

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams
    
    // Validate UUIDs
    let tenant_id: string
    let objective_id: string | null = null
    let initiative_id: string | null = null
    let assigned_to: string | null = null
    
    try {
      tenant_id = searchParams.get('tenant_id') ? validateUuid(searchParams.get('tenant_id'))! : userProfile.tenant_id
      objective_id = validateUuid(searchParams.get('objective_id'))
      initiative_id = validateUuid(searchParams.get('initiative_id'))
      assigned_to = validateUuid(searchParams.get('assigned_to'))
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    
    // Validate date filters
    let start_date: string | null = null
    let end_date: string | null = null
    
    try {
      const startDateParam = searchParams.get('start_date')
      const endDateParam = searchParams.get('end_date')
      
      if (startDateParam) {
        start_date = dateSchema.parse(startDateParam)
      }
      if (endDateParam) {
        end_date = dateSchema.parse(endDateParam)
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid date format. Use YYYY-MM-DD' }, { status: 400 })
    }
    
    // Status filters
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const is_completed = searchParams.get('is_completed')
    
    // Validate and parse progress range
    let min_progress: number | null = null
    let max_progress: number | null = null
    
    try {
      const minProgressParam = searchParams.get('min_progress')
      const maxProgressParam = searchParams.get('max_progress')
      
      if (minProgressParam) {
        min_progress = progressSchema.parse(minProgressParam)
      }
      if (maxProgressParam) {
        max_progress = progressSchema.parse(maxProgressParam)
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid progress value. Must be 0-100' }, { status: 400 })
    }
    
    // Validate pagination
    const page = Math.max(1, Math.min(10000, parseInt(searchParams.get('page') || '1')))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')))
    const offset = (page - 1) * limit
    
    // Validate sorting
    const sort_by = searchParams.get('sort_by') || 'created_at'
    const sort_order = searchParams.get('sort_order') || 'desc'
    
    // Validate and sanitize search
    let search: string | undefined
    try {
      const searchParam = searchParams.get('search')
      if (searchParam) {
        search = searchStringSchema.parse(searchParam)
      }
    } catch (error) {
      return NextResponse.json({ error: 'Invalid search query' }, { status: 400 })
    }
    
    // Legacy parameter and new useinitiatives parameter support
    const include_initiatives = searchParams.get('include_initiatives') === 'true' || searchParams.get('useinitiatives') === 'true'

    // Validate enum values
    if (status && !VALID_OBJECTIVE_STATUSES.includes(status as any)) {
      return NextResponse.json({ 
        error: 'Invalid status value',
        details: `Must be one of: ${VALID_OBJECTIVE_STATUSES.join(', ')}`
      }, { status: 400 })
    }

    if (priority && !VALID_PRIORITIES.includes(priority as any)) {
      return NextResponse.json({ 
        error: 'Invalid priority value',
        details: `Must be one of: ${VALID_PRIORITIES.join(', ')}`
      }, { status: 400 })
    }

    if (!VALID_SORT_FIELDS.includes(sort_by as any)) {
      return NextResponse.json({ 
        error: 'Invalid sort field',
        details: `Must be one of: ${VALID_SORT_FIELDS.join(', ')}`
      }, { status: 400 })
    }

    if (!VALID_SORT_ORDERS.includes(sort_order as any)) {
      return NextResponse.json({ 
        error: 'Invalid sort order',
        details: `Must be one of: ${VALID_SORT_ORDERS.join(', ')}`
      }, { status: 400 })
    }

    // Build query - Fetch basic objective data first
    // We'll fetch initiatives separately due to RLS issues with nested joins
    let selectQuery = `
      *,
      area:areas!objectives_area_id_fkey(id, name),
      created_by_profile:user_profiles!objectives_created_by_fkey(id, full_name, email)
    `
    
    // Build base query with pagination and sorting
    let query = supabase
      .from('objectives')
      .select(selectQuery, { count: 'exact' })
      .eq('tenant_id', tenant_id)
      .range(offset, offset + limit - 1)
      .order(sort_by, { ascending: sort_order === 'asc' })

    // Apply entity filters
    // Only apply area filtering for Managers - other roles (CEO, Admin) see all areas
    if (userProfile.role === 'Manager' && userProfile.area_id) {
      // Managers only see their area's objectives
      query = query.eq('area_id', userProfile.area_id)
    }

    if (objective_id) {
      query = query.eq('id', objective_id)
    }

    // Apply status filters
    if (status) {
      query = query.eq('status', status)
    }

    if (priority) {
      query = query.eq('priority', priority)
    }

    if (is_completed === 'true') {
      query = query.eq('status', 'completed')
    } else if (is_completed === 'false') {
      query = query.neq('status', 'completed')
    }

    // Apply range filters (already validated)
    if (min_progress !== null) {
      query = query.gte('progress', min_progress)
    }

    if (max_progress !== null) {
      query = query.lte('progress', max_progress)
    }

    // Apply date range filters
    if (start_date) {
      query = query.gte('end_date', start_date)
    }
    if (end_date) {
      query = query.lte('start_date', end_date)
    }

    // Apply search filter (already sanitized)
    if (search) {
      // Search in title and description using ilike for case-insensitive search
      // The search string has already been sanitized by searchStringSchema
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    const { data: objectives, error, count } = await query

    if (error) {
      logger.error('Error fetching objectives:', error)
      return NextResponse.json({ 
        error: 'Failed to fetch objectives',
        details: error.message 
      }, { status: 500 })
    }
    
    // Fetch initiatives separately for each objective if needed
    let objectivesWithInitiatives = objectives || []
    
    if (include_initiatives && objectivesWithInitiatives.length > 0) {
      // Get all objective IDs
      const objectiveIds = objectivesWithInitiatives.map((obj: any) => obj.id)
      
      // Fetch junction table data with initiatives  
      // Use 2-step approach to avoid RLS issues with complex joins
      const { data: junctionData, error: junctionError } = await supabase
        .from('objective_initiatives')
        .select('objective_id, initiative_id')
        .in('objective_id', objectiveIds)
      
      let enrichedJunctionData: any[] = []
      if (!junctionError && junctionData && junctionData.length > 0) {
        // Get all initiative IDs from junction
        const initiativeIds = junctionData.map(j => j.initiative_id)
        
        // Fetch initiatives separately  
        const { data: initiativesData, error: initiativesError } = await supabase
          .from('initiatives')
          .select('id, title, progress, area_id, status, description, tenant_id')
          .in('id', initiativeIds)
          .eq('tenant_id', tenant_id)
        
        if (!initiativesError && initiativesData) {
          // Create map of initiatives by ID
          const initiativesById = Object.fromEntries(
            initiativesData.map(init => [init.id, init])
          )
          
          // Enrich junction data with initiative details
          enrichedJunctionData = junctionData.map(junction => ({
            objective_id: junction.objective_id,
            initiative_id: junction.initiative_id,
            initiatives: initiativesById[junction.initiative_id] || null
          })).filter(item => item.initiatives !== null)
        }
      }
      
      if (enrichedJunctionData.length > 0) {
        
        // Group initiatives by objective_id
        const initiativesByObjective: Record<string, any[]> = {}
        enrichedJunctionData.forEach((junction: any) => {
          // The structure is now junction.initiatives instead of junction.initiative
          if (junction.initiatives) {
            if (!initiativesByObjective[junction.objective_id]) {
              initiativesByObjective[junction.objective_id] = []
            }
            // Wrap the initiative in the expected structure
            initiativesByObjective[junction.objective_id].push({
              objective_id: junction.objective_id,
              initiative_id: junction.initiative_id,
              initiative: junction.initiatives
            })
          }
        })
        
        // Add initiatives to objectives
        objectivesWithInitiatives = objectivesWithInitiatives.map((obj: any) => ({
          ...obj,
          initiatives: initiativesByObjective[obj.id] || []
        }))
      } else {
        // If junction query fails, add empty initiatives array
        objectivesWithInitiatives = objectivesWithInitiatives.map((obj: any) => ({
          ...obj,
          initiatives: []
        }))
      }
    } else {
      // Add empty initiatives array if not including initiatives
      objectivesWithInitiatives = objectivesWithInitiatives.map((obj: any) => ({
        ...obj,
        initiatives: []
      }))
    }

    // Post-processing for initiative_id filter (can't be done in query due to junction table)
    let filteredObjectives = objectivesWithInitiatives
    if (initiative_id) {
      filteredObjectives = filteredObjectives.filter((obj: any) => 
        obj.initiatives?.some((item: any) => item.initiative?.id === initiative_id)
      )
    }

    // Post-processing for assigned_to filter (check initiatives assignments)
    if (assigned_to) {
      // This would require joining through initiatives->activities->assigned_to
      // For now, we'll implement this as a TODO or require frontend filtering
      logger.warn('assigned_to filtering for objectives not yet implemented - requires complex joins')
    }

    // Process objectives to include additional metadata
    const processedObjectives = filteredObjectives.map((obj: any) => {
      // Extract initiatives from the junction table structure - matching initiatives API pattern
      let initiatives: any[] = []
      if (obj.initiatives && Array.isArray(obj.initiatives)) {
        initiatives = obj.initiatives
          .map((item: any) => item.initiative)
          .filter(Boolean)
      }
      
      return {
        ...obj,
        area_name: obj.area?.name,
        created_by_name: obj.created_by_profile?.full_name,
        initiatives_count: initiatives.length,
        initiatives: initiatives, // Always include initiatives array since we're always fetching it
        // Calculate overall progress based on linked initiatives
        overall_progress: initiatives.length > 0 
          ? Math.round(initiatives.reduce((sum: number, init: any) => sum + (init.progress || 0), 0) / initiatives.length)
          : obj.progress || 0, // Fall back to objective's own progress if no initiatives
        is_on_track: initiatives.length > 0 
          ? initiatives.reduce((sum: number, init: any) => sum + (init.progress || 0), 0) / initiatives.length >= 70
          : (obj.progress || 0) >= 70
      }
    })

    // Calculate pagination metadata
    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / limit)
    const hasMore = page < totalPages



    return NextResponse.json({ 
      objectives: processedObjectives,  // Changed from 'data' to 'objectives' to match frontend expectation
      total: totalCount,
      page,
      limit,
      totalPages,
      hasMore,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasMore,
        hasPrevious: page > 1
      },
      filters_applied: {
        objective_id,
        initiative_id,
        assigned_to,
        status,
        priority,
        is_completed,
        min_progress,
        max_progress,
        start_date,
        end_date,
        search,
        sort_by,
        sort_order,
        include_initiatives,
        useinitiatives: searchParams.get('useinitiatives') === 'true'
      }
    })

  } catch (error) {
    logger.error('Unexpected error in GET /api/objectives:', error)
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

    const { title, description, start_date, end_date } = validationResult.data
    
    // Validate area_id if provided
    let area_id: string | null = null
    if (body.area_id) {
      try {
        area_id = validateUuid(body.area_id)
      } catch (error: any) {
        return NextResponse.json({ error: `Invalid area_id: ${error.message}` }, { status: 400 })
      }
    }

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
        created_by: userProfile.id,
        start_date: start_date || new Date().toISOString().split('T')[0],
        end_date: end_date || null,
        target_date: end_date || null
      })
      .select()
      .single()

    if (createError) {
      logger.error('Error creating objective:', createError)
      return NextResponse.json({ error: 'Failed to create objective' }, { status: 500 })
    }

    // No longer linking to quarters - using date ranges instead

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
    logger.error('Unexpected error in POST /api/objectives:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}