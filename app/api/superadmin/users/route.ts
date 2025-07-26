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

interface CreateUserRequest {
  tenant_id: string;
  email: string;
  name: string;
  role: string;
  area_id?: string;
}

// GET /api/superadmin/users - Search users across all tenants
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
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const tenant_id = searchParams.get('tenant_id') || '';
    const role = searchParams.get('role') || '';

    const offset = (page - 1) * limit;

    // Build query
    let query = supabaseAdmin
      .from('user_profiles')
      .select(`
        id,
        email,
        full_name,
        role,
        area,
        is_active,
        created_at,
        updated_at,
        tenants!inner(id, name, industry)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (tenant_id) {
      query = query.eq('tenant_id', tenant_id);
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: users, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true });

    if (tenant_id) {
      countQuery = countQuery.eq('tenant_id', tenant_id);
    }

    if (role) {
      countQuery = countQuery.eq('role', role);
    }

    if (search) {
      countQuery = countQuery.or(`email.ilike.%${search}%,full_name.ilike.%${search}%`);
    }

    const { count } = await countQuery;

    // Log action (simplified)
    console.log('Superadmin action:', {
      superadmin: superadmin.email,
      action: 'VIEW_USERS',
      total: count
    });

    return NextResponse.json({
      users: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/superadmin/users - Create new user
export async function POST(request: NextRequest) {
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
    const body: CreateUserRequest = await request.json();
    const { tenant_id, email, name, role, area_id } = body;

    // Validate input
    if (!tenant_id || !email || !name || !role) {
      return NextResponse.json(
        { error: 'Tenant ID, email, name, and role are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate role
    const validRoles = ['CEO', 'Admin', 'Manager', 'Analyst'];
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be one of: ' + validRoles.join(', ') },
        { status: 400 }
      );
    }

    // Check if tenant exists
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select('id, name')
      .eq('id', tenant_id)
      .eq('is_active', true)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found or inactive' },
        { status: 400 }
      );
    }

    // Check if user with email already exists in this tenant
    const { data: existingUser } = await supabaseAdmin
      .from('user_profiles')
      .select('id')
      .eq('email', email)
      .eq('tenant_id', tenant_id)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists in this tenant' },
        { status: 400 }
      );
    }

    // For now, we'll create a placeholder auth user ID
    // In a real implementation, you'd create the auth.users record first
    const userId = crypto.randomUUID();
    
    // Create user profile
    const { data: newUser, error } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        id: userId,
        tenant_id,
        email,
        full_name: name,
        role,
        area: area_id,
        is_active: true,
        created_by_superadmin: superadmin.id
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    // Log action (simplified)
    console.log('Superadmin action:', {
      superadmin: superadmin.email,
      action: 'CREATE_USER',
      user_id: userId,
      email
    });

    return NextResponse.json({
      success: true,
      user_id: userId,
      message: 'User created successfully',
    });

  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create user' },
      { status: 500 }
    );
  }
}

// Disable other methods
export const PUT = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
export const DELETE = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });