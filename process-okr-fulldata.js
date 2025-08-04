const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const SUPABASE_URL = 'https://zkkdnslupqnpioltjpeu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CEO_USER_ID = '573d6535-a480-4e75-985b-8820e16437ad';
const TENANT_ID = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2';

async function processOKRFullDataFile() {
  console.log('🚀 Procesando archivo OKRfulldata.xlsx con datos reales...');
  
  const filePath = path.join(__dirname, 'public', 'OKRfulldata.xlsx');
  const workbook = XLSX.readFile(filePath);
  
  // Obtener áreas del tenant
  console.log('🔍 Consultando áreas para tenant:', TENANT_ID);
  const { data: areas, error: areasError } = await supabase
    .from('areas')
    .select('id, name')
    .eq('tenant_id', TENANT_ID);
    
  if (areasError) {
    console.error('❌ Error consultando áreas:', areasError.message);
    return;
  }
    
  if (!areas || areas.length === 0) {
    console.error('❌ No se encontraron áreas para el tenant');
    return;
  }
  
  console.log('📍 Áreas disponibles:', areas.map(a => `${a.name} (${a.id})`));
  console.log('📋 Pestañas en el archivo:', workbook.SheetNames);
  
  let totalInitiatives = 0;
  
  // Procesar cada pestaña
  for (const sheetName of workbook.SheetNames) {
    console.log(`\n📋 Procesando pestaña: ${sheetName}`);
    
    // Encontrar área correspondiente
    const area = areas.find(a => areNamesMatch(a.name, sheetName));
    if (!area) {
      console.log(`⚠️  No se encontró área para: ${sheetName}`);
      continue;
    }
    
    console.log(`✅ Área: ${area.name} (${area.id})`);
    
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Analizar estructura primero
    console.log(`  📊 Total de filas: ${rawData.length}`);
    console.log(`  📋 Primeras 3 filas:`);
    for (let i = 0; i < Math.min(3, rawData.length); i++) {
      const row = rawData[i];
      if (row && row.length > 0) {
        console.log(`    ${i + 1}: [${row.join(' | ')}]`);
      }
    }
    
    // Procesar datos de esta pestaña
    const result = await processSheetData(rawData, area, sheetName);
    
    if (result.savedCount > 0) {
      console.log(`✅ ${result.savedCount} iniciativas creadas`);
      totalInitiatives += result.savedCount;
    }
    
    if (result.errors.length > 0) {
      console.log('⚠️  Errores:', result.errors);
    }
  }
  
  console.log(`\n🎉 Procesamiento completado: ${totalInitiatives} iniciativas totales`);
  
  // Verificar resultado final
  await verifyResults();
}

