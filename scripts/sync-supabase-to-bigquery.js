#!/usr/bin/env node

/**
 * Script para sincronizar datos de Supabase a BigQuery
 * Ejecuta manualmente la sincronización de todas las tablas necesarias
 */

const { createClient } = require('@supabase/supabase-js');
const { BigQuery } = require('@google-cloud/bigquery');
require('dotenv').config({ path: '.env.local' });

// Configuración
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'insaight-backend';
const DATASET_ID = 'gestion_iniciativas';

// Inicializar clientes
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const bigquery = new BigQuery({ projectId: PROJECT_ID });

// Tablas a sincronizar
const TABLES_TO_SYNC = [
  'initiatives',
  'areas',
  'objectives',
  'activities',
  'user_profiles',
  'tenants',
  'organizations',
  'progress_history',
  'audit_log',
  'objective_initiatives'
];

async function syncTable(tableName) {
  console.log(`📊 Sincronizando tabla: ${tableName}...`);
  
  try {
    // 1. Obtener datos de Supabase
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) {
      console.error(`❌ Error obteniendo datos de ${tableName}:`, error);
      return false;
    }
    
    console.log(`✅ Obtenidos ${data.length} registros de ${tableName}`);
    
    if (data.length === 0) {
      console.log(`⚠️ No hay datos en ${tableName}, saltando...`);
      return true;
    }
    
    // 2. Preparar el dataset en BigQuery
    const dataset = bigquery.dataset(DATASET_ID);
    const table = dataset.table(tableName);
    
    // 3. Verificar si la tabla existe
    const [tableExists] = await table.exists();
    
    if (tableExists) {
      // Truncar la tabla existente
      console.log(`🗑️ Limpiando tabla existente ${tableName}...`);
      await bigquery.query({
        query: `TRUNCATE TABLE \`${PROJECT_ID}.${DATASET_ID}.${tableName}\``,
        location: 'US',
      });
    } else {
      // Crear la tabla con el esquema automático
      console.log(`📝 Creando tabla ${tableName}...`);
      await table.create({
        schema: generateSchemaFromData(data[0]),
      });
    }
    
    // 4. Preparar datos para BigQuery (convertir objetos JSON a strings)
    const processedData = data.map(row => {
      const processedRow = {};
      for (const [key, value] of Object.entries(row)) {
        if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
          // Convert JSON objects to strings
          processedRow[key] = JSON.stringify(value);
        } else {
          processedRow[key] = value;
        }
      }
      return processedRow;
    });
    
    // 5. Insertar datos en BigQuery
    console.log(`📥 Insertando datos en BigQuery...`);
    await table.insert(processedData);
    
    console.log(`✅ Tabla ${tableName} sincronizada exitosamente\n`);
    return true;
    
  } catch (error) {
    console.error(`❌ Error sincronizando ${tableName}:`, error.message);
    return false;
  }
}

function generateSchemaFromData(sample) {
  const schema = [];
  
  for (const [key, value] of Object.entries(sample)) {
    let type = 'STRING';
    let mode = value === null ? 'NULLABLE' : 'REQUIRED';
    
    if (typeof value === 'number') {
      type = Number.isInteger(value) ? 'INTEGER' : 'FLOAT';
    } else if (typeof value === 'boolean') {
      type = 'BOOLEAN';
    } else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)) && value.includes('-'))) {
      type = 'TIMESTAMP';
    } else if (typeof value === 'object' && value !== null) {
      // Convert JSON to STRING for BigQuery compatibility
      type = 'STRING';
    }
    
    // Make all fields nullable for flexibility
    mode = 'NULLABLE';
    
    schema.push({
      name: key,
      type: type,
      mode: mode
    });
  }
  
  return schema;
}

