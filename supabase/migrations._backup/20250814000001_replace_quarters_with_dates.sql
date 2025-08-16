-- Migration: Replace quarters system with start_date and end_date for objectives
-- Date: 2025-08-14
-- Description: This migration removes the quarters system and replaces it with 
--              direct start_date and end_date fields on objectives table

-- ============================================================
-- Step 1: Add new date columns to objectives table
-- ============================================================

-- Add start_date and end_date columns if they don't exist
ALTER TABLE public.objectives 
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date;

-- Update existing objectives with dates based on their linked quarters (if any)
-- This preserves existing data by setting dates from the first and last quarters
UPDATE public.objectives o
SET 
  start_date = COALESCE(
    o.start_date,
    (
      SELECT MIN(q.start_date)
      FROM public.objective_quarters oq
      JOIN public.quarters q ON q.id = oq.quarter_id
      WHERE oq.objective_id = o.id
    ),
    CURRENT_DATE
  ),
  end_date = COALESCE(
    o.end_date,
    (
      SELECT MAX(q.end_date)
      FROM public.objective_quarters oq
      JOIN public.quarters q ON q.id = oq.quarter_id
      WHERE oq.objective_id = o.id
    )
  )
WHERE o.start_date IS NULL;

-- ============================================================
-- Step 2: Drop foreign key constraints related to quarters
-- ============================================================

-- Drop foreign key constraints from objective_quarters table
ALTER TABLE IF EXISTS public.objective_quarters
  DROP CONSTRAINT IF EXISTS objective_quarters_objective_id_fkey,
  DROP CONSTRAINT IF EXISTS objective_quarters_quarter_id_fkey;

-- ============================================================
-- Step 3: Drop RLS policies related to quarters
-- ============================================================

-- Drop quarters table policies
DROP POLICY IF EXISTS "Quarters: Tenant isolation" ON public.quarters;
DROP POLICY IF EXISTS "Quarters: Read access" ON public.quarters;
DROP POLICY IF EXISTS "Quarters: CEO/Admin can manage" ON public.quarters;

-- Drop objective_quarters junction table policies
DROP POLICY IF EXISTS "Objective quarters: access via objective" ON public.objective_quarters;
DROP POLICY IF EXISTS "Objective quarters: CEO/Admin can manage" ON public.objective_quarters;

-- ============================================================
-- Step 4: Drop indexes related to quarters
-- ============================================================

DROP INDEX IF EXISTS public.idx_objective_quarters_objective_id;
DROP INDEX IF EXISTS public.idx_objective_quarters_quarter_id;
DROP INDEX IF EXISTS public.idx_quarters_tenant_id;
DROP INDEX IF EXISTS public.idx_quarters_dates;

-- ============================================================
-- Step 5: Drop triggers related to quarters
-- ============================================================

-- Drop audit triggers
DROP TRIGGER IF EXISTS quarters_audit_trigger ON public.quarters;
DROP TRIGGER IF EXISTS objective_quarters_audit_trigger ON public.objective_quarters;

-- Drop webhook triggers
DROP TRIGGER IF EXISTS webhook_quarters_insert ON public.quarters;
DROP TRIGGER IF EXISTS webhook_quarters_update ON public.quarters;
DROP TRIGGER IF EXISTS webhook_quarters_delete ON public.quarters;
DROP TRIGGER IF EXISTS webhook_objective_quarters_insert ON public.objective_quarters;
DROP TRIGGER IF EXISTS webhook_objective_quarters_update ON public.objective_quarters;
DROP TRIGGER IF EXISTS webhook_objective_quarters_delete ON public.objective_quarters;

-- ============================================================
-- Step 6: Drop views that reference quarters
-- ============================================================

-- Drop and recreate quarter_performance view without quarters reference
DROP VIEW IF EXISTS public.quarter_performance CASCADE;

-- Drop any other views that might reference quarters
DROP VIEW IF EXISTS public.objectives_with_quarters CASCADE;

-- ============================================================
-- Step 7: Drop the quarters-related tables
-- ============================================================

-- Drop junction table
DROP TABLE IF EXISTS public.objective_quarters CASCADE;

-- Drop quarters table
DROP TABLE IF EXISTS public.quarters CASCADE;

-- ============================================================
-- Step 8: Update or recreate views to use date ranges
-- ============================================================

-- Create a new view for objectives with date-based filtering
CREATE OR REPLACE VIEW public.objectives_by_period AS
SELECT 
  o.*,
  a.name as area_name,
  up.full_name as created_by_name,
  COUNT(DISTINCT oi.initiative_id) as initiative_count,
  AVG(i.progress) as average_progress
FROM public.objectives o
LEFT JOIN public.areas a ON o.area_id = a.id
LEFT JOIN public.user_profiles up ON o.created_by = up.id
LEFT JOIN public.objective_initiatives oi ON o.id = oi.objective_id
LEFT JOIN public.initiatives i ON oi.initiative_id = i.id
GROUP BY o.id, a.name, up.full_name;

