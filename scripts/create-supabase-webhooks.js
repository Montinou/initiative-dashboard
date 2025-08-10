#!/usr/bin/env node

/**
 * Script para crear Database Webhooks en Supabase usando la Management API
 * Estos webhooks SÍ aparecerán en el Dashboard
 */

const SUPABASE_PROJECT_REF = 'zkkdnslupqnpioltjpeu';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw';
const WEBHOOK_URL = 'https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2';

// Tablas para crear webhooks
const tables = [
  { schema: 'public', table: 'initiatives', name: 'Sync Initiatives to BigQuery' },
  { schema: 'public', table: 'activities', name: 'Sync Activities to BigQuery' },
  { schema: 'public', table: 'areas', name: 'Sync Areas to BigQuery' },
  { schema: 'public', table: 'user_profiles', name: 'Sync User Profiles to BigQuery' },
  { schema: 'public', table: 'objectives', name: 'Sync Objectives to BigQuery' },
  { schema: 'public', table: 'progress_history', name: 'Sync Progress History to BigQuery' },
  { schema: 'public', table: 'objective_initiatives', name: 'Sync Objective Initiatives to BigQuery' },
  { schema: 'public', table: 'organizations', name: 'Sync Organizations to BigQuery' },
  { schema: 'public', table: 'tenants', name: 'Sync Tenants to BigQuery' }
];

async function createWebhooks() {
  console.log('========================================');
  console.log('🔧 Creando Database Webhooks en Supabase');
  console.log('========================================\n');

  for (const tableConfig of tables) {
    console.log(`\n📌 Configurando webhook para ${tableConfig.table}...`);
    
    // Configuración del webhook
    const webhookConfig = {
      name: tableConfig.name,
      schema: tableConfig.schema,
      table: tableConfig.table,
      events: ['INSERT', 'UPDATE', 'DELETE'],
      config: {
        url: WEBHOOK_URL,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8'
        },
        timeout_ms: 10000
      },
      enabled: true
    };

    try {
      // Usar la API de Supabase Management
      const response = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/hooks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify(webhookConfig)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Webhook creado para ${tableConfig.table}`);
      } else {
        const error = await response.text();
        console.log(`⚠️ No se pudo crear webhook para ${tableConfig.table}: ${error}`);
        
        // Si la API no funciona, mostrar comando SQL alternativo
        console.log(`   Alternativa: Usa el SQL Editor con este comando:`);
        console.log(`   ${getSQLCommand(tableConfig)}`);
      }
    } catch (error) {
      console.log(`❌ Error creando webhook para ${tableConfig.table}: ${error.message}`);
    }
  }

  console.log('\n========================================');
  console.log('📊 Instrucciones Alternativas');
  console.log('========================================\n');
  
  console.log('Si los webhooks no se crearon automáticamente, puedes crearlos manualmente:\n');
  console.log('1. Ve a: https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/database/hooks');
  console.log('2. Haz clic en "Create a new hook"');
  console.log('3. Para cada tabla, configura:');
  console.log('   - Name: [Nombre descriptivo]');
  console.log('   - Table: [Selecciona la tabla]');
  console.log('   - Events: INSERT, UPDATE, DELETE');
  console.log('   - Type: HTTP Request');
  console.log('   - Method: POST');
  console.log(`   - URL: ${WEBHOOK_URL}`);
  console.log('   - Headers:');
  console.log('     Content-Type: application/json');
  console.log('     Authorization: Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8');
  console.log('   - HTTP Timeout: 10000ms');
  console.log('\n');
  
  // Generar SQL para crear webhooks usando pg_net
  console.log('O ejecuta este SQL en el SQL Editor:\n');
  console.log(generateFullSQL());
}

function getSQLCommand(tableConfig) {
  return `
-- Webhook para ${tableConfig.table}
SELECT
  net.http_post(
    url := '${WEBHOOK_URL}',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8"}'::jsonb,
    body := json_build_object(
      'type', 'webhook_config',
      'table', '${tableConfig.table}',
      'schema', '${tableConfig.schema}',
      'events', ARRAY['INSERT', 'UPDATE', 'DELETE']
    )::text
  );`;
}

function generateFullSQL() {
  return `
-- Habilitar extensión pg_net si no está habilitada
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Crear función para webhooks HTTP
CREATE OR REPLACE FUNCTION public.http_webhook_trigger()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
  webhook_url TEXT := '${WEBHOOK_URL}';
BEGIN
  -- Crear payload
  payload := json_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE 
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)
      ELSE row_to_json(NEW)
    END,
    'old_record', CASE 
      WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)
      ELSE NULL
    END,
    'timestamp', NOW()
  );
  
  -- Enviar webhook
  PERFORM net.http_post(
    url := webhook_url,
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8"}'::jsonb,
    body := payload::text,
    timeout_milliseconds := 10000
  );
  
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

${tables.map(t => `
-- Webhooks para ${t.table}
CREATE TRIGGER http_webhook_${t.table}
AFTER INSERT OR UPDATE OR DELETE ON public.${t.table}
FOR EACH ROW
EXECUTE FUNCTION public.http_webhook_trigger();
`).join('\n')}

-- Verificar triggers creados
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name LIKE 'http_webhook_%';
`;
}

// Ejecutar
createWebhooks().catch(console.error);