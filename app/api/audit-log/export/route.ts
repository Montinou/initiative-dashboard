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

    // Check permissions - only Executives and Admins can export audit log
    if (!['Executive', 'Admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Parse query parameters (same as main audit log endpoint)
    const searchParams = request.nextUrl.searchParams
    const tenant_id = searchParams.get('tenant_id') || profile.tenant_id
    const entity_type = searchParams.get('entity_type')
    const entity_id = searchParams.get('entity_id')
    const user_id = searchParams.get('user_id')
    const action = searchParams.get('action')
    const date_from = searchParams.get('date_from')
    const date_to = searchParams.get('date_to')
    const format = searchParams.get('format') || 'csv'

    // Build query
    let query = supabase
      .from('audit_log')
      .select(`
        *,
        user_profile:user_profiles!audit_log_user_id_fkey(
          id,
          full_name,
          email
        )
      `)
      .eq('tenant_id', tenant_id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (entity_type) query = query.eq('entity_type', entity_type)
    if (entity_id) query = query.eq('entity_id', entity_id)
    if (user_id) query = query.eq('user_id', user_id)
    if (action) query = query.eq('action', action)
    if (date_from) query = query.gte('created_at', date_from)
    if (date_to) query = query.lte('created_at', date_to)

    const { data: entries, error } = await query

    if (error) {
      console.error('Error fetching audit log for export:', error)
      return NextResponse.json({ error: 'Failed to fetch audit log' }, { status: 500 })
    }

    if (format === 'csv') {
      // Generate CSV
      const csv = generateCSV(entries || [])
      
      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`
        }
      })
    } else {
      // Return JSON
      return NextResponse.json({ 
        entries: entries || [],
        exported_at: new Date().toISOString(),
        exported_by: profile.email
      })
    }

  } catch (error) {
    console.error('Unexpected error in GET /api/audit-log/export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function generateCSV(entries: any[]): string {
  if (entries.length === 0) {
    return 'Date,User,Action,Entity Type,Entity ID,Changes,IP Address\n'
  }

  // CSV headers
  const headers = [
    'Date',
    'User',
    'Email',
    'Action',
    'Entity Type',
    'Entity ID',
    'Changes',
    'IP Address'
  ]

  // Generate CSV rows
  const rows = entries.map(entry => {
    const user = entry.user_profile
    const changes = JSON.stringify(entry.changes || {}).replace(/"/g, '""')
    
    return [
      new Date(entry.created_at).toISOString(),
      user?.full_name || 'Unknown',
      user?.email || '',
      entry.action,
      entry.entity_type,
      entry.entity_id,
      `"${changes}"`,
      entry.ip_address || ''
    ].join(',')
  })

  return [headers.join(','), ...rows].join('\n')
}