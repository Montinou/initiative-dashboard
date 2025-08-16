import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { matchAreaName } from '@/lib/area-matching';

export async function POST(request: NextRequest) {
  try {
    // Create Supabase clients
    const supabase = await createClient()
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Get auth token from headers
    const authToken = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!authToken) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify user session
    const { data: { user }, error: authError } = await supabase.auth.getUser(authToken);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    // Get user profile to access tenant_id
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const tenantId = userProfile.tenant_id; // Use tenant from authenticated user

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

    // Parse the file
    const buffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);
    
    let workbook: XLSX.WorkBook;
    let parsedData: any[] = [];
    let errors: string[] = [];
    let responseSheetData: any[] = [];

    try {
      if (file.type === 'text/csv') {
        // Parse CSV
        const text = new TextDecoder('utf-8').decode(uint8Array);
        workbook = XLSX.read(text, { type: 'string' });
      } else {
        // Parse Excel
        workbook = XLSX.read(uint8Array, { type: 'array' });
      }

      // Process all worksheets
      const allSheetsData = [];
      const allErrors = [];
      
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Skip empty sheets
        if (!rawData || rawData.length < 2) {
          continue;
        }
        
        // Process each sheet
        const processedSheet = await processTableroDataBySheet(rawData as any[][], tenantId, sheetName, supabaseAdmin);
        
        if (processedSheet.data.length > 0) {
          allSheetsData.push({
            sheetName,
            data: processedSheet.data,
            recordCount: processedSheet.data.length
          });
        }
        
        if (processedSheet.errors.length > 0) {
          allErrors.push(...processedSheet.errors.map(error => `[${sheetName}] ${error}`));
        }
      }
      
      // Flatten all data for compatibility
      parsedData = allSheetsData.flatMap(sheet => 
        sheet.data.map(row => ({ ...row, sheetSource: sheet.sheetName }))
      );
      errors = allErrors;

      // Store allSheetsData for response
      responseSheetData = allSheetsData;

    } catch (parseError) {
      console.error('File parsing error:', parseError);
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
        const saveResult = await saveProcessedDataToDatabase(parsedData, tenantId, user.id, supabaseAdmin);
        savedInitiatives = saveResult.savedCount;
        saveErrors = saveResult.errors;
      } catch (saveError) {
        console.error('Database save error:', saveError);
        saveErrors.push('Failed to save data to database');
      }
    }

    // Return processed data
    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        fileSize: file.size,
        recordsProcessed: parsedData.length,
        sheetsProcessed: responseSheetData.length,
        sheetDetails: responseSheetData,
        errors: [...errors, ...saveErrors],
        parsedData: parsedData,
        savedInitiatives: savedInitiatives,
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
 * Process area-specific sheets (like "Administración", "Producto", etc.)
 * Uses robust area matching and validates against SIGA requirements
 */
async function processAreaSpecificSheet(rawData: any[][], tenantId: string, sheetName: string, supabase: any, areaMatchResult: any) {
  const errors: string[] = [];
  const _processedData: any[] = [];

  if (rawData.length < 3) {
    errors.push(`Sheet "${sheetName}": File must contain at least two header rows and one data row`);
    return { data: [], errors };
  }

  // Handle multi-row headers
  const firstRowHeaders = rawData[0].map((h: any) => 
    h ? h.toString().toLowerCase().trim() : ''
  );
  const secondRowHeaders = rawData[1].map((h: any) => 
    h ? h.toString().toLowerCase().trim() : ''
  );

  // Combine headers from both rows
  const maxLength = Math.max(firstRowHeaders.length, secondRowHeaders.length);
  const headers = [];
  
  for (let i = 0; i < maxLength; i++) {
    const firstHeader = firstRowHeaders[i] || '';
    const secondHeader = secondRowHeaders[i] || '';
    
    if (firstHeader) {
      headers[i] = firstHeader;
    } else if (secondHeader) {
      headers[i] = secondHeader;
    } else {
      headers[i] = '';
    }
  }

  // Find column mappings
  const columnMapping = {
    area: -1,
    objetivo: -1,
    accionClave: -1,
    progreso: -1,
    prioridad: -1,
    responsable: -1,
    fechaLimite: -1,
    estado: -1,
    resultado: -1
  };

  // Map columns
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    
    if (['área', 'area', 'division'].includes(header)) {
      columnMapping.area = i;
    }
    else if (['objetivo', 'objetivo clave', 'objective'].includes(header)) {
      columnMapping.objetivo = i;
    }
    else if (['período', 'periodo', 'trimestre'].includes(header)) {
      columnMapping.periodo = i;
    }
    else if (['acción clave', 'accion clave', 'key action', 'action'].includes(header)) {
      columnMapping.accionClave = i;
    }
    else if (['% de cumplimiento', 'porcentaje de cumplimiento', 'progreso', '% avance', 'avance', 'progress'].includes(header)) {
      columnMapping.progreso = i;
    }
    else if (['prioridad', 'priority'].includes(header)) {
      columnMapping.prioridad = i;
    }
    else if (['responsable acción', 'responsable', 'responsible'].includes(header)) {
      columnMapping.responsable = i;
    }
    else if (['fecha límite', 'fecha limite', 'deadline', 'due date'].includes(header)) {
      columnMapping.fechaLimite = i;
    }
    else if (['check point', 'checkpoint', 'estado', 'status'].includes(header)) {
      columnMapping.estado = i;
    }
    else if (['resultado de la acción', 'resultado', 'result', 'outcome'].includes(header)) {
      columnMapping.resultado = i;
    }
  }

  // Validate required columns
  const requiredColumns = ['objetivo', 'progreso'];
  const missingColumns: string[] = [];

  requiredColumns.forEach(col => {
    if (columnMapping[col as keyof typeof columnMapping] === -1) {
      missingColumns.push(col);
    }
  });

  if (missingColumns.length > 0) {
    errors.push(`Sheet "${sheetName}": Missing required columns: ${missingColumns.join(', ')}`);
    return { data: [], errors };
  }

  // Use the matched area name for all rows in this sheet
  const resolvedAreaName = areaMatchResult.matched ? areaMatchResult.areaName : sheetName;

  // Process data rows (starting from row 3, index 2)
  for (let i = 2; i < rawData.length; i++) {
    const row = rawData[i];
    
    if (!row || row.length === 0 || row.every(cell => !cell)) {
      continue; // Skip empty rows
    }
    
    // Skip rows with no meaningful data
    const hasAnyMeaningfulData = row.some(cell => 
      cell && 
      cell.toString().trim() && 
      cell.toString().trim() !== '' &&
      !cell.toString().match(/^[\s\-_=]+$/) // Skip rows with just separators
    );
    
    if (!hasAnyMeaningfulData) {
      continue;
    }

    const processedRow: any = {
      rowNumber: i + 1,
      area: resolvedAreaName, // Use the matched area name
      objetivo: '',
      accionClave: '',
      progreso: 0,
      prioridad: '',
      responsable: '',
      fechaLimite: '',
      estado: '🟡',
      resultado: '',
      sheetSource: sheetName,
      areaMatchConfidence: areaMatchResult.confidence,
      areaMatchType: areaMatchResult.matchType
    };

    // Extract objetivo
    const objetivoValue = row[columnMapping.objetivo];
    if (objetivoValue && objetivoValue.toString().trim()) {
      processedRow.objetivo = objetivoValue.toString().trim();
    }
    
    // Extract progreso
    const progresoValue = row[columnMapping.progreso];
    if (progresoValue !== undefined && progresoValue !== null) {
      let progress = 0;
      
      if (typeof progresoValue === 'number') {
        progress = progresoValue;
      } else {
        const progressStr = progresoValue.toString().replace('%', '').trim();
        progress = parseFloat(progressStr);
      }
      
      // Convert percentage if needed
      if (progress > 1 && progress <= 100) {
        processedRow.progreso = Math.round(progress);
      } else if (progress <= 1) {
        processedRow.progreso = Math.round(progress * 100);
      } else {
        errors.push(`Sheet "${sheetName}" Row ${i + 1}: Invalid progress value "${progresoValue}"`);
        processedRow.progreso = 0;
      }
      
      // Validate range
      if (processedRow.progreso < 0 || processedRow.progreso > 100) {
        errors.push(`Sheet "${sheetName}" Row ${i + 1}: Progress must be between 0 and 100`);
        processedRow.progreso = Math.max(0, Math.min(100, processedRow.progreso));
      }
    } else {
      errors.push(`Sheet "${sheetName}" Row ${i + 1}: Missing progress value`);
    }

    // Extract other fields
    if (columnMapping.periodo !== -1) {
      const periodoValue = row[columnMapping.periodo];
      if (periodoValue) {
        processedRow.periodo = periodoValue.toString().trim();
      }
    }


    if (columnMapping.accionClave !== -1) {
      const accionValue = row[columnMapping.accionClave];
      if (accionValue) {
        processedRow.accionClave = accionValue.toString().trim();
      }
    }

    if (columnMapping.prioridad !== -1) {
      const prioridadValue = row[columnMapping.prioridad];
      if (prioridadValue) {
        processedRow.prioridad = prioridadValue.toString().trim().toLowerCase();
      }
    }

    if (columnMapping.responsable !== -1) {
      const responsableValue = row[columnMapping.responsable];
      if (responsableValue) {
        processedRow.responsable = responsableValue.toString().trim();
      }
    }

    if (columnMapping.fechaLimite !== -1) {
      const fechaValue = row[columnMapping.fechaLimite];
      if (fechaValue) {
        processedRow.fechaLimite = fechaValue.toString().trim();
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
        if (estadoStr.includes('finalizado') || estadoStr.includes('completado') || 
            estadoStr.includes('🟢') || estadoStr.includes('verde')) {
          processedRow.estado = '🟢';
        } else if (estadoStr.includes('en curso') || estadoStr.includes('progreso') || 
                   estadoStr.includes('avanzado') || estadoStr.includes('🟡') || estadoStr.includes('amarillo')) {
          processedRow.estado = '🟡';
        } else if (estadoStr.includes('atrasado') || estadoStr.includes('crítico') || 
                   estadoStr.includes('critico') || estadoStr.includes('🔴') || estadoStr.includes('rojo')) {
          processedRow.estado = '🔴';
        }
      }
    }

    // Determine status based on progress if not provided
    if (processedRow.estado === '🟡') {
      if (processedRow.progreso >= 75) {
        processedRow.estado = '🟢';
      } else if (processedRow.progreso < 40) {
        processedRow.estado = '🔴';
      }
    }

    // Only add rows with meaningful objectives (single period rows)
    if (processedRow.objetivo) {
      processedData.push(processedRow);
    }
  }

  return { data: processedData, errors };
}

