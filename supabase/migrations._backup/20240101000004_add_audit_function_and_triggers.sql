-- ============================================================
-- Migration 4: Add audit function and triggers
-- ============================================================
-- This migration creates the audit system for tracking changes
-- to important business tables
-- ============================================================

-- Function to capture changes for audit logging
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id uuid;
BEGIN
  -- Get the current user's profile id (not auth id)
  -- Handle case where JWT claim might not be set (during migrations, etc.)
  BEGIN
    current_user_id := (
      SELECT id FROM public.user_profiles 
      WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid
      LIMIT 1
    );
  EXCEPTION WHEN OTHERS THEN
    current_user_id := NULL;
  END;

  IF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_log (
      user_id, 
      action, 
      table_name, 
      record_id, 
      old_data,
      created_at
    )
    VALUES (
      current_user_id,
      'DELETE',
      TG_TABLE_NAME,
      OLD.id,
      to_jsonb(OLD),
      timezone('utc'::text, now())
    );
    RETURN OLD;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_log (
      user_id, 
      action, 
      table_name, 
      record_id, 
      old_data, 
      new_data,
      created_at
    )
    VALUES (
      current_user_id,
      'UPDATE',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      timezone('utc'::text, now())
    );
    RETURN NEW;
  ELSIF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_log (
      user_id, 
      action, 
      table_name, 
      record_id, 
      new_data,
      created_at
    )
    VALUES (
      current_user_id,
      'INSERT',
      TG_TABLE_NAME,
      NEW.id,
      to_jsonb(NEW),
      timezone('utc'::text, now())
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update initiative progress based on activities
CREATE OR REPLACE FUNCTION public.update_initiative_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_count integer;
  completed_count integer;
  new_progress integer;
  initiative_record record;
BEGIN
  -- Get the initiative_id from the activity
  IF TG_OP = 'DELETE' THEN
    SELECT * INTO initiative_record FROM public.initiatives WHERE id = OLD.initiative_id;
  ELSE
    SELECT * INTO initiative_record FROM public.initiatives WHERE id = NEW.initiative_id;
  END IF;

  -- Calculate total and completed activities for the initiative
  SELECT 
    COUNT(*) AS total,
    COUNT(CASE WHEN is_completed = true THEN 1 END) AS completed
  INTO total_count, completed_count
  FROM public.activities
  WHERE initiative_id = initiative_record.id;

  -- Calculate progress percentage
  IF total_count > 0 THEN
    new_progress := ROUND((completed_count::numeric / total_count::numeric) * 100);
  ELSE
    new_progress := 0;
  END IF;

  -- Update the initiative progress
  UPDATE public.initiatives
  SET 
    progress = new_progress,
    updated_at = timezone('utc'::text, now()),
    completion_date = CASE 
      WHEN new_progress = 100 THEN timezone('utc'::text, now())::date
      ELSE NULL
    END
  WHERE id = initiative_record.id;

  -- Log progress history
  INSERT INTO public.progress_history (
    initiative_id,
    completed_activities_count,
    total_activities_count,
    notes,
    updated_by,
    created_at
  )
  VALUES (
    initiative_record.id,
    completed_count,
    total_count,
    'Auto-updated from activity change',
    (SELECT id FROM public.user_profiles WHERE user_id = current_setting('request.jwt.claim.sub', true)::uuid LIMIT 1),
    timezone('utc'::text, now())
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to business tables
CREATE TRIGGER areas_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.areas
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER user_profiles_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER objectives_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.objectives
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER initiatives_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.initiatives
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER activities_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

CREATE TRIGGER quarters_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.quarters
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_function();

-- Trigger to auto-update initiative progress when activities change
CREATE TRIGGER update_initiative_progress_trigger
  AFTER INSERT OR UPDATE OF is_completed OR DELETE ON public.activities
  FOR EACH ROW EXECUTE FUNCTION public.update_initiative_progress();

-- Add comments for documentation
COMMENT ON FUNCTION public.audit_trigger_function() IS 'Captures all data changes for audit logging';
COMMENT ON FUNCTION public.update_initiative_progress() IS 'Automatically updates initiative progress based on activity completion';
COMMENT ON TRIGGER areas_audit_trigger ON public.areas IS 'Audit trail for area changes';
COMMENT ON TRIGGER user_profiles_audit_trigger ON public.user_profiles IS 'Audit trail for user profile changes';
COMMENT ON TRIGGER objectives_audit_trigger ON public.objectives IS 'Audit trail for objective changes';
COMMENT ON TRIGGER initiatives_audit_trigger ON public.initiatives IS 'Audit trail for initiative changes';
COMMENT ON TRIGGER activities_audit_trigger ON public.activities IS 'Audit trail for activity changes';
COMMENT ON TRIGGER update_initiative_progress_trigger ON public.activities IS 'Auto-updates initiative progress when activities change';