async function processSheetData(rawData, area, sheetName) {
  let savedCount = 0;
  const errors = [];
  
  if (rawData.length < 3) {
    errors.push('No hay suficientes datos');
    return { savedCount: 0, errors };
  }
  
  // Identificar estructura de columnas
  const columnMapping = identifyColumns(rawData);
  console.log(`  🗺️  Mapeo de columnas:`, columnMapping);
  
  if (columnMapping.title === -1) {
    errors.push('No se encontró columna de título/acción clave');
    return { savedCount: 0, errors };
  }
  
  // Procesar filas de datos (generalmente desde la fila 2 o 3)
  const startRow = findDataStartRow(rawData);
  console.log(`  🎯 Iniciando procesamiento desde fila: ${startRow + 1}`);
  
  for (let i = startRow; i < rawData.length; i++) {
    const row = rawData[i];
    
    if (!row || row.length === 0) continue;
    
    // Obtener título
    const title = row[columnMapping.title];
    if (!title || !title.toString().trim()) {
      continue; // Saltar filas sin título
    }
    
    const titleText = title.toString().trim();
    
    // Obtener progreso
    let progress = 0;
    if (columnMapping.progress !== -1 && row[columnMapping.progress] !== undefined) {
      progress = parseProgress(row[columnMapping.progress]);
    }
    
    // Obtener prioridad
    let priority = 'medium';
    if (columnMapping.priority !== -1 && row[columnMapping.priority]) {
      priority = parsePriority(row[columnMapping.priority]);
    }
    
    // Obtener responsable
    let responsable = '';
    if (columnMapping.responsible !== -1 && row[columnMapping.responsible]) {
      responsable = row[columnMapping.responsible].toString().trim();
    }
    
    // Obtener fecha
    let fecha = '';
    if (columnMapping.date !== -1 && row[columnMapping.date]) {
      fecha = row[columnMapping.date].toString().trim();
    }
    
    // Obtener descripción/resultado
    let descripcion = '';
    if (columnMapping.description !== -1 && row[columnMapping.description]) {
      descripcion = row[columnMapping.description].toString().trim();
    }
    
    try {
      // Crear descripción completa
      const descriptionParts = [];
      if (descripcion) descriptionParts.push(descripcion);
      if (responsable) descriptionParts.push(`Responsable: ${responsable}`);
      if (fecha) descriptionParts.push(`Fecha: ${fecha}`);
      descriptionParts.push(`Importado desde: ${sheetName} (fila ${i + 1})`);
      
      const initiativeData = {
        tenant_id: TENANT_ID,
        area_id: area.id,
        created_by: CEO_USER_ID,
        owner_id: CEO_USER_ID,
        title: titleText,
        description: descriptionParts.join('\n\n'),
        status: getStatusFromProgress(progress),
        priority: priority,
        progress: progress,
        target_date: getTargetDate(fecha),
        metadata: {
          importedFrom: 'okr_fulldata',
          originalData: {
            sheet: sheetName,
            area: area.name,
            rowIndex: i + 1,
            responsable: responsable,
            fecha: fecha,
            originalProgress: progress
          }
        }
      };
      
      const { data: newInitiative, error: initiativeError } = await supabase
        .from('initiatives')
        .insert(initiativeData)
        .select('id')
        .single();
      
      if (initiativeError) {
        errors.push(`Error guardando "${titleText}": ${initiativeError.message}`);
        continue;
      }
      
      savedCount++;
      console.log(`  ✅ ${savedCount}. ${titleText} (${progress}%)`);
      
    } catch (error) {
      errors.push(`Error procesando fila ${i + 1}: ${error.message}`);
    }
  }
  
  return { savedCount, errors };
}

function identifyColumns(rawData) {
  const mapping = {
    title: -1,
    progress: -1,
    priority: -1,
    responsible: -1,
    date: -1,
    description: -1
  };
  
  // Buscar en encabezados (fila 0 y 1)
  for (let headerRow = 0; headerRow < Math.min(2, rawData.length); headerRow++) {
    const headers = rawData[headerRow] || [];
    
    headers.forEach((header, index) => {
      if (!header) return;
      
      const headerLower = header.toString().toLowerCase();
      
      // Patrones para título/acción clave
      if ((headerLower.includes('acción') || headerLower.includes('accion') || 
           headerLower.includes('objetivo') || headerLower.includes('título') ||
           headerLower.includes('titulo') || headerLower.includes('descripción') ||
           headerLower.includes('descripcion')) && mapping.title === -1) {
        mapping.title = index;
      }
      // Patrones para progreso
      else if ((headerLower.includes('progreso') || headerLower.includes('%') ||
                headerLower.includes('avance')) && mapping.progress === -1) {
        mapping.progress = index;
      }
      // Patrones para prioridad
      else if (headerLower.includes('prioridad') && mapping.priority === -1) {
        mapping.priority = index;
      }
      // Patrones para responsable
      else if ((headerLower.includes('responsable') || headerLower.includes('encargado')) && mapping.responsible === -1) {
        mapping.responsible = index;
      }
      // Patrones para fecha
      else if ((headerLower.includes('fecha') || headerLower.includes('plazo')) && mapping.date === -1) {
        mapping.date = index;
      }
      // Patrones para descripción/resultado
      else if ((headerLower.includes('resultado') || headerLower.includes('detalle')) && mapping.description === -1) {
        mapping.description = index;
      }
    });
  }
  
  // Si no encontramos título en encabezados, buscar en la primera columna con texto
  if (mapping.title === -1) {
    for (let col = 0; col < 5; col++) {
      let hasTextContent = false;
      for (let row = 2; row < Math.min(10, rawData.length); row++) {
        if (rawData[row] && rawData[row][col] && 
            typeof rawData[row][col] === 'string' && 
            rawData[row][col].trim().length > 5) {
          hasTextContent = true;
          break;
        }
      }
      if (hasTextContent) {
        mapping.title = col;
        break;
      }
    }
  }
  
  return mapping;
}

