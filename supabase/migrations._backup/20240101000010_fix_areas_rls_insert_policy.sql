-- Fix RLS INSERT policy for areas table
-- The current policy fails because it references areas.tenant_id before the row is inserted
-- We need to reference the tenant_id from the data being inserted instead

DROP POLICY IF EXISTS "Areas: CEO/Admin can insert" ON public.areas;
CREATE POLICY "Areas: CEO/Admin can insert"
  ON public.areas FOR INSERT
  WITH CHECK (
    -- Check that the user has permission in the tenant they're trying to insert into
    tenant_id IN (
      SELECT up.tenant_id FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role IN ('CEO','Admin')
    )
  );