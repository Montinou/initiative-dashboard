import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, unauthorizedResponse } from '@/lib/api-auth-helper'
import { logger } from "@/lib/logger"

export async function GET(request: NextRequest) {
  try {
    // Use authenticateRequest for proper authentication
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request)
    
    if (authError || !user || !userProfile || !supabase) {
      return unauthorizedResponse(authError || 'Authentication required')
    }

    // Check permissions - only CEO, Admins, and Managers can view audit log
    if (!['CEO', 'Admin', 'Manager'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const entity_type = searchParams.get('entity_type')
    const entity_id = searchParams.get('entity_id')
    const user_id = searchParams.get('user_id')
    const action = searchParams.get('action')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    // RLS automatically filters by tenant_id
    let query = supabase
      .from('audit_log')
      .select(`
        *,
        user_profile:user_profiles!audit_log_user_id_fkey(
          id,
          full_name,
          email
        )
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (entity_type) {
      query = query.eq('entity_type', entity_type)
    }
    if (entity_id) {
      query = query.eq('entity_id', entity_id)
    }
    if (user_id) {
      query = query.eq('user_id', user_id)
    }
    if (action) {
      query = query.eq('action', action)
    }
    if (date_from) {
      query = query.gte('created_at', date_from)
    }
    if (date_to) {
      query = query.lte('created_at', date_to)
    }

    // Managers can only see audit logs for their area
    if (userProfile.role === 'Manager' && userProfile.area_id) {
      // Filter to only show audit logs related to their area
      query = query.or(`entity_type.eq.area,entity_type.eq.initiative,entity_type.eq.activity`)
        .or(`entity_id.eq.${userProfile.area_id},metadata->area_id.eq.${userProfile.area_id}`)
    }

    const { data: entries, error, count } = await query

    if (error) {
      logger.error('Error fetching audit log:', error)
      return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 })
    }

    return NextResponse.json({ 
      entries: entries || [],
      total: count || 0,
      has_more: (count || 0) > offset + limit
    })

  } catch (error) {
    logger.error('Unexpected error in GET /api/audit-log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Use authenticateRequest for proper authentication
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(request)
    
    if (authError || !user || !userProfile || !supabase) {
      return unauthorizedResponse(authError || 'Authentication required')
    }

    // Parse request body
    const body = await request.json()
    const { entity_type, entity_id, action, changes, metadata } = body

    // Validate required fields
    if (!entity_type || !entity_id || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: entity_type, entity_id, action' },
        { status: 400 }
      )
    }

    // Get IP address and user agent
    const ip_address = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown'
    const user_agent = request.headers.get('user-agent') || 'unknown'

    // Create audit log entry
    // tenant_id is still needed for INSERT operations
    const { data: logEntry, error: createError } = await supabase
      .from('audit_log')
      .insert({
        tenant_id: userProfile.tenant_id,
        user_id: userProfile.id,
        entity_type,
        entity_id,
        action,
        changes: changes || {},
        metadata: {
          ...metadata,
          area_id: userProfile.area_id
        },
        ip_address,
        user_agent
      })
      .select()
      .single()

    if (createError) {
      logger.error('Error creating audit log entry:', createError)
      return NextResponse.json({ error: 'Failed to create audit log entry' }, { status: 500 })
    }

    return NextResponse.json(logEntry, { status: 201 })

  } catch (error) {
    logger.error('Unexpected error in POST /api/audit-log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
