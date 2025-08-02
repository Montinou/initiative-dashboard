-- Fix RLS policy for managers area access
-- The current policy tries to join areas.name with user_profiles.area (which doesn't exist)
-- It should join areas.id with user_profiles.area_id

-- Drop the incorrect policy
DROP POLICY IF EXISTS "Managers can manage initiatives in their area" ON public.initiatives;

-- Create the corrected policy
CREATE POLICY "Managers can manage initiatives in their area" ON public.initiatives 
FOR ALL USING (
    EXISTS (
        SELECT 1 
        FROM public.user_profiles up 
        JOIN public.areas a ON a.id = up.area_id 
        WHERE up.id = auth.uid() 
        AND up.tenant_id = initiatives.tenant_id 
        AND a.id = initiatives.area_id 
        AND up.role = 'Manager'
    )
);

-- Verify the policy was created correctly
SELECT 
    policyname,
    cmd,
    qual,
    roles
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'initiatives' 
AND policyname = 'Managers can manage initiatives in their area';