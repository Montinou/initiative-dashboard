-- Migración para preparar todas las funciones de logging para webhooks
-- Los webhooks reales se deben configurar en el Dashboard de Supabase

-- Función helper para preparar payload para cualquier tabla
CREATE OR REPLACE FUNCTION public.prepare_webhook_payload()
RETURNS TRIGGER AS $$
DECLARE
  webhook_data JSONB;
  table_info TEXT;
BEGIN
  -- Preparar información de la tabla
  table_info := TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME;
  
  -- Construir payload según la operación
  IF TG_OP = 'DELETE' THEN
    webhook_data := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'old_record', row_to_json(OLD)::jsonb,
      'timestamp', NOW()
    );
  ELSIF TG_OP = 'UPDATE' THEN
    webhook_data := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW)::jsonb,
      'old_record', row_to_json(OLD)::jsonb,
      'timestamp', NOW()
    );
  ELSIF TG_OP = 'INSERT' THEN
    webhook_data := jsonb_build_object(
      'type', TG_OP,
      'table', TG_TABLE_NAME,
      'schema', TG_TABLE_SCHEMA,
      'record', row_to_json(NEW)::jsonb,
      'timestamp', NOW()
    );
  END IF;

  -- Loguear en tabla de auditoría
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
      WHEN TG_OP = 'DELETE' THEN (OLD.id)::TEXT
      ELSE (NEW.id)::TEXT
    END,
    'https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2',
    'pending',
    NOW()
  );

  -- Log para debugging
  RAISE LOG 'Webhook trigger for %.%: % - Record ID: %', 
    TG_TABLE_SCHEMA, 
    TG_TABLE_NAME, 
    TG_OP,
    CASE 
      WHEN TG_OP = 'DELETE' THEN (OLD.id)::TEXT
      ELSE (NEW.id)::TEXT
    END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers para todas las tablas principales
-- 1. Initiatives
DROP TRIGGER IF EXISTS webhook_trigger_initiatives ON public.initiatives;
CREATE TRIGGER webhook_trigger_initiatives
AFTER INSERT OR UPDATE OR DELETE ON public.initiatives
FOR EACH ROW
EXECUTE FUNCTION public.prepare_webhook_payload();

-- 2. Activities
DROP TRIGGER IF EXISTS webhook_trigger_activities ON public.activities;
CREATE TRIGGER webhook_trigger_activities
AFTER INSERT OR UPDATE OR DELETE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.prepare_webhook_payload();

-- 3. Areas
DROP TRIGGER IF EXISTS webhook_trigger_areas ON public.areas;
CREATE TRIGGER webhook_trigger_areas
AFTER INSERT OR UPDATE OR DELETE ON public.areas
FOR EACH ROW
EXECUTE FUNCTION public.prepare_webhook_payload();

-- 4. User Profiles
DROP TRIGGER IF EXISTS webhook_trigger_user_profiles ON public.user_profiles;
CREATE TRIGGER webhook_trigger_user_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.prepare_webhook_payload();

-- 5. Objectives
DROP TRIGGER IF EXISTS webhook_trigger_objectives ON public.objectives;
CREATE TRIGGER webhook_trigger_objectives
AFTER INSERT OR UPDATE OR DELETE ON public.objectives
FOR EACH ROW
EXECUTE FUNCTION public.prepare_webhook_payload();

-- 6. Progress History
DROP TRIGGER IF EXISTS webhook_trigger_progress_history ON public.progress_history;
CREATE TRIGGER webhook_trigger_progress_history
AFTER INSERT OR UPDATE OR DELETE ON public.progress_history
FOR EACH ROW
EXECUTE FUNCTION public.prepare_webhook_payload();

-- 7. Objective Initiatives
DROP TRIGGER IF EXISTS webhook_trigger_objective_initiatives ON public.objective_initiatives;
CREATE TRIGGER webhook_trigger_objective_initiatives
AFTER INSERT OR UPDATE OR DELETE ON public.objective_initiatives
FOR EACH ROW
EXECUTE FUNCTION public.prepare_webhook_payload();

-- 8. Organizations
DROP TRIGGER IF EXISTS webhook_trigger_organizations ON public.organizations;
CREATE TRIGGER webhook_trigger_organizations
AFTER INSERT OR UPDATE OR DELETE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.prepare_webhook_payload();

-- 9. Tenants
DROP TRIGGER IF EXISTS webhook_trigger_tenants ON public.tenants;
CREATE TRIGGER webhook_trigger_tenants
AFTER INSERT OR UPDATE OR DELETE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.prepare_webhook_payload();

-- 10. Invitations
DROP TRIGGER IF EXISTS webhook_trigger_invitations ON public.invitations;
CREATE TRIGGER webhook_trigger_invitations
AFTER INSERT OR UPDATE OR DELETE ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.prepare_webhook_payload();

-- 11. Audit Log (meta!)
DROP TRIGGER IF EXISTS webhook_trigger_audit_log ON public.audit_log;
CREATE TRIGGER webhook_trigger_audit_log
AFTER INSERT OR UPDATE OR DELETE ON public.audit_log
FOR EACH ROW
EXECUTE FUNCTION public.prepare_webhook_payload();

-- Función para obtener configuración de webhooks
CREATE OR REPLACE FUNCTION public.get_all_webhooks_config()
RETURNS TABLE(
  table_name TEXT,
  webhook_name TEXT,
  url TEXT,
  method TEXT,
  headers JSONB,
  events TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.table_name::TEXT,
    ('sync-' || t.table_name)::TEXT as webhook_name,
    'https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2'::TEXT as url,
    'POST'::TEXT as method,
    jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8'
    ) as headers,
    ARRAY['INSERT', 'UPDATE', 'DELETE']::TEXT[] as events
  FROM (
    VALUES 
      ('initiatives'),
      ('activities'),
      ('areas'),
      ('user_profiles'),
      ('objectives'),
      ('progress_history'),
      ('objective_initiatives'),
      ('organizations'),
      ('tenants'),
      ('invitations'),
      ('audit_log')
  ) as t(table_name);
END;
$$ LANGUAGE plpgsql;

-- Mostrar configuración para copiar al Dashboard
SELECT * FROM public.get_all_webhooks_config();

-- Comentario con instrucciones
COMMENT ON FUNCTION public.get_all_webhooks_config() IS '
INSTRUCCIONES PARA CONFIGURAR WEBHOOKS EN DASHBOARD:

1. Ir a: https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/database/hooks

2. Para cada tabla en la lista (ejecutar SELECT * FROM get_all_webhooks_config()):
   
   a) Click en "Create a new hook"
   
   b) Configurar con estos valores:
      - Name: sync-[nombre_tabla]
      - Schema: public
      - Table: [nombre_tabla]
      - Events: ✅ Insert, ✅ Update, ✅ Delete
      - Type: HTTP Request
      - Method: POST
      - URL: https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2
      - Headers:
        Content-Type: application/json
        Authorization: Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8
      - Timeout: 10000
   
   c) Click en "Create webhook"

3. Repetir para todas las tablas:
   - initiatives
   - activities
   - areas
   - user_profiles
   - objectives
   - progress_history
   - objective_initiatives
   - organizations
   - tenants
   - invitations
   - audit_log

4. Verificar que todos estén "Enabled" en el dashboard
';