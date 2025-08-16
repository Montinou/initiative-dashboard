import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth-helper';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * GET /api/upload/okr-file/jobs/[id]/status
 * Get simplified status of a specific import job
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

    // Use service client to bypass RLS
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get job status
    const { data: job, error } = await serviceClient
      .from('okr_import_jobs')
      .select(`
        id,
        status,
        total_rows,
        processed_rows,
        success_rows,
        error_rows,
        job_metadata,
        error_summary,
        original_filename,
        created_at,
        started_at,
        completed_at
      `)
      .eq('id', jobId)
      
      .single();

    if (error || !job) {
      return NextResponse.json({ 
        error: 'Job not found or access denied' 
      }, { status: 404 });
    }

    // Calculate progress percentage
    const progressPercentage = job.total_rows > 0 
      ? Math.round((job.processed_rows / job.total_rows) * 100)
      : 0;

    // Calculate processing time
    let processingTime = null;
    if (job.started_at) {
      const startTime = new Date(job.started_at).getTime();
      const endTime = job.completed_at 
        ? new Date(job.completed_at).getTime() 
        : Date.now();
      processingTime = Math.round((endTime - startTime) / 1000); // in seconds
    }

    // Get count of errors if any
    let errorDetails = null;
    if (job.error_rows > 0) {
      const { data: errors, error: errorQueryError } = await serviceClient
        .from('okr_import_job_items')
        .select('row_number, error_message')
        .eq('job_id', jobId)
        .eq('status', 'error')
        .limit(5); // Get first 5 errors as preview

      if (!errorQueryError && errors) {
        errorDetails = errors;
      }
    }

    // Extract created entities from metadata
    const createdEntities = job.job_metadata?.created_entities || null;

    return NextResponse.json({
      id: job.id,
      status: job.status,
      filename: job.original_filename,
      progress: {
        percentage: progressPercentage,
        total: job.total_rows,
        processed: job.processed_rows,
        successful: job.success_rows,
        failed: job.error_rows
      },
      timing: {
        createdAt: job.created_at,
        startedAt: job.started_at,
        completedAt: job.completed_at,
        processingTimeSeconds: processingTime
      },
      summary: {
        errorSummary: job.error_summary,
        createdEntities,
        processingMode: job.job_metadata?.processing_mode || 'async'
      },
      errorPreview: errorDetails
    });

  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch job status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}