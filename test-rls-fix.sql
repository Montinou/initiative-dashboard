-- Quick test to verify RLS policies are working
-- This should show current policies and test basic user profile access

-- Check current policies
SELECT policyname, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- Try to query user_profiles with a known user_id
-- This simulates what the Cloud Function is trying to do
SELECT user_id, tenant_id, role 
FROM user_profiles 
WHERE user_id = '573d6535-a480-4e75-985b-8820e16437ad'
LIMIT 1;