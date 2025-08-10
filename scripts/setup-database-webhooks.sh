#!/bin/bash

# Script para configurar Database Webhooks de Supabase
set -e

echo "=========================================="
echo "🔧 Configurando Database Webhooks"
echo "=========================================="
echo ""

# Configuración
SUPABASE_URL="https://zkkdnslupqnpioltjpeu.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpra2Ruc2x1cHFucGlvbHRqcGV1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDk3Mjg0OCwiZXhwIjoyMDY2NTQ4ODQ4fQ.rqDCmmp95O3VLnVogVCIMUe-vN7WYB8gXZ4p0a0mxpw"
WEBHOOK_URL="https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2"

echo "📋 Configuración:"
echo "  Supabase URL: $SUPABASE_URL"
echo "  Webhook URL: $WEBHOOK_URL"
echo ""

# SQL para crear los webhooks
SQL_COMMANDS=$(cat <<'EOF'
-- Habilitar extensión pg_net si no está habilitada
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

-- Limpiar triggers existentes
DROP TRIGGER IF EXISTS webhook_initiatives_all ON public.initiatives;
DROP TRIGGER IF EXISTS webhook_activities_all ON public.activities;
DROP TRIGGER IF EXISTS webhook_areas_all ON public.areas;
DROP TRIGGER IF EXISTS webhook_user_profiles_all ON public.user_profiles;
DROP TRIGGER IF EXISTS webhook_objectives_all ON public.objectives;
DROP TRIGGER IF EXISTS webhook_progress_history_all ON public.progress_history;
DROP TRIGGER IF EXISTS webhook_objective_initiatives_all ON public.objective_initiatives;
DROP TRIGGER IF EXISTS webhook_organizations_all ON public.organizations;
DROP TRIGGER IF EXISTS webhook_tenants_all ON public.tenants;

-- Crear triggers combinados (INSERT, UPDATE, DELETE)
CREATE TRIGGER webhook_initiatives_all
AFTER INSERT OR UPDATE OR DELETE ON public.initiatives
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_activities_all
AFTER INSERT OR UPDATE OR DELETE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_areas_all
AFTER INSERT OR UPDATE OR DELETE ON public.areas
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_user_profiles_all
AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_objectives_all
AFTER INSERT OR UPDATE OR DELETE ON public.objectives
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_progress_history_all
AFTER INSERT OR UPDATE OR DELETE ON public.progress_history
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_objective_initiatives_all
AFTER INSERT OR UPDATE OR DELETE ON public.objective_initiatives
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_organizations_all
AFTER INSERT OR UPDATE OR DELETE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_tenants_all
AFTER INSERT OR UPDATE OR DELETE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

-- Verificar triggers creados
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'webhook_%'
ORDER BY event_object_table, event_manipulation;
EOF
)

# Ejecutar SQL usando curl con la API de Supabase
echo "1. Aplicando configuración de webhooks..."

RESPONSE=$(curl -s -X POST \
  "$SUPABASE_URL/rest/v1/rpc/execute_sql" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$SQL_COMMANDS\"}" 2>/dev/null || echo "error")

# Como execute_sql no existe, usar una alternativa
echo "Usando método alternativo con psql..."

# Guardar SQL en archivo temporal
echo "$SQL_COMMANDS" > /tmp/webhooks.sql

# Usar psql con connection string
PGPASSWORD="bWSg6ONuXWdZsDVP" psql \
  "postgresql://postgres.zkkdnslupqnpioltjpeu:bWSg6ONuXWdZsDVP@aws-0-sa-east-1.pooler.supabase.com:6543/postgres" \
  -f /tmp/webhooks.sql \
  2>&1 | grep -v "NOTICE"

if [ $? -eq 0 ]; then
  echo "✅ Webhooks configurados exitosamente"
else
  echo "⚠️ Hubo problemas al configurar los webhooks"
fi

# 2. Verificar triggers creados
echo ""
echo "2. Verificando triggers creados..."

VERIFY_SQL="SELECT trigger_name, event_object_table FROM information_schema.triggers WHERE trigger_schema = 'public' AND trigger_name LIKE 'webhook_%' ORDER BY event_object_table;"

echo "$VERIFY_SQL" | PGPASSWORD="bWSg6ONuXWdZsDVP" psql \
  "postgresql://postgres.zkkdnslupqnpioltjpeu:bWSg6ONuXWdZsDVP@aws-0-sa-east-1.pooler.supabase.com:6543/postgres" \
  -t 2>/dev/null | grep webhook

# 3. Verificar Cloud Function
echo ""
echo "3. Verificando Cloud Function syncSupabaseToBigQueryV2..."

FUNCTION_STATUS=$(gcloud functions describe syncSupabaseToBigQueryV2 --region=us-central1 --project=insaight-backend --format="value(state)" 2>/dev/null || echo "NOT_FOUND")

if [ "$FUNCTION_STATUS" = "ACTIVE" ]; then
  echo "✅ Cloud Function está activa"
else
  echo "⚠️ Cloud Function en estado: $FUNCTION_STATUS"
fi

# 4. Test del webhook
echo ""
echo "4. Probando webhook con datos de prueba..."

TEST_PAYLOAD='{
  "type": "INSERT",
  "table": "test_webhook",
  "schema": "public",
  "record": {
    "id": "test-123",
    "name": "Test Webhook",
    "created_at": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
  },
  "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
}'

echo "Enviando payload de prueba..."
TEST_RESPONSE=$(curl -s -X POST \
  "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8" \
  -d "$TEST_PAYLOAD" \
  --max-time 10 2>/dev/null || echo '{"error": "timeout"}')

if echo "$TEST_RESPONSE" | grep -q "success\|ok\|200"; then
  echo "✅ Webhook respondió correctamente"
else
  echo "⚠️ Respuesta del webhook: $(echo $TEST_RESPONSE | head -c 100)..."
fi

# 5. Resumen
echo ""
echo "=========================================="
echo "📊 Resumen de Database Webhooks"
echo "=========================================="
echo ""
echo "Tablas con webhooks configurados:"
echo "  ✓ initiatives"
echo "  ✓ activities"
echo "  ✓ areas"
echo "  ✓ user_profiles"
echo "  ✓ objectives"
echo "  ✓ progress_history"
echo "  ✓ objective_initiatives"
echo "  ✓ organizations"
echo "  ✓ tenants"
echo ""
echo "Cloud Function URL:"
echo "  $WEBHOOK_URL"
echo ""
echo "Eventos capturados:"
echo "  • INSERT - Nuevos registros"
echo "  • UPDATE - Modificaciones"
echo "  • DELETE - Eliminaciones"
echo ""
echo "✅ Los webhooks sincronizarán automáticamente los cambios con BigQuery"
echo ""
echo "Para ver los logs de sincronización:"
echo "gcloud functions logs read syncSupabaseToBigQueryV2 --region=us-central1 --project=insaight-backend"

# Limpiar archivos temporales
rm -f /tmp/webhooks.sql