// Legacy function - replaced by processTableroDataBySheet
async function _processTableroData(rawData: any[][], tenantId: string, supabase: any) {
  const errors: string[] = [];
  const _processedData: any[] = [];

  if (rawData.length < 3) {
    errors.push('File must contain at least two header rows and one data row');
    return { data: [], errors };
  }

  // Expected headers matching OKR Administración.xlsx structure
  const _expectedHeaders = [
    'área', 'area', 'division',
    'objetivo', 'objetivo clave', 'objective',
    'período', 'periodo', 'trimestre',
    'acción clave', 'accion clave', 'key action', 'action',
    '% de cumplimiento', 'porcentaje de cumplimiento', 'progreso', '% avance', 'avance', 'progress',
    'prioridad', 'priority',
    'responsable acción', 'responsable', 'responsible',
    'fecha límite', 'fecha limite', 'deadline', 'due date',
    'check point', 'checkpoint', 'estado', 'status',
    'resultado de la acción', 'resultado', 'result', 'outcome'
  ];

  // Handle multi-row headers for OKR Administración.xlsx structure
  // Row 1: ['ÁREA', 'OBJETIVO', 'Período', 'Q2']
  // Row 2: [<3 empty items>, 'Acción Clave', '% de cumplimiento', 'Prioridad', 'Responsable Acción', 'Fecha Límite', 'Check point', 'Resultado de la acción']
  
  const firstRowHeaders = rawData[0].map((h: any) => 
    h ? h.toString().toLowerCase().trim() : ''
  );
  const secondRowHeaders = rawData[1].map((h: any) => 
    h ? h.toString().toLowerCase().trim() : ''
  );

  // Combine headers from both rows, ensuring we get all columns
  const maxLength = Math.max(firstRowHeaders.length, secondRowHeaders.length);
  const headers = [];
  
  for (let i = 0; i < maxLength; i++) {
    const firstHeader = firstRowHeaders[i] || '';
    const secondHeader = secondRowHeaders[i] || '';
    
    // Use first row header if available, otherwise use second row header
    if (firstHeader) {
      headers[i] = firstHeader;
    } else if (secondHeader) {
      headers[i] = secondHeader;
    } else {
      headers[i] = '';
    }
  }

  // Find column mappings for OKR Administración.xlsx structure
  const columnMapping = {
    area: -1,
    objetivo: -1,
    accionClave: -1,
    progreso: -1,
    prioridad: -1,
    responsable: -1,
    fechaLimite: -1,
    estado: -1,
    resultado: -1
  };

  // Map columns for OKR Administración.xlsx structure
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    
    // Map area column (Column A)
    if (['área', 'area', 'division'].includes(header)) {
      columnMapping.area = i;
    }
    // Map objetivo column (Column B)
    else if (['objetivo', 'objetivo clave', 'objective'].includes(header)) {
      columnMapping.objetivo = i;
    }
    // Map acción clave column (Column D)
    else if (['acción clave', 'accion clave', 'key action', 'action'].includes(header)) {
      columnMapping.accionClave = i;
    }
    // Map progreso column (Column E - % de cumplimiento)
    else if (['% de cumplimiento', 'porcentaje de cumplimiento', 'progreso', '% avance', 'avance', 'progress'].includes(header)) {
      columnMapping.progreso = i;
    }
    // Map prioridad column (Column F)
    else if (['prioridad', 'priority'].includes(header)) {
      columnMapping.prioridad = i;
    }
    // Map responsable column (Column G)
    else if (['responsable acción', 'responsable', 'responsible'].includes(header)) {
      columnMapping.responsable = i;
    }
    // Map fecha límite column (Column H)
    else if (['fecha límite', 'fecha limite', 'deadline', 'due date'].includes(header)) {
      columnMapping.fechaLimite = i;
    }
    // Map estado column (Column I - Check point)
    else if (['check point', 'checkpoint', 'estado', 'status'].includes(header)) {
      columnMapping.estado = i;
    }
    // Map resultado column (Column J)
    else if (['resultado de la acción', 'resultado', 'result', 'outcome'].includes(header)) {
      columnMapping.resultado = i;
    }
  }

  // Validate required columns for OKR Administración.xlsx
  const requiredColumns = ['area', 'objetivo', 'progreso'];
  const missingColumns: string[] = [];

  requiredColumns.forEach(col => {
    if (columnMapping[col as keyof typeof columnMapping] === -1) {
      missingColumns.push(col);
    }
  });

  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
    return { data: [], errors };
  }

  // Get areas from database for validation
  const { data: dbAreas } = await supabase
    .from('areas')
    .select('id, name, tenant_id')
    ;

  // Database connection is required - real area data must be available
  if (!dbAreas) {
    errors.push(`Database connection failed - cannot validate areas`);
    return { data: [], errors };
  }
  
  const validAreas = dbAreas.map(a => a.name.toLowerCase());

  // Area name normalization function
  const normalizeAreaName = (areaName: string): string => {
    const normalized = areaName.toLowerCase().trim();
    
    // Common area name mappings
    const areaMapping: { [key: string]: string } = {
      'administracion': 'administración',
      'comercial': 'comercial',
      'marketing': 'marketing', 
      'ventas': 'comercial',
      'rrhh': 'rrhh',
      'recursos humanos': 'rrhh',
      'finanzas': 'finanzas',
      'financiero': 'finanzas',
      'it': 'it',
      'sistemas': 'it',
      'tecnologia': 'it',
      'operaciones': 'operaciones',
      'producto': 'producto',
      'logistica': 'logística',
      'e-commerce': 'e-commerce',
      'ecommerce': 'e-commerce',
      'division iluminacion': 'división iluminación',
      'division electricidad': 'división electricidad', 
      'division industria': 'división industria'
    };
    
    return areaMapping[normalized] || normalized;
  };

  // Process data rows (starting from row 3, index 2, since we have 2 header rows)
  for (let i = 2; i < rawData.length; i++) {
    const row = rawData[i];
    
    if (!row || row.length === 0 || row.every(cell => !cell)) {
      continue; // Skip empty rows
    }
    
    // Skip rows that are clearly empty or just formatting rows
    const hasAnyMeaningfulData = row.some(cell => 
      cell && 
      cell.toString().trim() && 
      cell.toString().trim() !== '' &&
      !cell.toString().match(/^[\s\-_=]+$/) // Skip rows with just separators
    );
    
    if (!hasAnyMeaningfulData) {
      continue; // Skip rows with no meaningful data
    }

    const processedRow: any = {
      rowNumber: i + 1, // Actual Excel row number
      area: '',
      objetivo: '',
      accionClave: '',
      progreso: 0,
      prioridad: '',
      responsable: '',
      fechaLimite: '',
      estado: '🟡',
      resultado: ''
    };

    // Extract area
    const areaValue = row[columnMapping.area];
    if (areaValue && areaValue.toString().trim()) {
      const originalArea = areaValue.toString().trim();
      const normalizedArea = normalizeAreaName(originalArea);
      
      // Use the normalized area name for consistency
      processedRow.area = normalizedArea;
      
      // Validate area exists in database (will be auto-created if needed)
      if (validAreas.length > 0 && !validAreas.includes(normalizedArea)) {
        // This is just a warning since areas can be auto-created
        errors.push(`Row ${i + 1}: Area "${originalArea}" will be created automatically`);
      }
    }

    // Extract objetivo
    const objetivoValue = row[columnMapping.objetivo];
    if (objetivoValue && objetivoValue.toString().trim()) {
      processedRow.objetivo = objetivoValue.toString().trim();
    }
    
    // Only report missing area/objetivo if this row has other meaningful data
    const hasOtherData = row.some((cell, index) => 
      index !== columnMapping.area && 
      index !== columnMapping.objetivo && 
      cell && cell.toString().trim()
    );
    
    if (hasOtherData) {
      if (!processedRow.area) {
        errors.push(`Row ${i + 1}: Missing area value`);
      }
      if (!processedRow.objetivo) {
        errors.push(`Row ${i + 1}: Missing objetivo value`);
      }
    }

    // Extract progreso
    const progresoValue = row[columnMapping.progreso];
    if (progresoValue !== undefined && progresoValue !== null) {
      let progress = 0;
      
      if (typeof progresoValue === 'number') {
        progress = progresoValue;
      } else {
        const progressStr = progresoValue.toString().replace('%', '').trim();
        progress = parseFloat(progressStr);
      }
      
      // Convert percentage if it's over 1 (assuming it's already a percentage)
      if (progress > 1 && progress <= 100) {
        // It's already a percentage, keep as is
        processedRow.progreso = Math.round(progress);
      } else if (progress <= 1) {
        // It's a decimal, convert to percentage
        processedRow.progreso = Math.round(progress * 100);
      } else {
        errors.push(`Row ${i + 1}: Invalid progress value "${progresoValue}"`);
        processedRow.progreso = 0;
      }
      
      // Validate range
      if (processedRow.progreso < 0 || processedRow.progreso > 100) {
        errors.push(`Row ${i + 1}: Progress must be between 0 and 100`);
        processedRow.progreso = Math.max(0, Math.min(100, processedRow.progreso));
      }
    } else {
      errors.push(`Row ${i + 1}: Missing progress value`);
    }


    // Extract acción clave (Column D)
    if (columnMapping.accionClave !== -1) {
      const accionValue = row[columnMapping.accionClave];
      if (accionValue) {
        processedRow.accionClave = accionValue.toString().trim();
      }
    }

    // Extract prioridad (Column F)
    if (columnMapping.prioridad !== -1) {
      const prioridadValue = row[columnMapping.prioridad];
      if (prioridadValue) {
        processedRow.prioridad = prioridadValue.toString().trim().toLowerCase();
      }
    }

    // Extract responsable (Column G)  
    if (columnMapping.responsable !== -1) {
      const responsableValue = row[columnMapping.responsable];
      if (responsableValue) {
        processedRow.responsable = responsableValue.toString().trim();
      }
    }

    // Extract fecha límite (Column H)
    if (columnMapping.fechaLimite !== -1) {
      const fechaValue = row[columnMapping.fechaLimite];
      if (fechaValue) {
        processedRow.fechaLimite = fechaValue.toString().trim();
      }
    }

    // Extract resultado (Column J)
    if (columnMapping.resultado !== -1) {
      const resultadoValue = row[columnMapping.resultado];
      if (resultadoValue) {
        processedRow.resultado = resultadoValue.toString().trim();
      }
    }

    // Extract estado (Column I - Check point)
    if (columnMapping.estado !== -1) {
      const estadoValue = row[columnMapping.estado];
      if (estadoValue) {
        const estadoStr = estadoValue.toString().trim().toLowerCase();
        // Map Check point values to emojis
        if (estadoStr.includes('finalizado') || estadoStr.includes('completado') || 
            estadoStr.includes('🟢') || estadoStr.includes('verde')) {
          processedRow.estado = '🟢';
        } else if (estadoStr.includes('en curso') || estadoStr.includes('progreso') || 
                   estadoStr.includes('avanzado') || estadoStr.includes('🟡') || estadoStr.includes('amarillo')) {
          processedRow.estado = '🟡';
        } else if (estadoStr.includes('atrasado') || estadoStr.includes('crítico') || 
                   estadoStr.includes('critico') || estadoStr.includes('🔴') || estadoStr.includes('rojo')) {
          processedRow.estado = '🔴';
        }
      }
    }

    // Determine status based on progress if not provided
    if (processedRow.estado === '🟡') {
      if (processedRow.progreso >= 75) {
        processedRow.estado = '🟢';
      } else if (processedRow.progreso < 40) {
        processedRow.estado = '🔴';
      }
    }

    processedData.push(processedRow);
  }

  return { data: processedData, errors };
}

async function processTableroDataBySheet(rawData: any[][], tenantId: string, sheetName: string, supabase: any) {
  const errors: string[] = [];
  const _processedData: any[] = [];

  if (rawData.length < 2) {
    errors.push(`Sheet "${sheetName}": File must contain at least a header row and one data row`);
    return { data: [], errors };
  }

  // Get areas from database for robust matching
  const { data: dbAreas } = await supabase
    .from('areas')
    .select('id, name, tenant_id')
    ;

  if (!dbAreas) {
    errors.push(`Sheet "${sheetName}": Database connection failed - cannot validate areas`);
    return { data: [], errors };
  }

  // Perform area matching for sheet name
  const areaMatchResult = matchAreaName(sheetName, dbAreas);
  
  if (!areaMatchResult.matched) {
    errors.push(`Sheet "${sheetName}": No matching area found in database. Available areas: ${dbAreas.map(a => a.name).join(', ')}`);
    // Continue processing but with warning
  } else {
    // Log successful match with confidence
    console.log(`✅ Area match: "${sheetName}" → "${areaMatchResult.areaName}" (${Math.round(areaMatchResult.confidence * 100)}% confidence, ${areaMatchResult.matchType} match)`);
  }

  // Handle different sheet types based on name and structure
  if (sheetName === 'Resumen por Objetivo' || sheetName.toLowerCase().includes('resumen')) {
    return await processResumenSheet(rawData, tenantId, sheetName, supabase, areaMatchResult);
  } else if (sheetName.startsWith('OKRs ')) {
    return await processOKRSheet(rawData, tenantId, sheetName, supabase, areaMatchResult);
  } else {
    // For area-specific sheets, use the matched area directly
    return await processAreaSpecificSheet(rawData, tenantId, sheetName, supabase, areaMatchResult);
  }
}

async function processResumenSheet(rawData: any[][], tenantId: string, sheetName: string, supabase: any, areaMatchResult?: any) {
  const errors: string[] = [];
  const _processedData: any[] = [];

  // Find the header row for "Resumen por Objetivo" sheet
  let headerRowIndex = -1;
  let headers: string[] = [];
  
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.some(cell => cell && cell.toString().toLowerCase().includes('área')) &&
        row.some(cell => cell && cell.toString().toLowerCase().includes('objetivo'))) {
      headerRowIndex = i;
      headers = row.map(h => h ? h.toString().trim() : '');
      break;
    }
  }

  if (headerRowIndex === -1) {
    errors.push(`Sheet "${sheetName}": Could not find expected headers (Área, Objetivo)`);
    return { data: [], errors };
  }

  // Map columns for "Resumen por Objetivo"
  const columnMapping = {
    area: -1,
    objetivo: -1,
    progreso: -1,
    obstaculos: -1,
    potenciadores: -1,
    estado: -1
  };

  headers.forEach((header, index) => {
    const headerLower = header.toLowerCase();
    if (headerLower.includes('área') || headerLower === 'area') {
      columnMapping.area = index;
    } else if (headerLower.includes('objetivo')) {
      columnMapping.objetivo = index;
    } else if (headerLower.includes('%') || headerLower.includes('avance') || headerLower.includes('progreso')) {
      columnMapping.progreso = index;
    } else if (headerLower.includes('obstáculo') || headerLower.includes('lows')) {
      columnMapping.obstaculos = index;
    } else if (headerLower.includes('potenciador') || headerLower.includes('highs')) {
      columnMapping.potenciadores = index;
    } else if (headerLower.includes('estado')) {
      columnMapping.estado = index;
    }
  });

  // Validate required columns
  if (columnMapping.area === -1 || columnMapping.objetivo === -1 || columnMapping.progreso === -1) {
    errors.push(`Sheet "${sheetName}": Missing required columns (Área, Objetivo, Progreso)`);
    return { data: [], errors };
  }

  // Get areas from database for validation
  const { data: dbAreas } = await supabase
    .from('areas')
    .select('id, name, tenant_id')
    ;

  // Database connection is required - real area data must be available for sheet processing
  if (!dbAreas) {
    errors.push(`Sheet "${sheetName}": Database connection failed - cannot validate areas`);
    return { data: [], errors };
  }
  
  const validAreas = dbAreas.map(a => a.name.toLowerCase());

  // Process data rows
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    
    if (!row || row.length === 0 || row.every(cell => !cell)) {
      continue; // Skip empty rows
    }

    const processedRow: any = {
      rowNumber: i + 1,
      area: '',
      objetivo: '',
      progreso: 0,
      obstaculos: '',
      potenciadores: '',
      estado: '🟡',
      sheetSource: sheetName
    };

    // Extract area
    const areaValue = row[columnMapping.area];
    if (areaValue) {
      processedRow.area = areaValue.toString().trim();
      
      // Validate area exists in database
      const areaLower = processedRow.area.toLowerCase();
      if (validAreas.length > 0 && !validAreas.includes(areaLower)) {
        errors.push(`Sheet "${sheetName}" Row ${i + 1}: Area "${processedRow.area}" not found in system`);
      }
    } else {
      errors.push(`Sheet "${sheetName}" Row ${i + 1}: Missing area value`);
    }

    // Extract objetivo
    const objetivoValue = row[columnMapping.objetivo];
    if (objetivoValue) {
      processedRow.objetivo = objetivoValue.toString().trim();
    } else {
      errors.push(`Sheet "${sheetName}" Row ${i + 1}: Missing objetivo value`);
    }

    // Extract progreso
    const progresoValue = row[columnMapping.progreso];
    if (progresoValue !== undefined && progresoValue !== null) {
      let progress = 0;
      
      if (typeof progresoValue === 'number') {
        progress = progresoValue;
      } else {
        const progressStr = progresoValue.toString().replace('%', '').trim();
        progress = parseFloat(progressStr);
      }
      
      // Convert percentage if it's over 1 (assuming it's already a percentage)
      if (progress > 1 && progress <= 100) {
        processedRow.progreso = Math.round(progress);
      } else if (progress <= 1) {
        processedRow.progreso = Math.round(progress * 100);
      } else {
        errors.push(`Sheet "${sheetName}" Row ${i + 1}: Invalid progress value "${progresoValue}"`);
        processedRow.progreso = 0;
      }
      
      // Validate range
      if (processedRow.progreso < 0 || processedRow.progreso > 100) {
        errors.push(`Sheet "${sheetName}" Row ${i + 1}: Progress must be between 0 and 100`);
        processedRow.progreso = Math.max(0, Math.min(100, processedRow.progreso));
      }
    } else {
      errors.push(`Sheet "${sheetName}" Row ${i + 1}: Missing progress value`);
    }


    // Extract acción clave (Column D)
    if (columnMapping.accionClave !== -1) {
      const accionValue = row[columnMapping.accionClave];
      if (accionValue) {
        processedRow.accionClave = accionValue.toString().trim();
      }
    }

    // Extract prioridad (Column F)
    if (columnMapping.prioridad !== -1) {
      const prioridadValue = row[columnMapping.prioridad];
      if (prioridadValue) {
        processedRow.prioridad = prioridadValue.toString().trim().toLowerCase();
      }
    }

    // Extract responsable (Column G)  
    if (columnMapping.responsable !== -1) {
      const responsableValue = row[columnMapping.responsable];
      if (responsableValue) {
        processedRow.responsable = responsableValue.toString().trim();
      }
    }

    // Extract fecha límite (Column H)
    if (columnMapping.fechaLimite !== -1) {
      const fechaValue = row[columnMapping.fechaLimite];
      if (fechaValue) {
        processedRow.fechaLimite = fechaValue.toString().trim();
      }
    }

    // Extract resultado (Column J)
    if (columnMapping.resultado !== -1) {
      const resultadoValue = row[columnMapping.resultado];
      if (resultadoValue) {
        processedRow.resultado = resultadoValue.toString().trim();
      }
    }

    // Extract estado (Column I - Check point)
    if (columnMapping.estado !== -1) {
      const estadoValue = row[columnMapping.estado];
      if (estadoValue) {
        const estadoStr = estadoValue.toString().trim().toLowerCase();
        // Map Check point values to emojis
        if (estadoStr.includes('finalizado') || estadoStr.includes('completado') || 
            estadoStr.includes('🟢') || estadoStr.includes('verde')) {
          processedRow.estado = '🟢';
        } else if (estadoStr.includes('en curso') || estadoStr.includes('progreso') || 
                   estadoStr.includes('avanzado') || estadoStr.includes('🟡') || estadoStr.includes('amarillo')) {
          processedRow.estado = '🟡';
        } else if (estadoStr.includes('atrasado') || estadoStr.includes('crítico') || 
                   estadoStr.includes('critico') || estadoStr.includes('🔴') || estadoStr.includes('rojo')) {
          processedRow.estado = '🔴';
        }
      }
    }

    // Determine status based on progress if not provided
    if (processedRow.estado === '🟡') {
      if (processedRow.progreso >= 75) {
        processedRow.estado = '🟢';
      } else if (processedRow.progreso < 40) {
        processedRow.estado = '🔴';
      }
    }

    processedData.push(processedRow);
  }

  return { data: processedData, errors };
}

async function processOKRSheet(rawData: any[][], tenantId: string, sheetName: string, supabase: any, areaMatchResult?: any) {
  const errors: string[] = [];
  const _processedData: any[] = [];

  // Find the header row for OKR sheets
  let headerRowIndex = -1;
  let headers: string[] = [];
  
  for (let i = 0; i < Math.min(5, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.some(cell => cell && cell.toString().toLowerCase().includes('área')) &&
        row.some(cell => cell && cell.toString().toLowerCase().includes('objetivo'))) {
      headerRowIndex = i;
      headers = row.map(h => h ? h.toString().trim() : '');
      break;
    }
  }

  if (headerRowIndex === -1) {
    errors.push(`Sheet "${sheetName}": Could not find expected OKR headers`);
    return { data: [], errors };
  }

  // Look for "Acción Clave" sub-headers
  let actionHeaderRowIndex = -1;
  let actionHeaders: string[] = [];
  
  for (let i = headerRowIndex + 1; i < Math.min(headerRowIndex + 5, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.some(cell => cell && cell.toString().toLowerCase().includes('acción'))) {
      actionHeaderRowIndex = i;
      actionHeaders = row.map(h => h ? h.toString().trim() : '');
      break;
    }
  }

  if (actionHeaderRowIndex === -1) {
    errors.push(`Sheet "${sheetName}": Could not find action headers`);
    return { data: [], errors };
  }

  // Map columns for OKR action data
  const columnMapping = {
    accion: -1,
    porcentaje: -1,
    prioridad: -1,
    responsable: -1,
    fecha: -1,
    resultado: -1
  };

  actionHeaders.forEach((header, index) => {
    const headerLower = header.toLowerCase();
    if (headerLower.includes('acción') || headerLower.includes('accion')) {
      columnMapping.accion = index;
    } else if (headerLower.includes('porcentaje') || headerLower.includes('%')) {
      columnMapping.porcentaje = index;
    } else if (headerLower.includes('prioridad')) {
      columnMapping.prioridad = index;
    } else if (headerLower.includes('responsable')) {
      columnMapping.responsable = index;
    } else if (headerLower.includes('fecha')) {
      columnMapping.fecha = index;
    } else if (headerLower.includes('resultado')) {
      columnMapping.resultado = index;
    }
  });

  const areaName = sheetName.replace('OKRs ', '');

  // Process action rows
  for (let i = actionHeaderRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    
    if (!row || row.length === 0 || row.every(cell => !cell)) {
      continue;
    }

    const processedRow: any = {
      rowNumber: i + 1,
      area: areaName,
      objetivo: row[columnMapping.accion] ? row[columnMapping.accion].toString().trim() : '',
      progreso: 0,
      obstaculos: '',
      potenciadores: '',
      estado: '🟡',
      sheetSource: sheetName,
      prioridad: columnMapping.prioridad !== -1 && row[columnMapping.prioridad] ? 
                 row[columnMapping.prioridad].toString().trim() : '',
      responsable: columnMapping.responsable !== -1 && row[columnMapping.responsable] ? 
                   row[columnMapping.responsable].toString().trim() : '',
      fechaLimite: columnMapping.fecha !== -1 && row[columnMapping.fecha] ? 
                   row[columnMapping.fecha].toString().trim() : '',
      resultado: columnMapping.resultado !== -1 && row[columnMapping.resultado] ? 
                 row[columnMapping.resultado].toString().trim() : ''
    };

    // Extract progreso
    if (columnMapping.porcentaje !== -1) {
      const porcentajeValue = row[columnMapping.porcentaje];
      if (porcentajeValue !== undefined && porcentajeValue !== null) {
        let progress = 0;
        
        if (typeof porcentajeValue === 'number') {
          progress = porcentajeValue;
        } else {
          const progressStr = porcentajeValue.toString().replace('%', '').trim();
          progress = parseFloat(progressStr);
        }
        
        if (!isNaN(progress)) {
          if (progress > 1 && progress <= 100) {
            processedRow.progreso = Math.round(progress);
          } else if (progress <= 1) {
            processedRow.progreso = Math.round(progress * 100);
          }
        }
      }
    }

    // Determine status based on progress
    if (processedRow.progreso >= 75) {
      processedRow.estado = '🟢';
    } else if (processedRow.progreso < 40) {
      processedRow.estado = '🔴';
    }

    if (processedRow.objetivo) {
      processedData.push(processedRow);
    }
  }

  return { data: processedData, errors };
}

