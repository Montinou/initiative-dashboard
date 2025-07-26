import { NextRequest, NextResponse } from 'next/server';
import { withSuperadminAuth, logSuperadminAction } from '@/lib/superadmin-middleware';
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
export const GET = withSuperadminAuth(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const tenant_id = searchParams.get(tenant_id) || '';
    const role = searchParams.get('role') || '';

    const offset = (page - 1) * limit;

    // Build query
    let query = supabaseAdmin
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        is_system_admin,
        created_at,
        updated_at,
        tenants!inner(id, name, industry),
        areas(id, name)
      `)
      .order('created_at', { ascending: false });

    // Apply filters
    if (tenant_id) {
      query = query.eq(tenant_id, tenant_id);
    }

    if (role) {
      query = query.eq('role', role);
    }

    if (search) {
      query = query.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: users, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }

    // Get total count for pagination
    let countQuery = supabaseAdmin
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (tenant_id) {
      countQuery = countQuery.eq(tenant_id, tenant_id);
    }

    if (role) {
      countQuery = countQuery.eq('role', role);
    }

    if (search) {
      countQuery = countQuery.or(`email.ilike.%${search}%,name.ilike.%${search}%`);
    }

    const { count } = await countQuery;

    await logSuperadminAction(
      context.superadmin!.id,
      'VIEW_USERS',
      'user',
      undefined,
      { page, limit, search, tenant_id, role, total: count },
      request
    );

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
});

// POST /api/superadmin/users - Create new user
export const POST = withSuperadminAuth(async (request, context) => {
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
    const validRoles = ['ceo', 'admin', 'manager', 'analyst'];
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
      .from('users')
      .select('id')
      .eq('email', email)
      .eq(tenant_id, tenant_id)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists in this tenant' },
        { status: 400 }
      );
    }

    // Create user using database function
    const { data: userId, error } = await supabaseAdmin.rpc('superadmin_create_user', {
      p_superadmin_id: context.superadmin!.id,
      p_tenant_id: tenant_id,
      p_email: email,
      p_name: name,
      p_role: role,
      p_area_id: area_id || null
    });

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    await logSuperadminAction(
      context.superadmin!.id,
      'CREATE_USER',
      'user',
      userId,
      { 
        email, 
        tenant_name: tenant.name, 
        role,
        area_id 
      },
      request
    );

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
});

// Disable other methods
export const PUT = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
export const DELETE = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });