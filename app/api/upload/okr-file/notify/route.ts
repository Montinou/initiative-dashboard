import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
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
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, tenant_id, area_id')
      .eq('user_id', user.id)
      .single();
      
    if (!profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 403 });
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
      .eq('tenant_id', profile.tenant_id)
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

    // Create new import job
    const { data: job, error: jobError } = await supabase
      .from('okr_import_jobs')
      .insert({
        tenant_id: profile.tenant_id,
        user_id: profile.id,
        area_id: profile.area_id,
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