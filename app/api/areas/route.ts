import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getUserProfile } from '@/lib/server-user-profile'
import { logger } from '@/lib/logger'
import { 
  validateUuid,
  searchStringSchema,
  safeStringSchema,
  safeSqlIdentifier
} from '@/lib/validation/api-validators'
import { z } from 'zod'

/**
 * GET /api/areas
 * 
 * Fetches areas with optional filtering and search
 * 
 * Query Parameters:
 * - includeStats: Include statistics (default: false)
 * - page: Page number for pagination (default: 1)
 * - limit: Items per page (default: 50, max: 200)
 * - search: Search in area name and description
 * - is_active: Filter by active status (true/false)
 * - manager_id: Filter by manager
 * - sort_by: Sort field (name, created_at, updated_at)
 * - sort_order: Sort order (asc, desc)
 */
export async function GET(request: NextRequest) {
  try {
    // getUserProfile now supports Authorization header if provided
    const { user, userProfile } = await getUserProfile(request)

    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = await createClient()

    // Parse query params
    const { searchParams } = new URL(request.url)
    const includeStats = searchParams.get('includeStats') === 'true'
    const page = Math.max(1, Number(searchParams.get('page') || '1'))
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit') || searchParams.get('pageSize') || '50')))
    const offset = (page - 1) * limit

    // Parse and validate sorting parameters
    const sortBy = searchParams.get('sort_by') || 'name'
    const sortOrder = searchParams.get('sort_order') === 'desc' ? 'desc' : 'asc'
    const ascending = sortOrder === 'asc'

    // Validate sort field to prevent injection
    const validSortFields = ['name', 'created_at', 'updated_at', 'is_active']
    let sortField: string
    try {
      if (validSortFields.includes(sortBy)) {
        sortField = safeSqlIdentifier(sortBy)
      } else {
        sortField = 'name'
      }
    } catch {
      sortField = 'name'
    }

    // Base query scoped by tenant via RLS with enhanced relations
    let query = supabase
      .from('areas')
      .select(`
        *,
        manager:user_profiles!areas_manager_id_fkey (
          id,
          full_name,
          email
        )
      `, { count: 'exact' })
      .eq('tenant_id', userProfile.tenant_id)
      .order(sortField, { ascending })
      .range(offset, offset + limit - 1)

    // Apply filters with validation
    const searchParam = searchParams.get('search')
    const isActive = searchParams.get('is_active')
    const managerIdParam = searchParams.get('manager_id')

    // Search filter with sanitization
    if (searchParam) {
      try {
        const search = searchStringSchema.parse(searchParam)
        if (search) {
          // Search in name and description using ilike for case-insensitive search
          // The search string has already been sanitized by searchStringSchema
          query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`)
        }
      } catch (error) {
        return NextResponse.json({ error: 'Invalid search query' }, { status: 400 })
      }
    }

    // Active status filter
    if (isActive !== null && isActive !== '') {
      query = query.eq('is_active', isActive === 'true')
    }

    // Manager filter with UUID validation
    if (managerIdParam) {
      if (managerIdParam === 'null' || managerIdParam === 'none') {
        query = query.is('manager_id', null)
      } else {
        try {
          const managerId = validateUuid(managerIdParam)
          if (managerId) {
            query = query.eq('manager_id', managerId)
          }
        } catch (error: any) {
          return NextResponse.json({ error: `Invalid manager_id: ${error.message}` }, { status: 400 })
        }
      }
    }

    // For managers, only show their assigned area unless they're CEO/Admin
    if (userProfile.role === 'Manager' && userProfile.area_id) {
      query = query.eq('id', userProfile.area_id)
    }

    const { data: areas, error, count } = await query
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Optionally include stats from initiatives and objectives tables
    if (includeStats && areas && areas.length > 0) {
      const areaIds = areas.map(a => a.id)
      
      // Get initiatives stats
      const { data: initiativesData, error: initiativesError } = await supabase
        .from('initiatives')
        .select('area_id, status, progress')
        .in('area_id', areaIds)

      if (initiativesError) {
        return NextResponse.json({ error: initiativesError.message }, { status: 500 })
      }
      
      // Get objectives stats
      const { data: objectivesData, error: objectivesError } = await supabase
        .from('objectives')
        .select('area_id, title, progress, status')
        .in('area_id', areaIds)

      if (objectivesError) {
        logger.error('Error fetching objectives', objectivesError, { service: 'areas-api' })
      }

      const statsMap: Record<string, { 
        total: number; 
        completed: number; 
        in_progress: number; 
        blocked: number;
        averageProgress: number;
        total_objectives: number;
        objectives: any[];
      }> = {}
      
      // Process initiatives
      for (const initiative of initiativesData || []) {
        const key = initiative.area_id as string
        if (!statsMap[key]) {
          statsMap[key] = { 
            total: 0, 
            completed: 0, 
            in_progress: 0, 
            blocked: 0,
            averageProgress: 0,
            total_objectives: 0,
            objectives: []
          }
        }
        statsMap[key].total += 1
        if (initiative.status === 'completed') statsMap[key].completed += 1
        else if (initiative.status === 'in_progress') statsMap[key].in_progress += 1
        else if (initiative.status === 'blocked' || initiative.status === 'on_hold') statsMap[key].blocked += 1
      }
      
      // Process objectives
      for (const objective of objectivesData || []) {
        const key = objective.area_id as string
        if (!statsMap[key]) {
          statsMap[key] = { 
            total: 0, 
            completed: 0, 
            in_progress: 0, 
            blocked: 0,
            averageProgress: 0,
            total_objectives: 0,
            objectives: []
          }
        }
        statsMap[key].total_objectives += 1
        statsMap[key].objectives.push({
          id: objective.area_id,
          name: objective.title,
          progress: objective.progress || 0,
          status: objective.status || 'planning'
        })
      }
      
      // Calculate average progress for each area
      for (const key in statsMap) {
        const initiatives = initiativesData?.filter(i => i.area_id === key) || []
        if (initiatives.length > 0) {
          const totalProgress = initiatives.reduce((sum, i) => sum + (i.progress || 0), 0)
          statsMap[key].averageProgress = Math.round(totalProgress / initiatives.length)
        }
      }

      const areasWithStats = areas.map(a => ({
        ...a,
        stats: statsMap[a.id] || { 
          total: 0, 
          completed: 0, 
          in_progress: 0, 
          blocked: 0,
          averageProgress: 0,
          total_objectives: 0,
          objectives: []
        }
      }))

      const totalCount = count || 0
      const totalPages = Math.ceil(totalCount / limit)
      const hasMore = page < totalPages

      return NextResponse.json({ 
        data: areasWithStats, 
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
        }
      })
    }

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / limit)
    const hasMore = page < totalPages

    return NextResponse.json({ 
      data: areas, 
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
      }
    })
  } catch (err: any) {
    logger.error('GET /api/areas error', err as Error, { service: 'areas-api', method: 'GET' })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, userProfile } = await getUserProfile(request)
    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const supabase = await createClient()
    const body = await request.json()

    // Create validation schema for POST
    const areaCreateSchema = z.object({
      name: safeStringSchema,
      description: safeStringSchema.optional(),
      manager_id: z.string().uuid('Invalid manager_id format').optional()
    })
    
    const validationResult = areaCreateSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validationResult.error.issues },
        { status: 400 }
      )
    }
    
    const { name, description, manager_id } = validationResult.data

    const insert = {
      name,
      description: description || null,
      manager_id: manager_id || null,
      tenant_id: userProfile.tenant_id,
      created_by: user.id
    }

    const { data, error } = await supabase
      .from('areas')
      .insert(insert)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch (err: any) {
    logger.error('POST /api/areas error', err as Error, { service: 'areas-api', method: 'POST' })
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