async function saveProcessedDataToDatabase(processedData: any[], tenantId: string, userId: string, supabase: any) {
  const errors: string[] = [];
  let savedCount = 0;

  // Get areas for this tenant - using exact names since matching was already done
  const { data: existingAreas } = await supabase
    .from('areas')
    .select('id, name')
    ;

  const areaMap: { [key: string]: string } = {};
  
  if (existingAreas) {
    existingAreas.forEach((area: any) => {
      // Use exact name matching since area names were already resolved by robust matching
      areaMap[area.name] = area.id;
    });
  }

  // Process each data row and save as initiative
  for (const row of processedData) {
    try {
      // Find area using exact name (already resolved by robust matching)
      let areaId = areaMap[row.area];
      
      if (!areaId) {
        // This should rarely happen since area matching was already performed
        // but we'll handle it gracefully for edge cases
        errors.push(`Area "${row.area}" not found in database after matching. This indicates a system error.`);
        continue;
      }

      // Create initiative
      const initiativeData = {
        tenant_id: tenantId,
        area_id: areaId,
        created_by: userId,
        owner_id: userId,
        title: row.accionClave || row.objetivo || 'Acción sin título',
        description: buildDescription(row),
        status: mapStatusToEnum(row.estado),
        priority: mapPriorityFromString(row.prioridad) || mapPriorityFromProgress(row.progreso),
        progress: Math.min(100, Math.max(0, row.progreso || 0)),
        metadata: {
          importedFrom: 'excel_upload',
          originalData: row,
          sheetSource: row.sheetSource,
          responsable: row.responsable,
          fechaLimite: row.fechaLimite,
          resultado: row.resultado
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

      // Create subtasks from resultado if present
      if (row.resultado) {
        const subtasks = [{
          initiative_id: newInitiative.id,
          tenant_id: tenantId,
          title: 'Resultado de la acción',
          description: row.resultado,
          completed: row.estado === '🟢' // Mark as completed if status is green (finalizado)
        }];

        const { error: subtaskError } = await supabase
          .from('subtasks')
          .insert(subtasks);

        if (subtaskError) {
          errors.push(`Failed to save subtask for "${row.accionClave || row.objetivo}": ${subtaskError.message}`);
        }
      }

    } catch (error) {
      errors.push(`Unexpected error processing "${row.objetivo}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { savedCount, errors };
}

function buildDescription(row: any): string {
  const parts = [];
  
  if (row.objetivo) {
    parts.push(`Objetivo: ${row.objetivo}`);
  }
  
  if (row.accionClave) {
    parts.push(`Acción Clave: ${row.accionClave}`);
  }
  
  if (row.progreso !== undefined) {
    parts.push(`Progreso actual: ${row.progreso}%`);
  }
  
  if (row.responsable) {
    parts.push(`Responsable: ${row.responsable}`);
  }
  
  if (row.fechaLimite) {
    parts.push(`Fecha Límite: ${row.fechaLimite}`);
  }
  
  if (row.resultado) {
    parts.push(`Resultado: ${row.resultado}`);
  }
  
  if (row.sheetSource) {
    parts.push(`Fuente: ${row.sheetSource}`);
  }
  
  return parts.join('\n\n');
}

function mapStatusToEnum(estado: string): 'planning' | 'in_progress' | 'completed' | 'on_hold' {
  if (!estado) return 'planning';
  
  const statusStr = estado.toString().toLowerCase();
  
  if (estado.includes('🟢') || statusStr.includes('verde') || statusStr.includes('bien') || statusStr.includes('bueno')) {
    return 'in_progress'; // Green usually means good progress
  } else if (estado.includes('🔴') || statusStr.includes('rojo') || statusStr.includes('crítico') || statusStr.includes('critico')) {
    return 'on_hold'; // Red means issues/blocked
  } else if (estado.includes('🟡') || statusStr.includes('amarillo') || statusStr.includes('atención') || statusStr.includes('atencion')) {
    return 'planning'; // Yellow means needs attention/planning
  }
  
  return 'planning';
}

function mapPriorityFromString(prioridad: string): string | null {
  if (!prioridad) return null;
  
  const prioridadLower = prioridad.toLowerCase().trim();
  
  if (prioridadLower === 'alta' || prioridadLower === 'high') {
    return 'high';
  } else if (prioridadLower === 'media' || prioridadLower === 'medium') {
    return 'medium';
  } else if (prioridadLower === 'baja' || prioridadLower === 'low') {
    return 'low';
  }
  
  return null; // Let mapPriorityFromProgress handle it
}

function mapPriorityFromProgress(progress: number): string {
  if (progress >= 75) return 'high';    // High progress = high priority to complete
  if (progress >= 50) return 'medium';  // Medium progress = medium priority  
  if (progress >= 25) return 'medium';  // Low progress = medium priority to focus on
  return 'high';                        // Very low progress = high priority for attention
}