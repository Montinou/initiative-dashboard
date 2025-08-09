/**
 * BigQuery Sync API
 * Webhook endpoint para sincronizar datos de iniciativas con BigQuery
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { BigQuery } from '@google-cloud/bigquery';

// Configuración de BigQuery
const BIGQUERY_CONFIG = {
  projectId: process.env.GCLOUD_PROJECT_ID || 'insaight-backend',
  datasetId: 'gestion_iniciativas',
  tableId: 'iniciativas',
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS // Opcional: usar service account
};

// Inicializar cliente de BigQuery
function getBigQueryClient() {
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return new BigQuery({
      projectId: BIGQUERY_CONFIG.projectId,
      keyFilename: BIGQUERY_CONFIG.keyFilename
    });
  } else {
    // Usar credenciales por defecto (en Cloud Functions/Run)
    return new BigQuery({
      projectId: BIGQUERY_CONFIG.projectId
    });
  }
}

// Mapear datos de Supabase a esquema de BigQuery
function mapInitiativeToBigQuery(initiative: any, area: any, manager: any) {
  return {
    iniciativa_id: initiative.id,
    nombre_iniciativa: initiative.title,
    descripcion: initiative.description || '',
    area_responsable: area?.name || 'Sin área',
    responsable_directo: manager?.full_name || 'Sin asignar',
    fecha_inicio: initiative.start_date || new Date().toISOString().split('T')[0],
    fecha_fin_estimada: initiative.target_date || null,
    fecha_fin_real: initiative.completion_date || null,
    estado: mapStatus(initiative.status),
    progreso_actual: initiative.progress || 0,
    presupuesto_asignado: initiative.budget || 0,
    costo_real: initiative.actual_cost || 0,
    resumen_resultados: initiative.results_summary || '',
    lecciones_aprendidas: initiative.lessons_learned || ''
  };
}

// Mapear estados de Supabase a BigQuery
function mapStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'planning': 'Planificación',
    'in_progress': 'En Progreso',
    'completed': 'Completado',
    'on_hold': 'En Pausa',
    'cancelled': 'Cancelado'
  };
  return statusMap[status] || status;
}

/**
 * POST /api/sync/bigquery
 * Recibe webhook de Supabase y sincroniza con BigQuery
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar token de seguridad (configurar en Supabase webhook)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.WEBHOOK_SECRET_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parsear el payload del webhook
    const payload = await request.json();
    console.log('Webhook received:', payload.type, payload.table);

    // Validar que es una tabla que nos interesa
    if (payload.table !== 'initiatives') {
      return NextResponse.json({ 
        message: 'Table not configured for sync',
        table: payload.table 
      });
    }

    // Determinar la acción
    const { type, record, old_record } = payload;
    
    const bigquery = getBigQueryClient();
    const dataset = bigquery.dataset(BIGQUERY_CONFIG.datasetId);
    const table = dataset.table(BIGQUERY_CONFIG.tableId);

    let result;

    switch (type) {
      case 'INSERT':
      case 'UPDATE':
        // Obtener datos adicionales de Supabase si es necesario
        const supabase = await createClient();
        
        // Obtener información del área y responsable
        const { data: fullInitiative } = await supabase
          .from('initiatives')
          .select(`
            *,
            areas!initiatives_area_id_fkey (
              id,
              name
            ),
            user_profiles!initiatives_created_by_fkey (
              id,
              full_name
            )
          `)
          .eq('id', record.id)
          .single();

        if (!fullInitiative) {
          throw new Error('Initiative not found');
        }

        // Mapear datos
        const bigqueryRecord = mapInitiativeToBigQuery(
          fullInitiative,
          fullInitiative.areas,
          fullInitiative.user_profiles
        );

        // Insertar o actualizar en BigQuery
        if (type === 'INSERT') {
          [result] = await table.insert([bigqueryRecord]);
          console.log('Inserted to BigQuery:', bigqueryRecord.iniciativa_id);
        } else {
          // Para UPDATE, primero intentar eliminar el registro existente
          const deleteQuery = `
            DELETE FROM \`${BIGQUERY_CONFIG.projectId}.${BIGQUERY_CONFIG.datasetId}.${BIGQUERY_CONFIG.tableId}\`
            WHERE iniciativa_id = @iniciativaId
          `;
          
          await bigquery.query({
            query: deleteQuery,
            params: { iniciativaId: bigqueryRecord.iniciativa_id }
          });
          
          // Luego insertar el registro actualizado
          [result] = await table.insert([bigqueryRecord]);
          console.log('Updated in BigQuery:', bigqueryRecord.iniciativa_id);
        }
        break;

      case 'DELETE':
        // Eliminar de BigQuery
        const deleteQuery = `
          DELETE FROM \`${BIGQUERY_CONFIG.projectId}.${BIGQUERY_CONFIG.datasetId}.${BIGQUERY_CONFIG.tableId}\`
          WHERE iniciativa_id = @iniciativaId
        `;
        
        [result] = await bigquery.query({
          query: deleteQuery,
          params: { iniciativaId: old_record.id }
        });
        
        console.log('Deleted from BigQuery:', old_record.id);
        break;

      default:
        return NextResponse.json({ 
          error: 'Unknown webhook type',
          type: type 
        }, { status: 400 });
    }

    // Si llegamos aquí, la sincronización fue exitosa
    // Opcionalmente, reiniciar la importación en Vertex AI Search
    if (process.env.AUTO_REINDEX_VERTEX === 'true') {
      await triggerVertexReindex();
    }

    return NextResponse.json({
      success: true,
      message: `Successfully synced ${type} operation to BigQuery`,
      initiativeId: record?.id || old_record?.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('BigQuery sync error:', error);
    return NextResponse.json(
      { 
        error: 'Sync failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync/bigquery
 * Sincronización manual completa
 */
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación básica
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    if (token !== process.env.SYNC_API_TOKEN) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = await createClient();
    const bigquery = getBigQueryClient();
    
    // Obtener todas las iniciativas de Supabase
    const { data: initiatives, error } = await supabase
      .from('initiatives')
      .select(`
        *,
        areas!initiatives_area_id_fkey (
          id,
          name
        ),
        user_profiles!initiatives_created_by_fkey (
          id,
          full_name
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    // Limpiar tabla de BigQuery
    const dataset = bigquery.dataset(BIGQUERY_CONFIG.datasetId);
    const table = dataset.table(BIGQUERY_CONFIG.tableId);
    
    const deleteAllQuery = `
      DELETE FROM \`${BIGQUERY_CONFIG.projectId}.${BIGQUERY_CONFIG.datasetId}.${BIGQUERY_CONFIG.tableId}\`
      WHERE 1=1
    `;
    
    await bigquery.query(deleteAllQuery);
    console.log('Cleared BigQuery table');

    // Mapear e insertar todos los registros
    const bigqueryRecords = initiatives.map(init => 
      mapInitiativeToBigQuery(init, init.areas, init.user_profiles)
    );

    if (bigqueryRecords.length > 0) {
      await table.insert(bigqueryRecords);
      console.log(`Inserted ${bigqueryRecords.length} records to BigQuery`);
    }

    // Trigger reindexación si está configurado
    if (process.env.AUTO_REINDEX_VERTEX === 'true') {
      await triggerVertexReindex();
    }

    return NextResponse.json({
      success: true,
      message: 'Full sync completed',
      recordsSynced: bigqueryRecords.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Full sync error:', error);
    return NextResponse.json(
      { 
        error: 'Full sync failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Trigger reindexación en Vertex AI Search
 */
async function triggerVertexReindex() {
  try {
    const projectNumber = '30705406738';
    const location = 'global';
    const dataStoreId = 'iniciativas-knowledge-base';
    
    // Aquí podrías implementar la llamada a la API de Vertex AI
    // para reiniciar la importación desde BigQuery
    console.log('Vertex AI reindex triggered (not implemented)');
    
    // Por ahora solo logueamos, pero podrías usar:
    // - Google Auth Library para obtener token
    // - Fetch para llamar a la API de import
    
  } catch (error) {
    console.error('Failed to trigger Vertex reindex:', error);
  }
}