function findDataStartRow(rawData) {
  // Buscar la primera fila que tenga datos válidos (no solo encabezados)
  for (let i = 1; i < Math.min(5, rawData.length); i++) {
    const row = rawData[i];
    if (row && row.length > 0) {
      // Verificar si hay contenido que no sean encabezados típicos
      const hasRealData = row.some(cell => 
        cell && 
        typeof cell === 'string' && 
        cell.trim().length > 3 &&
        !cell.toString().toLowerCase().includes('objetivo') &&
        !cell.toString().toLowerCase().includes('área') &&
        !cell.toString().toLowerCase().includes('período') &&
        !cell.toString().toLowerCase().includes('acción') &&
        !cell.toString().toLowerCase().includes('progreso')
      );
      
      if (hasRealData) {
        return i;
      }
    }
  }
  
  // Por defecto, iniciar desde la fila 2
  return 2;
}

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

  // Coincidencia directa
  if (normalizedArea === normalizedSheet || 
      normalizedArea.includes(normalizedSheet) || 
      normalizedSheet.includes(normalizedArea)) {
    return true;
  }

  // Mapeos específicos
  const mappings = {
    'administracion': ['admin'],
    'capitalhumano': ['capital', 'humano', 'rrhh'],
    'comercial': ['ventas', 'sales'],
    'producto': ['product']
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
  
  // Si el valor está entre 0 y 1, convertir a porcentaje
  if (progress <= 1 && progress > 0) {
    progress = progress * 100;
  }
  
  return Math.min(100, Math.max(0, Math.round(progress)));
}

function parsePriority(value) {
  if (!value) return 'medium';
  
  const str = value.toString().toLowerCase();
  if (str.includes('alta') || str.includes('high')) return 'high';
  if (str.includes('baja') || str.includes('low')) return 'low';
  
  return 'medium';
}

function getStatusFromProgress(progress) {
  if (progress >= 100) return 'completed';
  if (progress >= 50) return 'in_progress';
  if (progress > 0) return 'in_progress';
  return 'planning';
}

function getTargetDate(fechaString) {
  if (fechaString && fechaString.toString().trim()) {
    // Intentar parsear fecha si está en formato reconocible
    try {
      const date = new Date(fechaString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (e) {
      // Ignorar errores de parseo
    }
  }
  
  // Fecha por defecto: fin de año
  const now = new Date();
  return new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
}

async function verifyResults() {
  console.log('\n🔍 Verificando resultados...');
  
  const { data: initiatives, error } = await supabase
    .from('initiatives')
    .select(`
      id, 
      title, 
      progress, 
      status,
      priority,
      areas:area_id (name)
    `)
    .eq('tenant_id', TENANT_ID)
    .order('progress', { ascending: false });
  
  if (error) {
    console.error('❌ Error verificando:', error.message);
    return;
  }
  
  console.log(`📊 Total de iniciativas en la base: ${initiatives.length}`);
  
  // Agrupar por área
  const byArea = initiatives.reduce((acc, init) => {
    const areaName = init.areas?.name || 'Sin área';
    if (!acc[areaName]) acc[areaName] = [];
    acc[areaName].push(init);
    return acc;
  }, {});
  
  console.log('\n📋 Por área:');
  Object.entries(byArea).forEach(([areaName, inits]) => {
    const avgProgress = inits.reduce((sum, i) => sum + i.progress, 0) / inits.length;
    const statusCount = inits.reduce((acc, i) => {
      acc[i.status] = (acc[i.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`  - ${areaName}: ${inits.length} iniciativas (promedio: ${avgProgress.toFixed(1)}%)`);
    console.log(`    Estados: ${Object.entries(statusCount).map(([s, c]) => `${s}: ${c}`).join(', ')}`);
    
    // Mostrar las primeras 3 iniciativas como ejemplo
    inits.slice(0, 3).forEach(init => {
      console.log(`    • ${init.title} (${init.progress}% - ${init.status})`);
    });
  });
}

// Ejecutar
if (require.main === module) {
  processOKRFullDataFile();
}

module.exports = { processOKRFullDataFile };