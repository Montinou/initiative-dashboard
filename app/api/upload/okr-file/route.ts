import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/utils/supabase/server';
import { getManagerAreaId } from '@/lib/server/manager-permissions';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user profile with role validation
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select(`
        id,
        tenant_id,
        area_id,
        role,
        areas:area_id (
          id,
          name,
          tenant_id
        )
      `)
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Verify manager role and area assignment
    if (userProfile.role !== 'Manager' && userProfile.role !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Only managers can upload OKR files' },
        { status: 403 }
      );
    }

    if (!userProfile.area_id) {
      return NextResponse.json(
        { error: 'Manager must be assigned to an area to upload files' },
        { status: 403 }
      );
    }

    const managerAreaId = await getManagerAreaId(user.id);
    if (!managerAreaId || managerAreaId !== userProfile.area_id) {
      return NextResponse.json(
        { error: 'Area assignment validation failed' },
        { status: 403 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

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
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    // Save file upload record
    const { data: uploadRecord, error: uploadError } = await supabase
      .from('uploaded_files')
      .insert({
        tenant_id: userProfile.tenant_id,
        area_id: userProfile.area_id,
        uploaded_by: user.id,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        upload_status: 'processing'
      })
      .select('id')
      .single();

    if (uploadError || !uploadRecord) {
      return NextResponse.json(
        { error: 'Failed to record file upload' },
        { status: 500 }
      );
    }

    // Parse the file
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    let workbook: XLSX.WorkBook;
    let parsedData: any[] = [];
    let errors: string[] = [];
    let processedSheets: any[] = [];

    try {
      if (file.type === 'text/csv') {
        const text = new TextDecoder('utf-8').decode(uint8Array);
        workbook = XLSX.read(text, { type: 'string' });
      } else {
        workbook = XLSX.read(uint8Array, { type: 'array' });
      }

      // Process all worksheets
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (!rawData || rawData.length < 2) {
          continue; // Skip empty sheets
        }
        
        const processedSheet = await processOKRSheetForManager(
          rawData as any[][],
          userProfile.tenant_id,
          userProfile.area_id,
          userProfile.areas.name,
          sheetName,
          supabase
        );
        
        if (processedSheet.data.length > 0) {
          processedSheets.push({
            sheetName,
            data: processedSheet.data,
            recordCount: processedSheet.data.length
          });
          parsedData.push(...processedSheet.data);
        }
        
        if (processedSheet.errors.length > 0) {
          errors.push(...processedSheet.errors.map(error => `[${sheetName}] ${error}`));
        }
      }

    } catch (parseError) {
      console.error('File parsing error:', parseError);
      
      // Update upload record with error
      await supabase
        .from('uploaded_files')
        .update({ 
          upload_status: 'failed',
          error_message: 'Failed to parse file. Please check the file format.'
        })
        .eq('id', uploadRecord.id);

      return NextResponse.json(
        { error: 'Failed to parse file. Please check the file format.' },
        { status: 400 }
      );
    }

    // Save processed data to database
    let savedInitiatives = 0;
    let saveErrors: string[] = [];
    
    if (parsedData.length > 0) {
      try {
        const saveResult = await saveOKRDataForManager(
          parsedData,
          userProfile.tenant_id,
          userProfile.area_id,
          user.id,
          supabase
        );
        savedInitiatives = saveResult.savedCount;
        saveErrors = saveResult.errors;
      } catch (saveError) {
        console.error('Database save error:', saveError);
        saveErrors.push('Failed to save data to database');
      }
    }

    // Update upload record
    const finalStatus = saveErrors.length > 0 ? 'completed_with_errors' : 'completed';
    const allErrors = [...errors, ...saveErrors];
    
    await supabase
      .from('uploaded_files')
      .update({
        upload_status: finalStatus,
        processed_records: savedInitiatives,
        error_message: allErrors.length > 0 ? allErrors.join('; ') : null,
        processed_at: new Date().toISOString()
      })
      .eq('id', uploadRecord.id);

    return NextResponse.json({
      success: true,
      data: {
        uploadId: uploadRecord.id,
        fileName: file.name,
        fileSize: file.size,
        recordsProcessed: parsedData.length,
        sheetsProcessed: processedSheets.length,
        sheetDetails: processedSheets,
        savedInitiatives: savedInitiatives,
        errors: allErrors,
        areaName: userProfile.areas.name,
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
 * Process OKR sheet data specifically for a manager's area
 * Ensures all data is assigned to the manager's area only
 */
async function processOKRSheetForManager(
  rawData: any[][],
  tenantId: string,
  areaId: string,
  areaName: string,
  sheetName: string,
  supabase: any
) {
  const errors: string[] = [];
  const processedData: any[] = [];

  if (rawData.length < 2) {
    errors.push(`Sheet "${sheetName}": File must contain at least a header row and one data row`);
    return { data: [], errors };
  }

  // Find header row
  let headerRowIndex = -1;
  let headers: string[] = [];
  
  for (let i = 0; i < Math.min(5, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.some(cell => 
      cell && (
        cell.toString().toLowerCase().includes('objetivo') ||
        cell.toString().toLowerCase().includes('acción') ||
        cell.toString().toLowerCase().includes('accion')
      )
    )) {
      headerRowIndex = i;
      headers = row.map(h => h ? h.toString().trim() : '');
      break;
    }
  }

  if (headerRowIndex === -1) {
    errors.push(`Sheet "${sheetName}": Could not find expected headers (Objetivo, Acción, etc.)`);
    return { data: [], errors };
  }

  // Map columns
  const columnMapping = {
    objetivo: -1,
    accion: -1,
    progreso: -1,
    prioridad: -1,
    responsable: -1,
    fecha: -1,
    descripcion: -1,
    resultado: -1,
    estado: -1
  };

  headers.forEach((header, index) => {
    const headerLower = header.toLowerCase();
    if (headerLower.includes('objetivo')) {
      columnMapping.objetivo = index;
    } else if (headerLower.includes('acción') || headerLower.includes('accion')) {
      columnMapping.accion = index;
    } else if (headerLower.includes('progreso') || headerLower.includes('%') || headerLower.includes('avance')) {
      columnMapping.progreso = index;
    } else if (headerLower.includes('prioridad')) {
      columnMapping.prioridad = index;
    } else if (headerLower.includes('responsable')) {
      columnMapping.responsable = index;
    } else if (headerLower.includes('fecha')) {
      columnMapping.fecha = index;
    } else if (headerLower.includes('descripción') || headerLower.includes('descripcion')) {
      columnMapping.descripcion = index;
    } else if (headerLower.includes('resultado')) {
      columnMapping.resultado = index;
    } else if (headerLower.includes('estado')) {
      columnMapping.estado = index;
    }
  });

  // Validate required columns
  if (columnMapping.objetivo === -1 && columnMapping.accion === -1) {
    errors.push(`Sheet "${sheetName}": Missing required columns (Objetivo or Acción)`);
    return { data: [], errors };
  }

  // Process data rows
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    
    if (!row || row.length === 0 || row.every(cell => !cell)) {
      continue; // Skip empty rows
    }

    // Skip rows with no meaningful data
    const hasAnyMeaningfulData = row.some(cell => 
      cell && 
      cell.toString().trim() && 
      cell.toString().trim() !== '' &&
      !cell.toString().match(/^[\s\-_=]+$/)
    );
    
    if (!hasAnyMeaningfulData) {
      continue;
    }

    const processedRow: any = {
      rowNumber: i + 1,
      areaId: areaId, // Force manager's area
      areaName: areaName,
      objetivo: '',
      accion: '',
      progreso: 0,
      prioridad: 'medium',
      responsable: '',
      fechaLimite: '',
      descripcion: '',
      resultado: '',
      estado: '🟡',
      sheetSource: sheetName,
      tenantId: tenantId
    };

    // Extract objetivo
    if (columnMapping.objetivo !== -1) {
      const objetivoValue = row[columnMapping.objetivo];
      if (objetivoValue && objetivoValue.toString().trim()) {
        processedRow.objetivo = objetivoValue.toString().trim();
      }
    }

    // Extract accion
    if (columnMapping.accion !== -1) {
      const accionValue = row[columnMapping.accion];
      if (accionValue && accionValue.toString().trim()) {
        processedRow.accion = accionValue.toString().trim();
      }
    }

    // Use accion as title if objetivo is empty
    if (!processedRow.objetivo && processedRow.accion) {
      processedRow.objetivo = processedRow.accion;
    }

    // Skip if no meaningful objective/action
    if (!processedRow.objetivo) {
      continue;
    }

    // Extract progress
    if (columnMapping.progreso !== -1) {
      const progresoValue = row[columnMapping.progreso];
      if (progresoValue !== undefined && progresoValue !== null) {
        let progress = 0;
        
        if (typeof progresoValue === 'number') {
          progress = progresoValue;
        } else {
          const progressStr = progresoValue.toString().replace('%', '').trim();
          progress = parseFloat(progressStr);
        }
        
        if (!isNaN(progress)) {
          if (progress > 1 && progress <= 100) {
            processedRow.progreso = Math.round(progress);
          } else if (progress <= 1) {
            processedRow.progreso = Math.round(progress * 100);
          }
          
          // Validate range
          if (processedRow.progreso < 0 || processedRow.progreso > 100) {
            processedRow.progreso = Math.max(0, Math.min(100, processedRow.progreso));
          }
        }
      }
    }

    // Extract other fields
    if (columnMapping.prioridad !== -1) {
      const prioridadValue = row[columnMapping.prioridad];
      if (prioridadValue) {
        const prioridad = prioridadValue.toString().trim().toLowerCase();
        if (['alta', 'high'].includes(prioridad)) {
          processedRow.prioridad = 'high';
        } else if (['baja', 'low'].includes(prioridad)) {
          processedRow.prioridad = 'low';
        } else {
          processedRow.prioridad = 'medium';
        }
      }
    }

    if (columnMapping.responsable !== -1) {
      const responsableValue = row[columnMapping.responsable];
      if (responsableValue) {
        processedRow.responsable = responsableValue.toString().trim();
      }
    }

    if (columnMapping.fecha !== -1) {
      const fechaValue = row[columnMapping.fecha];
      if (fechaValue) {
        processedRow.fechaLimite = fechaValue.toString().trim();
      }
    }

    if (columnMapping.descripcion !== -1) {
      const descripcionValue = row[columnMapping.descripcion];
      if (descripcionValue) {
        processedRow.descripcion = descripcionValue.toString().trim();
      }
    }

    if (columnMapping.resultado !== -1) {
      const resultadoValue = row[columnMapping.resultado];
      if (resultadoValue) {
        processedRow.resultado = resultadoValue.toString().trim();
      }
    }

    if (columnMapping.estado !== -1) {
      const estadoValue = row[columnMapping.estado];
      if (estadoValue) {
        const estadoStr = estadoValue.toString().trim().toLowerCase();
        if (estadoStr.includes('completado') || estadoStr.includes('🟢') || estadoStr.includes('verde')) {
          processedRow.estado = '🟢';
        } else if (estadoStr.includes('crítico') || estadoStr.includes('🔴') || estadoStr.includes('rojo')) {
          processedRow.estado = '🔴';
        } else {
          processedRow.estado = '🟡';
        }
      }
    }

    // Auto-determine status from progress if not explicitly set
    if (processedRow.estado === '🟡') {
      if (processedRow.progreso >= 90) {
        processedRow.estado = '🟢';
      } else if (processedRow.progreso < 25) {
        processedRow.estado = '🔴';
      }
    }

    processedData.push(processedRow);
  }

  return { data: processedData, errors };
}

/**
 * Save OKR data to database ensuring it's assigned to manager's area only
 */
async function saveOKRDataForManager(
  processedData: any[],
  tenantId: string,
  areaId: string,
  userId: string,
  supabase: any
) {
  const errors: string[] = [];
  let savedCount = 0;

  for (const row of processedData) {
    try {
      // Build description from available data
      const descriptionParts = [];
      if (row.descripcion) descriptionParts.push(row.descripcion);
      if (row.accion && row.accion !== row.objetivo) descriptionParts.push(`Acción: ${row.accion}`);
      if (row.responsable) descriptionParts.push(`Responsable: ${row.responsable}`);
      if (row.fechaLimite) descriptionParts.push(`Fecha límite: ${row.fechaLimite}`);
      if (row.resultado) descriptionParts.push(`Resultado esperado: ${row.resultado}`);
      
      // Create initiative - ALWAYS assign to manager's area
      const initiativeData = {
        tenant_id: tenantId,
        area_id: areaId, // Force manager's area - no exceptions
        created_by: userId,
        owner_id: userId,
        title: row.objetivo,
        description: descriptionParts.join('\n\n') || `Importado desde archivo: ${row.sheetSource}`,
        status: mapStatusFromEmoji(row.estado),
        priority: row.prioridad || 'medium',
        progress: Math.min(100, Math.max(0, row.progreso || 0)),
        metadata: {
          importedFrom: 'manager_okr_upload',
          originalData: {
            objetivo: row.objetivo,
            accion: row.accion,
            responsable: row.responsable,
            fechaLimite: row.fechaLimite,
            resultado: row.resultado,
            sheetSource: row.sheetSource
          },
          managerUpload: true,
          uploadedBy: userId
        }
      };

      const { data: newInitiative, error: initiativeError } = await supabase
        .from('initiatives')
        .insert(initiativeData)
        .select('id')
        .single();

      if (initiativeError) {
        errors.push(`Failed to save initiative "${row.objetivo}": ${initiativeError.message}`);
        continue;
      }

      savedCount++;

      // Create subtask from resultado if present
      if (row.resultado) {
        const subtaskData = {
          initiative_id: newInitiative.id,
          tenant_id: tenantId,
          title: 'Resultado esperado',
          description: row.resultado,
          completed: row.estado === '🟢'
        };

        const { error: subtaskError } = await supabase
          .from('subtasks')
          .insert(subtaskData);

        if (subtaskError) {
          errors.push(`Failed to save subtask for "${row.objetivo}": ${subtaskError.message}`);
        }
      }

    } catch (error) {
      errors.push(`Unexpected error processing "${row.objetivo}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { savedCount, errors };
}

function mapStatusFromEmoji(estado: string): 'planning' | 'in_progress' | 'completed' | 'on_hold' {
  if (estado.includes('🟢')) {
    return 'completed';
  } else if (estado.includes('🔴')) {
    return 'on_hold';
  } else if (estado.includes('🟡')) {
    return 'in_progress';
  }
  
  return 'planning';
}