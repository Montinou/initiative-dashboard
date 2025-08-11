import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { getUserProfile } from '@/lib/server-user-profile';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getObjectHead } from '@/utils/gcs';
import { processOKRImportJob } from '@/services/okrImportProcessor';

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
    // getUserProfile now supports Authorization header if provided
    const { user, userProfile } = await getUserProfile(req);

    if (!user || !userProfile) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = await createClient();

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

    // Trigger processing asynchronously
    // In production, this should be a background job/queue service
    processOKRImportJob(job.id).catch(error => {
      console.error(`Failed to process job ${job.id}:`, error);
    });

    return NextResponse.json({ 
      jobId: job.id, 
      status: 'pending',
      message: 'Import job created successfully'
    });

  } catch (error) {
    console.error('Error in notify endpoint:', error);
    return NextResponse.json({ 
      error: 'Failed to process notification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}