async function createViews() {
  console.log('🔧 Creando vistas adicionales y relacionadas...');
  
  const views = [
    {
      name: 'Initiatives',
      query: `CREATE OR REPLACE VIEW \`${PROJECT_ID}.${DATASET_ID}.Initiatives\` AS SELECT * FROM \`${PROJECT_ID}.${DATASET_ID}.initiatives\``
    },
    {
      name: 'Areas',
      query: `CREATE OR REPLACE VIEW \`${PROJECT_ID}.${DATASET_ID}.Areas\` AS SELECT * FROM \`${PROJECT_ID}.${DATASET_ID}.areas\``
    },
    {
      name: 'Objectives',
      query: `CREATE OR REPLACE VIEW \`${PROJECT_ID}.${DATASET_ID}.Objectives\` AS SELECT * FROM \`${PROJECT_ID}.${DATASET_ID}.objectives\``
    },
    {
      name: 'Activities',
      query: `CREATE OR REPLACE VIEW \`${PROJECT_ID}.${DATASET_ID}.Activities\` AS SELECT * FROM \`${PROJECT_ID}.${DATASET_ID}.activities\``
    },
    {
      name: 'initiatives_with_objectives',
      query: `CREATE OR REPLACE VIEW \`${PROJECT_ID}.${DATASET_ID}.initiatives_with_objectives\` AS 
        SELECT 
          i.*,
          o.id as objective_id,
          o.title as objective_title,
          o.description as objective_description,
          o.progress as objective_progress
        FROM \`${PROJECT_ID}.${DATASET_ID}.initiatives\` i
        LEFT JOIN \`${PROJECT_ID}.${DATASET_ID}.objective_initiatives\` oi ON i.id = oi.initiative_id
        LEFT JOIN \`${PROJECT_ID}.${DATASET_ID}.objectives\` o ON oi.objective_id = o.id`
    },
    {
      name: 'activities_with_initiatives',
      query: `CREATE OR REPLACE VIEW \`${PROJECT_ID}.${DATASET_ID}.activities_with_initiatives\` AS 
        SELECT 
          a.*,
          i.title as initiative_title,
          i.area_id,
          i.progress as initiative_progress,
          ar.name as area_name
        FROM \`${PROJECT_ID}.${DATASET_ID}.activities\` a
        LEFT JOIN \`${PROJECT_ID}.${DATASET_ID}.initiatives\` i ON a.initiative_id = i.id
        LEFT JOIN \`${PROJECT_ID}.${DATASET_ID}.areas\` ar ON i.area_id = ar.id`
    },
    {
      name: 'objectives_full_view',
      query: `CREATE OR REPLACE VIEW \`${PROJECT_ID}.${DATASET_ID}.objectives_full_view\` AS 
        SELECT 
          o.id,
          o.tenant_id,
          o.title,
          o.description,
          o.area_id,
          o.created_by,
          o.created_at,
          o.updated_at,
          o.quarter,
          o.priority,
          o.status,
          o.progress,
          o.target_date,
          COUNT(DISTINCT oi.initiative_id) as initiative_count,
          AVG(i.progress) as avg_initiative_progress,
          COUNT(DISTINCT a.id) as total_activities,
          COUNT(DISTINCT CASE WHEN a.is_completed = true THEN a.id END) as completed_activities
        FROM \`${PROJECT_ID}.${DATASET_ID}.objectives\` o
        LEFT JOIN \`${PROJECT_ID}.${DATASET_ID}.objective_initiatives\` oi ON o.id = oi.objective_id
        LEFT JOIN \`${PROJECT_ID}.${DATASET_ID}.initiatives\` i ON oi.initiative_id = i.id
        LEFT JOIN \`${PROJECT_ID}.${DATASET_ID}.activities\` a ON i.id = a.initiative_id
        GROUP BY o.id, o.tenant_id, o.title, o.description, o.area_id, o.created_by, 
                 o.created_at, o.updated_at, o.quarter, o.priority, o.status, o.progress, 
                 o.target_date`
    }
  ];
  
  for (const view of views) {
    try {
      await bigquery.query({
        query: view.query,
        location: 'US',
      });
      console.log(`✅ Vista ${view.name} creada`);
    } catch (error) {
      console.log(`⚠️ Error creando vista ${view.name}:`, error.message);
    }
  }
}

async function main() {
  console.log('🚀 Iniciando sincronización Supabase → BigQuery\n');
  console.log(`📍 Proyecto: ${PROJECT_ID}`);
  console.log(`📂 Dataset: ${DATASET_ID}`);
  console.log(`🔗 Supabase: ${SUPABASE_URL}\n`);
  
  const results = [];
  
  for (const tableName of TABLES_TO_SYNC) {
    const success = await syncTable(tableName);
    results.push({ table: tableName, success });
  }
  
  // Crear vistas con nombres en mayúscula para compatibilidad
  await createViews();
  
  // Resumen
  console.log('\n📊 Resumen de sincronización:');
  console.log('================================');
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Exitosas: ${successful.length}/${results.length}`);
  if (successful.length > 0) {
    successful.forEach(r => console.log(`   - ${r.table}`));
  }
  
  if (failed.length > 0) {
    console.log(`\n❌ Fallidas: ${failed.length}`);
    failed.forEach(r => console.log(`   - ${r.table}`));
  }
  
  console.log('\n✨ Sincronización completada!');
  
  // Ejecutar consulta de prueba
  console.log('\n🧪 Ejecutando consulta de prueba...');
  const [rows] = await bigquery.query({
    query: `SELECT COUNT(*) as total FROM \`${PROJECT_ID}.${DATASET_ID}.initiatives\``,
    location: 'US',
  });
  console.log(`📊 Total de iniciativas en BigQuery: ${rows[0].total}`);
}

// Ejecutar
main().catch(console.error);