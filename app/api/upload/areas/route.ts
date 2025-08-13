import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { AreaImportProcessor } from '@/services/areaImportProcessor';
import { Storage } from '@google-cloud/storage';

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEY_FILE,
});

const bucket = storage.bucket(process.env.GCS_BUCKET_NAME!);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Check permissions (only Admin and CEO can import areas)
    if (!['Admin', 'CEO'].includes(userProfile.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions. Only Admin and CEO can import areas.' },
        { status: 403 }
      );
    }

    // Get request body
    const body = await request.json();
    const { objectPath, filename, contentType } = body;

    if (!objectPath || !filename) {
      return NextResponse.json(
        { error: 'Missing required fields: objectPath, filename' },
        { status: 400 }
      );
    }

    // Download file from GCS
    const file = bucket.file(objectPath);
    const [exists] = await file.exists();
    
    if (!exists) {
      return NextResponse.json(
        { error: 'File not found in storage' },
        { status: 404 }
      );
    }

    const [fileBuffer] = await file.download();

    // Process import
    const processor = new AreaImportProcessor(
      supabase,
      userProfile.tenant_id,
      userProfile.id
    );

    const result = await processor.processImport(
      fileBuffer,
      filename,
      contentType || 'text/csv',
      objectPath
    );

    return NextResponse.json({
      success: true,
      jobId: result.jobId,
      totalRows: result.totalRows,
      successRows: result.successRows,
      errorRows: result.errorRows,
      errors: result.errors,
      processedAreas: result.processedAreas
    });

  } catch (error) {
    console.error('Area import error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process area import',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for preview
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const objectPath = searchParams.get('objectPath');
    const contentType = searchParams.get('contentType');

    if (!objectPath) {
      return NextResponse.json(
        { error: 'Missing objectPath parameter' },
        { status: 400 }
      );
    }

    // Download file from GCS
    const file = bucket.file(objectPath);
    const [exists] = await file.exists();
    
    if (!exists) {
      return NextResponse.json(
        { error: 'File not found in storage' },
        { status: 404 }
      );
    }

    const [fileBuffer] = await file.download();

    // Get preview
    const preview = await AreaImportProcessor.getPreview(
      fileBuffer,
      contentType || 'text/csv'
    );

    return NextResponse.json(preview);

  } catch (error) {
    console.error('Area import preview error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate preview',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}