-- =============================================
-- Migration 003: Add Audit Function and Triggers
-- =============================================
-- This migration implements comprehensive audit logging functionality
-- to track all changes (INSERT, UPDATE, DELETE) on critical business tables.

-- ============================================================
-- Audit Trigger Function
-- ============================================================

-- Create the audit trigger function that will be called on data changes
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Safely get the current user ID from JWT claims
  -- The true parameter means it returns NULL if the setting doesn't exist
  BEGIN
    current_user_id := (
      SELECT id 
      FROM public.user_profiles 
      WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid
      LIMIT 1
    );
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  -- Handle different operation types
  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_log (
      user_id, 
      action, 
      table_name, 
      record_id, 
      old_data
    )
    VALUES (
      current_user_id,
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD)
    );
    RETURN OLD;
    
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_log (
      user_id, 
      action, 
      table_name, 
      record_id, 
      old_data, 
      new_data
    )
    VALUES (
      current_user_id,
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
    RETURN NEW;
    
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_log (
      user_id, 
      action, 
      table_name, 
      record_id, 
      new_data
    )
    VALUES (
      current_user_id,
      'INSERT',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW)
    );
    RETURN NEW;
  END IF;
  
  RETURN NULL; -- Should never reach here
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION audit_trigger_function() IS 'Generic audit trigger function that logs all data changes to audit_log table';

-- ============================================================
-- Apply Audit Triggers to Business Tables
-- ============================================================

-- Areas table audit trigger
CREATE TRIGGER areas_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.areas
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- User profiles table audit trigger
CREATE TRIGGER user_profiles_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Initiatives table audit trigger
CREATE TRIGGER initiatives_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.initiatives
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Activities table audit trigger
CREATE TRIGGER activities_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.activities
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Quarters table audit trigger
CREATE TRIGGER quarters_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.quarters
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Objectives table audit trigger
CREATE TRIGGER objectives_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.objectives
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================
-- Helper Functions for Audit Analysis
-- ============================================================

-- Function to get audit history for a specific record
CREATE OR REPLACE FUNCTION get_audit_history(
  p_table_name text,
  p_record_id uuid
)
RETURNS TABLE (
  audit_id uuid,
  user_id uuid,
  user_email text,
  action text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id as audit_id,
    al.user_id,
    up.email as user_email,
    al.action,
    al.old_data,
    al.new_data,
    al.created_at
  FROM public.audit_log al
  LEFT JOIN public.user_profiles up ON al.user_id = up.id
  WHERE al.table_name = p_table_name
    AND al.record_id = p_record_id
  ORDER BY al.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION get_audit_history(text, uuid) IS 'Retrieve complete audit history for a specific record';

-- Function to get recent audit activity by user
CREATE OR REPLACE FUNCTION get_user_audit_activity(
  p_user_id uuid,
  p_limit integer DEFAULT 100
)
RETURNS TABLE (
  audit_id uuid,
  action text,
  table_name text,
  record_id uuid,
  created_at timestamp with time zone
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    id as audit_id,
    action,
    table_name,
    record_id,
    created_at
  FROM public.audit_log
  WHERE user_id = p_user_id
  ORDER BY created_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON FUNCTION get_user_audit_activity(uuid, integer) IS 'Retrieve recent audit activity for a specific user';

-- ============================================================
-- Update Triggers for Timestamp Management
-- ============================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION update_updated_at_column() IS 'Automatically updates the updated_at column on row modification';

-- Apply updated_at triggers to tables with updated_at column
CREATE TRIGGER update_tenants_updated_at
BEFORE UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_areas_updated_at
BEFORE UPDATE ON public.areas
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_objectives_updated_at
BEFORE UPDATE ON public.objectives
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_initiatives_updated_at
BEFORE UPDATE ON public.initiatives
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
BEFORE UPDATE ON public.activities
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();