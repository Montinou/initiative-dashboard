-- ============================================================================
-- OKR Import System Database Enhancements
-- Date: 2025-08-13
-- Purpose: Add missing features for OKR bulk import processing
-- ============================================================================

-- 1. AREA IMPORT TRACKING TABLE
-- Tracks which areas are created or updated during import
CREATE TABLE IF NOT EXISTS public.area_import_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  area_name text NOT NULL,
  area_id uuid,
  action text CHECK (action IN ('create', 'update', 'skip', 'error')),
  status import_item_status DEFAULT 'pending',
  error_message text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT area_import_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT area_import_tracking_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.okr_import_jobs(id) ON DELETE CASCADE,
  CONSTRAINT area_import_tracking_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id)
);

-- 2. USER PROFILE IMPORT TRACKING TABLE
-- Tracks which users are created or updated during import
CREATE TABLE IF NOT EXISTS public.user_profile_import_tracking (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  user_profile_id uuid,
  area_id uuid,
  role user_role,
  action text CHECK (action IN ('create', 'update', 'skip', 'error', 'invite')),
  status import_item_status DEFAULT 'pending',
  error_message text,
  processed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT user_profile_import_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT user_profile_import_tracking_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.okr_import_jobs(id) ON DELETE CASCADE,
  CONSTRAINT user_profile_import_tracking_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id),
  CONSTRAINT user_profile_import_tracking_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.areas(id)
);

-- 3. BATCH PROCESSING PERFORMANCE TABLE
-- Tracks batch processing metrics for optimization
CREATE TABLE IF NOT EXISTS public.okr_import_batch_metrics (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL,
  batch_number integer NOT NULL,
  batch_size integer NOT NULL,
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  rows_processed integer DEFAULT 0,
  rows_succeeded integer DEFAULT 0,
  rows_failed integer DEFAULT 0,
  processing_time_ms integer,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT okr_import_batch_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT okr_import_batch_metrics_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.okr_import_jobs(id) ON DELETE CASCADE
);

-- 4. ADD MISSING COLUMNS TO okr_import_jobs
ALTER TABLE public.okr_import_jobs 
ADD COLUMN IF NOT EXISTS processing_mode text DEFAULT 'async' CHECK (processing_mode IN ('sync', 'async', 'batch')),
ADD COLUMN IF NOT EXISTS batch_size integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS validation_errors jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS processing_time_ms integer,
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_retries integer DEFAULT 3;

-- 5. ADD MISSING COLUMNS TO okr_import_job_items for better tracking
ALTER TABLE public.okr_import_job_items
ADD COLUMN IF NOT EXISTS validation_errors jsonb DEFAULT '[]',
ADD COLUMN IF NOT EXISTS retry_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS parent_entity_id uuid,
ADD COLUMN IF NOT EXISTS processing_time_ms integer;

-- 6. CREATE INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_area_import_tracking_job_id ON public.area_import_tracking(job_id);
CREATE INDEX IF NOT EXISTS idx_area_import_tracking_area_name ON public.area_import_tracking(area_name);
CREATE INDEX IF NOT EXISTS idx_user_profile_import_tracking_job_id ON public.user_profile_import_tracking(job_id);
CREATE INDEX IF NOT EXISTS idx_user_profile_import_tracking_email ON public.user_profile_import_tracking(email);
CREATE INDEX IF NOT EXISTS idx_okr_import_batch_metrics_job_id ON public.okr_import_batch_metrics(job_id);
CREATE INDEX IF NOT EXISTS idx_okr_import_job_items_parent_entity ON public.okr_import_job_items(parent_entity_id);
CREATE INDEX IF NOT EXISTS idx_okr_import_jobs_processing_mode ON public.okr_import_jobs(processing_mode, status);

-- 7. CREATE COMPOSITE INDEXES FOR COMMON QUERIES
CREATE INDEX IF NOT EXISTS idx_objectives_tenant_title ON public.objectives(tenant_id, UPPER(title));
CREATE INDEX IF NOT EXISTS idx_initiatives_tenant_title ON public.initiatives(tenant_id, UPPER(title));
CREATE INDEX IF NOT EXISTS idx_activities_initiative_title ON public.activities(initiative_id, UPPER(title));
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_email ON public.user_profiles(tenant_id, email);

