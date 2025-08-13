-- Migración para crear Database Webhooks usando pg_net
-- Estos webhooks enviarán datos a BigQuery mediante Cloud Function

-- Habilitar extensión pg_net para webhooks HTTP
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Crear función principal para enviar webhooks
CREATE OR REPLACE FUNCTION public.send_webhook_to_bigquery()
RETURNS TRIGGER AS $$
DECLARE
  request_id BIGINT;
  payload JSONB;
BEGIN
  -- Construir el payload
  payload := jsonb_build_object(
    'type', TG_OP,
    'table', TG_TABLE_NAME,
    'schema', TG_TABLE_SCHEMA,
    'record', CASE 
      WHEN TG_OP = 'DELETE' THEN row_to_json(OLD)::jsonb
      ELSE row_to_json(NEW)::jsonb
    END,
    'old_record', CASE 
      WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD)::jsonb
      ELSE NULL
    END,
    'timestamp', NOW(),
    'user', current_user
  );

  -- Enviar webhook asíncrono usando pg_net
  SELECT net.http_post(
    url := 'https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8',
      'X-Supabase-Event', TG_OP,
      'X-Supabase-Table', TG_TABLE_NAME
    ),
    body := payload::text,
    timeout_milliseconds := 10000
  ) INTO request_id;

  -- Log del webhook (opcional, para debugging)
  RAISE NOTICE 'Webhook enviado para %.% (%) - Request ID: %', 
    TG_TABLE_SCHEMA, TG_TABLE_NAME, TG_OP, request_id;

  -- Retornar el registro apropiado
  RETURN CASE 
    WHEN TG_OP = 'DELETE' THEN OLD
    ELSE NEW
  END;
END;
$$ LANGUAGE plpgsql;

-- Limpiar triggers antiguos si existen
DO $$ 
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT trigger_name, event_object_table 
    FROM information_schema.triggers 
    WHERE trigger_schema = 'public' 
    AND (trigger_name LIKE 'webhook_%' OR trigger_name LIKE 'http_webhook_%')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', r.trigger_name, r.event_object_table);
    RAISE NOTICE 'Eliminado trigger antiguo: %', r.trigger_name;
  END LOOP;
END $$;

-- Crear triggers para cada tabla principal

-- 1. INITIATIVES
CREATE TRIGGER bigquery_sync_initiatives
AFTER INSERT OR UPDATE OR DELETE ON public.initiatives
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

-- 2. ACTIVITIES
CREATE TRIGGER bigquery_sync_activities
AFTER INSERT OR UPDATE OR DELETE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

-- 3. AREAS
CREATE TRIGGER bigquery_sync_areas
AFTER INSERT OR UPDATE OR DELETE ON public.areas
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

-- 4. USER_PROFILES
CREATE TRIGGER bigquery_sync_user_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

-- 5. OBJECTIVES
CREATE TRIGGER bigquery_sync_objectives
AFTER INSERT OR UPDATE OR DELETE ON public.objectives
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

-- 6. PROGRESS_HISTORY
CREATE TRIGGER bigquery_sync_progress_history
AFTER INSERT OR UPDATE OR DELETE ON public.progress_history
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

-- 7. OBJECTIVE_INITIATIVES
CREATE TRIGGER bigquery_sync_objective_initiatives
AFTER INSERT OR UPDATE OR DELETE ON public.objective_initiatives
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

-- 8. ORGANIZATIONS
CREATE TRIGGER bigquery_sync_organizations
AFTER INSERT OR UPDATE OR DELETE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

-- 9. TENANTS
CREATE TRIGGER bigquery_sync_tenants
AFTER INSERT OR UPDATE OR DELETE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

-- 10. INVITATIONS
CREATE TRIGGER bigquery_sync_invitations
AFTER INSERT OR UPDATE OR DELETE ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

-- 11. AUDIT_LOG
CREATE TRIGGER bigquery_sync_audit_log
AFTER INSERT OR UPDATE OR DELETE ON public.audit_log
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

-- Crear tabla para monitorear webhooks (opcional)
CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT,
  payload JSONB,
  response_status INTEGER,
  response_body TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Índices para mejor performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at ON public.webhook_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_table_name ON public.webhook_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_event_type ON public.webhook_logs(event_type);

-- Función para verificar el estado de pg_net (útil para debugging)
CREATE OR REPLACE FUNCTION public.check_webhook_status()
RETURNS TABLE(
  id BIGINT,
  url TEXT,
  method TEXT,
  status TEXT,
  created TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.url,
    r.method,
    r.status,
    r.created
  FROM net._http_response r
  ORDER BY r.created DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Verificar que los triggers se crearon correctamente
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'bigquery_sync_%';
  
  RAISE NOTICE ' Se crearon % triggers de sincronización con BigQuery', trigger_count;
  RAISE NOTICE '=Ê Los webhooks enviarán datos a: https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2';
  RAISE NOTICE '= Para ver el estado de los webhooks, ejecuta: SELECT * FROM public.check_webhook_status();';
END $$;

-- Crear comentarios en las tablas para documentar
COMMENT ON FUNCTION public.send_webhook_to_bigquery() IS 'Envía cambios de datos a BigQuery mediante webhook HTTP usando pg_net';
COMMENT ON FUNCTION public.check_webhook_status() IS 'Verifica el estado de los últimos 20 webhooks enviados';
COMMENT ON TABLE public.webhook_logs IS 'Registro de webhooks enviados a BigQuery para auditoría y debugging';