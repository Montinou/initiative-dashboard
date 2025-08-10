-- Parte 2: Crear triggers para sincronización con BigQuery

-- Limpiar triggers antiguos
DROP TRIGGER IF EXISTS bigquery_sync_initiatives ON public.initiatives;
DROP TRIGGER IF EXISTS bigquery_sync_activities ON public.activities;
DROP TRIGGER IF EXISTS bigquery_sync_areas ON public.areas;
DROP TRIGGER IF EXISTS bigquery_sync_user_profiles ON public.user_profiles;
DROP TRIGGER IF EXISTS bigquery_sync_objectives ON public.objectives;
DROP TRIGGER IF EXISTS bigquery_sync_progress_history ON public.progress_history;
DROP TRIGGER IF EXISTS bigquery_sync_objective_initiatives ON public.objective_initiatives;
DROP TRIGGER IF EXISTS bigquery_sync_organizations ON public.organizations;
DROP TRIGGER IF EXISTS bigquery_sync_tenants ON public.tenants;

-- Crear nuevos triggers
CREATE TRIGGER bigquery_sync_initiatives
AFTER INSERT OR UPDATE OR DELETE ON public.initiatives
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

CREATE TRIGGER bigquery_sync_activities
AFTER INSERT OR UPDATE OR DELETE ON public.activities
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

CREATE TRIGGER bigquery_sync_areas
AFTER INSERT OR UPDATE OR DELETE ON public.areas
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

CREATE TRIGGER bigquery_sync_user_profiles
AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

CREATE TRIGGER bigquery_sync_objectives
AFTER INSERT OR UPDATE OR DELETE ON public.objectives
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

CREATE TRIGGER bigquery_sync_progress_history
AFTER INSERT OR UPDATE OR DELETE ON public.progress_history
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

CREATE TRIGGER bigquery_sync_objective_initiatives
AFTER INSERT OR UPDATE OR DELETE ON public.objective_initiatives
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

CREATE TRIGGER bigquery_sync_organizations
AFTER INSERT OR UPDATE OR DELETE ON public.organizations
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

CREATE TRIGGER bigquery_sync_tenants
AFTER INSERT OR UPDATE OR DELETE ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.send_webhook_to_bigquery();

-- Verificar triggers creados
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public' 
AND trigger_name LIKE 'bigquery_sync_%'
ORDER BY event_object_table;