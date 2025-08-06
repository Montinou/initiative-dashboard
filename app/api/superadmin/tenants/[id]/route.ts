import { NextResponse } from 'next/server';
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

interface UpdateTenantRequest {
  name?: string;
  industry?: string;
  description?: string;
  settings?: Record<string, any>;
  is_active?: boolean;
}

// GET /api/superadmin/tenants/[id] - Get specific tenant
export const GET = withSuperadminAuth(async (request, context, { params }: { params: { id: string } }) => {
  try {
    const tenantId = params.id;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Get tenant details
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from('tenants')
      .select(`
        id,
        name,
        industry,
        description,
        is_active,
        settings,
        created_at,
        updated_at,
        created_by_superadmin
      `)
      .eq('id', tenantId)
      .single();

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Get tenant users count
    const { count: userCount } = await supabaseAdmin
      .from('user_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId);

    // Get tenant areas count
    const { count: areasCount } = await supabaseAdmin
      .from('areas')
      .select('*', { count: 'exact', head: true })
      .eq(tenant_id, tenantId);

    // Get tenant initiatives count
    const { count: initiativesCount } = await supabaseAdmin
      .from('initiatives')
      .select('*', { count: 'exact', head: true })
      .eq(tenant_id, tenantId);

    await logSuperadminAction(
      context.superadmin!.id,
      'VIEW_TENANT',
      'tenant',
      tenantId,
      { tenant_name: tenant.name },
      request
    );

    return NextResponse.json({
      tenant: {
        ...tenant,
        stats: {
          users: userCount || 0,
          areas: areasCount || 0,
          initiatives: initiativesCount || 0,
        },
      },
    });

  } catch (error) {
    console.error('Get tenant error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch tenant' },
      { status: 500 }
    );
  }
});

// PUT /api/superadmin/tenants/[id] - Update tenant
export const PUT = withSuperadminAuth(async (request, context, { params }: { params: { id: string } }) => {
  try {
    const tenantId = params.id;
    const body: UpdateTenantRequest = await request.json();

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Check if tenant exists
    const { data: existingTenant, error: checkError } = await supabaseAdmin
      .from('tenants')
      .select('id, name')
      .eq('id', tenantId)
      .single();

    if (checkError || !existingTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.industry !== undefined) updateData.industry = body.industry;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.settings !== undefined) updateData.settings = body.settings;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    // Update tenant
    const { error: updateError } = await supabaseAdmin
      .from('tenants')
      .update(updateData)
      .eq('id', tenantId);

    if (updateError) {
      throw new Error(`Failed to update tenant: ${updateError.message}`);
    }

    await logSuperadminAction(
      context.superadmin!.id,
      'UPDATE_TENANT',
      'tenant',
      tenantId,
      { 
        tenant_name: existingTenant.name,
        changes: updateData 
      },
      request
    );

    return NextResponse.json({
      success: true,
      message: 'Tenant updated successfully',
    });

  } catch (error) {
    console.error('Update tenant error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update tenant' },
      { status: 500 }
    );
  }
});

// DELETE /api/superadmin/tenants/[id] - Soft delete tenant
export const DELETE = withSuperadminAuth(async (request, context, { params }: { params: { id: string } }) => {
  try {
    const tenantId = params.id;

    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    // Check if tenant exists
    const { data: existingTenant, error: checkError } = await supabaseAdmin
      .from('tenants')
      .select('id, name, is_active')
      .eq('id', tenantId)
      .single();

    if (checkError || !existingTenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }

    // Soft delete by setting is_active to false
    const { error: deleteError } = await supabaseAdmin
      .from('tenants')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', tenantId);

    if (deleteError) {
      throw new Error(`Failed to delete tenant: ${deleteError.message}`);
    }

    await logSuperadminAction(
      context.superadmin!.id,
      'DELETE_TENANT',
      'tenant',
      tenantId,
      { 
        tenant_name: existingTenant.name,
        soft_delete: true 
      },
      request
    );

    return NextResponse.json({
      success: true,
      message: 'Tenant deleted successfully',
    });

  } catch (error) {
    console.error('Delete tenant error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete tenant' },
      { status: 500 }
    );
  }
});

// Disable other methods
export const POST = () => NextResponse.json({ error: 'Method not allowed' }, { status: 405 });