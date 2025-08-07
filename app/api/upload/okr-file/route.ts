/**
 * Single-Area OKR File Upload API
 * 
 * Processes Excel files containing OKR data for a manager's assigned area.
 * Creates objectives, initiatives, and activities based on the new schema structure.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/utils/supabase/server';
import { getUserProfile } from '@/lib/server-user-profile';

interface ProcessedData {
  objectives: number;
  initiatives: number;
  activities: number;
  errors: string[];
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user profile
    const userProfile = await getUserProfile(request);
    if (!userProfile) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify manager role and area assignment
    if (userProfile.role !== 'Manager' && userProfile.role !== 'Admin') {
      return NextResponse.json(
        { error: 'Only managers/admins can upload OKR files' },
        { status: 403 }
      );
    }

    if (!userProfile.area_id) {
      return NextResponse.json(
        { error: 'Manager must be assigned to an area to upload files' },
        { status: 403 }
      );
    }

    // Get area details
    const { data: area, error: areaError } = await supabase
      .from('areas')
      .select('id, name')
      .eq('id', userProfile.area_id)
      .eq('tenant_id', userProfile.tenant_id)
      .single();

    if (areaError || !area) {
      return NextResponse.json(
        { error: 'Area not found' },
        { status: 404 }
      );
    }

    // Get quarters for this tenant
    const { data: quarters } = await supabase
      .from('quarters')
      .select('id, quarter_name, start_date, end_date')
      .eq('tenant_id', userProfile.tenant_id);

    console.log('📍 Processing for area:', `${area.name} (${area.id})`);
    console.log('📅 Available quarters:', quarters?.map(q => q.quarter_name) || []);

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const quarterName = formData.get('quarter') as string; // Optional: specific quarter

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload XLSX or XLS files only.' },
        { status: 400 }
      );
    }

    // Parse the file
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    const workbook = XLSX.read(uint8Array, { type: 'array' });

    console.log('📊 Sheets found:', workbook.SheetNames);

    // Store the uploaded file record
    const { data: uploadedFile, error: fileError } = await supabase
      .from('uploaded_files')
      .insert({
        tenant_id: userProfile.tenant_id,
        uploaded_by: userProfile.id,
        original_filename: file.name,
        stored_filename: `${Date.now()}_${file.name}`
      })
      .select()
      .single();

    if (fileError) {
      console.error('Error saving file record:', fileError);
    }

    let totalProcessed: ProcessedData = {
      objectives: 0,
      initiatives: 0,
      activities: 0,
      errors: []
    };

    let processedSheets: any[] = [];

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n📋 Processing sheet: ${sheetName}`);
      
      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!rawData || rawData.length < 2) {
        console.log(`⚠️  Sheet "${sheetName}" is empty or has no data`);
        continue;
      }

      // Process this sheet for the manager's area
      const processedSheet = await processSheetData(
        rawData as any[][],
        area,
        quarters || [],
        quarterName,
        userProfile,
        supabase,
        uploadedFile?.id
      );

      processedSheets.push({
        sheetName,
        areaName: area.name,
        areaId: area.id,
        objectives: processedSheet.objectives,
        initiatives: processedSheet.initiatives,
        activities: processedSheet.activities,
        errors: processedSheet.errors
      });

      totalProcessed.objectives += processedSheet.objectives;
      totalProcessed.initiatives += processedSheet.initiatives;
      totalProcessed.activities += processedSheet.activities;
      totalProcessed.errors.push(...processedSheet.errors.map(e => `[${sheetName}] ${e}`));

      // Link file to area
      if (uploadedFile) {
        await supabase
          .from('file_areas')
          .insert({
            file_id: uploadedFile.id,
            area_id: area.id
          });
      }
    }

    console.log(`\n🎉 Processing completed!`);
    console.log(`📊 Total processed - Objectives: ${totalProcessed.objectives}, Initiatives: ${totalProcessed.initiatives}, Activities: ${totalProcessed.activities}`);

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        fileSize: file.size,
        fileId: uploadedFile?.id,
        processed: {
          objectives: totalProcessed.objectives,
          initiatives: totalProcessed.initiatives,
          activities: totalProcessed.activities
        },
        sheetsProcessed: processedSheets.length,
        sheetDetails: processedSheets,
        errors: totalProcessed.errors,
        areaName: area.name,
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

/**
 * Process sheet data and create objectives, initiatives, and activities
 */
