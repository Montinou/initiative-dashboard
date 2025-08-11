import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserProfile } from '@/lib/server-user-profile';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { processOKRImportJob } from '@/services/okrImportProcessor';

/**
 * Process a specific import job or all pending jobs
 * This endpoint can be called manually or via a cron job
 */
export async function POST(req: NextRequest) {
  try {
    // getUserProfile now supports Authorization header if provided
    const { user, userProfile } = await getUserProfile(req);

    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { jobId } = await req.json();
    
    // Use service client to bypass RLS
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    if (jobId) {
      // Process specific job
      const { data: job, error } = await serviceClient
        .from('okr_import_jobs')
        .select('*')
        .eq('id', jobId)
        .eq('tenant_id', userProfile.tenant_id)
        .single();

      if (error || !job) {
        return NextResponse.json({ 
          error: 'Job not found or access denied' 
        }, { status: 404 });
      }

      if (job.status !== 'pending') {
        return NextResponse.json({ 
          message: 'Job already processed',
          status: job.status 
        });
      }

      // Process the job
      await processOKRImportJob(jobId);

      // Get updated status
      const { data: updatedJob } = await serviceClient
        .from('okr_import_jobs')
        .select('status, summary, processed_rows')
        .eq('id', jobId)
        .single();

      return NextResponse.json({
        jobId,
        status: updatedJob?.status,
        summary: updatedJob?.summary,
        processedRows: updatedJob?.processed_rows
      });

    } else {
      // Process all pending jobs for the tenant
      const { data: pendingJobs, error } = await serviceClient
        .from('okr_import_jobs')
        .select('id')
        .eq('tenant_id', userProfile.tenant_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
        .limit(5); // Process max 5 jobs at once

      if (error || !pendingJobs || pendingJobs.length === 0) {
        return NextResponse.json({ 
          message: 'No pending jobs found' 
        });
      }

      const results = [];
      for (const job of pendingJobs) {
        try {
          await processOKRImportJob(job.id);
          results.push({ jobId: job.id, status: 'processed' });
        } catch (error) {
          console.error(`Failed to process job ${job.id}:`, error);
          results.push({ 
            jobId: job.id, 
            status: 'failed', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          });
        }
      }

      return NextResponse.json({
        message: `Processed ${results.length} jobs`,
        results
      });
    }

  } catch (error) {
    console.error('Error in process endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to process jobs',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Get status of import jobs
 */
export async function GET(req: NextRequest) {
  try {
    // getUserProfile now supports Authorization header if provided
    const { user, userProfile } = await getUserProfile(req);

    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId');
    const status = url.searchParams.get('status');

    const supabase = await createClient();

    let query = supabase
      .from('okr_import_jobs')
      .select('*')
      .eq('tenant_id', userProfile.tenant_id)
      .order('created_at', { ascending: false });

    if (jobId) {
      query = query.eq('id', jobId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    const { data: jobs, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({ jobs });

  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch job status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}