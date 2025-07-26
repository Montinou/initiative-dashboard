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

interface CreateTenantRequest {
  name: string;
  industry: string;
  description: string;
  settings?: Record<string, any>;
}

// GET /api/superadmin/tenants - List all tenants
export const GET = withSuperadminAuth(async (request, context) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const industry = searchParams.get('industry') || '';

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get tenants with user count
    const { data, error } = await supabaseAdmin.rpc('superadmin_get_tenants', {
      p_superadmin_id: context.superadmin!.id
    });

    if (error) {
      throw new Error(`Failed to fetch tenants: ${error.message}`);
    }

    // Apply client-side filtering if needed
    let filteredData = data || [];
    
    if (search) {
      filteredData = filteredData.filter((tenant: any) =>
        tenant.name.toLowerCase().includes(search.toLowerCase()) ||
        tenant.description?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (industry) {
      filteredData = filteredData.filter((tenant: any) =>
        tenant.industry === industry
      );
    }

    // Apply pagination
    const paginatedData = filteredData.slice(offset, offset + limit);
    const total = filteredData.length;

    await logSuperadminAction(
      context.superadmin!.id,
      'VIEW_TENANTS',
      'tenant',
      undefined,
      { page, limit, search, industry, total },
      request
    );

    return NextResponse.json({
      tenants: paginatedData,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });

  } catch (error) {
    console.error('Get tenants error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tenants' },
      { status: 500 }
    );
  }
});

// POST /api/superadmin/tenants - Create new tenant
export const POST = withSuperadminAuth(async (request, context) => {
  try {
    const body: CreateTenantRequest = await request.json();
    const { name, industry, description, settings = {} } = body;

    // Validate input
    if (!name || !industry) {
      return NextResponse.json(
        { error: 'Name and industry are required' },
        { status: 400 }
      );
    }

    // Create tenant using database function
    const { data: tenantId, error } = await supabaseAdmin.rpc('superadmin_create_tenant', {
      p_superadmin_id: context.superadmin!.id,
      p_name: name,
      p_industry: industry,
      p_description: description || '',
      p_settings: settings
    });

    if (error) {
      throw new Error(`Failed to create tenant: ${error.message}`);
    }

    await logSuperadminAction(
      context.superadmin!.id,
      'CREATE_TENANT',
      'tenant',
      tenantId,
      { name, industry, description },
      request
    );

    return NextResponse.json({
      success: true,
      tenant_id: tenantId,
      message: 'Tenant created successfully',
    });

  } catch (error) {
    console.error('Create tenant error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create tenant' },
      { status: 500 }
    );
  }
});

// Disable other methods
export const PUT = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
export const DELETE = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });