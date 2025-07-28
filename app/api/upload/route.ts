import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    // Create Supabase clients
    const cookieStore = cookies()
    const supabase = createClient(cookieStore)
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
      .eq('id', user.id)
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
      let allSheetsData = [];
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
        const saveResult = await saveProcessedDataToDatabase(parsedData, tenantId, currentUser.id, supabaseAdmin);
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
        sheetsProcessed: allSheetsData.length,
        sheetDetails: allSheetsData,
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

async function processTableroData(rawData: any[][], tenantId: string, supabase: any) {
  const errors: string[] = [];
  const processedData: any[] = [];

  if (rawData.length < 2) {
    errors.push('File must contain at least a header row and one data row');
    return { data: [], errors };
  }

  // Expected headers (flexible matching)
  const expectedHeaders = [
    'área', 'area', 'division',
    'objetivo', 'objetivo clave', 'objective', 
    'progreso', '% avance', 'avance', 'progress',
    'obstáculos', 'obstaculos', 'lows', 'problemas',
    'potenciadores', 'potenciador', 'highs', 'facilitadores',
    'estado', 'status'
  ];

  const headers = rawData[0].map((h: any) => 
    h ? h.toString().toLowerCase().trim() : ''
  );

  // Find column mappings
  const columnMapping = {
    area: -1,
    objetivo: -1,
    progreso: -1,
    obstaculos: -1,
    potenciadores: -1,
    estado: -1
  };

  // Map area column
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (['área', 'area', 'division'].includes(header)) {
      columnMapping.area = i;
      break;
    }
  }

  // Map objetivo column
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (['objetivo', 'objetivo clave', 'objective'].includes(header)) {
      columnMapping.objetivo = i;
      break;
    }
  }

  // Map progreso column
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (['progreso', '% avance', 'avance', 'progress'].includes(header)) {
      columnMapping.progreso = i;
      break;
    }
  }

  // Map obstáculos column
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (['obstáculos', 'obstaculos', 'lows', 'problemas'].includes(header)) {
      columnMapping.obstaculos = i;
      break;
    }
  }

  // Map potenciadores column
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (['potenciadores', 'potenciador', 'highs', 'facilitadores'].includes(header)) {
      columnMapping.potenciadores = i;
      break;
    }
  }

  // Map estado column
  for (let i = 0; i < headers.length; i++) {
    const header = headers[i];
    if (['estado', 'status'].includes(header)) {
      columnMapping.estado = i;
      break;
    }
  }

  // Validate required columns
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
    .select('name')
    .eq('tenant_id', tenantId);

  // TODO: Database connection required - no fallback areas allowed
  if (!dbAreas) {
    errors.push(`Database connection failed - cannot validate areas`);
    return { data: [], errors };
  }
  
  const validAreas = dbAreas.map(a => a.name.toLowerCase());

  // Process data rows
  for (let i = 1; i < rawData.length; i++) {
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
      estado: '🟡'
    };

    // Extract area
    const areaValue = row[columnMapping.area];
    if (areaValue) {
      processedRow.area = areaValue.toString().trim();
      
      // Validate area exists in database
      const areaLower = processedRow.area.toLowerCase();
      if (validAreas.length > 0 && !validAreas.includes(areaLower)) {
        errors.push(`Row ${i + 1}: Area "${processedRow.area}" not found in system`);
      }
    } else {
      errors.push(`Row ${i + 1}: Missing area value`);
    }

    // Extract objetivo
    const objetivoValue = row[columnMapping.objetivo];
    if (objetivoValue) {
      processedRow.objetivo = objetivoValue.toString().trim();
    } else {
      errors.push(`Row ${i + 1}: Missing objetivo value`);
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

    // Extract obstáculos
    if (columnMapping.obstaculos !== -1) {
      const obstaculosValue = row[columnMapping.obstaculos];
      if (obstaculosValue) {
        processedRow.obstaculos = obstaculosValue.toString().trim();
      }
    }

    // Extract potenciadores
    if (columnMapping.potenciadores !== -1) {
      const potenciadoresValue = row[columnMapping.potenciadores];
      if (potenciadoresValue) {
        processedRow.potenciadores = potenciadoresValue.toString().trim();
      }
    }

    // Extract estado
    if (columnMapping.estado !== -1) {
      const estadoValue = row[columnMapping.estado];
      if (estadoValue) {
        const estadoStr = estadoValue.toString().trim();
        // Map various status formats to emojis
        if (estadoStr.includes('🟢') || estadoStr.toLowerCase().includes('verde') || 
            estadoStr.toLowerCase().includes('bien') || estadoStr.toLowerCase().includes('bueno')) {
          processedRow.estado = '🟢';
        } else if (estadoStr.includes('🔴') || estadoStr.toLowerCase().includes('rojo') || 
                   estadoStr.toLowerCase().includes('crítico') || estadoStr.toLowerCase().includes('critico')) {
          processedRow.estado = '🔴';
        } else if (estadoStr.includes('🟡') || estadoStr.toLowerCase().includes('amarillo') || 
                   estadoStr.toLowerCase().includes('atención') || estadoStr.toLowerCase().includes('atencion')) {
          processedRow.estado = '🟡';
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
  const processedData: any[] = [];

  if (rawData.length < 2) {
    errors.push(`Sheet "${sheetName}": File must contain at least a header row and one data row`);
    return { data: [], errors };
  }

  // Handle different sheet types based on name and structure
  if (sheetName === 'Resumen por Objetivo' || sheetName.toLowerCase().includes('resumen')) {
    return await processResumenSheet(rawData, tenantId, sheetName, supabase);
  } else if (sheetName.startsWith('OKRs ')) {
    return await processOKRSheet(rawData, tenantId, sheetName, supabase);
  } else {
    // Try generic processing
    return await processTableroData(rawData, tenantId, supabase);
  }
}

async function processResumenSheet(rawData: any[][], tenantId: string, sheetName: string, supabase: any) {
  const errors: string[] = [];
  const processedData: any[] = [];

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
    .select('name')
    .eq('tenant_id', tenantId);

  // TODO: Database connection required - no fallback areas allowed for sheet processing
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

    // Extract obstáculos
    if (columnMapping.obstaculos !== -1) {
      const obstaculosValue = row[columnMapping.obstaculos];
      if (obstaculosValue) {
        processedRow.obstaculos = obstaculosValue.toString().trim();
      }
    }

    // Extract potenciadores
    if (columnMapping.potenciadores !== -1) {
      const potenciadoresValue = row[columnMapping.potenciadores];
      if (potenciadoresValue) {
        processedRow.potenciadores = potenciadoresValue.toString().trim();
      }
    }

    // Extract estado
    if (columnMapping.estado !== -1) {
      const estadoValue = row[columnMapping.estado];
      if (estadoValue) {
        const estadoStr = estadoValue.toString().trim();
        // Map various status formats to emojis
        if (estadoStr.includes('🟢') || estadoStr.toLowerCase().includes('verde') || 
            estadoStr.toLowerCase().includes('bien') || estadoStr.toLowerCase().includes('bueno')) {
          processedRow.estado = '🟢';
        } else if (estadoStr.includes('🔴') || estadoStr.toLowerCase().includes('rojo') || 
                   estadoStr.toLowerCase().includes('crítico') || estadoStr.toLowerCase().includes('critico')) {
          processedRow.estado = '🔴';
        } else if (estadoStr.includes('🟡') || estadoStr.toLowerCase().includes('amarillo') || 
                   estadoStr.toLowerCase().includes('atención') || estadoStr.toLowerCase().includes('atencion')) {
          processedRow.estado = '🟡';
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

async function processOKRSheet(rawData: any[][], tenantId: string, sheetName: string, supabase: any) {
  const errors: string[] = [];
  const processedData: any[] = [];

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

  // Get or create areas for this tenant
  const { data: existingAreas } = await supabase
    .from('areas')
    .select('id, name')
    .eq('tenant_id', tenantId);

  const areaMap: { [key: string]: string } = {};
  
  if (existingAreas) {
    existingAreas.forEach((area: any) => {
      areaMap[area.name.toLowerCase()] = area.id;
    });
  }

  // Process each data row and save as initiative
  for (const row of processedData) {
    try {
      // Find or create area
      let areaId = areaMap[row.area.toLowerCase()];
      
      if (!areaId) {
        // Create new area
        const { data: newArea, error: areaError } = await supabase
          .from('areas')
          .insert({
            tenant_id: tenantId,
            name: row.area,
            description: `Área creada automáticamente desde upload: ${row.area}`,
            manager_id: userId, // Assign current user as manager
            is_active: true
          })
          .select('id')
          .single();

        if (areaError) {
          errors.push(`Failed to create area "${row.area}": ${areaError.message}`);
          continue;
        }

        areaId = newArea.id;
        areaMap[row.area.toLowerCase()] = areaId;
      }

      // Create initiative
      const initiativeData = {
        tenant_id: tenantId,
        area_id: areaId,
        created_by: userId,
        owner_id: userId,
        title: row.objetivo || row.objetivoClave || 'Objetivo sin título',
        description: buildDescription(row),
        status: mapStatusToEnum(row.estado),
        priority: mapPriorityFromProgress(row.progreso),
        progress: Math.min(100, Math.max(0, row.progreso || 0)),
        metadata: {
          importedFrom: 'excel_upload',
          originalData: row,
          sheetSource: row.sheetSource
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

      // Create subtasks from obstacles and enhancers if present
      if (row.obstaculos || row.potenciadores) {
        const subtasks = [];
        
        if (row.obstaculos) {
          subtasks.push({
            initiative_id: newInitiative.id,
            tenant_id: tenantId,
            title: 'Obstáculos identificados',
            description: row.obstaculos,
            completed: false
          });
        }
        
        if (row.potenciadores) {
          subtasks.push({
            initiative_id: newInitiative.id,
            tenant_id: tenantId,
            title: 'Potenciadores identificados',
            description: row.potenciadores,
            completed: true // Mark as identified/available
          });
        }

        if (subtasks.length > 0) {
          const { error: subtaskError } = await supabase
            .from('subtasks')
            .insert(subtasks);

          if (subtaskError) {
            errors.push(`Failed to save subtasks for "${row.objetivo}": ${subtaskError.message}`);
          }
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
  
  if (row.objetivo || row.objetivoClave) {
    parts.push(`Objetivo: ${row.objetivo || row.objetivoClave}`);
  }
  
  if (row.progreso !== undefined) {
    parts.push(`Progreso actual: ${row.progreso}%`);
  }
  
  if (row.obstaculos) {
    parts.push(`Obstáculos: ${row.obstaculos}`);
  }
  
  if (row.potenciadores) {
    parts.push(`Potenciadores: ${row.potenciadores}`);
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

function mapPriorityFromProgress(progress: number): string {
  if (progress >= 75) return 'high';    // High progress = high priority to complete
  if (progress >= 50) return 'medium';  // Medium progress = medium priority  
  if (progress >= 25) return 'medium';  // Low progress = medium priority to focus on
  return 'high';                        // Very low progress = high priority for attention
}