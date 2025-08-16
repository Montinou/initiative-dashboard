-- ============================================================
-- Temporarily disable webhooks to allow seeding
-- ============================================================
-- The webhooks are causing issues during seeding because pg_net
-- extension functions are not available in local development.
-- This migration disables all webhook triggers temporarily.
-- ============================================================

-- Drop all webhook triggers that might interfere with seeding
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

-- Also drop the generic webhook triggers
DROP TRIGGER IF EXISTS webhook_trigger_initiatives ON public.initiatives;
DROP TRIGGER IF EXISTS webhook_trigger_activities ON public.activities;
DROP TRIGGER IF EXISTS webhook_trigger_areas ON public.areas;
DROP TRIGGER IF EXISTS webhook_trigger_user_profiles ON public.user_profiles;
DROP TRIGGER IF EXISTS webhook_trigger_objectives ON public.objectives;
DROP TRIGGER IF EXISTS webhook_trigger_progress_history ON public.progress_history;
DROP TRIGGER IF EXISTS webhook_trigger_objective_initiatives ON public.objective_initiatives;
DROP TRIGGER IF EXISTS webhook_trigger_organizations ON public.organizations;
DROP TRIGGER IF EXISTS webhook_trigger_tenants ON public.tenants;
DROP TRIGGER IF EXISTS webhook_trigger_invitations ON public.invitations;
DROP TRIGGER IF EXISTS webhook_trigger_audit_log ON public.audit_log;

-- Drop the BigQuery sync trigger
DROP TRIGGER IF EXISTS sync_initiatives_to_bigquery ON public.initiatives;

-- Drop webhook functions that might be causing issues
DROP FUNCTION IF EXISTS public.send_webhook_v2() CASCADE;
DROP FUNCTION IF EXISTS public.send_bigquery_webhook() CASCADE;
DROP FUNCTION IF EXISTS public.send_database_webhook() CASCADE;
DROP FUNCTION IF EXISTS public.handle_webhook_change() CASCADE;

-- Add a comment to indicate webhooks are disabled
COMMENT ON DATABASE postgres IS 'Webhooks temporarily disabled for local development. Re-enable in production.';