-- ============================================================
-- Comprehensive fix for all RLS policies to avoid recursion
-- ============================================================

-- First, disable RLS on all tables temporarily
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Create new simplified policies
-- ============================================================

-- 1. USER_PROFILES - Simplest possible policies
CREATE POLICY "Allow authenticated users to view all profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role has full access"
  ON public.user_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. AREAS - Simple policies
CREATE POLICY "Authenticated users can view all areas"
  ON public.areas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role has full access to areas"
  ON public.areas FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. INITIATIVES - Simple policies
CREATE POLICY "Authenticated users can view all initiatives"
  ON public.initiatives FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role has full access to initiatives"
  ON public.initiatives FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. OBJECTIVES - Simple policies
CREATE POLICY "Authenticated users can view all objectives"
  ON public.objectives FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role has full access to objectives"
  ON public.objectives FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. ACTIVITIES - Simple policies
CREATE POLICY "Authenticated users can view all activities"
  ON public.activities FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role has full access to activities"
  ON public.activities FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 6. TENANTS - Simple policies
CREATE POLICY "Authenticated users can view all tenants"
  ON public.tenants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role has full access to tenants"
  ON public.tenants FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 7. ORGANIZATIONS - Simple policies
CREATE POLICY "Authenticated users can view all organizations"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role has full access to organizations"
  ON public.organizations FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Add helpful comment
COMMENT ON SCHEMA public IS 
'Public schema with simplified RLS policies to avoid recursion. All authenticated users can read all data temporarily.';