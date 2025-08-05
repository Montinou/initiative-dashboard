-- Force fix by dropping ALL possible policies with CASCADE
-- This will remove any policies regardless of their current state

-- Disable RLS temporarily to ensure we can work
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies (this will succeed even if they don't exist)
DO $$ 
DECLARE
    pol_record RECORD;
BEGIN
    -- Get all policies for user_profiles table
    FOR pol_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'user_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_profiles', pol_record.policyname);
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create the minimal set of working policies with CORRECT relationships
CREATE POLICY "service_role_access" ON public.user_profiles 
FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "user_own_profile" ON public.user_profiles 
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "user_update_own" ON public.user_profiles 
FOR UPDATE USING (user_id = auth.uid());

-- Test immediately
SELECT COUNT(*) as test_count FROM public.user_profiles WHERE id = '573d6535-a480-4e75-985b-8820e16437ad'::uuid;