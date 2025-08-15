import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth-helper';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * GET /api/upload/okr-file/history
 * Get import job history with pagination and filtering
 */
export async function GET(req: NextRequest) {
  try {
    const { user, userProfile, error: authError } = await authenticateRequest(req);
    if (authError || !userProfile) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    
    // Query parameters
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const status = url.searchParams.get('status'); // completed, failed, partial, processing, pending
    const areaId = url.searchParams.get('area_id');
    const dateFrom = url.searchParams.get('date_from');
    const dateTo = url.searchParams.get('date_to');
    const sortBy = url.searchParams.get('sort_by') || 'created_at';
    const sortOrder = url.searchParams.get('sort_order') || 'desc';
    
    const offset = (page - 1) * limit;

    // Use service client to bypass RLS
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Build query
    let query = serviceClient
      .from('okr_import_jobs')
      .select(`
        id,
        area_id,
        original_filename,
        file_size_bytes,
        status,
        total_rows,
        processed_rows,
        success_rows,
        error_rows,
        job_metadata,
        error_summary,
        created_at,
        started_at,
        completed_at,
        areas!left (
          id,
          name
        ),
        user_profiles!left (
          id,
          full_name,
          email
        )
      `, { count: 'exact' })
      .eq('tenant_id', userProfile.tenant_id);

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (areaId) {
      query = query.eq('area_id', areaId);
    }
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      // Add 1 day to include the entire day
      const endDate = new Date(dateTo);
      endDate.setDate(endDate.getDate() + 1);
      query = query.lt('created_at', endDate.toISOString());
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data: jobs, error, count } = await query;

    if (error) {
      throw error;
    }

    // Calculate statistics for the filtered results
    const stats = {
      totalJobs: count || 0,
      completed: 0,
      failed: 0,
      partial: 0,
      processing: 0,
      pending: 0,
      totalRowsProcessed: 0,
      totalSuccessRows: 0,
      totalErrorRows: 0
    };

    // Get overall statistics (without pagination)
    const { data: allJobs } = await serviceClient
      .from('okr_import_jobs')
      .select('status, processed_rows, success_rows, error_rows')
      .eq('tenant_id', userProfile.tenant_id);

    if (allJobs) {
      for (const job of allJobs) {
        stats[job.status as keyof typeof stats]++;
        stats.totalRowsProcessed += job.processed_rows || 0;
        stats.totalSuccessRows += job.success_rows || 0;
        stats.totalErrorRows += job.error_rows || 0;
      }
    }

    // Format jobs for response
    const formattedJobs = jobs?.map(job => ({
      id: job.id,
      filename: job.original_filename,
      fileSize: job.file_size_bytes,
      area: job.areas ? {
        id: job.areas.id,
        name: job.areas.name
      } : null,
      uploadedBy: job.user_profiles ? {
        id: job.user_profiles.id,
        name: job.user_profiles.full_name,
        email: job.user_profiles.email
      } : null,
      status: job.status,
      progress: {
        total: job.total_rows,
        processed: job.processed_rows,
        successful: job.success_rows,
        failed: job.error_rows,
        percentage: job.total_rows > 0 
          ? Math.round((job.processed_rows / job.total_rows) * 100)
          : 0
      },
      summary: {
        errorSummary: job.error_summary,
        createdEntities: job.job_metadata?.created_entities,
        processingMode: job.job_metadata?.processing_mode || 'async'
      },
      timing: {
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        processingTime: job.started_at && job.completed_at
          ? Math.round((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 1000)
          : null
      }
    })) || [];

    return NextResponse.json({
      jobs: formattedJobs,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: count ? Math.ceil(count / limit) : 0
      },
      filters: {
        status,
        areaId,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder
      },
      statistics: stats
    });

  } catch (error) {
    console.error('Error fetching job history:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch job history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}