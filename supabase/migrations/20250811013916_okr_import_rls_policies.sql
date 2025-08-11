-- Enable RLS on OKR import tables
ALTER TABLE public.okr_import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_import_job_items ENABLE ROW LEVEL SECURITY;

-- Policies for okr_import_jobs table
-- Users can view their tenant's import jobs
CREATE POLICY "Users can view their tenant's import jobs"
  ON public.okr_import_jobs FOR SELECT
  TO authenticated
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles 
    WHERE user_id = auth.uid()
  ));

-- Users can create import jobs for their tenant
CREATE POLICY "Users can create import jobs for their tenant"
  ON public.okr_import_jobs FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_profiles 
    WHERE user_id = auth.uid()
  ));

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

-- Policies for okr_import_job_items table
-- Users can view items for their tenant's jobs
CREATE POLICY "Users can view items for their tenant's jobs"
  ON public.okr_import_job_items FOR SELECT
  TO authenticated
  USING (job_id IN (
    SELECT id FROM public.okr_import_jobs
    WHERE tenant_id IN (
      SELECT tenant_id FROM public.user_profiles 
      WHERE user_id = auth.uid()
    )
  ));

-- Users can create items for their jobs
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

-- Users can update items for their jobs
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

-- Grant necessary permissions
GRANT ALL ON public.okr_import_jobs TO authenticated;
GRANT ALL ON public.okr_import_job_items TO authenticated;