-- 8. CREATE FUNCTION FOR BATCH INSERT OF OBJECTIVES
CREATE OR REPLACE FUNCTION batch_insert_objectives(
  p_tenant_id uuid,
  p_area_id uuid,
  p_created_by uuid,
  p_objectives jsonb
) RETURNS TABLE (
  id uuid,
  title text,
  action text
) AS $$
DECLARE
  v_objective jsonb;
  v_existing_id uuid;
  v_new_id uuid;
BEGIN
  FOR v_objective IN SELECT * FROM jsonb_array_elements(p_objectives)
  LOOP
    -- Check if objective exists (case-insensitive)
    SELECT o.id INTO v_existing_id
    FROM objectives o
    WHERE o.tenant_id = p_tenant_id
      AND UPPER(o.title) = UPPER(v_objective->>'title');
    
    IF v_existing_id IS NOT NULL THEN
      -- Update existing objective
      UPDATE objectives SET
        description = COALESCE(v_objective->>'description', description),
        priority = COALESCE(v_objective->>'priority', priority),
        status = COALESCE(v_objective->>'status', status),
        progress = COALESCE((v_objective->>'progress')::integer, progress),
        start_date = COALESCE((v_objective->>'start_date')::date, start_date),
        end_date = COALESCE((v_objective->>'end_date')::date, end_date),
        target_date = COALESCE((v_objective->>'target_date')::date, target_date),
        metrics = COALESCE(v_objective->'metrics', metrics),
        updated_at = CURRENT_TIMESTAMP
      WHERE objectives.id = v_existing_id;
      
      RETURN QUERY SELECT v_existing_id, v_objective->>'title', 'update'::text;
    ELSE
      -- Insert new objective
      INSERT INTO objectives (
        tenant_id, area_id, title, description, created_by,
        priority, status, progress, start_date, end_date, target_date, metrics
      ) VALUES (
        p_tenant_id,
        p_area_id,
        v_objective->>'title',
        v_objective->>'description',
        p_created_by,
        COALESCE(v_objective->>'priority', 'medium'),
        COALESCE(v_objective->>'status', 'planning'),
        COALESCE((v_objective->>'progress')::integer, 0),
        (v_objective->>'start_date')::date,
        (v_objective->>'end_date')::date,
        (v_objective->>'target_date')::date,
        COALESCE(v_objective->'metrics', '[]'::jsonb)
      )
      RETURNING objectives.id INTO v_new_id;
      
      RETURN QUERY SELECT v_new_id, v_objective->>'title', 'create'::text;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. CREATE FUNCTION FOR BATCH INSERT OF INITIATIVES
CREATE OR REPLACE FUNCTION batch_insert_initiatives(
  p_tenant_id uuid,
  p_area_id uuid,
  p_created_by uuid,
  p_initiatives jsonb
) RETURNS TABLE (
  id uuid,
  title text,
  action text
) AS $$
DECLARE
  v_initiative jsonb;
  v_existing_id uuid;
  v_new_id uuid;
  v_objective_id uuid;
BEGIN
  FOR v_initiative IN SELECT * FROM jsonb_array_elements(p_initiatives)
  LOOP
    -- Get objective_id if provided
    v_objective_id := (v_initiative->>'objective_id')::uuid;
    
    -- Check if initiative exists (case-insensitive, within same objective if specified)
    IF v_objective_id IS NOT NULL THEN
      SELECT i.id INTO v_existing_id
      FROM initiatives i
      JOIN objective_initiatives oi ON oi.initiative_id = i.id
      WHERE i.tenant_id = p_tenant_id
        AND UPPER(i.title) = UPPER(v_initiative->>'title')
        AND oi.objective_id = v_objective_id;
    ELSE
      SELECT i.id INTO v_existing_id
      FROM initiatives i
      WHERE i.tenant_id = p_tenant_id
        AND UPPER(i.title) = UPPER(v_initiative->>'title')
        AND i.area_id = p_area_id;
    END IF;
    
    IF v_existing_id IS NOT NULL THEN
      -- Update existing initiative
      UPDATE initiatives SET
        description = COALESCE(v_initiative->>'description', description),
        status = COALESCE(v_initiative->>'status', status),
        progress = COALESCE((v_initiative->>'progress')::integer, progress),
        start_date = COALESCE((v_initiative->>'start_date')::date, start_date),
        due_date = COALESCE((v_initiative->>'due_date')::date, due_date),
        completion_date = COALESCE((v_initiative->>'completion_date')::date, completion_date),
        updated_at = CURRENT_TIMESTAMP
      WHERE initiatives.id = v_existing_id;
      
      RETURN QUERY SELECT v_existing_id, v_initiative->>'title', 'update'::text;
    ELSE
      -- Insert new initiative
      INSERT INTO initiatives (
        tenant_id, area_id, title, description, created_by,
        status, progress, start_date, due_date, completion_date
      ) VALUES (
        p_tenant_id,
        p_area_id,
        v_initiative->>'title',
        v_initiative->>'description',
        p_created_by,
        COALESCE(v_initiative->>'status', 'in_progress'),
        COALESCE((v_initiative->>'progress')::integer, 0),
        (v_initiative->>'start_date')::date,
        (v_initiative->>'due_date')::date,
        (v_initiative->>'completion_date')::date
      )
      RETURNING initiatives.id INTO v_new_id;
      
      -- Link to objective if provided
      IF v_objective_id IS NOT NULL THEN
        INSERT INTO objective_initiatives (objective_id, initiative_id)
        VALUES (v_objective_id, v_new_id)
        ON CONFLICT (objective_id, initiative_id) DO NOTHING;
      END IF;
      
      RETURN QUERY SELECT v_new_id, v_initiative->>'title', 'create'::text;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. CREATE FUNCTION FOR BATCH INSERT OF ACTIVITIES
CREATE OR REPLACE FUNCTION batch_insert_activities(
  p_tenant_id uuid,
  p_activities jsonb
) RETURNS TABLE (
  id uuid,
  title text,
  action text
) AS $$
DECLARE
  v_activity jsonb;
  v_existing_id uuid;
  v_new_id uuid;
  v_initiative_id uuid;
  v_assigned_to_id uuid;
BEGIN
  FOR v_activity IN SELECT * FROM jsonb_array_elements(p_activities)
  LOOP
    v_initiative_id := (v_activity->>'initiative_id')::uuid;
    
    -- Resolve assigned_to from email if provided
    IF v_activity->>'assigned_to_email' IS NOT NULL THEN
      SELECT up.id INTO v_assigned_to_id
      FROM user_profiles up
      WHERE up.tenant_id = p_tenant_id
        AND up.email = v_activity->>'assigned_to_email';
    ELSE
      v_assigned_to_id := (v_activity->>'assigned_to')::uuid;
    END IF;
    
    -- Check if activity exists (case-insensitive, within same initiative)
    SELECT a.id INTO v_existing_id
    FROM activities a
    WHERE a.initiative_id = v_initiative_id
      AND UPPER(a.title) = UPPER(v_activity->>'title');
    
    IF v_existing_id IS NOT NULL THEN
      -- Update existing activity
      UPDATE activities SET
        description = COALESCE(v_activity->>'description', description),
        is_completed = COALESCE((v_activity->>'is_completed')::boolean, is_completed),
        assigned_to = COALESCE(v_assigned_to_id, assigned_to),
        updated_at = CURRENT_TIMESTAMP
      WHERE activities.id = v_existing_id;
      
      RETURN QUERY SELECT v_existing_id, v_activity->>'title', 'update'::text;
    ELSE
      -- Insert new activity
      INSERT INTO activities (
        initiative_id, title, description, is_completed, assigned_to
      ) VALUES (
        v_initiative_id,
        v_activity->>'title',
        v_activity->>'description',
        COALESCE((v_activity->>'is_completed')::boolean, false),
        v_assigned_to_id
      )
      RETURNING activities.id INTO v_new_id;
      
      RETURN QUERY SELECT v_new_id, v_activity->>'title', 'create'::text;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. CREATE VIEW FOR IMPORT JOB DETAILS
CREATE OR REPLACE VIEW okr_import_job_details AS
SELECT 
  j.id,
  j.tenant_id,
  j.user_id,
  j.area_id,
  j.original_filename,
  j.file_size_bytes,
  j.status,
  j.total_rows,
  j.processed_rows,
  j.success_rows,
  j.error_rows,
  j.processing_mode,
  j.processing_time_ms,
  j.started_at,
  j.completed_at,
  j.created_at,
  up.full_name as user_name,
  up.email as user_email,
  a.name as area_name,
  t.subdomain as tenant_subdomain,
  COALESCE(j.job_metadata->>'created_entities', '{}'::text)::jsonb as created_entities,
  (
    SELECT COUNT(*) 
    FROM okr_import_job_items ji 
    WHERE ji.job_id = j.id AND ji.status = 'error'
  ) as error_count,
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'row', ji.row_number,
        'error', ji.error_message
      ) ORDER BY ji.row_number
    )
    FROM okr_import_job_items ji
    WHERE ji.job_id = j.id AND ji.status = 'error'
    LIMIT 10
  ) as recent_errors
FROM okr_import_jobs j
LEFT JOIN user_profiles up ON j.user_id = up.id
LEFT JOIN areas a ON j.area_id = a.id
LEFT JOIN tenants t ON j.tenant_id = t.id;

-- 12. ENABLE RLS ON NEW TABLES
ALTER TABLE public.area_import_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profile_import_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_import_batch_metrics ENABLE ROW LEVEL SECURITY;

-- 13. CREATE RLS POLICIES FOR NEW TABLES
-- Area import tracking policies
CREATE POLICY "Users can view area imports for their jobs"
  ON public.area_import_tracking FOR SELECT
  TO authenticated
  USING (job_id IN (
    SELECT id FROM public.okr_import_jobs
    WHERE tenant_id IN (
      SELECT tenant_id FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can create area imports for their jobs"
  ON public.area_import_tracking FOR INSERT
  TO authenticated
  WITH CHECK (job_id IN (
    SELECT id FROM public.okr_import_jobs
    WHERE user_id IN (
      SELECT id FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
  ));

-- User profile import tracking policies
CREATE POLICY "Users can view user imports for their jobs"
  ON public.user_profile_import_tracking FOR SELECT
  TO authenticated
  USING (job_id IN (
    SELECT id FROM public.okr_import_jobs
    WHERE tenant_id IN (
      SELECT tenant_id FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Admins can create user imports"
  ON public.user_profile_import_tracking FOR INSERT
  TO authenticated
  WITH CHECK (
    job_id IN (
      SELECT id FROM public.okr_import_jobs j
      WHERE j.user_id IN (
        SELECT up.id FROM public.user_profiles up
        WHERE up.user_id = auth.uid()
          AND up.role IN ('Admin', 'CEO')
      )
    )
  );

-- Batch metrics policies
CREATE POLICY "Users can view batch metrics for their jobs"
  ON public.okr_import_batch_metrics FOR SELECT
  TO authenticated
  USING (job_id IN (
    SELECT id FROM public.okr_import_jobs
    WHERE tenant_id IN (
      SELECT tenant_id FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Service role can manage batch metrics"
  ON public.okr_import_batch_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 14. GRANT PERMISSIONS
GRANT ALL ON public.area_import_tracking TO authenticated;
GRANT ALL ON public.user_profile_import_tracking TO authenticated;
GRANT ALL ON public.okr_import_batch_metrics TO authenticated;
GRANT ALL ON okr_import_job_details TO authenticated;

-- 15. ADD COMMENTS FOR DOCUMENTATION
COMMENT ON TABLE public.area_import_tracking IS 'Tracks area creation/updates during OKR imports';
COMMENT ON TABLE public.user_profile_import_tracking IS 'Tracks user profile creation/updates during OKR imports';
COMMENT ON TABLE public.okr_import_batch_metrics IS 'Performance metrics for batch processing optimization';
COMMENT ON VIEW okr_import_job_details IS 'Comprehensive view of import job status and details';

COMMENT ON FUNCTION batch_insert_objectives IS 'Batch insert/update objectives with duplicate detection';
COMMENT ON FUNCTION batch_insert_initiatives IS 'Batch insert/update initiatives with duplicate detection';
COMMENT ON FUNCTION batch_insert_activities IS 'Batch insert/update activities with duplicate detection';