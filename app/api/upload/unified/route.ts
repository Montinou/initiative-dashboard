import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { UnifiedImportProcessor, EntityType } from '@/services/unifiedImportProcessor';
import { ImportPreviewService } from '@/services/importPreview';
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
      .select('id, tenant_id, role, area_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Get request body
    const body = await request.json();
    const { objectPath, filename, contentType, entityType, preview } = body;

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

    // If preview mode, return preview and validation
    if (preview) {
      const previewService = new ImportPreviewService(
        supabase,
        userProfile.tenant_id,
        userProfile.id
      );

      const result = await previewService.getPreviewAndValidation(
        fileBuffer,
        filename,
        contentType || 'text/csv',
        entityType as EntityType
      );

      return NextResponse.json(result);
    }

    // Check permissions based on entity type
    const permissionCheck = checkImportPermissions(
      userProfile.role,
      entityType,
      userProfile.area_id
    );

    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.message },
        { status: 403 }
      );
    }

    // Process import
    const processor = new UnifiedImportProcessor(
      supabase,
      userProfile.tenant_id,
      userProfile.id
    );

    const result = await processor.processImport(
      fileBuffer,
      filename,
      contentType || 'text/csv',
      objectPath,
      entityType as EntityType
    );

    return NextResponse.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Unified import error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process import',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for preview with validation
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

    const { searchParams } = new URL(request.url);
    const objectPath = searchParams.get('objectPath');
    const contentType = searchParams.get('contentType');
    const entityType = searchParams.get('entityType') as EntityType;

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

    // Get preview and validation
    const previewService = new ImportPreviewService(
      supabase,
      userProfile.tenant_id,
      userProfile.id
    );

    const result = await previewService.getPreviewAndValidation(
      fileBuffer,
      'preview.csv',
      contentType || 'text/csv',
      entityType
    );

    return NextResponse.json(result);

  } catch (error) {
    console.error('Unified import preview error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate preview',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Check if user has permission to import specific entity type
 */
function checkImportPermissions(
  role: string,
  entityType?: string,
  userAreaId?: string
): { allowed: boolean; message?: string } {
  // CEO and Admin can import anything
  if (['CEO', 'Admin'].includes(role)) {
    return { allowed: true };
  }

  // Managers have limited permissions
  if (role === 'Manager') {
    if (!userAreaId) {
      return {
        allowed: false,
        message: 'Manager must be assigned to an area'
      };
    }

    // Managers can only import certain entity types for their area
    const allowedForManager = ['objectives', 'initiatives', 'activities'];
    
    if (!entityType || !allowedForManager.includes(entityType)) {
      return {
        allowed: false,
        message: `Managers can only import: ${allowedForManager.join(', ')}`
      };
    }

    // Managers cannot import users or areas
    if (['users', 'areas'].includes(entityType)) {
      return {
        allowed: false,
        message: 'Only Admin and CEO can import users and areas'
      };
    }

    return { allowed: true };
  }

  return {
    allowed: false,
    message: 'Insufficient permissions'
  };
}