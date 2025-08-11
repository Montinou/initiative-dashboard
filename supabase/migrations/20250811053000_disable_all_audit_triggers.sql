-- ============================================================
-- Disable ALL audit triggers to allow seeding
-- ============================================================

-- Drop all audit triggers from all tables
DROP TRIGGER IF EXISTS initiatives_audit_trigger ON public.initiatives;
DROP TRIGGER IF EXISTS activities_audit_trigger ON public.activities;
DROP TRIGGER IF EXISTS areas_audit_trigger ON public.areas;
DROP TRIGGER IF EXISTS user_profiles_audit_trigger ON public.user_profiles;
DROP TRIGGER IF EXISTS objectives_audit_trigger ON public.objectives;
DROP TRIGGER IF EXISTS organizations_audit_trigger ON public.organizations;
DROP TRIGGER IF EXISTS tenants_audit_trigger ON public.tenants;
DROP TRIGGER IF EXISTS quarters_audit_trigger ON public.quarters;
DROP TRIGGER IF EXISTS progress_history_audit_trigger ON public.progress_history;
DROP TRIGGER IF EXISTS uploaded_files_audit_trigger ON public.uploaded_files;
DROP TRIGGER IF EXISTS file_areas_audit_trigger ON public.file_areas;
DROP TRIGGER IF EXISTS file_initiatives_audit_trigger ON public.file_initiatives;
DROP TRIGGER IF EXISTS objective_initiatives_audit_trigger ON public.objective_initiatives;
DROP TRIGGER IF EXISTS objective_quarters_audit_trigger ON public.objective_quarters;
DROP TRIGGER IF EXISTS audit_log_audit_trigger ON public.audit_log;

-- Drop the problematic audit function
DROP FUNCTION IF EXISTS public.audit_trigger_function() CASCADE;

-- Create a dummy webhook_audit_log table if it doesn't exist
-- This prevents errors if something still tries to write to it
CREATE TABLE IF NOT EXISTS public.webhook_audit_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    webhook_type text,
    table_name text,
    operation text,
    record_id text,
    payload jsonb,
    response jsonb,
    status text DEFAULT 'pending',
    created_at timestamp with time zone DEFAULT now()
);

-- Add comment
COMMENT ON TABLE public.webhook_audit_log IS 'Dummy table for local development - prevents errors during seeding';