async function processSheetData(
  data: any[][],
  area: any,
  quarters: any[],
  quarterName: string | null,
  userProfile: any,
  supabase: any,
  fileId: string | undefined
): Promise<ProcessedData> {
  const result: ProcessedData = {
    objectives: 0,
    initiatives: 0,
    activities: 0,
    errors: []
  };
  try {
    // Assume the first row contains headers
    const headers = data[0];
    
    // Common header variations
    const headerMap: Record<string, string[]> = {
      objective: ['objetivo', 'objective', 'okr', 'meta'],
      initiative: ['iniciativa', 'initiative', 'proyecto', 'project', 'acción', 'accion'],
      activity: ['actividad', 'activity', 'tarea', 'task', 'subtarea'],
      quarter: ['trimestre', 'quarter', 'q', 'periodo', 'period'],
      progress: ['progreso', 'progress', 'avance', '%'],
      responsible: ['responsable', 'responsible', 'owner', 'asignado', 'assigned'],
      status: ['estado', 'status', 'situación'],
      dueDate: ['fecha', 'date', 'due', 'vencimiento', 'entrega'],
      description: ['descripción', 'descripcion', 'description', 'detalle']
    };

    // Find column indices
    const findColumnIndex = (variants: string[]) => {
      return headers.findIndex((h: any) => 
        variants.some(v => 
          h && h.toString().toLowerCase().includes(v.toLowerCase())
        )
      );
    };

    const columns = {
      objective: findColumnIndex(headerMap.objective),
      initiative: findColumnIndex(headerMap.initiative),
      activity: findColumnIndex(headerMap.activity),
      quarter: findColumnIndex(headerMap.quarter),
      progress: findColumnIndex(headerMap.progress),
      responsible: findColumnIndex(headerMap.responsible),
      status: findColumnIndex(headerMap.status),
      dueDate: findColumnIndex(headerMap.dueDate),
      description: findColumnIndex(headerMap.description)
    };

    console.log('📊 Column mapping:', columns);

    // Track created entities to avoid duplicates and link relationships
    const createdObjectives = new Map<string, string>(); // title -> id
    const createdInitiatives = new Map<string, string>(); // title -> id

    // Process data rows
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      try {
        // Extract data from row
        const objectiveTitle = columns.objective >= 0 ? row[columns.objective]?.toString().trim() : null;
        const initiativeTitle = columns.initiative >= 0 ? row[columns.initiative]?.toString().trim() : null;
        const activityTitle = columns.activity >= 0 ? row[columns.activity]?.toString().trim() : null;
        const quarterValue = columns.quarter >= 0 ? row[columns.quarter]?.toString().trim() : quarterName;
        const progressValue = columns.progress >= 0 ? parseFloat(row[columns.progress]) || 0 : 0;
        const descriptionValue = columns.description >= 0 ? row[columns.description]?.toString().trim() : null;

        // Create or get objective
        let objectiveId: string | null = null;
        if (objectiveTitle && !createdObjectives.has(objectiveTitle)) {
          const { data: objective, error } = await supabase
            .from('objectives')
            .insert({
              tenant_id: userProfile.tenant_id,
              area_id: area.id,
              title: objectiveTitle,
              description: descriptionValue || `Imported from ${area.name} OKR file`,
              created_by: userProfile.id
            })
            .select()
            .single();

          if (!error && objective) {
            createdObjectives.set(objectiveTitle, objective.id);
            objectiveId = objective.id;
            result.objectives++;

            // Link to quarter if specified
            if (quarterValue) {
              const quarter = quarters.find(q => 
                q.quarter_name.toLowerCase() === quarterValue.toLowerCase()
              );
              if (quarter) {
                await supabase
                  .from('objective_quarters')
                  .insert({
                    objective_id: objective.id,
                    quarter_id: quarter.id
                  });
              }
            }
          } else {
            console.error(`Error creating objective: ${error?.message}`);
          }
        } else if (objectiveTitle) {
          objectiveId = createdObjectives.get(objectiveTitle) || null;
        }

        // Create or get initiative
        let initiativeId: string | null = null;
        if (initiativeTitle && !createdInitiatives.has(initiativeTitle)) {
          const { data: initiative, error } = await supabase
            .from('initiatives')
            .insert({
              tenant_id: userProfile.tenant_id,
              area_id: area.id,
              title: initiativeTitle,
              description: descriptionValue || `Part of: ${objectiveTitle || 'General objective'}`,
              created_by: userProfile.id,
              progress: progressValue
            })
            .select()
            .single();

          if (!error && initiative) {
            createdInitiatives.set(initiativeTitle, initiative.id);
            initiativeId = initiative.id;
            result.initiatives++;

            // Link to objective if exists
            if (objectiveId) {
              await supabase
                .from('objective_initiatives')
                .insert({
                  objective_id: objectiveId,
                  initiative_id: initiative.id
                });
            }

            // Link to file if exists
            if (fileId) {
              await supabase
                .from('file_initiatives')
                .insert({
                  file_id: fileId,
                  initiative_id: initiative.id
                });
            }
          } else {
            console.error(`Error creating initiative: ${error?.message}`);
          }
        } else if (initiativeTitle) {
          initiativeId = createdInitiatives.get(initiativeTitle) || null;
        }

        // Create activity if specified
        if (activityTitle && initiativeId) {
          const isCompleted = progressValue >= 100 || 
                            (columns.status >= 0 && 
                             ['completado', 'completed', 'done', 'finalizado'].includes(
                               row[columns.status]?.toString().toLowerCase() || ''
                             ));

          const { error } = await supabase
            .from('activities')
            .insert({
              initiative_id: initiativeId,
              title: activityTitle,
              description: descriptionValue,
              is_completed: isCompleted,
              assigned_to: null // Could map responsible column to user if needed
            });

          if (!error) {
            result.activities++;
          } else {
            console.error(`Error creating activity: ${error.message}`);
          }
        }

      } catch (rowError) {
        console.error(`Error processing row ${i}:`, rowError);
        result.errors.push(`Row ${i}: ${rowError.message}`);
      }
    }

  } catch (error) {
    console.error('Error processing sheet:', error);
    result.errors.push(`Sheet processing error: ${error.message}`);
  }

  return result;
}

