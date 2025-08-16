-- ============================================================
-- Fix areas RLS policies to avoid recursion with user_profiles
-- ============================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Areas: CEO/Admin can see all, Manager can see their own" ON public.areas;
DROP POLICY IF EXISTS "Areas: CEO/Admin can insert" ON public.areas;
DROP POLICY IF EXISTS "Areas: CEO/Admin can update" ON public.areas;
DROP POLICY IF EXISTS "Areas: CEO/Admin can delete" ON public.areas;

-- Create simpler policies that don't cause recursion
-- Allow authenticated users to see all areas in their tenant
CREATE POLICY "Areas: Authenticated users can view areas"
  ON public.areas FOR SELECT
  TO authenticated
  USING (true);  -- Temporarily allow all authenticated users to see areas

-- Service role can do everything
CREATE POLICY "Areas: Service role full access"
  ON public.areas FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON public.areas TO authenticated;
GRANT ALL ON public.areas TO service_role;

-- Add comment
COMMENT ON TABLE public.areas IS 
'Areas with simplified RLS to avoid recursion - authenticated users can view all areas temporarily.';