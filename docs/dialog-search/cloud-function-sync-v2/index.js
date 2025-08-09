/**
 * Cloud Function v2 para sincronización completa Supabase → BigQuery
 * Maneja todas las tablas del schema público
 */

const { BigQuery } = require('@google-cloud/bigquery');

// Configuración
const CONFIG = {
  bigquery: {
    projectId: process.env.GCLOUD_PROJECT_ID || 'insaight-backend',
    datasetId: process.env.BIGQUERY_DATASET || 'gestion_iniciativas'
  },
  webhook: {
    secret: process.env.WEBHOOK_SECRET || 'sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8'
  }
};

// Mapeo de tablas Supabase → BigQuery
const TABLE_MAPPING = {
  'initiatives': 'iniciativas',
  'activities': 'activities',
  'areas': 'areas',
  'user_profiles': 'user_profiles',
  'objectives': 'objectives',
  'progress_history': 'progress_history',
  'objective_initiatives': 'objective_initiatives',
  'organizations': 'organizaciones',
  'tenants': 'tenants',
  'invitations': 'invitations',
  'audit_log': 'audit_log'
};

// Función para mapear campos específicos por tabla
function mapRecordToBigQuery(tableName, record) {
  // Convertir UUIDs y timestamps a strings
  const mapped = {};
  
  for (const [key, value] of Object.entries(record)) {
    if (value === null || value === undefined) {
      mapped[key] = null;
    } else if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/))) {
      mapped[key] = new Date(value).toISOString();
    } else if (typeof value === 'object') {
      mapped[key] = JSON.stringify(value);
    } else {
      mapped[key] = String(value);
    }
  }
  
  // Mapeos específicos por tabla
  switch(tableName) {
    case 'initiatives':
      return {
        iniciativa_id: mapped.id,
        tenant_id: mapped.tenant_id,
        area_id: mapped.area_id,
        nombre_iniciativa: mapped.title,
        descripcion: mapped.description,
        creado_por: mapped.created_by,
        fecha_inicio: mapped.start_date,
        fecha_fin: mapped.due_date,
        fecha_completado: mapped.completion_date,
        progreso_actual: parseInt(mapped.progress || 0),
        estado: mapped.status,
        fecha_creacion: mapped.created_at,
        fecha_actualizacion: mapped.updated_at
      };
      
    case 'activities':
      return {
        id: mapped.id,
        initiative_id: mapped.initiative_id,
        title: mapped.title,
        description: mapped.description,
        assigned_to: mapped.assigned_to,
        is_completed: mapped.is_completed === 'true',
        created_at: mapped.created_at,
        updated_at: mapped.updated_at
      };
      
    case 'areas':
      return {
        id: mapped.id,
        tenant_id: mapped.tenant_id,
        name: mapped.name,
        description: mapped.description,
        manager_id: mapped.manager_id,
        is_active: mapped.is_active === 'true',
        created_at: mapped.created_at,
        updated_at: mapped.updated_at
      };
      
    case 'user_profiles':
      return {
        id: mapped.id,
        tenant_id: mapped.tenant_id,
        user_id: mapped.user_id,
        email: mapped.email,
        full_name: mapped.full_name,
        role: mapped.role,
        area_id: mapped.area_id,
        avatar_url: mapped.avatar_url,
        phone: mapped.phone,
        is_active: mapped.is_active === 'true',
        is_system_admin: mapped.is_system_admin === 'true',
        last_login: mapped.last_login,
        created_at: mapped.created_at,
        updated_at: mapped.updated_at
      };
      
    case 'objectives':
      return {
        id: mapped.id,
        tenant_id: mapped.tenant_id,
        area_id: mapped.area_id,
        title: mapped.title,
        description: mapped.description,
        created_by: mapped.created_by,
        quarter: mapped.quarter,
        priority: mapped.priority,
        status: mapped.status,
        progress: parseInt(mapped.progress || 0),
        target_date: mapped.target_date,
        metrics: mapped.metrics,
        created_at: mapped.created_at,
        updated_at: mapped.updated_at
      };
      
    case 'progress_history':
      return {
        id: mapped.id,
        initiative_id: mapped.initiative_id,
        completed_activities_count: parseInt(mapped.completed_activities_count || 0),
        total_activities_count: parseInt(mapped.total_activities_count || 0),
        notes: mapped.notes,
        updated_by: mapped.updated_by,
        created_at: mapped.created_at
      };
      
    case 'objective_initiatives':
      return {
        id: mapped.id,
        objective_id: mapped.objective_id,
        initiative_id: mapped.initiative_id
      };
      
    case 'organizations':
      return {
        id: mapped.id,
        name: mapped.name,
        description: mapped.description,
        website: mapped.website,
        subdomain: mapped.subdomain,
        industry: mapped.industry,
        company_size: mapped.company_size,
        timezone: mapped.timezone,
        logo_url: mapped.logo_url,
        primary_color: mapped.primary_color,
        secondary_color: mapped.secondary_color,
        created_at: mapped.created_at,
        updated_at: mapped.updated_at
      };
      
    case 'tenants':
      return {
        id: mapped.id,
        organization_id: mapped.organization_id,
        subdomain: mapped.subdomain,
        created_at: mapped.created_at,
        updated_at: mapped.updated_at
      };
      
    case 'invitations':
      return {
        id: mapped.id,
        tenant_id: mapped.tenant_id,
        email: mapped.email,
        role: mapped.role,
        area_id: mapped.area_id,
        custom_message: mapped.custom_message,
        sent_by: mapped.sent_by,
        token: mapped.token,
        status: mapped.status,
        expires_at: mapped.expires_at,
        accepted_at: mapped.accepted_at,
        accepted_by: mapped.accepted_by,
        reminder_count: parseInt(mapped.reminder_count || 0),
        metadata: mapped.metadata,
        created_at: mapped.created_at,
        updated_at: mapped.updated_at
      };
      
    case 'audit_log':
      return {
        id: mapped.id,
        user_id: mapped.user_id,
        action: mapped.action,
        table_name: mapped.table_name,
        record_id: mapped.record_id,
        old_data: mapped.old_data,
        new_data: mapped.new_data,
        created_at: mapped.created_at
      };
      
    default:
      return mapped;
  }
}

