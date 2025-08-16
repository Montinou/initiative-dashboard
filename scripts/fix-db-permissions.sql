-- Fix permissions for the get_current_user_tenant function
-- This function is used by RLS policies to determine the user's tenant

-- Grant execute permission on the function to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_tenant() TO authenticated;

-- Also grant usage on the public schema if needed
GRANT USAGE ON SCHEMA public TO authenticated;

-- Verify the function exists and check its definition
SELECT 
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'get_current_user_tenant';

-- If the function doesn't exist, create it
CREATE OR REPLACE FUNCTION public.get_current_user_tenant()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT tenant_id 
  FROM public.user_profiles 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_current_user_tenant() TO authenticated;

-- Also check and fix permissions for user_profiles table
GRANT SELECT ON public.user_profiles TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create a basic policy if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_profiles' 
        AND policyname = 'Users can view own profile'
    ) THEN
        CREATE POLICY "Users can view own profile"
        ON public.user_profiles
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid());
    END IF;
END $$;