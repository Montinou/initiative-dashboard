-- Migración para crear Database Webhooks automáticamente usando supabase_functions.http_request
-- Esto creará los webhooks que aparecerán en el Dashboard de Supabase

-- Primero, verificar que la extensión pg_net esté habilitada
CREATE EXTENSION IF NOT EXISTS pg_net;

-- URL de la Cloud Function
DO $$
DECLARE
  webhook_url TEXT := 'https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2';
  webhook_headers TEXT := '{"Content-Type":"application/json","Authorization":"Bearer sk_webhook_a7f4d2e9c8b3a1f5e2d7c9b4a6f1e3d8"}';
  webhook_timeout TEXT := '10000';
BEGIN
  -- Limpiar triggers existentes si los hay
  DROP TRIGGER IF EXISTS webhook_initiatives_insert ON public.initiatives;
  DROP TRIGGER IF EXISTS webhook_initiatives_update ON public.initiatives;
  DROP TRIGGER IF EXISTS webhook_initiatives_delete ON public.initiatives;
  
  DROP TRIGGER IF EXISTS webhook_activities_insert ON public.activities;
  DROP TRIGGER IF EXISTS webhook_activities_update ON public.activities;
  DROP TRIGGER IF EXISTS webhook_activities_delete ON public.activities;
  
  DROP TRIGGER IF EXISTS webhook_areas_insert ON public.areas;
  DROP TRIGGER IF EXISTS webhook_areas_update ON public.areas;
  DROP TRIGGER IF EXISTS webhook_areas_delete ON public.areas;
  
  DROP TRIGGER IF EXISTS webhook_user_profiles_insert ON public.user_profiles;
  DROP TRIGGER IF EXISTS webhook_user_profiles_update ON public.user_profiles;
  DROP TRIGGER IF EXISTS webhook_user_profiles_delete ON public.user_profiles;
  
  DROP TRIGGER IF EXISTS webhook_objectives_insert ON public.objectives;
  DROP TRIGGER IF EXISTS webhook_objectives_update ON public.objectives;
  DROP TRIGGER IF EXISTS webhook_objectives_delete ON public.objectives;
  
  DROP TRIGGER IF EXISTS webhook_progress_history_insert ON public.progress_history;
  DROP TRIGGER IF EXISTS webhook_progress_history_update ON public.progress_history;
  DROP TRIGGER IF EXISTS webhook_progress_history_delete ON public.progress_history;
  
  DROP TRIGGER IF EXISTS webhook_objective_initiatives_insert ON public.objective_initiatives;
  DROP TRIGGER IF EXISTS webhook_objective_initiatives_update ON public.objective_initiatives;
  DROP TRIGGER IF EXISTS webhook_objective_initiatives_delete ON public.objective_initiatives;
  
  DROP TRIGGER IF EXISTS webhook_organizations_insert ON public.organizations;
  DROP TRIGGER IF EXISTS webhook_organizations_update ON public.organizations;
  DROP TRIGGER IF EXISTS webhook_organizations_delete ON public.organizations;
  
  DROP TRIGGER IF EXISTS webhook_tenants_insert ON public.tenants;
  DROP TRIGGER IF EXISTS webhook_tenants_update ON public.tenants;
  DROP TRIGGER IF EXISTS webhook_tenants_delete ON public.tenants;
  
  DROP TRIGGER IF EXISTS webhook_invitations_insert ON public.invitations;
  DROP TRIGGER IF EXISTS webhook_invitations_update ON public.invitations;
  DROP TRIGGER IF EXISTS webhook_invitations_delete ON public.invitations;
  
  DROP TRIGGER IF EXISTS webhook_audit_log_insert ON public.audit_log;
  DROP TRIGGER IF EXISTS webhook_audit_log_update ON public.audit_log;
  DROP TRIGGER IF EXISTS webhook_audit_log_delete ON public.audit_log;
END $$;

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

-- Crear triggers para cada tabla

-- 1. INITIATIVES
CREATE TRIGGER webhook_initiatives_insert
AFTER INSERT ON public.initiatives
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_initiatives_update
AFTER UPDATE ON public.initiatives
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_initiatives_delete
AFTER DELETE ON public.initiatives
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

-- 2. ACTIVITIES
CREATE TRIGGER webhook_activities_insert
AFTER INSERT ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_activities_update
AFTER UPDATE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_activities_delete
AFTER DELETE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

-- 3. AREAS
CREATE TRIGGER webhook_areas_insert
AFTER INSERT ON public.areas
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_areas_update
AFTER UPDATE ON public.areas
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_areas_delete
AFTER DELETE ON public.areas
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

-- 4. USER_PROFILES
CREATE TRIGGER webhook_user_profiles_insert
AFTER INSERT ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_user_profiles_update
AFTER UPDATE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_user_profiles_delete
AFTER DELETE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

-- 5. OBJECTIVES
CREATE TRIGGER webhook_objectives_insert
AFTER INSERT ON public.objectives
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_objectives_update
AFTER UPDATE ON public.objectives
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_objectives_delete
AFTER DELETE ON public.objectives
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

-- 6. PROGRESS_HISTORY
CREATE TRIGGER webhook_progress_history_insert
AFTER INSERT ON public.progress_history
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_progress_history_update
AFTER UPDATE ON public.progress_history
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_progress_history_delete
AFTER DELETE ON public.progress_history
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

-- 7. OBJECTIVE_INITIATIVES
CREATE TRIGGER webhook_objective_initiatives_insert
AFTER INSERT ON public.objective_initiatives
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_objective_initiatives_update
AFTER UPDATE ON public.objective_initiatives
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_objective_initiatives_delete
AFTER DELETE ON public.objective_initiatives
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

-- 8. ORGANIZATIONS
CREATE TRIGGER webhook_organizations_insert
AFTER INSERT ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_organizations_update
AFTER UPDATE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_organizations_delete
AFTER DELETE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

-- 9. TENANTS
CREATE TRIGGER webhook_tenants_insert
AFTER INSERT ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_tenants_update
AFTER UPDATE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_tenants_delete
AFTER DELETE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

-- 10. INVITATIONS
CREATE TRIGGER webhook_invitations_insert
AFTER INSERT ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_invitations_update
AFTER UPDATE ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_invitations_delete
AFTER DELETE ON public.invitations
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

-- 11. AUDIT_LOG
CREATE TRIGGER webhook_audit_log_insert
AFTER INSERT ON public.audit_log
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_audit_log_update
AFTER UPDATE ON public.audit_log
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

CREATE TRIGGER webhook_audit_log_delete
AFTER DELETE ON public.audit_log
FOR EACH ROW
EXECUTE FUNCTION public.create_webhook_payload();

-- Verificar que los triggers se crearon
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE 'webhook_%'
ORDER BY event_object_table, event_manipulation;

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Database Webhooks creados automáticamente para 11 tablas';
  RAISE NOTICE 'Los webhooks aparecerán en: https://supabase.com/dashboard/project/zkkdnslupqnpioltjpeu/database/hooks';
  RAISE NOTICE 'Cloud Function URL: https://us-central1-insaight-backend.cloudfunctions.net/syncSupabaseToBigQueryV2';
END $$;