-- ============================================================
-- Step 9: Add indexes for the new date columns
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_objectives_start_date ON public.objectives (start_date);
CREATE INDEX IF NOT EXISTS idx_objectives_end_date ON public.objectives (end_date);
CREATE INDEX IF NOT EXISTS idx_objectives_date_range ON public.objectives (start_date, end_date);

-- Compound index for common query patterns
CREATE INDEX IF NOT EXISTS idx_objectives_tenant_dates ON public.objectives (tenant_id, start_date, end_date);

-- ============================================================
-- Step 10: Update RLS policies for objectives to consider dates
-- ============================================================

-- Drop existing objectives policies that might reference quarters
DROP POLICY IF EXISTS "Objectives: Tenant isolation" ON public.objectives;
DROP POLICY IF EXISTS "Objectives: Area managers can view their area" ON public.objectives;
DROP POLICY IF EXISTS "Objectives: CEO/Admin can manage all" ON public.objectives;
DROP POLICY IF EXISTS "Objectives: Managers can create in their area" ON public.objectives;

-- Recreate objectives policies without quarter references
CREATE POLICY "Objectives: Tenant isolation"
  ON public.objectives FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Objectives: CEO/Admin can manage all"
  ON public.objectives FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
        AND tenant_id = objectives.tenant_id
        AND role IN ('CEO', 'Admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
        AND tenant_id = objectives.tenant_id
        AND role IN ('CEO', 'Admin')
    )
  );

CREATE POLICY "Objectives: Managers can manage their area"
  ON public.objectives FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
        AND tenant_id = objectives.tenant_id
        AND role = 'Manager'
        AND area_id = objectives.area_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
        AND tenant_id = objectives.tenant_id
        AND role = 'Manager'
        AND area_id = objectives.area_id
    )
  );

-- ============================================================
-- Step 11: Create helper functions for date-based queries
-- ============================================================

-- Function to get objectives for a specific period
CREATE OR REPLACE FUNCTION public.get_objectives_by_period(
  p_tenant_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  area_id uuid,
  start_date date,
  end_date date,
  initiative_count bigint,
  average_progress numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.title,
    o.description,
    o.area_id,
    o.start_date,
    o.end_date,
    COUNT(DISTINCT oi.initiative_id) as initiative_count,
    AVG(i.progress) as average_progress
  FROM public.objectives o
  LEFT JOIN public.objective_initiatives oi ON o.id = oi.objective_id
  LEFT JOIN public.initiatives i ON oi.initiative_id = i.id
  WHERE o.tenant_id = p_tenant_id
    AND (p_start_date IS NULL OR o.end_date >= p_start_date)
    AND (p_end_date IS NULL OR o.start_date <= p_end_date)
  GROUP BY o.id;
END;
$$;

-- Function to get current objectives (active today)
CREATE OR REPLACE FUNCTION public.get_current_objectives(p_tenant_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  area_id uuid,
  start_date date,
  end_date date
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id,
    o.title,
    o.description,
    o.area_id,
    o.start_date,
    o.end_date
  FROM public.objectives o
  WHERE o.tenant_id = p_tenant_id
    AND (o.start_date IS NULL OR o.start_date <= CURRENT_DATE)
    AND (o.end_date IS NULL OR o.end_date >= CURRENT_DATE);
END;
$$;

-- ============================================================
-- Step 12: Update audit log to track schema changes
-- ============================================================

INSERT INTO public.audit_log (
  tenant_id,
  user_id,
  action,
  table_name,
  record_id,
  new_data,
  created_at
)
SELECT 
  t.id as tenant_id,
  NULL as user_id,
  'SCHEMA_MIGRATION' as action,
  'objectives' as table_name,
  NULL as record_id,
  jsonb_build_object(
    'migration', '20250814000001_replace_quarters_with_dates',
    'description', 'Replaced quarters system with start_date and end_date fields',
    'timestamp', CURRENT_TIMESTAMP
  ) as new_data,
  CURRENT_TIMESTAMP as created_at
FROM public.tenants t;

-- ============================================================
-- Step 13: Add comments for documentation
-- ============================================================

COMMENT ON COLUMN public.objectives.start_date IS 'Start date for the objective period';
COMMENT ON COLUMN public.objectives.end_date IS 'End date for the objective period';

-- ============================================================
-- Migration Complete
-- ============================================================

-- Summary of changes:
-- 1. Added start_date and end_date columns to objectives table
-- 2. Migrated data from quarters to date fields
-- 3. Removed quarters and objective_quarters tables
-- 4. Updated RLS policies to work without quarters
-- 5. Created new views and functions for date-based queries
-- 6. Added indexes for performance optimization