// Función principal
exports.syncSupabaseToBigQuery = async (req, res) => {
  console.log('Webhook recibido:', {
    method: req.method,
    path: req.path,
    headers: req.headers,
    query: req.query
  });

  // Manejo de GET para sincronización manual
  if (req.method === 'GET') {
    const token = req.query.token || req.query.auth;
    if (CONFIG.webhook.secret && token !== CONFIG.webhook.secret) {
      return res.status(401).json({ 
        error: 'Unauthorized - provide ?token=YOUR_TOKEN' 
      });
    }
    
    return res.status(200).json({
      status: 'healthy',
      config: CONFIG,
      tables_supported: Object.keys(TABLE_MAPPING),
      timestamp: new Date().toISOString()
    });
  }

  // Validar método POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed' 
    });
  }

  // Validar autorización
  const authHeader = req.headers.authorization;
  if (CONFIG.webhook.secret && authHeader !== `Bearer ${CONFIG.webhook.secret}`) {
    console.error('Autorización inválida:', authHeader);
    return res.status(401).json({ 
      error: 'Unauthorized' 
    });
  }

  try {
    const payload = req.body;
    console.log('Payload recibido:', JSON.stringify(payload, null, 2));

    // Extraer información del webhook
    const { type, table, record, old_record } = payload;
    
    if (!table || !TABLE_MAPPING[table]) {
      console.log(`Tabla ${table} no soportada para sincronización`);
      return res.status(200).json({ 
        message: `Table ${table} not configured for sync` 
      });
    }

    const bigqueryTable = TABLE_MAPPING[table];
    const bigquery = new BigQuery({ projectId: CONFIG.bigquery.projectId });
    const dataset = bigquery.dataset(CONFIG.bigquery.datasetId);
    const bqTable = dataset.table(bigqueryTable);

    let result;

    switch(type) {
      case 'INSERT':
        const insertData = mapRecordToBigQuery(table, record);
        console.log(`Insertando en ${bigqueryTable}:`, insertData);
        
        await bqTable.insert(insertData);
        result = { action: 'inserted', table: bigqueryTable, id: record.id };
        break;

      case 'UPDATE':
        const updateData = mapRecordToBigQuery(table, record);
        const recordId = record.id;
        
        console.log(`Actualizando ${bigqueryTable} con ID ${recordId}:`, updateData);
        
        // BigQuery no soporta UPDATE directo en streaming, usar MERGE
        const mergeQuery = `
          MERGE \`${CONFIG.bigquery.projectId}.${CONFIG.bigquery.datasetId}.${bigqueryTable}\` T
          USING (SELECT @record AS data) S
          ON T.${bigqueryTable === 'iniciativas' ? 'iniciativa_id' : 'id'} = JSON_VALUE(S.data, '$.${bigqueryTable === 'iniciativas' ? 'iniciativa_id' : 'id'}')
          WHEN MATCHED THEN
            UPDATE SET ${Object.keys(updateData).map(k => `T.${k} = JSON_VALUE(S.data, '$.${k}')`).join(', ')}
          WHEN NOT MATCHED THEN
            INSERT (${Object.keys(updateData).join(', ')})
            VALUES (${Object.keys(updateData).map(k => `JSON_VALUE(S.data, '$.${k}')`).join(', ')})
        `;
        
        const options = {
          query: mergeQuery,
          params: { record: JSON.stringify(updateData) }
        };
        
        const [job] = await bigquery.createQueryJob(options);
        await job.getQueryResults();
        
        result = { action: 'updated', table: bigqueryTable, id: recordId };
        break;

      case 'DELETE':
        const deleteId = old_record?.id || record?.id;
        console.log(`Eliminando de ${bigqueryTable} con ID ${deleteId}`);
        
        const deleteQuery = `
          DELETE FROM \`${CONFIG.bigquery.projectId}.${CONFIG.bigquery.datasetId}.${bigqueryTable}\`
          WHERE ${bigqueryTable === 'iniciativas' ? 'iniciativa_id' : 'id'} = @id
        `;
        
        const deleteOptions = {
          query: deleteQuery,
          params: { id: deleteId }
        };
        
        const [deleteJob] = await bigquery.createQueryJob(deleteOptions);
        await deleteJob.getQueryResults();
        
        result = { action: 'deleted', table: bigqueryTable, id: deleteId };
        break;

      default:
        console.log(`Tipo de operación no soportada: ${type}`);
        return res.status(400).json({ 
          error: `Unsupported operation type: ${type}` 
        });
    }

    console.log('Sincronización exitosa:', result);
    return res.status(200).json({ 
      success: true, 
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en sincronización:', error);
    return res.status(500).json({ 
      error: 'Internal server error', 
      message: error.message,
      details: error.errors || error.stack
    });
  }
};