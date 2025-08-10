#!/usr/bin/env node

/**
 * Script para aplicar Database Webhooks usando Supabase Client
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://zkkdnslupqnpioltjpeu.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function applyWebhooks() {
  console.log('==========================================');
  console.log('🔧 Aplicando Database Webhooks');
  console.log('==========================================\n');

  try {
    // SQL para crear los webhooks
    const sql = `
      -- Habilitar extensión pg_net
      CREATE EXTENSION IF NOT EXISTS pg_net;

      -- Función para crear payload JSON personalizado
      CREATE OR REPLACE FUNCTION public.create_webhook_payload()
      RETURNS TRIGGER AS $$
      DECLARE
        payload JSON;
        record_data JSON;
        old_record_data JSON;
      BEGIN
        -- Preparar datos del registro
        IF TG_OP = 'DELETE' THEN
          old_record_data := row_to_json(OLD);
          record_data := NULL;
        ELSIF TG_OP = 'UPDATE' THEN
          record_data := row_to_json(NEW);
          old_record_data := row_to_json(OLD);
        ELSE -- INSERT
          record_data := row_to_json(NEW);
          old_record_data := NULL;
        END IF;
        
        -- Crear payload
        payload := json_build_object(
          'type', TG_OP,
          'table', TG_TABLE_NAME,
          'schema', TG_TABLE_SCHEMA,
          'record', record_data,
          'old_record', old_record_data,
          'timestamp', NOW()
        );
        
        -- Llamar a la función de webhook
        PERFORM net.http_post(
          url := 'https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2',
          headers := '{"Content-Type": "application/json", "Authorization": "Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8"}'::jsonb,
          body := payload::text,
          timeout_milliseconds := 10000
        );
        
        -- Retornar el valor apropiado
        IF TG_OP = 'DELETE' THEN
          RETURN OLD;
        ELSE
          RETURN NEW;
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `;

    // Lista de tablas para configurar webhooks
    const tables = [
      'initiatives',
      'activities', 
      'areas',
      'user_profiles',
      'objectives',
      'progress_history',
      'objective_initiatives',
      'organizations',
      'tenants'
    ];

    console.log('1. Creando función de webhook...');
    // Nota: Supabase JS Client no soporta ejecutar SQL arbitrario directamente
    // Necesitamos usar la migración de Supabase o conectar con pg directamente
    
    console.log('\n📝 Para aplicar los webhooks, ejecuta la siguiente migración:\n');
    console.log('npx supabase migration new create_webhooks');
    console.log('Luego copia el contenido del archivo:');
    console.log('supabase/migrations/20250809210000_create_database_webhooks_automatically.sql');
    console.log('\nY ejecuta:');
    console.log('npx supabase db push');
    
    console.log('\n✅ Alternativamente, puedes aplicar la migración desde el Dashboard de Supabase:');
    console.log('https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/sql/new');
    
    // Verificar si la Cloud Function existe
    console.log('\n2. Verificando Cloud Function...');
    const testPayload = {
      type: 'TEST',
      table: 'test',
      schema: 'public',
      record: { test: true },
      timestamp: new Date().toISOString()
    };

    const response = await fetch('https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8'
      },
      body: JSON.stringify(testPayload)
    });

    if (response.ok) {
      console.log('✅ Cloud Function syncSupabaseToBigQueryV2 está activa');
    } else {
      console.log('⚠️ Cloud Function respondió con estado:', response.status);
    }

    console.log('\n==========================================');
    console.log('📊 Resumen');
    console.log('==========================================\n');
    console.log('Tablas para webhooks:');
    tables.forEach(table => {
      console.log(`  • ${table}`);
    });
    console.log('\nEventos a capturar:');
    console.log('  • INSERT');
    console.log('  • UPDATE');
    console.log('  • DELETE');
    console.log('\nCloud Function:');
    console.log('  https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Ejecutar
applyWebhooks();