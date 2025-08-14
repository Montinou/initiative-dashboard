-- Fix RLS policy for objective_initiatives to allow proper nested joins
-- The previous policy was too restrictive and prevented fetching initiatives through objectives

-- Drop the existing policy
DROP POLICY IF EXISTS "Objective initiatives: access via initiative/objective" ON public.objective_initiatives;

-- Create a simpler policy that allows reading junction table data if user can see either the objective OR initiative
CREATE POLICY "Objective initiatives: read access for authenticated users"
  ON public.objective_initiatives FOR SELECT
  USING (
    -- User can read junction if they can see the objective
    EXISTS (
      SELECT 1 FROM public.objectives o
      JOIN public.user_profiles up ON up.tenant_id = o.tenant_id
      WHERE o.id = objective_initiatives.objective_id
        AND up.user_id = auth.uid()
    )
    OR
    -- OR if they can see the initiative
    EXISTS (
      SELECT 1 FROM public.initiatives i
      JOIN public.user_profiles up ON up.tenant_id = i.tenant_id
      WHERE i.id = objective_initiatives.initiative_id
        AND up.user_id = auth.uid()
    )
  );

-- Keep the write policies more restrictive
CREATE POLICY "Objective initiatives: write access for CEO/Admin"
  ON public.objective_initiatives FOR INSERT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role IN ('CEO', 'Admin')
    )
  );

CREATE POLICY "Objective initiatives: update access for CEO/Admin"
  ON public.objective_initiatives FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role IN ('CEO', 'Admin')
    )
  );

CREATE POLICY "Objective initiatives: delete access for CEO/Admin"
  ON public.objective_initiatives FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role IN ('CEO', 'Admin')
    )
  );