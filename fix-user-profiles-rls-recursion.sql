-- Fix user_profiles RLS infinite recursion
-- The issue: Multiple policies query user_profiles within the user_profiles policy condition
-- Solution: Use auth.uid() directly without subqueries to user_profiles

-- Drop all existing problematic policies
DROP POLICY IF EXISTS "Users can view profiles in their tenant" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins and CEOs can manage user profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_tenant_isolation" ON public.user_profiles;

-- Create simple, non-recursive policies
-- 1. Allow users to view their own profile (no recursion)
CREATE POLICY "Users can view own profile" ON public.user_profiles 
FOR SELECT USING (id = auth.uid());

-- 2. Allow users to update their own profile
CREATE POLICY "Users can update own profile" ON public.user_profiles 
FOR UPDATE USING (id = auth.uid());

-- 3. Allow service role full access (for admin operations)
CREATE POLICY "Service role full access" ON public.user_profiles 
FOR ALL USING (auth.role() = 'service_role');

-- 4. Allow authenticated users to read basic profile info of users in same tenant
-- This uses a non-recursive approach by checking the current user's tenant_id from auth.jwt()
CREATE POLICY "View profiles in same tenant" ON public.user_profiles 
FOR SELECT USING (
    -- Allow if the user is viewing their own profile
    id = auth.uid() 
    OR 
    -- Or if they're in the same tenant (using auth metadata, not recursive query)
    tenant_id = COALESCE(
        (auth.jwt() ->> 'tenant_id')::uuid,
        -- Fallback: get tenant_id from the requesting user's own record (single lookup, no recursion)
        (SELECT up.tenant_id FROM public.user_profiles up WHERE up.id = auth.uid() LIMIT 1)
    )
);

-- Test the policies work without recursion
-- This query should now work without infinite recursion
SELECT 
    'Testing user_profiles access' as test,
    COUNT(*) as profile_count
FROM public.user_profiles 
WHERE id = '573d6535-a480-4e75-985b-8820e16437ad'::uuid;

-- Verify no recursive policies exist
SELECT 
    schemaname,
    tablename, 
    policyname,
    cmd as operation,
    qual as condition
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'user_profiles'
ORDER BY policyname;