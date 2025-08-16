-- Fix RLS policies for okr_import_jobs table
-- The issue is that user_id references user_profiles.id, not auth.uid()

-- Drop existing incorrect policies
DROP POLICY IF EXISTS "Users can create import jobs for their tenant" ON public.okr_import_jobs;
DROP POLICY IF EXISTS "Users can update their own import jobs" ON public.okr_import_jobs;

-- Create corrected policies
-- Users can create import jobs for their tenant (using service role for initial creation)
CREATE POLICY "Users can create import jobs for their tenant"
  ON public.okr_import_jobs FOR INSERT
  TO authenticated
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
    AND 
    user_id IN (
      SELECT id FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Users can update their own import jobs
CREATE POLICY "Users can update their own import jobs"
  ON public.okr_import_jobs FOR UPDATE
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Also fix the policies for okr_import_job_items
DROP POLICY IF EXISTS "Users can create items for their jobs" ON public.okr_import_job_items;
DROP POLICY IF EXISTS "Users can update items for their jobs" ON public.okr_import_job_items;

-- Recreate with correct user_id reference
CREATE POLICY "Users can create items for their jobs"
  ON public.okr_import_job_items FOR INSERT
  TO authenticated
  WITH CHECK (job_id IN (
    SELECT id FROM public.okr_import_jobs
    WHERE user_id IN (
      SELECT id FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Users can update items for their jobs"
  ON public.okr_import_job_items FOR UPDATE
  TO authenticated
  USING (job_id IN (
    SELECT id FROM public.okr_import_jobs
    WHERE user_id IN (
      SELECT id FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
  ))
  WITH CHECK (job_id IN (
    SELECT id FROM public.okr_import_jobs
    WHERE user_id IN (
      SELECT id FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
  ));