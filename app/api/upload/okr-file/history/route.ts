import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Get import job history
 * GET /api/upload/okr-file/history
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status');
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');

    // Build query
    let query = supabase
      .from('okr_import_jobs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    
    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Execute query (RLS will filter by tenant automatically)
    const { data: jobs, error, count } = await query;

    if (error) {
      console.error('Error fetching job history:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch job history',
        details: error.message 
      }, { status: 500 });
    }

    // Format response
    const formattedJobs = jobs?.map(job => ({
      id: job.id,
      filename: job.original_filename,
      status: job.status,
      totalRows: job.total_rows || 0,
      processedRows: job.processed_rows || 0,
      successRows: job.success_rows || 0,
      errorRows: job.error_rows || 0,
      fileSize: job.file_size_bytes,
      createdAt: job.created_at,
      completedAt: job.completed_at,
      duration: job.started_at && job.completed_at
        ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
        : null
    })) || [];

    return NextResponse.json({
      jobs: formattedJobs,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    });

  } catch (error) {
    console.error('Error in history endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch history',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}