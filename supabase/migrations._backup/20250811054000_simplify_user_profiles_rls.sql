-- ============================================================
-- Simplify user_profiles RLS to eliminate ALL recursion
-- ============================================================

-- Drop all existing policies on user_profiles
DROP POLICY IF EXISTS "Profiles: Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles: View based on role" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles: Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles: CEO/Admin can insert" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles: CEO/Admin can update tenant profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Profiles: CEO/Admin can delete" ON public.user_profiles;

-- Create a single, simple policy that allows authenticated users to read all profiles
-- This eliminates any possibility of recursion
CREATE POLICY "Profiles: Authenticated users can view all profiles"
  ON public.user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Profiles: Users can update own"
  ON public.user_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role can do everything (for admin operations)
CREATE POLICY "Profiles: Service role full access"
  ON public.user_profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant necessary permissions
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_profiles TO service_role;

-- Add helpful comment
COMMENT ON TABLE public.user_profiles IS 
'User profiles with simplified RLS - authenticated users can read all profiles to avoid recursion issues.';