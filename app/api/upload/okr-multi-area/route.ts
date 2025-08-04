import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createClient } from '@/utils/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    
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
      .select('id, tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    // Only CEO/SuperAdmin can upload multi-area files
    if (userProfile.role !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Only SuperAdmin/CEO can upload multi-area OKR files' },
        { status: 403 }
      );
    }

    // Get all areas for this tenant
    const { data: areas, error: areasError } = await supabase
      .from('areas')
      .select('id, name')
      .eq('tenant_id', userProfile.tenant_id);

    if (areasError || !areas || areas.length === 0) {
      return NextResponse.json(
        { error: 'No areas found for this tenant' },
        { status: 404 }
      );
    }

    console.log('📍 Available areas:', areas.map(a => `${a.name} (${a.id})`));

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

    let totalInitiatives = 0;
    let processedSheets: any[] = [];
    let allErrors: string[] = [];

    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n📋 Processing sheet: ${sheetName}`);
      
      // Find matching area for this sheet
      const area = areas.find(a => 
        a.name.toLowerCase().includes(sheetName.toLowerCase()) ||
        sheetName.toLowerCase().includes(a.name.toLowerCase()) ||
        areNamesMatch(a.name, sheetName)
      );

      if (!area) {
        console.log(`⚠️  No area found for sheet: ${sheetName}`);
        allErrors.push(`No matching area found for sheet "${sheetName}"`);
        continue;
      }

      console.log(`✅ Area matched: ${area.name} (ID: ${area.id})`);

      const worksheet = workbook.Sheets[sheetName];
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!rawData || rawData.length < 2) {
        console.log(`⚠️  Sheet "${sheetName}" is empty or has no data`);
        continue;
      }

      // Process this sheet for the matched area
      const processedSheet = await processMultiAreaOKRSheet(
        rawData as any[][],
        userProfile.tenant_id,
        area.id,
        area.name,
        sheetName,
        user.id,
        supabase
      );

      if (processedSheet.savedCount > 0) {
        processedSheets.push({
          sheetName,
          areaName: area.name,
          areaId: area.id,
          recordCount: processedSheet.savedCount,
          errors: processedSheet.errors
        });
        totalInitiatives += processedSheet.savedCount;
      }

      if (processedSheet.errors.length > 0) {
        allErrors.push(...processedSheet.errors.map(error => `[${sheetName}] ${error}`));
      }
    }

    console.log(`\n🎉 Processing completed!`);
    console.log(`📊 Total initiatives processed: ${totalInitiatives}`);
    console.log(`📑 Sheets processed: ${processedSheets.length}`);

    return NextResponse.json({
      success: true,
      data: {
        fileName: file.name,
        fileSize: file.size,
        totalInitiatives: totalInitiatives,
        sheetsProcessed: processedSheets.length,
        sheetDetails: processedSheets,
        errors: allErrors,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Multi-area upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error during file processing' },
      { status: 500 }
    );
  }
}

/**
 * Check if area names match with different variations
 */
function areNamesMatch(areaName: string, sheetName: string): boolean {
  const normalize = (str: string) => str.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[áàâã]/g, 'a')
    .replace(/[éèê]/g, 'e')
    .replace(/[íìî]/g, 'i')
    .replace(/[óòô]/g, 'o')
    .replace(/[úùû]/g, 'u')
    .replace(/ñ/g, 'n');

  const normalizedArea = normalize(areaName);
  const normalizedSheet = normalize(sheetName);

  // Direct match or containment
  if (normalizedArea === normalizedSheet || 
      normalizedArea.includes(normalizedSheet) || 
      normalizedSheet.includes(normalizedArea)) {
    return true;
  }

  // Special mappings
  const mappings: Record<string, string[]> = {
    'administracion': ['admin', 'administration', 'administrativo'],
    'capitalhumano': ['rrhh', 'recursos', 'humanos', 'personal', 'hr'],
    'comercial': ['ventas', 'sales', 'commercial', 'marketing'],
    'producto': ['product', 'desarrollo', 'development']
  };

  for (const [key, variants] of Object.entries(mappings)) {
    if (normalizedArea.includes(key) && variants.some(v => normalizedSheet.includes(v))) {
      return true;
    }
    if (normalizedSheet.includes(key) && variants.some(v => normalizedArea.includes(v))) {
      return true;
    }
  }

  return false;
}

/**
 * Process OKR sheet data for multi-area upload (CEO/SuperAdmin)
 */
async function processMultiAreaOKRSheet(
  rawData: any[][],
  tenantId: string,
  areaId: string,
  areaName: string,
  sheetName: string,
  userId: string,
  supabase: any
) {
  const errors: string[] = [];
  let savedCount = 0;

  if (rawData.length < 2) {
    errors.push(`Sheet "${sheetName}": File must contain at least a header row and one data row`);
    return { savedCount: 0, errors };
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
        cell.toString().toLowerCase().includes('accion') ||
        cell.toString().toLowerCase().includes('title') ||
        cell.toString().toLowerCase().includes('initiative')
      )
    )) {
      headerRowIndex = i;
      headers = row.map(h => h ? h.toString().trim() : '');
      break;
    }
  }

  if (headerRowIndex === -1) {
    errors.push(`Sheet "${sheetName}": Could not find expected headers`);
    return { savedCount: 0, errors };
  }

  console.log(`  📋 Headers found: ${headers.join(', ')}`);

  // Map columns dynamically
  const columnMapping = mapColumns(headers);

  // Validate required columns
  if (columnMapping.title === -1) {
    errors.push(`Sheet "${sheetName}": Missing required title/objetivo column`);
    return { savedCount: 0, errors };
  }

  // Process data rows
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    
    if (!row || row.length === 0 || row.every(cell => !cell)) {
      continue; // Skip empty rows
    }

    const title = row[columnMapping.title]?.toString().trim();
    if (!title) {
      continue; // Skip rows without title
    }

    try {
      // Build initiative data
      const initiativeData = {
        tenant_id: tenantId,
        area_id: areaId,
        created_by: userId,
        owner_id: userId,
        title: title,
        description: buildDescription(row, columnMapping, sheetName),
        status: parseStatus(row[columnMapping.status]),
        priority: parsePriority(row[columnMapping.priority]),
        progress: parseProgress(row[columnMapping.progress]),
        budget: parseBudget(row[columnMapping.budget]),
        target_date: parseDate(row[columnMapping.targetDate]) || getDefaultTargetDate(),
        metadata: {
          importedFrom: 'ceo_multi_area_upload',
          originalData: {
            sheet: sheetName,
            area: areaName,
            rowIndex: i + 1
          },
          uploadedBy: userId
        }
      };

      const { data: newInitiative, error: initiativeError } = await supabase
        .from('initiatives')
        .insert(initiativeData)
        .select('id')
        .single();

      if (initiativeError) {
        errors.push(`Failed to save initiative "${title}": ${initiativeError.message}`);
        continue;
      }

      savedCount++;
      console.log(`  ✅ ${savedCount}. ${title} (${initiativeData.progress}%)`);

    } catch (error) {
      errors.push(`Error processing row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { savedCount, errors };
}

