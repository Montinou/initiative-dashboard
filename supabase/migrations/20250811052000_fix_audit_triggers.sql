-- ============================================================
-- Fix audit triggers that are causing seeding issues
-- ============================================================

-- Drop any remaining triggers that might write to webhook_audit_log
DROP TRIGGER IF EXISTS audit_initiatives_changes ON public.initiatives;
DROP TRIGGER IF EXISTS audit_activities_changes ON public.activities;
DROP TRIGGER IF EXISTS audit_areas_changes ON public.areas;
DROP TRIGGER IF EXISTS audit_user_profiles_changes ON public.user_profiles;
DROP TRIGGER IF EXISTS audit_objectives_changes ON public.objectives;
DROP TRIGGER IF EXISTS audit_organizations_changes ON public.organizations;
DROP TRIGGER IF EXISTS audit_tenants_changes ON public.tenants;

-- Drop the audit function if it's trying to write to webhook_audit_log
DROP FUNCTION IF EXISTS public.handle_audit_trigger() CASCADE;

-- Recreate a simpler audit function that doesn't depend on webhook_audit_log
CREATE OR REPLACE FUNCTION public.handle_audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
    -- For now, just return the record without logging
    -- This allows seeding to proceed
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Comment to indicate this is a temporary fix
COMMENT ON FUNCTION public.handle_audit_trigger() IS 'Simplified audit function for local development - does not write to webhook_audit_log';