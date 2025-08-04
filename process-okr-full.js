const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuración de Supabase
const SUPABASE_URL = 'https://zkkdnslupqnpioltjpeu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Mapeo de nombres de pestañas a áreas en la base de datos
const AREA_MAPPING = {
  'Administración': 'Administración',
  'Capital Humano': 'Capital Humano', 
  'Comercial': 'Comercial',
  'Producto': 'Producto'
};

async function processOKRFile() {
  try {
    console.log('🚀 Iniciando procesamiento de OKRFull.xlsx...');
    
    // Leer el archivo Excel
    const filePath = path.join(__dirname, 'public', 'OKRFull.xlsx');
    console.log('📂 Leyendo archivo:', filePath);
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Archivo no encontrado: ${filePath}`);
    }
    
    const workbook = XLSX.readFile(filePath);
    console.log('📊 Pestañas encontradas:', workbook.SheetNames);
    
    // Obtener el tenant_id del usuario de prueba
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('tenant_id')
      .eq('user_id', '573d6535-a480-4e75-985b-8820e16437ad')
      .single();
    
    if (profileError || !userProfile) {
      throw new Error(`Error obteniendo perfil de usuario: ${profileError?.message}`);
    }
    
    const tenantId = userProfile.tenant_id;
    console.log('🏢 Tenant ID:', tenantId);
    
    // Obtener las áreas existentes
    const { data: areas, error: areasError } = await supabase
      .from('areas')
      .select('id, name')
      .eq('tenant_id', tenantId);
    
    if (areasError) {
      throw new Error(`Error obteniendo áreas: ${areasError.message}`);
    }
    
    console.log('📍 Áreas disponibles:', areas.map(a => a.name));
    
    // Procesar cada pestaña
    let totalInitiatives = 0;
    
    for (const sheetName of workbook.SheetNames) {
      console.log(`\n📋 Procesando pestaña: ${sheetName}`);
      
      // Buscar el área correspondiente
      const area = areas.find(a => 
        a.name.toLowerCase().includes(sheetName.toLowerCase()) ||
        sheetName.toLowerCase().includes(a.name.toLowerCase())
      );
      
      if (!area) {
        console.log(`⚠️  No se encontró área para la pestaña: ${sheetName}`);
        continue;
      }
      
      console.log(`✅ Área encontrada: ${area.name} (ID: ${area.id})`);
      
      // Leer datos de la pestaña
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      console.log(`📊 Filas encontradas: ${jsonData.length}`);
      
      // Procesar cada fila como una iniciativa
      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        
        // Detectar columnas dinámicamente
        const keys = Object.keys(row);
        const titleKey = keys.find(k => 
          k.toLowerCase().includes('objetivo') || 
          k.toLowerCase().includes('title') ||
          k.toLowerCase().includes('iniciativa') ||
          k.toLowerCase().includes('nombre')
        ) || keys[0];
        
        const descriptionKey = keys.find(k => 
          k.toLowerCase().includes('descripcion') || 
          k.toLowerCase().includes('description') ||
          k.toLowerCase().includes('detalle')
        ) || keys[1];
        
        const progressKey = keys.find(k => 
          k.toLowerCase().includes('progreso') || 
          k.toLowerCase().includes('progress') ||
          k.toLowerCase().includes('%')
        );
        
        const budgetKey = keys.find(k => 
          k.toLowerCase().includes('presupuesto') ||
          k.toLowerCase().includes('budget') ||
          k.toLowerCase().includes('costo')
        );
        
        const statusKey = keys.find(k => 
          k.toLowerCase().includes('estado') ||
          k.toLowerCase().includes('status')
        );
        
        const title = row[titleKey];
        if (!title || title.toString().trim() === '') {
          continue; // Saltar filas vacías
        }
        
        const initiative = {
          tenant_id: tenantId,
          area_id: area.id,
          created_by: '573d6535-a480-4e75-985b-8820e16437ad', // Usuario de prueba
          title: title.toString().trim(),
          description: row[descriptionKey] ? row[descriptionKey].toString().trim() : null,
          status: parseStatus(row[statusKey]),
          priority: 'medium',
          progress: parseProgress(row[progressKey]),
          budget: parseBudget(row[budgetKey]),
          target_date: getTargetDate(),
          metadata: {
            source: 'OKRFull.xlsx',
            sheet: sheetName,
            row_index: i + 1,
            original_data: row
          }
        };
        
        console.log(`  📝 ${i + 1}. ${initiative.title} (${initiative.progress}%)`);
        
        // Insertar en la base de datos
        const { error: insertError } = await supabase
          .from('initiatives')
          .insert(initiative);
        
        if (insertError) {
          console.error(`❌ Error insertando iniciativa: ${insertError.message}`);
        } else {
          totalInitiatives++;
        }
      }
    }
    
    console.log(`\n🎉 Procesamiento completado!`);
    console.log(`📊 Total de iniciativas procesadas: ${totalInitiatives}`);
    
    // Verificar los datos insertados
    const { data: verifyData, error: verifyError } = await supabase
      .from('initiatives')
      .select('id, title, area_id, progress, budget')
      .eq('tenant_id', tenantId);
    
    if (verifyError) {
      console.error('❌ Error verificando datos:', verifyError.message);
    } else {
      console.log(`✅ Verificación: ${verifyData.length} iniciativas en la base de datos`);
    }
    
  } catch (error) {
    console.error('❌ Error procesando archivo:', error.message);
  }
}

// Funciones auxiliares
function parseStatus(statusValue) {
  if (!statusValue) return 'planning';
  
  const status = statusValue.toString().toLowerCase();
  if (status.includes('progreso') || status.includes('progress')) return 'in_progress';
  if (status.includes('completado') || status.includes('complete')) return 'completed';
  if (status.includes('pausa') || status.includes('hold')) return 'on_hold';
  
  return 'planning';
}

function parseProgress(progressValue) {
  if (!progressValue) return 0;
  
  const progress = progressValue.toString().replace('%', '').replace(',', '.');
  const parsed = parseFloat(progress);
  
  return isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), 100);
}

function parseBudget(budgetValue) {
  if (!budgetValue) return null;
  
  const budget = budgetValue.toString()
    .replace(/[$,]/g, '')
    .replace(/[^\d.]/g, '');
  
  const parsed = parseFloat(budget);
  return isNaN(parsed) ? null : parsed;
}

function getTargetDate() {
  // Establecer fecha objetivo a fin de año
  const now = new Date();
  return new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
}

// Ejecutar el script
if (require.main === module) {
  processOKRFile();
}

module.exports = { processOKRFile };