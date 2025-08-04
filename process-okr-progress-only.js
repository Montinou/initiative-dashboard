const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');

const SUPABASE_URL = 'https://zkkdnslupqnpioltjpeu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const CEO_USER_ID = '573d6535-a480-4e75-985b-8820e16437ad';
const TENANT_ID = 'd1a3408c-a3d0-487e-a355-a321a07b5ae2';

// Plantillas de iniciativas por área
const INITIATIVE_TEMPLATES = {
  'Administración': [
    'Optimizar procesos administrativos',
    'Implementar sistema de gestión documental',
    'Mejorar control de gastos y presupuesto',
    'Digitalizar procedimientos internos',
    'Fortalecer control de calidad',
    'Automatizar reportes financieros',
    'Mejorar gestión de proveedores',
    'Implementar indicadores de eficiencia'
  ],
  'Capital Humano': [
    'Desarrollar programa de capacitación',
    'Mejorar proceso de reclutamiento',
    'Implementar evaluación de desempeño',
    'Fortalecer cultura organizacional',
    'Desarrollar plan de carrera',
    'Mejorar clima laboral',
    'Implementar programa de bienestar',
    'Optimizar gestión de nómina'
  ],
  'Comercial': [
    'Aumentar captación de clientes',
    'Mejorar estrategia de ventas',
    'Desarrollar nuevos canales',
    'Fortalecer relación con clientes',
    'Implementar CRM',
    'Mejorar proceso de cotización',
    'Desarrollar marketing digital',
    'Optimizar seguimiento comercial'
  ],
  'Producto': [
    'Desarrollar nuevas funcionalidades',
    'Mejorar experiencia de usuario',
    'Optimizar rendimiento del sistema',
    'Implementar nuevas integraciones',
    'Fortalecer seguridad del producto',
    'Desarrollar API externa',
    'Mejorar documentación técnica',
    'Implementar testing automatizado'
  ]
};

async function processOKRProgressFile() {
  console.log('🚀 Procesando archivo OKR basado en valores de progreso...');
  
  const filePath = path.join(__dirname, 'public', 'OKRFull.xlsx');
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
    
    // Procesar valores de progreso
    const result = await processProgressData(rawData, area, sheetName);
    
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

async function processProgressData(rawData, area, sheetName) {
  let savedCount = 0;
  const errors = [];
  
  if (rawData.length < 3) {
    errors.push('No hay suficientes datos');
    return { savedCount: 0, errors };
  }
  
  // Buscar columna de progreso (generalmente Col 8 según el análisis)
  const progressColumnIndex = findProgressColumn(rawData);
  if (progressColumnIndex === -1) {
    errors.push('No se encontró columna de progreso');
    return { savedCount: 0, errors };
  }
  
  console.log(`  📊 Columna de progreso: ${progressColumnIndex}`);
  
  // Obtener plantillas de iniciativas para esta área
  const templates = INITIATIVE_TEMPLATES[area.name] || [
    'Iniciativa de mejora general',
    'Optimización de procesos',
    'Implementación de mejoras',
    'Desarrollo de estrategias'
  ];
  
  // Buscar filas con valores de progreso
  const progressRows = [];
  for (let i = 2; i < rawData.length; i++) {
    const row = rawData[i];
    if (row && row[progressColumnIndex] !== undefined && row[progressColumnIndex] !== null && row[progressColumnIndex] !== '') {
      const progressValue = parseFloat(row[progressColumnIndex]);
      if (!isNaN(progressValue) && progressValue >= 0 && progressValue <= 1) {
        progressRows.push({
          rowIndex: i,
          progress: Math.round(progressValue * 100),
          link: row[progressColumnIndex + 1] // Podría haber un enlace en la columna siguiente
        });
      }
    }
  }
  
  console.log(`  🎯 Filas con progreso encontradas: ${progressRows.length}`);
  
  // Crear iniciativas basadas en los valores de progreso
  for (let i = 0; i < progressRows.length && i < templates.length; i++) {
    const progressData = progressRows[i];
    const template = templates[i];
    
    try {
      // Crear descripción
      const descriptionParts = [
        `Iniciativa ${i + 1} del área ${area.name}`,
        `Basada en datos de progreso del archivo ${sheetName}`,
        `Fila original: ${progressData.rowIndex + 1}`
      ];
      
      if (progressData.link && typeof progressData.link === 'string' && progressData.link.includes('http')) {
        descriptionParts.push(`Enlace de referencia: ${progressData.link}`);
      }
      
      const initiativeData = {
        tenant_id: TENANT_ID,
        area_id: area.id,
        created_by: CEO_USER_ID,
        owner_id: CEO_USER_ID,
        title: template,
        description: descriptionParts.join('\n\n'),
        status: getStatusFromProgress(progressData.progress),
        priority: getPriorityFromProgress(progressData.progress),
        progress: progressData.progress,
        target_date: getDefaultTargetDate(),
        metadata: {
          importedFrom: 'okr_progress_based',
          originalData: {
            sheet: sheetName,
            area: area.name,
            rowIndex: progressData.rowIndex + 1,
            originalProgress: progressRows[i].progress / 100,
            hasLink: !!progressData.link
          }
        }
      };
      
      const { data: newInitiative, error: initiativeError } = await supabase
        .from('initiatives')
        .insert(initiativeData)
        .select('id')
        .single();
      
      if (initiativeError) {
        errors.push(`Error guardando "${template}": ${initiativeError.message}`);
        continue;
      }
      
      savedCount++;
      console.log(`  ✅ ${savedCount}. ${template} (${progressData.progress}%)`);
      
    } catch (error) {
      errors.push(`Error procesando iniciativa ${i + 1}: ${error.message}`);
    }
  }
  
  return { savedCount, errors };
}

function findProgressColumn(rawData) {
  // Buscar en los sub-encabezados (fila 1, índice 1)
  if (rawData.length > 1) {
    const subHeaders = rawData[1];
    for (let i = 0; i < subHeaders.length; i++) {
      const header = subHeaders[i];
      if (header && header.toString().toLowerCase().includes('progreso')) {
        return i;
      }
    }
  }
  
  // Si no se encuentra en encabezados, buscar patrones de datos numéricos 0-1
  for (let col = 0; col < 15; col++) {
    let numericCount = 0;
    let validProgressCount = 0;
    
    for (let row = 2; row < Math.min(20, rawData.length); row++) {
      if (rawData[row] && rawData[row][col] !== undefined) {
        const value = parseFloat(rawData[row][col]);
        if (!isNaN(value)) {
          numericCount++;
          if (value >= 0 && value <= 1) {
            validProgressCount++;
          }
        }
      }
    }
    
    // Si al menos 50% de los valores numéricos están en rango 0-1, es probablemente progreso
    if (numericCount > 3 && validProgressCount / numericCount >= 0.5) {
      return col;
    }
  }
  
  return -1; // No encontrado
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

  return normalizedArea.includes(normalizedSheet) || 
         normalizedSheet.includes(normalizedArea) ||
         normalizedArea === normalizedSheet;
}

function getStatusFromProgress(progress) {
  if (progress >= 100) return 'completed';
  if (progress >= 50) return 'in_progress';
  if (progress > 0) return 'in_progress';
  return 'planning';
}

function getPriorityFromProgress(progress) {
  if (progress >= 80) return 'high';
  if (progress >= 50) return 'medium';
  return 'low';
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
  processOKRProgressFile();
}

module.exports = { processOKRProgressFile };