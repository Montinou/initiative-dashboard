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

interface CreateTenantRequest {
  name: string;
  industry: string;
  description: string;
  settings?: Record<string, any>;
}

// GET /api/superadmin/tenants - List all tenants
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
    const industry = searchParams.get('industry') || '';

    // Calculate offset
    const offset = (page - 1) * limit;

    // Get tenants with user count
    const { data, error } = await supabaseAdmin
      .from('tenants')
      .select(`
        id,
        name,
        subdomain,
        description,
        industry,
        is_active,
        settings,
        created_at,
        updated_at,
        user_profiles(count)
      `)
      .order('created_at', { ascending: false });

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

    // Log action (simplified)
    console.log('Superadmin action:', {
      superadmin: superadmin.email,
      action: 'VIEW_TENANTS',
      total
    });

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
}

// POST /api/superadmin/tenants - Create new tenant
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
    const body: CreateTenantRequest = await request.json();
    const { name, industry, description, settings = {} } = body;

    // Validate input
    if (!name || !industry) {
      return NextResponse.json(
        { error: 'Name and industry are required' },
        { status: 400 }
      );
    }

    // Generate subdomain from name
    const subdomain = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    // Create tenant
    const { data: newTenant, error } = await supabaseAdmin
      .from('tenants')
      .insert({
        name,
        subdomain,
        description: description || '',
        industry,
        is_active: true,
        settings,
        created_by_superadmin: superadmin.id
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create tenant: ${error.message}`);
    }
    
    const tenantId = newTenant.id;

    // Log action (simplified)
    console.log('Superadmin action:', {
      superadmin: superadmin.email,
      action: 'CREATE_TENANT',
      tenant_id: tenantId,
      name
    });

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
}

// Disable other methods
export const PUT = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
export const DELETE = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });