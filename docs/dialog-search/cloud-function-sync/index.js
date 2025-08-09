/**
 * Cloud Function para sincronizar Supabase con BigQuery
 * Deploy: gcloud functions deploy syncSupabaseToBigQuery
 */

const { BigQuery } = require('@google-cloud/bigquery');
const { createClient } = require('@supabase/supabase-js');

// Configuración
const CONFIG = {
  bigquery: {
    projectId: process.env.GCLOUD_PROJECT || 'insaight-backend',
    datasetId: 'gestion_iniciativas',
    tableId: 'iniciativas'
  },
  supabase: {
    url: process.env.SUPABASE_URL || 'https://zkkdnslupqnpioltjpeu.supabase.co',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
  },
  webhook: {
    secret: process.env.WEBHOOK_SECRET
  }
};

// Cliente de BigQuery
const bigquery = new BigQuery({
  projectId: CONFIG.bigquery.projectId
});

// Cliente de Supabase (para sincronización completa)
const supabase = CONFIG.supabase.serviceKey ? 
  createClient(CONFIG.supabase.url, CONFIG.supabase.serviceKey) : null;

/**
 * Mapear datos de Supabase a esquema de BigQuery
 */
function mapInitiativeToBigQuery(initiative, area, user) {
  return {
    iniciativa_id: initiative.id,
    nombre_iniciativa: initiative.title || '',
    descripcion: initiative.description || '',
    area_responsable: area?.name || 'Sin área',
    responsable_directo: user?.full_name || 'Sin asignar',
    fecha_inicio: initiative.start_date || new Date().toISOString().split('T')[0],
    fecha_fin_estimada: initiative.target_date || null,
    fecha_fin_real: initiative.completion_date || null,
    estado: mapStatus(initiative.status),
    progreso_actual: initiative.progress || 0,
    presupuesto_asignado: parseFloat(initiative.budget) || 0,
    costo_real: parseFloat(initiative.actual_cost) || 0,
    resumen_resultados: initiative.results_summary || '',
    lecciones_aprendidas: initiative.lessons_learned || ''
  };
}

/**
 * Mapear estados
 */
function mapStatus(status) {
  const statusMap = {
    'planning': 'Planificación',
    'in_progress': 'En Progreso',
    'completed': 'Completado',
    'on_hold': 'En Pausa',
    'cancelled': 'Cancelado'
  };
  return statusMap[status] || status;
}

/**
 * Función principal de Cloud Function
 */
exports.syncSupabaseToBigQuery = async (req, res) => {
  // Verificar método
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar autenticación solo para POST
  if (req.method === 'POST') {
    const authHeader = req.headers.authorization;
    if (CONFIG.webhook.secret && authHeader !== `Bearer ${CONFIG.webhook.secret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }
  
  // Para GET, verificar token en query string
  if (req.method === 'GET') {
    const token = req.query.token || req.query.auth;
    if (CONFIG.webhook.secret && token !== CONFIG.webhook.secret) {
      return res.status(401).json({ error: 'Unauthorized - provide ?token=YOUR_TOKEN' });
    }
  }

  try {
    const dataset = bigquery.dataset(CONFIG.bigquery.datasetId);
    const table = dataset.table(CONFIG.bigquery.tableId);

    // POST: Webhook de Supabase
    if (req.method === 'POST') {
      const { type, record, old_record, table: tableName } = req.body;

      // Validar tabla
      if (tableName !== 'initiatives') {
        return res.json({ 
          message: 'Table not configured for sync',
          table: tableName 
        });
      }

      console.log(`Processing ${type} for initiative:`, record?.id || old_record?.id);

      switch (type) {
        case 'INSERT':
        case 'UPDATE':
          // Para simplificar, usamos los datos directos del webhook
          // En producción, podrías hacer una consulta adicional a Supabase
          const bigqueryRecord = mapInitiativeToBigQuery(
            record,
            record.areas || {},
            record.user_profiles || {}
          );

          if (type === 'UPDATE') {
            // Eliminar registro existente
            await bigquery.query({
              query: `
                DELETE FROM \`${CONFIG.bigquery.projectId}.${CONFIG.bigquery.datasetId}.${CONFIG.bigquery.tableId}\`
                WHERE iniciativa_id = @iniciativaId
              `,
              params: { iniciativaId: bigqueryRecord.iniciativa_id }
            });
          }

          // Insertar registro
          await table.insert([bigqueryRecord]);
          console.log(`${type} successful for:`, bigqueryRecord.iniciativa_id);
          break;

        case 'DELETE':
          // Eliminar de BigQuery
          await bigquery.query({
            query: `
              DELETE FROM \`${CONFIG.bigquery.projectId}.${CONFIG.bigquery.datasetId}.${CONFIG.bigquery.tableId}\`
              WHERE iniciativa_id = @iniciativaId
            `,
            params: { iniciativaId: old_record.id }
          });
          console.log('DELETE successful for:', old_record.id);
          break;

        default:
          return res.status(400).json({ 
            error: 'Unknown webhook type',
            type: type 
          });
      }

      // Opcionalmente, trigger reindexación de Vertex AI
      if (process.env.AUTO_REINDEX === 'true') {
        await triggerVertexReindex();
      }

      return res.json({
        success: true,
        message: `${type} operation synced to BigQuery`,
        initiativeId: record?.id || old_record?.id
      });
    }

    // GET: Sincronización completa
    if (req.method === 'GET') {
      if (!supabase) {
        return res.status(500).json({ 
          error: 'Supabase client not configured for full sync' 
        });
      }

      // Obtener todas las iniciativas
      const { data: initiatives, error } = await supabase
        .from('initiatives')
        .select(`
          *,
          areas (id, name),
          user_profiles!initiatives_created_by_fkey (id, full_name)
        `);

      if (error) {
        throw error;
      }

      // Limpiar tabla
      await bigquery.query({
        query: `DELETE FROM \`${CONFIG.bigquery.projectId}.${CONFIG.bigquery.datasetId}.${CONFIG.bigquery.tableId}\` WHERE 1=1`
      });

      // Insertar todos los registros
      if (initiatives && initiatives.length > 0) {
        const bigqueryRecords = initiatives.map(init => 
          mapInitiativeToBigQuery(init, init.areas, init.user_profiles)
        );
        
        await table.insert(bigqueryRecords);
        console.log(`Full sync: ${bigqueryRecords.length} records`);

        return res.json({
          success: true,
          message: 'Full sync completed',
          recordsSynced: bigqueryRecords.length
        });
      }

      return res.json({
        success: true,
        message: 'No records to sync',
        recordsSynced: 0
      });
    }

  } catch (error) {
    console.error('Sync error:', error);
    return res.status(500).json({ 
      error: 'Sync failed',
      details: error.message 
    });
  }
};

/**
 * Trigger reindexación en Vertex AI Search (stub)
 */
async function triggerVertexReindex() {
  // Implementar llamada a API de Vertex AI Search
  console.log('Vertex AI reindex triggered (not implemented)');
}