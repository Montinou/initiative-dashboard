import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/api-auth-helper';
import { buildObjectKey, generateSignedPostPolicy } from '@/utils/gcs';
import crypto from 'crypto';

/**
 * Generate signed URL for OKR file upload to GCS
 * This replaces the direct file upload with a secure GCS-based approach
 */
export async function POST(req: NextRequest) {
  try {
    // Check if required GCS configuration exists
    if (!process.env.GCS_BUCKET_NAME) {
      console.error('GCS_BUCKET_NAME not configured.');
      return NextResponse.json({ 
        error: 'Storage service not configured',
        details: 'The file upload service requires GCS_BUCKET_NAME to be configured.',
        helpUrl: 'https://github.com/Montinou/initiative-dashboard/blob/main/docs/deployment/gcs-setup.md'
      }, { status: 503 });
    }

    // Get authenticated user profile and supabase client
    const { user, userProfile, error: authError } = await authenticateRequest(req);
    if (authError || !userProfile) {
      return NextResponse.json(
        { error: authError || 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { filename, contentType, checksum, size } = body;

    // Validate required fields
    if (!filename || !contentType || !checksum || !size) {
      return NextResponse.json({ 
        error: 'Missing required fields: filename, contentType, checksum, size' 
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (!allowedTypes.includes(contentType)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only CSV and Excel files are allowed.' 
      }, { status: 400 });
    }

    // Validate file size
    const maxSize = parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50') * 1024 * 1024;
    if (size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is ${process.env.MAX_UPLOAD_SIZE_MB || '50'}MB` 
      }, { status: 400 });
    }

    // Build object key
    const timestamp = Date.now();
    const objectKey = buildObjectKey({
      tenantId: userProfile.tenant_id,
      userId: userProfile.id,
      timestamp,
      checksum,
      filename,
    });

    // Generate signed URL with metadata
    const { url, fields } = await generateSignedPostPolicy({
      objectKey,
      contentType,
      metadata: {
        tenant_id: userProfile.tenant_id,
        user_id: userProfile.id,
        area_id: userProfile.area_id || '',
        filename,
        checksum,
        content_type: contentType,
        session_id: crypto.randomUUID(),
        source: 'web_upload',
      },
    });

    // Return upload configuration
    return NextResponse.json({
      uploadUrl: url,
      fields,
      objectPath: objectKey,
      maxSizeMB: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50'),
      expiresIn: parseInt(process.env.GCS_SIGNED_URL_TTL_SECONDS || '1800'),
    });

  } catch (error) {
    console.error('Error generating upload URL:', error);
    return NextResponse.json({ 
      error: 'Failed to generate upload URL',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}