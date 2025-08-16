/**
 * File Upload with GCS Backup
 * 
 * This endpoint:
 * 1. Receives the file
 * 2. Uploads it to Google Cloud Storage as backup
 * 3. Processes the data
 * 4. Saves to database with GCS URL reference
 */

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/utils/supabase/server';
import { Storage } from '@google-cloud/storage';
import { authenticateRequest } from '@/lib/api-auth-helper';
import { validateFile } from '@/lib/upload/validators';
import crypto from 'crypto';

// Initialize GCS with default credentials
const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID || 'insaight-backend',
});

// Use the appropriate bucket for uploads
const bucketName = 'insaight-backend-raw-data'; // Using the raw-data bucket for uploads
const bucket = storage.bucket(bucketName);

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Authenticate user
    const { user, userProfile } = await authenticateRequest(request);

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const areaId = formData.get('areaId') as string | null;
    const entityType = formData.get('entityType') as string || 'initiatives';

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv'
    ];

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload XLSX, XLS, or CSV files only.' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    // Generate unique filename for GCS
    const timestamp = Date.now();
    const hash = crypto.createHash('md5').update(uint8Array).digest('hex').substring(0, 8);
    const fileExtension = file.name.split('.').pop();
    const gcsFileName = `okr-uploads/${userProfile.tenant_id}/${timestamp}_${hash}.${fileExtension}`;

    // Upload to GCS
    console.log('📤 Uploading to GCS:', gcsFileName);
    const gcsFile = bucket.file(gcsFileName);
    
    await gcsFile.save(Buffer.from(uint8Array), {
      metadata: {
        contentType: file.type,
        metadata: {
          originalName: file.name,
          uploadedBy: userProfile.id,
          tenantId: userProfile.tenant_id,
          entityType: entityType,
          uploadTimestamp: new Date().toISOString()
        }
      }
    });

    // Get public URL (or signed URL if bucket is private)
    const [metadata] = await gcsFile.getMetadata();
    const gcsUrl = `gs://${bucketName}/${gcsFileName}`;
    console.log('✅ File uploaded to GCS:', gcsUrl);

    // Parse the file
    let workbook: XLSX.WorkBook;
    let parsedData: any[] = [];
    let errors: string[] = [];

    try {
      if (file.type === 'text/csv') {
        const text = new TextDecoder('utf-8').decode(uint8Array);
        workbook = XLSX.read(text, { type: 'string' });
      } else {
        workbook = XLSX.read(uint8Array, { type: 'array' });
      }

      // Process first worksheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Validate and process data
      const { data: areas } = await supabase
        .from('areas')
        .select('name');

      const validAreas = areas?.map(a => a.name) || [];

      // Determine if this is multi-area import
      const requireArea = userProfile.role === 'CEO' || userProfile.role === 'Admin';

      // Validate file
      const validationResult = validateFile(rawData as any[][], {
        validAreas,
        requireArea,
        maxRows: 10000
      });

      if (!validationResult.isValid) {
        return NextResponse.json(
          { 
            error: 'Validation failed',
            errors: validationResult.errors
          },
          { status: 400 }
        );
      }

      parsedData = validationResult.processedData || [];
      errors = validationResult.warnings?.map(w => w.message) || [];

    } catch (parseError) {
      console.error('File parsing error:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse file. Please check the file format.' },
        { status: 400 }
      );
    }

    // Save file metadata to database
    const { data: uploadedFile, error: fileError } = await supabase
      .from('uploaded_files')
      .insert({
        tenant_id: userProfile.tenant_id,
        uploaded_by: userProfile.id,
        original_filename: file.name,
        stored_filename: gcsFileName,
        gcs_url: gcsUrl,
        file_size: file.size,
        file_type: file.type,
        entity_type: entityType,
        metadata: {
          gcsMetadata: metadata,
          recordsProcessed: parsedData.length,
          processingErrors: errors
        }
      })
      .select()
      .single();

    if (fileError) {
      console.error('Error saving file record:', fileError);
    }

    // Process and save data to database
    let savedInitiatives = 0;
    let saveErrors: string[] = [];

    if (parsedData.length > 0) {
      // Get or use area
      let processAreaId = areaId;
      
      if (!processAreaId && userProfile.role === 'Manager' && userProfile.area_id) {
        processAreaId = userProfile.area_id;
      }

      // Save each record
      for (const row of parsedData) {
        try {
          // Find area if multi-area import
          let initiativeAreaId = processAreaId;
          
          if (row.area && !initiativeAreaId) {
            const { data: area } = await supabase
              .from('areas')
              .select('id')
              .eq('name', row.area)
              .single();
            
            if (area) {
              initiativeAreaId = area.id;
            }
          }

          if (!initiativeAreaId) {
            saveErrors.push(`Cannot determine area for: ${row.iniciativa}`);
            continue;
          }

          // Create objective if doesn't exist
          let objectiveId = null;
          if (row.objetivo) {
            const { data: existingObjective } = await supabase
              .from('objectives')
              .select('id')
              .eq('title', row.objetivo)
              .eq('area_id', initiativeAreaId)
              .single();

            if (existingObjective) {
              objectiveId = existingObjective.id;
            } else {
              const { data: newObjective } = await supabase
                .from('objectives')
                .insert({
                  tenant_id: userProfile.tenant_id,
                  area_id: initiativeAreaId,
                  title: row.objetivo,
                  description: `Imported from ${file.name}`,
                  created_by: userProfile.id,
                  status: 'in_progress',
                  priority: row.prioridad || 'medium'
                })
                .select()
                .single();

              if (newObjective) {
                objectiveId = newObjective.id;
              }
            }
          }

          // Create initiative
          const { data: newInitiative, error: initiativeError } = await supabase
            .from('initiatives')
            .insert({
              tenant_id: userProfile.tenant_id,
              area_id: initiativeAreaId,
              title: row.iniciativa,
              description: row.descripcion || '',
              progress: row.progreso || 0,
              status: row.estado || 'planning',
              created_by: userProfile.id,
              start_date: row.fechaInicio,
              due_date: row.fechaFin,
              metadata: {
                importedFrom: file.name,
                uploadFileId: uploadedFile?.id,
                gcsUrl: gcsUrl,
                responsable: row.responsable
              }
            })
            .select()
            .single();

          if (initiativeError) {
            saveErrors.push(`Failed to save "${row.iniciativa}": ${initiativeError.message}`);
          } else {
            savedInitiatives++;

            // Link to objective if exists
            if (objectiveId && newInitiative) {
              await supabase
                .from('objective_initiatives')
                .insert({
                  objective_id: objectiveId,
                  initiative_id: newInitiative.id
                });
            }

            // Link to uploaded file
            if (uploadedFile && newInitiative) {
              await supabase
                .from('file_initiatives')
                .insert({
                  file_id: uploadedFile.id,
                  initiative_id: newInitiative.id
                });
            }
          }

        } catch (error) {
          saveErrors.push(`Error processing "${row.iniciativa}": ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }

    // Return response
    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        fileSize: file.size,
        gcsUrl: gcsUrl,
        uploadedFileId: uploadedFile?.id,
        recordsProcessed: parsedData.length,
        savedInitiatives: savedInitiatives,
        errors: [...errors, ...saveErrors],
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Upload processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error during file processing' },
      { status: 500 }
    );
  }
}