/**
 * Map column headers to data fields
 */
function mapColumns(headers: string[]) {
  const mapping = {
    title: -1,
    description: -1,
    progress: -1,
    priority: -1,
    status: -1,
    budget: -1,
    targetDate: -1,
    responsible: -1
  };

  headers.forEach((header, index) => {
    const headerLower = header.toLowerCase();
    
    if (headerLower.includes('objetivo') || headerLower.includes('title') || headerLower.includes('iniciativa')) {
      mapping.title = index;
    } else if (headerLower.includes('descripción') || headerLower.includes('descripcion') || headerLower.includes('description')) {
      mapping.description = index;
    } else if (headerLower.includes('progreso') || headerLower.includes('progress') || headerLower.includes('%') || headerLower.includes('avance')) {
      mapping.progress = index;
    } else if (headerLower.includes('prioridad') || headerLower.includes('priority')) {
      mapping.priority = index;
    } else if (headerLower.includes('estado') || headerLower.includes('status')) {
      mapping.status = index;
    } else if (headerLower.includes('presupuesto') || headerLower.includes('budget') || headerLower.includes('costo')) {
      mapping.budget = index;
    } else if (headerLower.includes('fecha') || headerLower.includes('date') || headerLower.includes('plazo')) {
      mapping.targetDate = index;
    } else if (headerLower.includes('responsable') || headerLower.includes('responsible') || headerLower.includes('owner')) {
      mapping.responsible = index;
    }
  });

  return mapping;
}

/**
 * Build description from available data
 */
function buildDescription(row: any[], mapping: any, sheetName: string): string {
  const parts = [];
  
  if (mapping.description !== -1 && row[mapping.description]) {
    parts.push(row[mapping.description].toString().trim());
  }
  
  if (mapping.responsible !== -1 && row[mapping.responsible]) {
    parts.push(`Responsable: ${row[mapping.responsible].toString().trim()}`);
  }
  
  parts.push(`Importado desde: ${sheetName}`);
  
  return parts.join('\n\n');
}

/**
 * Parse status from cell value
 */
function parseStatus(value: any): 'planning' | 'in_progress' | 'completed' | 'on_hold' {
  if (!value) return 'planning';
  
  const str = value.toString().toLowerCase();
  if (str.includes('completado') || str.includes('complete') || str.includes('🟢')) return 'completed';
  if (str.includes('progreso') || str.includes('progress') || str.includes('🟡')) return 'in_progress';
  if (str.includes('pausa') || str.includes('hold') || str.includes('🔴')) return 'on_hold';
  
  return 'planning';
}

/**
 * Parse priority from cell value
 */
function parsePriority(value: any): 'low' | 'medium' | 'high' {
  if (!value) return 'medium';
  
  const str = value.toString().toLowerCase();
  if (str.includes('alta') || str.includes('high')) return 'high';
  if (str.includes('baja') || str.includes('low')) return 'low';
  
  return 'medium';
}

/**
 * Parse progress percentage from cell value
 */
function parseProgress(value: any): number {
  if (!value) return 0;
  
  let progress = 0;
  if (typeof value === 'number') {
    progress = value;
  } else {
    const str = value.toString().replace('%', '').replace(',', '.');
    progress = parseFloat(str);
  }
  
  if (isNaN(progress)) return 0;
  
  // Convert to 0-100 range if needed
  if (progress <= 1 && progress > 0) {
    progress = progress * 100;
  }
  
  return Math.min(100, Math.max(0, Math.round(progress)));
}

/**
 * Parse budget from cell value
 */
function parseBudget(value: any): number | null {
  if (!value) return null;
  
  const str = value.toString().replace(/[$,]/g, '').replace(/[^\d.]/g, '');
  const parsed = parseFloat(str);
  
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse date from cell value
 */
function parseDate(value: any): string | null {
  if (!value) return null;
  
  try {
    const date = new Date(value);
    if (isNaN(date.getTime())) return null;
    
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

/**
 * Get default target date (end of year)
 */
function getDefaultTargetDate(): string {
  const now = new Date();
  return new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
}