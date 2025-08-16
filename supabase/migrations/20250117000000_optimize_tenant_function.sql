-- Optimize get_current_user_tenant function to fix 391ms timeout
-- This function is called by every RLS policy and needs to be extremely fast

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.get_current_user_tenant();

-- Create optimized version with proper indexing support
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
GRANT EXECUTE ON FUNCTION public.get_current_user_tenant() TO anon;

-- Create critical index for performance (if not exists)
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id_tenant_id 
ON public.user_profiles(user_id, tenant_id);

-- Also create index on user_id alone for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id 
ON public.user_profiles(user_id);

-- Verify the function works correctly
DO $$
BEGIN
    -- Test that function exists and is accessible
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' 
        AND p.proname = 'get_current_user_tenant'
    ) THEN
        RAISE EXCEPTION 'Function get_current_user_tenant was not created successfully';
    END IF;
    
    RAISE NOTICE 'get_current_user_tenant function optimized successfully';
END $$;
