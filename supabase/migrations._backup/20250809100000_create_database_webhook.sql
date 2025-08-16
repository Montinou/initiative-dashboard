-- Crear Database Webhook usando la API nativa de Supabase
-- Este webhook se ejecuta a nivel de base de datos y es más confiable que pg_net

-- Primero, limpiar webhooks anteriores si existen
DROP TRIGGER IF EXISTS sync_initiatives_to_bigquery ON public.initiatives;
DROP FUNCTION IF EXISTS public.sync_initiative_to_bigquery();

-- Crear función simplificada para preparar el payload
CREATE OR REPLACE FUNCTION public.prepare_bigquery_payload()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo loguear, el webhook real se configura en Supabase Dashboard
  IF TG_OP = 'INSERT' THEN
    RAISE LOG 'Initiative inserted: %', NEW.id;
  ELSIF TG_OP = 'UPDATE' THEN
    RAISE LOG 'Initiative updated: %', NEW.id;
  ELSIF TG_OP = 'DELETE' THEN
    RAISE LOG 'Initiative deleted: %', OLD.id;
  END IF;

  -- Actualizar audit log localmente
  INSERT INTO public.webhook_audit_log (
    table_name, 
    operation, 
    record_id, 
    webhook_url,
    status,
    created_at
  )
  VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT
      ELSE NEW.id::TEXT
    END,
    'https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQuery',
    'pending',
    NOW()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para logging local
CREATE TRIGGER log_bigquery_sync
AFTER INSERT OR UPDATE OR DELETE ON public.initiatives
FOR EACH ROW
EXECUTE FUNCTION public.prepare_bigquery_payload();

-- Agregar comentario para documentación
COMMENT ON TRIGGER log_bigquery_sync ON public.initiatives IS 
'Logs changes for BigQuery sync. Actual webhook configured via Supabase Dashboard';

-- Crear función helper para configuración manual del webhook
CREATE OR REPLACE FUNCTION public.get_webhook_config()
RETURNS TABLE(
  webhook_name TEXT,
  url TEXT,
  method TEXT,
  headers JSONB,
  events TEXT[],
  table_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'bigquery-sync'::TEXT as webhook_name,
    'https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQuery'::TEXT as url,
    'POST'::TEXT as method,
    jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8'
    ) as headers,
    ARRAY['INSERT', 'UPDATE', 'DELETE']::TEXT[] as events,
    'initiatives'::TEXT as table_name;
END;
$$ LANGUAGE plpgsql;

-- Instrucciones para configurar el webhook en Supabase Dashboard
COMMENT ON FUNCTION public.get_webhook_config() IS '
Para configurar el webhook en Supabase Dashboard:

1. Ir a https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/database/hooks
2. Click en "Create a new hook"
3. Configurar con estos valores (ejecutar SELECT * FROM get_webhook_config() para verlos):
   - Name: bigquery-sync
   - Table: initiatives
   - Events: Insert, Update, Delete
   - Type: HTTP Request
   - Method: POST
   - URL: https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQuery
   - Headers: 
     Content-Type: application/json
     Authorization: Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8
4. Click en "Create webhook"
';

-- Mostrar la configuración para copiar fácilmente
SELECT * FROM public.get_webhook_config();