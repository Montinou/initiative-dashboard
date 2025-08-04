const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración
const SUPABASE_URL = 'https://zkkdnslupqnpioltjpeu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function cleanExistingData() {
  console.log('🧹 Limpiando datos existentes...');
  
  try {
    // Limpiar en orden para respetar foreign keys
    console.log('  - Eliminando actividades...');
    await supabase.from('activities').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('  - Eliminando subtasks...');
    await supabase.from('subtasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('  - Eliminando historial de progreso...');
    await supabase.from('progress_history').delete().neq('id', 0);
    
    console.log('  - Eliminando iniciativas...');
    await supabase.from('initiatives').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('  - Limpiando archivos subidos...');
    await supabase.from('uploaded_files').delete().or('file_type.eq.spreadsheet,original_filename.like.%.xlsx');
    
    // Verificar limpieza
    const { data: initiatives } = await supabase.from('initiatives').select('id');
    const { data: subtasks } = await supabase.from('subtasks').select('id');
    const { data: activities } = await supabase.from('activities').select('id');
    
    console.log(`✅ Limpieza completada:`);
    console.log(`   - Iniciativas restantes: ${initiatives?.length || 0}`);
    console.log(`   - Subtasks restantes: ${subtasks?.length || 0}`);
    console.log(`   - Actividades restantes: ${activities?.length || 0}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error en limpieza:', error.message);
    return false;
  }
}

async function createCEOSession() {
  console.log('🔐 Creando sesión de CEO...');
  
  try {
    // Buscar el usuario CEO SIGA que hemos estado usando
    const { data: ceoProfile, error } = await supabase
      .from('user_profiles')
      .select('user_id, email, full_name, tenant_id')
      .eq('user_id', '573d6535-a480-4e75-985b-8820e16437ad')
      .single();
    
    if (error || !ceoProfile) {
      console.error('❌ No se encontró usuario CEO SIGA');
      return null;
    }
    
    console.log(`✅ CEO encontrado: ${ceoProfile.email} (${ceoProfile.full_name})`);
    console.log(`🏢 Tenant ID: ${ceoProfile.tenant_id}`);
    
    return {
      userId: ceoProfile.user_id,
      email: ceoProfile.email,
      tenantId: ceoProfile.tenant_id
    };
    
  } catch (error) {
    console.error('❌ Error creando sesión:', error.message);
    return null;
  }
}

async function processOKRFile() {
  console.log('🚀 Iniciando procesamiento de OKR como CEO...');
  
  // 1. Limpiar datos existentes
  const cleanSuccess = await cleanExistingData();
  if (!cleanSuccess) {
    console.error('❌ Falló la limpieza de datos');
    return;
  }
  
  // 2. Crear sesión de CEO
  const session = await createCEOSession();
  if (!session) {
    console.error('❌ No se pudo crear sesión de CEO');
    return;
  }
  
  // 3. Procesar archivo directamente con service role
  const filePath = path.join(__dirname, 'public', 'OKRFull.xlsx');
  console.log('📂 Procesando archivo:', filePath);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Archivo no encontrado: ${filePath}`);
    return;
  }
  
  try {
    const result = await processOKRFileDirectly(filePath, session.userId, session.tenantId);
    
    if (result.success) {
      console.log('🎉 ¡Procesamiento exitoso!');
      console.log(`📊 Total de iniciativas: ${result.totalInitiatives}`);
      console.log(`📑 Pestañas procesadas: ${result.sheetsProcessed}`);
      
      if (result.sheetDetails && result.sheetDetails.length > 0) {
        console.log('\n📋 Detalles por área:');
        result.sheetDetails.forEach(sheet => {
          console.log(`  - ${sheet.areaName}: ${sheet.recordCount} iniciativas`);
        });
      }
      
      if (result.errors && result.errors.length > 0) {
        console.log('\n⚠️  Errores encontrados:');
        result.errors.forEach(error => console.log(`  - ${error}`));
      }
      
    } else {
      console.error('❌ Error procesando archivo:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
  }
}

async function processOKRFileDirectly(filePath, userId, tenantId) {
  const XLSX = require('xlsx');
  
  // Leer archivo Excel
  const workbook = XLSX.readFile(filePath);
  console.log('📊 Pestañas encontradas:', workbook.SheetNames);
  
  const { data: areas } = await supabase
    .from('areas')
    .select('id, name')
    .eq('tenant_id', tenantId);
  
  if (!areas || areas.length === 0) {
    throw new Error('No se encontraron áreas para el tenant');
  }
  
  console.log('📍 Áreas disponibles:', areas.map(a => `${a.name} (${a.id})`));
  
  let totalInitiatives = 0;
  let processedSheets = [];
  let allErrors = [];
  
  // Procesar cada pestaña
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n📋 Procesando pestaña: ${sheetName}`);
    
    // Buscar área correspondiente
    const area = areas.find(a => 
      a.name.toLowerCase().includes(sheetName.toLowerCase()) ||
      sheetName.toLowerCase().includes(a.name.toLowerCase()) ||
      areNamesMatch(a.name, sheetName)
    );
    
    if (!area) {
      console.log(`⚠️  No se encontró área para la pestaña: ${sheetName}`);
      allErrors.push(`No se encontró área para "${sheetName}"`);
      continue;
    }
    
    console.log(`✅ Área encontrada: ${area.name} (ID: ${area.id})`);
    
    // Leer datos de la pestaña
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (!rawData || rawData.length < 2) {
      console.log(`⚠️  La pestaña "${sheetName}" está vacía`);
      continue;
    }
    
    console.log(`📊 Filas encontradas: ${rawData.length}`);
    
    // Procesar datos de esta pestaña
    const result = await processSheetData(
      rawData,
      tenantId,
      area.id,
      area.name,
      sheetName,
      userId
    );
    
    if (result.savedCount > 0) {
      processedSheets.push({
        sheetName,
        areaName: area.name,
        recordCount: result.savedCount
      });
      totalInitiatives += result.savedCount;
    }
    
    if (result.errors.length > 0) {
      allErrors.push(...result.errors);
    }
  }
  
  return {
    success: true,
    totalInitiatives,
    sheetsProcessed: processedSheets.length,
    sheetDetails: processedSheets,
    errors: allErrors
  };
}

async function processSheetData(rawData, tenantId, areaId, areaName, sheetName, userId) {
  let savedCount = 0;
  const errors = [];
  
  // Buscar fila de encabezados
  let headerRowIndex = -1;
  let headers = [];
  
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
    errors.push(`No se encontraron encabezados en "${sheetName}"`);
    return { savedCount: 0, errors };
  }
  
  console.log(`  📋 Encabezados: ${headers.join(', ')}`);
  
  // Mapear columnas
  const columnMapping = mapColumns(headers);
  
  if (columnMapping.title === -1) {
    errors.push(`No se encontró columna de título en "${sheetName}"`);
    return { savedCount: 0, errors };
  }
  
  // Procesar filas de datos
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    
    if (!row || row.length === 0 || row.every(cell => !cell)) {
      continue; // Saltar filas vacías
    }
    
    const title = row[columnMapping.title]?.toString().trim();
    if (!title) {
      continue; // Saltar filas sin título
    }
    
    try {
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
        target_date: getDefaultTargetDate(),
        metadata: {
          importedFrom: 'ceo_okr_upload',
          originalData: {
            sheet: sheetName,
            area: areaName,
            rowIndex: i + 1
          }
        }
      };
      
      const { data: newInitiative, error: initiativeError } = await supabase
        .from('initiatives')
        .insert(initiativeData)
        .select('id')
        .single();
      
      if (initiativeError) {
        errors.push(`Error guardando "${title}": ${initiativeError.message}`);
        continue;
      }
      
      savedCount++;
      console.log(`  ✅ ${savedCount}. ${title} (${initiativeData.progress}%)`);
      
    } catch (error) {
      errors.push(`Error en fila ${i + 1}: ${error.message}`);
    }
  }
  
  return { savedCount, errors };
}

// Funciones auxiliares
function areNamesMatch(areaName, sheetName) {
  const normalize = (str) => str.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[áàâã]/g, 'a')
    .replace(/[éèê]/g, 'e')
    .replace(/[íìî]/g, 'i')
    .replace(/[óòô]/g, 'o')
    .replace(/[úùû]/g, 'u')
    .replace(/ñ/g, 'n');

  const normalizedArea = normalize(areaName);
  const normalizedSheet = normalize(sheetName);

  const mappings = {
    'administracion': ['admin', 'administration'],
    'capitalhumano': ['rrhh', 'recursos', 'humanos', 'personal'],
    'comercial': ['ventas', 'sales', 'commercial'],
    'producto': ['product', 'desarrollo']
  };

  for (const [key, variants] of Object.entries(mappings)) {
    if (normalizedArea.includes(key) && variants.some(v => normalizedSheet.includes(v))) {
      return true;
    }
  }

  return false;
}

function mapColumns(headers) {
  const mapping = {
    title: -1,
    description: -1,
    progress: -1,
    priority: -1,
    status: -1,
    budget: -1
  };

  headers.forEach((header, index) => {
    const headerLower = header.toLowerCase();
    
    if (headerLower.includes('objetivo') || headerLower.includes('title')) {
      mapping.title = index;
    } else if (headerLower.includes('descripción') || headerLower.includes('descripcion')) {
      mapping.description = index;
    } else if (headerLower.includes('progreso') || headerLower.includes('%')) {
      mapping.progress = index;
    } else if (headerLower.includes('prioridad')) {
      mapping.priority = index;
    } else if (headerLower.includes('estado')) {
      mapping.status = index;
    } else if (headerLower.includes('presupuesto') || headerLower.includes('budget')) {
      mapping.budget = index;
    }
  });

  return mapping;
}

function buildDescription(row, mapping, sheetName) {
  const parts = [];
  
  if (mapping.description !== -1 && row[mapping.description]) {
    parts.push(row[mapping.description].toString().trim());
  }
  
  parts.push(`Importado desde: ${sheetName}`);
  
  return parts.join('\n\n');
}

function parseStatus(value) {
  if (!value) return 'planning';
  
  const str = value.toString().toLowerCase();
  if (str.includes('completado') || str.includes('🟢')) return 'completed';
  if (str.includes('progreso') || str.includes('🟡')) return 'in_progress';
  if (str.includes('pausa') || str.includes('🔴')) return 'on_hold';
  
  return 'planning';
}

function parsePriority(value) {
  if (!value) return 'medium';
  
  const str = value.toString().toLowerCase();
  if (str.includes('alta')) return 'high';
  if (str.includes('baja')) return 'low';
  
  return 'medium';
}

function parseProgress(value) {
  if (!value) return 0;
  
  let progress = 0;
  if (typeof value === 'number') {
    progress = value;
  } else {
    const str = value.toString().replace('%', '').replace(',', '.');
    progress = parseFloat(str);
  }
  
  if (isNaN(progress)) return 0;
  
  if (progress <= 1 && progress > 0) {
    progress = progress * 100;
  }
  
  return Math.min(100, Math.max(0, Math.round(progress)));
}

function parseBudget(value) {
  if (!value) return null;
  
  const str = value.toString().replace(/[$,]/g, '').replace(/[^\d.]/g, '');
  const parsed = parseFloat(str);
  
  return isNaN(parsed) ? null : parsed;
}

function getDefaultTargetDate() {
  const now = new Date();
  return new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
}

// Ejecutar el script
if (require.main === module) {
  processOKRFile();
}

module.exports = { processOKRFile };