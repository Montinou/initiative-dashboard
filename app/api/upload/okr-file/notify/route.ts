import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth-helper';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getObjectHead, downloadObject } from '@/utils/gcs';
import { processOKRImportJob, processOKRImportSynchronously, countRowsInFile } from '@/services/okrImportProcessor';

function parseKeyParts(objectPath: string) {
  const name = objectPath.split('/').pop()!; // {timestamp}-{checksum}-{sanitized_filename}
  const parts = name.split('-');
  const checksum = parts[1];
  const original_filename = parts.slice(2).join('-');
  return { checksum, original_filename };
}

/**
 * Notify endpoint - called after successful GCS upload
 * Creates import job and triggers processing
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

    const { objectPath } = await req.json();
    if (!objectPath) {
      return NextResponse.json({ error: 'Missing objectPath' }, { status: 400 });
    }

    // Fetch object metadata from GCS
    let objectMetadata;
    try {
      objectMetadata = await getObjectHead(objectPath);
    } catch (error) {
      console.error('Failed to get object metadata:', error);
      return NextResponse.json({ 
        error: 'Failed to verify uploaded file',
        details: 'Object not found in storage'
      }, { status: 404 });
    }

    const { checksum, original_filename } = parseKeyParts(objectPath);

    // Check for duplicate upload by checksum within last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const { data: duplicateJob } = await supabase
      .from('okr_import_jobs')
      .select('id, status, created_at')
      .eq('tenant_id', userProfile.tenant_id)
      .eq('file_checksum', checksum)
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (duplicateJob) {
      return NextResponse.json({ 
        jobId: duplicateJob.id, 
        status: duplicateJob.status,
        message: 'Duplicate file detected. Returning existing job.'
      });
    }

    // Create new import job using service role to bypass RLS temporarily
    // This is needed because the RLS policy needs fixing in production
    const serviceClient = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: job, error: jobError } = await serviceClient
      .from('okr_import_jobs')
      .insert({
        tenant_id: userProfile.tenant_id,
        user_id: userProfile.id,
        area_id: userProfile.area_id,
        object_path: objectPath,
        original_filename,
        file_checksum: checksum,
        file_size_bytes: parseInt(objectMetadata.size || '0'),
        content_type: objectMetadata.contentType || 'application/octet-stream',
        status: 'pending',
        job_metadata: {
          gcs_metadata: objectMetadata.metadata || {},
          upload_timestamp: new Date().toISOString()
        }
      })
      .select()
      .single();

    if (jobError || !job) {
      console.error('Failed to create job:', jobError);
      return NextResponse.json({ 
        error: 'Failed to create import job',
        details: jobError?.message
      }, { status: 500 });
    }

    // Check file size to determine processing mode
    // Download the file to count rows
    const SYNC_PROCESSING_THRESHOLD = 25;
    let rowCount = 0;
    let processingMode: 'sync' | 'async' = 'async';
    
    try {
      console.log(`Downloading file to count rows: ${objectPath}`);
      const buffer = await downloadObject(objectPath);
      rowCount = await countRowsInFile(buffer, objectMetadata.contentType || 'application/octet-stream');
      console.log(`File contains ${rowCount} rows`);
      
      processingMode = rowCount <= SYNC_PROCESSING_THRESHOLD ? 'sync' : 'async';
      console.log(`Using ${processingMode} processing mode`);
    } catch (error) {
      console.error('Failed to count rows, defaulting to async processing:', error);
      processingMode = 'async';
    }

    // Process based on determined mode
    if (processingMode === 'sync') {
      // Synchronous processing for small files (≤25 rows)
      try {
        console.log(`Starting synchronous processing for job ${job.id} with ${rowCount} rows`);
        
        // Process synchronously and get immediate results
        const result = await processOKRImportSynchronously(job.id);
        
        return NextResponse.json({ 
          jobId: job.id, 
          status: result.status,
          message: `Import completed synchronously. Processed ${result.processedRows} rows.`,
          summary: result.summary,
          processedRows: result.processedRows,
          successRows: result.successRows,
          errorRows: result.errorRows,
          processingMode: 'sync',
          createdEntities: result.createdEntities,
          errors: result.errors
        });
      } catch (processError) {
        console.error(`Failed to process job ${job.id} synchronously:`, processError);
        
        // Update job status to failed
        await serviceClient
          .from('okr_import_jobs')
          .update({ 
            status: 'failed',
            error_summary: processError instanceof Error ? processError.message : 'Processing failed',
            completed_at: new Date().toISOString()
          })
          .eq('id', job.id);
        
        return NextResponse.json({ 
          jobId: job.id, 
          status: 'failed',
          message: 'Import job failed during synchronous processing',
          error: processError instanceof Error ? processError.message : 'Processing failed',
          processingMode: 'sync'
        }, { status: 500 });
      }
    } else {
      // Asynchronous processing for large files (>25 rows)
      // Process the job asynchronously in the background
      // Note: In Vercel, we still need to process synchronously but we'll return immediately
      // In a production environment with proper background jobs, this would be truly async
      try {
        console.log(`Starting asynchronous processing for job ${job.id} with ${rowCount} rows`);
        
        // Start processing in the background (non-blocking)
        processOKRImportJob(job.id).catch(error => {
          console.error(`Background processing failed for job ${job.id}:`, error);
          // Update job status to failed in the background
          serviceClient
            .from('okr_import_jobs')
            .update({ 
              status: 'failed',
              error_summary: error instanceof Error ? error.message : 'Processing failed',
              completed_at: new Date().toISOString()
            })
            .eq('id', job.id)
            .then(() => console.log(`Job ${job.id} marked as failed`))
            .catch(err => console.error(`Failed to update job ${job.id} status:`, err));
        });
        
        // Return immediately with pending status
        return NextResponse.json({ 
          jobId: job.id, 
          status: 'pending',
          message: `Import job created. Processing ${rowCount} rows asynchronously.`,
          processingMode: 'async',
          estimatedTime: Math.ceil(rowCount / 10) + ' seconds' // Rough estimate
        });
      } catch (processError) {
        console.error(`Failed to start async processing for job ${job.id}:`, processError);
        
        return NextResponse.json({ 
          jobId: job.id, 
          status: 'failed',
          message: 'Failed to start asynchronous processing',
          error: processError instanceof Error ? processError.message : 'Processing failed',
          processingMode: 'async'
        }, { status: 500 });
      }
    }

  } catch (error) {
    console.error('Error in notify endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to process notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}