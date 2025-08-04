const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const SUPABASE_URL = 'https://zkkdnslupqnpioltjpeu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Usuario CEO SIGA
const CEO_USER_ID = '573d6535-a480-4e75-985b-8820e16437ad';
const TENANT_ID = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2';

async function processOKRTemplateFile() {
  console.log('🚀 Procesando archivo OKR con formato de plantilla...');
  
  const filePath = path.join(__dirname, 'public', 'OKRFull.xlsx');
  const workbook = XLSX.readFile(filePath);
  
  // Obtener áreas del tenant
  const { data: areas } = await supabase
    .from('areas')
    .select('id, name')
    .eq('tenant_id', TENANT_ID);
    
  if (!areas || areas.length === 0) {
    console.error('❌ No se encontraron áreas');
    return;
  }
  
  console.log('📍 Áreas disponibles:', areas.map(a => `${a.name} (${a.id})`));
  
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
    
    // Procesar con formato específico
    const result = await processTemplateSheet(rawData, area, sheetName);
    
    if (result.savedCount > 0) {
      console.log(`✅ ${result.savedCount} iniciativas guardadas`);
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

async function processTemplateSheet(rawData, area, sheetName) {
  let savedCount = 0;
  const errors = [];
  
  if (rawData.length < 3) {
    errors.push('Formato de archivo no válido');
    return { savedCount: 0, errors };
  }
  
  // El formato esperado es:
  // Fila 0: [ÁREA, OBJETIVO, Período, ...]
  // Fila 1: [, , , Acción Clave, Prioridad, Responsable, Fecha, ..., Progreso]
  // Fila 2+: datos
  
  const mainHeaders = rawData[0] || [];
  const subHeaders = rawData[1] || [];
  
  console.log(`  📋 Encabezados principales: [${mainHeaders.join(' | ')}]`);
  console.log(`  📋 Sub-encabezados: [${subHeaders.join(' | ')}]`);
  
  // Mapear columnas del formato específico
  const columnMapping = mapTemplateColumns(subHeaders);
  console.log(`  🗺️  Mapeo de columnas:`, columnMapping);
  
  if (columnMapping.accionClave === -1) {
    errors.push('No se encontró columna "Acción Clave"');
    return { savedCount: 0, errors };
  }
  
  // Procesar filas de datos (a partir de fila 2)
  for (let i = 2; i < rawData.length; i++) {
    const row = rawData[i];
    
    if (!row || row.length === 0) continue;
    
    // Obtener "Acción Clave" como título
    const accionClave = row[columnMapping.accionClave];
    if (!accionClave || !accionClave.toString().trim()) {
      continue; // Saltar filas sin acción clave
    }
    
    const title = accionClave.toString().trim();
    
    // Obtener progreso
    let progress = 0;
    if (columnMapping.progreso !== -1) {
      const progressValue = row[columnMapping.progreso];
      if (progressValue) {
        progress = parseProgress(progressValue);
      }
    }
    
    // Obtener prioridad
    let priority = 'medium';
    if (columnMapping.prioridad !== -1) {
      const priorityValue = row[columnMapping.prioridad];
      if (priorityValue) {
        priority = parsePriority(priorityValue);
      }
    }
    
    // Obtener responsable
    let responsable = '';
    if (columnMapping.responsable !== -1) {
      const responsableValue = row[columnMapping.responsable];
      if (responsableValue) {
        responsable = responsableValue.toString().trim();
      }
    }
    
    // Obtener fecha límite
    let fechaLimite = '';
    if (columnMapping.fechaLimite !== -1) {
      const fechaValue = row[columnMapping.fechaLimite];
      if (fechaValue) {
        fechaLimite = fechaValue.toString().trim();
      }
    }
    
    // Obtener resultado
    let resultado = '';
    if (columnMapping.resultado !== -1) {
      const resultadoValue = row[columnMapping.resultado];
      if (resultadoValue) {
        resultado = resultadoValue.toString().trim();
      }
    }
    
    try {
      // Crear descripción
      const descriptionParts = [];
      if (responsable) descriptionParts.push(`Responsable: ${responsable}`);
      if (fechaLimite) descriptionParts.push(`Fecha límite: ${fechaLimite}`);
      if (resultado) descriptionParts.push(`Resultado esperado: ${resultado}`);
      descriptionParts.push(`Importado desde: ${sheetName} (fila ${i + 1})`);
      
      const initiativeData = {
        tenant_id: TENANT_ID,
        area_id: area.id,
        created_by: CEO_USER_ID,
        owner_id: CEO_USER_ID,
        title: title,
        description: descriptionParts.join('\n\n'),
        status: getStatusFromProgress(progress),
        priority: priority,
        progress: progress,
        target_date: getDefaultTargetDate(),
        metadata: {
          importedFrom: 'okr_template_format',
          originalData: {
            sheet: sheetName,
            area: area.name,
            rowIndex: i + 1,
            responsable: responsable,
            fechaLimite: fechaLimite,
            resultado: resultado
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
      console.log(`  ✅ ${savedCount}. ${title} (${progress}%)`);
      
      // Crear subtask si hay resultado esperado
      if (resultado && newInitiative) {
        const subtaskData = {
          initiative_id: newInitiative.id,
          tenant_id: TENANT_ID,
          title: 'Resultado esperado',
          description: resultado,
          completed: progress >= 100
        };
        
        await supabase.from('subtasks').insert(subtaskData);
      }
      
    } catch (error) {
      errors.push(`Error procesando fila ${i + 1}: ${error.message}`);
    }
  }
  
  return { savedCount, errors };
}

function mapTemplateColumns(headers) {
  const mapping = {
    accionClave: -1,
    progreso: -1,
    prioridad: -1,
    responsable: -1,
    fechaLimite: -1,
    resultado: -1
  };
  
  headers.forEach((header, index) => {
    if (!header) return;
    
    const headerLower = header.toString().toLowerCase();
    
    if (headerLower.includes('acción') || headerLower.includes('accion')) {
      mapping.accionClave = index;
    } else if (headerLower.includes('progreso') || headerLower.includes('%')) {
      mapping.progreso = index;
    } else if (headerLower.includes('prioridad')) {
      mapping.prioridad = index;
    } else if (headerLower.includes('responsable')) {
      mapping.responsable = index;
    } else if (headerLower.includes('fecha')) {
      mapping.fechaLimite = index;
    } else if (headerLower.includes('resultado')) {
      mapping.resultado = index;
    }
  });
  
  return mapping;
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

function getDefaultTargetDate() {
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
      areas:area_id (name)
    `)
    .eq('tenant_id', TENANT_ID);
  
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
    console.log(`  - ${areaName}: ${inits.length} iniciativas (promedio: ${avgProgress.toFixed(1)}%)`);
  });
}

// Ejecutar
if (require.main === module) {
  processOKRTemplateFile();
}

module.exports = { processOKRTemplateFile };