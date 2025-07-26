import { NextRequest, NextResponse } from 'next/server';
import { edgeCompatibleAuth } from '@/lib/edge-compatible-auth';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// GET /api/superadmin/audit - Get audit log entries
export async function GET(request: NextRequest) {
  // Check authentication
  const sessionToken = request.cookies.get('superadmin-session')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const superadmin = await edgeCompatibleAuth.validateSession(sessionToken);
  if (!superadmin) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');
    const action = searchParams.get('action') || '';
    const target_type = searchParams.get('target_type') || '';
    const superadmin_id = searchParams.get('superadmin_id') || '';

    const offset = (page - 1) * limit;

    // Get audit log entries from superadmin_audit_log table
    let query = supabaseAdmin
      .from('superadmin_audit_log')
      .select(`
        id,
        action,
        target_type,
        target_id,
        details,
        ip_address,
        user_agent,
        created_at,
        superadmins(id, name, email)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (action) {
      query = query.ilike('action', `%${action}%`);
    }

    if (target_type) {
      query = query.eq('target_type', target_type);
    }

    if (superadmin_id) {
      query = query.eq('superadmin_id', superadmin_id);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: auditEntries, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch audit log: ${error.message}`);
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('superadmin_audit_log')
      .select('*', { count: 'exact', head: true });

    if (action) {
      countQuery = countQuery.ilike('action', `%${action}%`);
    }

    if (target_type) {
      countQuery = countQuery.eq('target_type', target_type);
    }

    if (superadmin_id) {
      countQuery = countQuery.eq('superadmin_id', superadmin_id);
    }

    const { count } = await countQuery;

    // Transform the data to match expected format
    const transformedEntries = (auditEntries || []).map(entry => ({
      action: entry.action,
      target_type: entry.target_type,
      created_at: entry.created_at,
      superadmin_name: entry.superadmins?.name || 'Unknown',
      details: entry.details,
      ip_address: entry.ip_address,
      user_agent: entry.user_agent
    }));

    return NextResponse.json({
      audit_entries: transformedEntries,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
      filters: {
        action,
        target_type,
        superadmin_id,
      },
    });

  } catch (error) {
    console.error('Get audit log error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch audit log' },
      { status: 500 }
    );
  }
}

// Disable other methods
export const POST = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
export const PUT = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
export const DELETE = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });