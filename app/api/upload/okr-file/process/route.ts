import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth-helper';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { 
  processOKRImportJob, 
  processOKRImportSynchronously,
  countRowsInFile 
} from '@/services/okrImportProcessor';
import { downloadObject } from '@/utils/gcs';
import { OKRBatchProcessor } from '@/services/okrBatchProcessor';
import { optimizedImportService } from '@/services/okrImportOptimized';
import { importMonitoring } from '@/services/importMonitoring';

/**
 * Process a specific import job or all pending jobs
 * This endpoint can be called manually or via a cron job
 */
export async function POST(req: NextRequest) {
  try {
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(req);
    if (authError || !userProfile || !supabase) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      );
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

      // Check if we should process synchronously or asynchronously
      const buffer = await downloadObject(job.object_path);
      const contentType = job.content_type || 'application/octet-stream';
      const rowCount = await countRowsInFile(buffer, contentType);
      
      console.log(`Job ${jobId} has ${rowCount} rows`);
      
      // Threshold for synchronous processing
      const SYNC_THRESHOLD = 25;
      
      // Use optimized import service for better performance
      const useOptimized = true; // Feature flag to switch between implementations
      
      if (useOptimized) {
        // Start monitoring for this job
        importMonitoring.startMonitoring();
        
        // Process with optimized service
        optimizedImportService.processImportJob(jobId, {
          onProgress: (update) => {
            // Progress updates are handled via SSE endpoint
            console.log(`Job ${jobId} progress: ${update.percentage}%`);
          },
          onError: (error) => {
            console.error(`Job ${jobId} error:`, error);
          }
        }).catch(error => {
          console.error(`Optimized processing failed for job ${jobId}:`, error);
        });

        // For small files, wait briefly to see if it completes quickly
        if (rowCount <= SYNC_THRESHOLD) {
          // Wait up to 5 seconds for small files to complete
          const maxWaitTime = 5000;
          const startTime = Date.now();
          
          while (Date.now() - startTime < maxWaitTime) {
            const { data: updatedJob } = await serviceClient
              .from('okr_import_jobs')
              .select('status, processed_rows, success_rows, error_rows')
              .eq('id', jobId)
              .single();
            
            if (updatedJob && updatedJob.status !== 'processing' && updatedJob.status !== 'pending') {
              // Job completed quickly
              return NextResponse.json({
                jobId,
                status: updatedJob.status,
                processedRows: updatedJob.processed_rows,
                successRows: updatedJob.success_rows,
                errorRows: updatedJob.error_rows,
                processingMode: 'optimized-sync',
                message: 'Processing completed'
              });
            }
            
            // Wait 500ms before checking again
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }

        // Return processing status for async jobs
        return NextResponse.json({
          jobId,
          status: 'processing',
          message: `Job is being processed (${rowCount} rows)`,
          processingMode: 'optimized-async',
          progressUrl: `/api/upload/okr-file/jobs/${jobId}/progress`
        });
        
      } else {
        // Fallback to original implementation
        if (rowCount <= SYNC_THRESHOLD) {
          // Process synchronously for small files
          console.log(`Processing synchronously (${rowCount} rows <= ${SYNC_THRESHOLD})`);
          
          try {
            const result = await processOKRImportSynchronously(jobId);
            
            return NextResponse.json({
              jobId,
              status: result.status,
              processedRows: result.processedRows,
              successRows: result.successRows,
              errorRows: result.errorRows,
              summary: result.summary,
              createdEntities: result.createdEntities,
              errors: result.errors,
              processingMode: 'synchronous'
            });
          } catch (error) {
            console.error('Synchronous processing failed:', error);
            return NextResponse.json({
              error: 'Processing failed',
              details: error instanceof Error ? error.message : 'Unknown error',
              processingMode: 'synchronous'
            }, { status: 500 });
          }
        } else {
          // Process asynchronously for large files
          console.log(`Processing asynchronously (${rowCount} rows > ${SYNC_THRESHOLD})`);
          
          // Start async processing
          processOKRImportJob(jobId).catch(error => {
            console.error(`Async processing failed for job ${jobId}:`, error);
          });

          // Return immediately with processing status
          return NextResponse.json({
            jobId,
            status: 'processing',
            message: `Job queued for processing (${rowCount} rows)`,
            processingMode: 'asynchronous'
          });
        }
      }

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
    const { user, userProfile, supabase, error: authError } = await authenticateRequest(req);
    if (authError || !userProfile || !supabase) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      );
    }

    const url = new URL(req.url);
    const jobId = url.searchParams.get('jobId');
    const status = url.searchParams.get('status');

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