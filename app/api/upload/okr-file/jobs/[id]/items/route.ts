import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth-helper';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * GET /api/upload/okr-file/jobs/[id]/items
 * Get processed items for a specific import job
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user, userProfile, error: authError } = await authenticateRequest(req);
    if (authError || !userProfile) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      );
    }

    const jobId = params.id;
    const url = new URL(req.url);
    
    // Query parameters for filtering and pagination
    const status = url.searchParams.get('status'); // success, error, pending
    const entityType = url.searchParams.get('entity_type'); // objective, initiative, activity
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    // Use service client to bypass RLS
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // First verify the job belongs to the user's tenant
    const { data: job, error: jobError } = await serviceClient
      .from('okr_import_jobs')
      .select('id, tenant_id')
      .eq('id', jobId)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ 
        error: 'Job not found or access denied' 
      }, { status: 404 });
    }

    // Build query for job items
    let query = serviceClient
      .from('okr_import_job_items')
      .select('*', { count: 'exact' })
      .eq('job_id', jobId)
      .order('row_number', { ascending: true });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (entityType) {
      query = query.eq('entity_type', entityType);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: items, error: itemsError, count } = await query;

    if (itemsError) {
      throw itemsError;
    }

    // Group items by entity type for better organization
    const groupedItems = {
      objectives: [],
      initiatives: [],
      activities: [],
      other: []
    };

    if (items) {
      for (const item of items) {
        const processedItem = {
          rowNumber: item.row_number,
          entityKey: item.entity_key,
          entityId: item.entity_id,
          action: item.action,
          status: item.status,
          errorMessage: item.error_message,
          rowData: item.row_data,
          processedAt: item.processed_at
        };

        switch (item.entity_type) {
          case 'objective':
            groupedItems.objectives.push(processedItem);
            break;
          case 'initiative':
            groupedItems.initiatives.push(processedItem);
            break;
          case 'activity':
            groupedItems.activities.push(processedItem);
            break;
          default:
            groupedItems.other.push(processedItem);
        }
      }
    }

    // Return paginated response
    return NextResponse.json({
      jobId,
      items: items?.map(item => ({
        rowNumber: item.row_number,
        entityType: item.entity_type,
        entityKey: item.entity_key,
        entityId: item.entity_id,
        action: item.action,
        status: item.status,
        errorMessage: item.error_message,
        rowData: item.row_data,
        processedAt: item.processed_at
      })),
      grouped: groupedItems,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0
      },
      filters: {
        status,
        entityType
      }
    });

  } catch (error) {
    console.error('Error fetching job items:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch job items',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}