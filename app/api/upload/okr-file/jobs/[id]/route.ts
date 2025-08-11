import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

/**
 * Get job status by ID
 * GET /api/upload/okr-file/jobs/[id]
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get job with items
    // RLS will ensure user can only see jobs from their tenant
    const { data: job, error: jobError } = await supabase
      .from('okr_import_jobs')
      .select(`
        *,
        items:okr_import_job_items(
          id,
          row_number,
          entity_type,
          entity_key,
          entity_id,
          action,
          status,
          error_message,
          processed_at
        )
      `)
      .eq('id', params.id)
      .single();

    if (jobError) {
      console.error('Error fetching job:', jobError);
      if (jobError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      }
      return NextResponse.json({ 
        error: 'Failed to fetch job',
        details: jobError.message 
      }, { status: 500 });
    }

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Calculate summary statistics
    const summary = {
      totalRows: job.total_rows || 0,
      processedRows: job.processed_rows || 0,
      successRows: job.success_rows || 0,
      errorRows: job.error_rows || 0,
      progressPercentage: job.total_rows > 0 
        ? Math.round((job.processed_rows / job.total_rows) * 100) 
        : 0,
      duration: job.started_at && job.completed_at
        ? new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()
        : null
    };

    return NextResponse.json({
      job: {
        id: job.id,
        status: job.status,
        filename: job.original_filename,
        fileSize: job.file_size_bytes,
        contentType: job.content_type,
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        errorSummary: job.error_summary,
        metadata: job.job_metadata
      },
      summary,
      items: job.items || []
    });

  } catch (error) {
    console.error('Error in job status endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch job status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}