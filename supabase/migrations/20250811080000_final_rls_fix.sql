-- ============================================================
-- Final fix for RLS recursion - Ultra simplified policies
-- ============================================================

-- Disable RLS temporarily to clear everything
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies on user_profiles
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'user_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', pol.policyname);
    END LOOP;
END $$;

-- Drop ALL policies on areas
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'areas'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.areas', pol.policyname);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;

-- Create the absolute simplest policies possible
-- No joins, no subqueries, no recursion

-- USER_PROFILES: Anyone authenticated can read
CREATE POLICY "read_all_profiles"
  ON public.user_profiles 
  FOR SELECT
  USING (true);

-- USER_PROFILES: Users can update their own
CREATE POLICY "update_own_profile"
  ON public.user_profiles 
  FOR UPDATE
  USING (auth.uid() = user_id);

-- USER_PROFILES: Service role bypass
CREATE POLICY "service_role_all_profiles"
  ON public.user_profiles 
  FOR ALL
  USING (auth.role() = 'service_role');

-- AREAS: Anyone authenticated can read
CREATE POLICY "read_all_areas"
  ON public.areas 
  FOR SELECT
  USING (true);

-- AREAS: Service role bypass
CREATE POLICY "service_role_all_areas"
  ON public.areas 
  FOR ALL
  USING (auth.role() = 'service_role');

-- Grant permissions
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.areas TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;
GRANT ALL ON public.areas TO service_role;